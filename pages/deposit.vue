<template>
  <div class="page--deposit">
    <el-form @submit.native.prevent class="form--amount">
      <el-form-item>
        <div class="amount-tip">
          <span class="text-danger" v-if="+amountDisplay > +balanceDisplay">Not enough balance </span>
          <span>Wallet balance: {{ balanceDisplay }} {{ underlyingToken.symbol }}</span>
        </div>
        <el-input v-model="amountDisplay" placeholder="Input token amount..." class="input-amount">
          <el-button class="select-token-btn" slot="prepend" @click="tokenSelectDialogVisible = !tokenSelectDialogVisible">
            <div class="select-token-btn__inner">
              <el-image v-if="underlyingToken" class="token-icon" :src="underlyingToken.logoURI"></el-image>
              <span v-if="underlyingToken" class="token-text">{{ underlyingToken.symbol }}</span>
              <span v-else class="token-text">Select a Token</span>
            </div>
          </el-button>
        </el-input>
        <div class="amount-tip">&asymp; <price :value="amountToUSD"></price></div>
      </el-form-item>
    </el-form>
    <el-card class="bank-list" :body-style="{'padding':0}" shadow="never">
      <div class="table-refresh-head">
        <span>Data updated&nbsp;</span>
        <span class="last-updated-at">{{ lastUpdatedAtDisplay }}</span>
        <span>&nbsp;ago&nbsp;</span>
        <el-button
          type="text" class="refresh-button" :loading="isRefreshing"
          @click="refreshTable"
        >REFRESH <i class="el-icon-refresh"></i></el-button>
      </div>
      <el-table :data="[]" class="table--headers-only">
        <el-table-column label="" width="60"></el-table-column>
        <el-table-column label="Bank" width="100"></el-table-column>
        <el-table-column label="APY" width="100" align="center"></el-table-column>
        <el-table-column label="TVL" align="right"></el-table-column>
        <el-table-column label="Supplying" align="right"></el-table-column>
        <el-table-column label="Gas Fee" width="120" align="center"></el-table-column>
        <el-table-column label="Action" width="160" align="center"></el-table-column>
      </el-table>
      <deposit-bank-item
        v-for="bank in banksList" :key="`${bank.name}-${underlyingToken.address}`"
        :ref="bank.title"
        :underlying-token-data="underlyingToken"
        :bank-data="bank"
        :bank-app="bank.app"/>
    </el-card>
    <token-select-dialog
      v-if="tokenSelectDialogVisible"
      :visible.sync="tokenSelectDialogVisible"
      @select="onSelectToken"
    />
  </div>
</template>

<script>
import _ from 'lodash'
import dayjs from 'dayjs'
import TokenSelectDialog from '@/components/dialogs/TokenSelectDialog'
import DepositBankItem from '@/components/banks/DepositBankItem'
import { createBanks } from '@/utils/banks/factory'

export default {
  components: {
    DepositBankItem,
    TokenSelectDialog,
  },
  data() {
    return {
      banksList: [],
      tokenSelectDialogVisible: false,
      underlyingToken: {
        "id": "ethereum",
        "symbol": "ETH",
        "name": "Ethereum",
        "logoURI": "https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880",
        "address": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        "decimals": 18
      },
      amountDisplay: '',
      balanceDisplay: '0',
      underlyingTokenPriceUSD: 0,
      lastUpdatedAt: dayjs(),
      currentTime: dayjs(),
      isRefreshing: false,
    }
  },
  computed: {
    amountToUSD() {
      return (+this.amountDisplay * +this.underlyingTokenPriceUSD).toFixed(2)
    },
    lastUpdatedAtDisplay() {
      return this.lastUpdatedAt ? this.lastUpdatedAt.from(this.currentTime, true) : '-'
    }
  },
  mounted() {
    this.banksList = createBanks(this.$wallet)
    this.getUnderlyingAssetPriceUSD()
    this.getBalanceDisplay()
  },
  methods: {
    onSelectToken(token) {
      this.underlyingToken = token
      this.getUnderlyingAssetPriceUSD()
      this.getBalanceDisplay()
      // 换 token 以后需要重置 table
      this.banksList = createBanks(this.$wallet)
    },
    async getBalanceDisplay() {
      this.balanceDisplay = await this.$wallet.getBalance(this.underlyingToken.address)
    },
    async getUnderlyingAssetPriceUSD() {
      const underlyingAssetAddress = this.underlyingToken.address
      if (!underlyingAssetAddress) {
        this.underlyingTokenPriceUSD = 0
        return
      }
      try {
        const underlyingTokenPriceUSD = await this.$wallet.getPriceUSD(underlyingAssetAddress)
        this.underlyingTokenPriceUSD = underlyingTokenPriceUSD
      } catch (error) {
        this.underlyingTokenPriceUSD = 0
      }
    },
    async refreshTable() {
      this.isRefreshing = true
      const promiseList = _.map(this.banksList, async (bank) => {
        const bankItem = this.$refs[bank.title]
        if (bankItem && bankItem[0].getAllData) {
          await bankItem[0].getAllData()
        }
      })
      try {
        await Promise.all(promiseList)
      } catch(error) {
        console.log(error)
      }
      this.isRefreshing = false
      this.lastUpdatedAt = dayjs()
    }
  },
  watch: {
    currentTime: {
      handler() {
        setTimeout(() => {
          this.currentTime = dayjs()
        }, 1000)
      },
      immediate: true
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/stylesheets/variables.scss';
.page--deposit {
  padding-top: 10px;
}
.table--headers-only {
  /deep/ > .el-table__body-wrapper > .el-table__empty-block {
    display: none;
  }
}
.form--amount {
  display: block;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  .amount-tip {
    color: $--color-text-regular;
    margin-right: 0.2em;
    text-align: right;
    line-height: 2;
  }
}
.text-danger {
  color: $--color-danger;
}
.select-token-btn {
  width: 350px;
  background-color: transparent;
  text-align: left;
  position: relative;
  line-height: 20px;
  padding-top: 18px;
  padding-bottom: 18px;
  &::after {
    content: "\e790";
    font-family: element-icons !important;
    font-size: 14px;
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
  }
}
.select-token-btn__inner {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  color: $--color-text-primary;
}
.token-icon {
  width: 20px;
  height: 20px;
  margin-right: 10px;
}
.bank-list {
  // TODO override styles
  // border: 1px solid $--border-color-base;
  /deep/ .bank-item + .bank-item {
    border-top: 1px solid $--border-color-base;
  }
}
@keyframes rotating {
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
}
.table-refresh-head {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  color: $--color-text-regular;
  padding: 5px 15px;
  border-bottom: 1px solid $--border-color-base;
  .refresh-button.is-loading {
    /deep/ .el-icon-loading {
      display: none;
      + span { margin-left: 0; }
    }
    .el-icon-refresh {
      animation: rotating 2s linear reverse infinite;
    }
  }
}
.last-updated-at {
  color: $--color-text-primary;
}
.input-amount /deep/ {
  .el-input-group__prepend {
    background-color: $--input-background-color;
    height: 56px !important;
    color: $--color-text-primary;
    font-size: 18px;
    font-weight: 400;
    border: none;
  }
  .el-input__inner {
    height: 56px;
    line-height: 56px;
    color: $--color-text-primary;
    font-size: 18px;
    font-weight: bold;
    border: none;
  }
}
</style>
