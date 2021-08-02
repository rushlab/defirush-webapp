<template>
  <div class="page--borrow">
    <el-form>
      <el-form-item>
        <chain-select :value.sync="currentChain"/>
      </el-form-item>
      <el-form-item class="token-amount">
        <div class="token-balance-display">
          <template v-if="balanceDisplay > 0">
            <span>Max:{{ balanceDisplay }}</span>
          </template>
          <template v-else>
            <span class="text-warning">Not enough balance </span> <span>Max: {{ balanceDisplay }}</span>
          </template>
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
        <div v-if="+underlyingTokenPriceUSD" class="token-value-to-usd">&asymp;${{ amountToUSD }}</div>
        <div v-else class="token-value-to-usd">-</div>
      </el-form-item>
    </el-form>
    <div class="bank-list">
      <el-table :data="[0]" style="width: 100%" :show-header="false" border>
        <el-table-column>
          <div slot-scope="scope" class="table-refresh-head">
            <span>Data updated&nbsp;</span><span class="last-updated-at">{{ lastUpdatedAtDisplay }}</span><span>&nbsp;ago</span>
            <div class="btn-text btn--refresh" :class="{'is-refreshing': isRefreshing}" @click="refreshTable">REFRESH</div>
          </div>
        </el-table-column>
      </el-table>
      <el-table :data="[]" style="width: 100%" border>
        <el-table-column label="Bank" width="180"></el-table-column>
        <el-table-column label="Total borrowed"></el-table-column>
        <el-table-column label="APY"></el-table-column>
        <!-- <el-table-column label="Borrowing"></el-table-column> -->
        <el-table-column label="Available">
          <template slot="header">
            <span>Available</span>
            <el-tooltip effect="dark" content="The amount you can borrow" placement="top">
              <i class="el-icon-question"></i>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="Gas Fee" width="180"></el-table-column>
        <el-table-column label="Action" width="180"></el-table-column>
        <span slot="empty"></span>
      </el-table>
      <borrow-bank-item
        v-for="bank in banksList" :key="`${bank.name}-${underlyingToken.address}`"
        :ref="bank.title"
        :underlying-token-data="underlyingToken"
        :bank-data="bank"
        :bank-app="bank.app"
      />
    </div>
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
import TokenSelectDialog from '@/components/selects/TokenSelectDialog'
import ChainSelect from '@/components/ChainSelect'
import BorrowBankItem from '@/components/banks/BorrowBankItem'
import { createBankApps } from '@/utils/banks/factory'

export default {
  components: {
    BorrowBankItem,
    TokenSelectDialog,
    ChainSelect
  },
  data() {
    return {
      currentChain: "Ethereum",
      banksList: [],
      tokenSelectDialogVisible: false,
      underlyingToken: {
        "symbol": "ETH",
        "name": "Ethereum",
        "decimals": 18,
        "address": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "logoURI": "https://tokens.1inch.exchange/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png"
      },
      accountData: null,
      amountDisplay: '0',
      balanceDisplay: '0',
      underlyingTokenPriceUSD: 0,
      lastUpdatedAt: dayjs(),
      currentTime: 0,
      isRefreshing: false
    }
  },
  computed: {
    amountToUSD() {
      return (+this.amountDisplay * +this.underlyingTokenPriceUSD).toFixed(6)
    },
    lastUpdatedAtDisplay() {
      return this.lastUpdatedAt ? this.lastUpdatedAt.to(this.currentTime) : '-'
    }
  },
  mounted() {
    this.banksList = createBankApps(this.$wallet)
    this.getUnderlyingAssetPriceUSD()
    this.getBalanceDisplay()
  },
  methods: {
    async getBalanceDisplay() {
      if (this.isETH) {
        this.balanceDisplay = await this.$wallet.getBalance()
      } else {
        const { address } = this.underlyingToken
        this.balanceDisplay = await this.$wallet.getBalance(address)
      }
    },
    onSelectToken(token) {
      this.underlyingToken = token
      this.getUnderlyingAssetPriceUSD()
      this.getBalanceDisplay()
      this.banksList = createBankApps(this.$wallet)
    },
    updateLastUpdatedAt() {
      return this.lastUpdatedAt ? this.lastUpdatedAt.to(this.currentTime) : '-'
    },
    async getUnderlyingAssetPriceUSD() {
      // TODO, 这里不要显示 price 了, $wallet 里面的方法也去掉, 直接在 dialog 里显示价格, 从 bankApp 里面取价格
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
      const promiseList = _.map(this.banksList, bank => {
        return new Promise((resolve) => {
          const bankItem = this.$refs[bank.title]
          if (bankItem && bankItem[0].getAllData) {
            bankItem[0].getAllData()
          }
          resolve()
        })
      })
      await Promise.all(promiseList)
      this.lastUpdatedAt = dayjs()
      this.isRefreshing = false
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
/deep/ {
  .el-table__empty-block {
    display: none;
  }
  .el-input-group__prepend {
    background-color: #ffffff;
  }
  .el-table th, .el-table tr {
    background-color: $color-bg-page;
  }
  .el-table--border th, .el-table--border td {
    // border-right-color: $color-border;
  }
  .el-table th.is-leaf, .el-table td {
    border-bottom-color: $color-border;
  }
  .el-table th {
    border-top: 1px solid $color-border;
  }
}
.token-amount /deep/ .el-form-item__content {
  position: relative;
  padding: 20px 0;

}
.token-balance-display,
.token-value-to-usd {
  position: absolute;
  right: 0;
  height: 16px;
  z-index: 1;
  line-height: 1;
  color: $color-text-light;
}
.token-balance-display {
  top: 0;
}
.text-warning {
  color: $color-warning;
}
.token-value-to-usd {
  bottom: 0;
  margin-top: 8px;
}
.select-token-btn {
  width: 350px;
  background-color: transparent;
  text-align: left;
  position: relative;
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
  color: $color-text;
}
.token-icon {
  width: 20px;
  height: 20px;
  margin-right: 10px;
}
.bank-list {
  border: 1px solid $color-border;
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
  color: $color-text-light;
  .btn-text {
    margin-left: 10px;
    cursor: pointer;
    text-decoration: underline;
    color: $color-text;
  }
  .btn--refresh {
    position: relative;
    padding-right: 20px;
  }
  .btn--refresh::after {
    content: "";
    position: absolute;
    width: 16px;
    height: 16px;
    right: 0;
    top: 50%;
    margin-top: -8px;
    background-repeat: no-repeat;
    background-position: center;
    background-size: cover;
    background-image: url('~/assets/icons/icon-rotate.png');
  }
  .btn--refresh.is-refreshing::after {
    animation: rotating infinite 1s ease-in-out;
  }
}
.last-updated-at {
  color: $color-text;
}
.input-amount  /deep/ {
  .el-input-group__prepend {
    background-color: #E6E8EC;
    height: 56px !important;
    color: $color-text;
    font-size: 18px;
    font-weight: 400;
    border: none;
  }

  .el-input__inner {
    height: 56px;
    line-height: 56px;
    background-color: #E6E8EC;
    color: $color-text;
    font-size: 18px;
    font-weight: 400;
    border: none;
  }
}
</style>
