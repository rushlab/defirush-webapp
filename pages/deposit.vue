<template>
  <div class="page--deposit">
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
        <el-input v-model="amountDisplay" placeholder="Input token amount...">
          <el-button class="select-token-btn" slot="prepend" @click="tokenSelectDialogVisible = !tokenSelectDialogVisible">
            <div class="select-token-btn__inner">
              <el-image v-if="underlyingToken" class="token-icon" :src="underlyingToken.logoURI"></el-image>
              <span v-if="underlyingToken" class="token-text">{{ underlyingToken.symbol }}</span>
              <span v-else class="token-text">Select a Token</span>
            </div>
          </el-button>
        </el-input>
        <div class="token-value-to-usd">&asymp;${{ amountToUSD }}</div>
      </el-form-item>
    </el-form>
    <div class="bank-list">
      <el-table :data="[0]" style="width: 100%" :show-header="false">
        <el-table-column>
          <div slot-scope="scope" class="table-refresh-head">
            <span>Data updated&nbsp;</span><span class="last-updated-at">{{ lastUpdatedAtDisplay }}</span><span>&nbsp;ago</span>
            <div class="btn-text" @click="refreshTable">REFRESH</div>
          </div>
        </el-table-column>
      </el-table>
      <el-table :data="[]" style="width: 100%">
        <el-table-column label="Bank" width="180"></el-table-column>
        <el-table-column label="锁仓量"></el-table-column>
        <el-table-column label="APY"></el-table-column>
        <el-table-column label="已存款金额"></el-table-column>
        <el-table-column label="Gas Fee" width="180"></el-table-column>
        <el-table-column label="Action" width="180"></el-table-column>
        <span slot="empty"></span>
      </el-table>
      <deposit-bank-item
        v-for="bank in banksList" :key="bank.title"
        :ref="bank.title"
        :underlying-token-data="underlyingToken"
        :bank-data="bank"
        :bank-app="bank.app"/>
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
import DepositBankItem from '@/components/banks/DepositBankItem'
import ChainSelect from '@/components/ChainSelect'
import { AaveApp } from '@/utils/banks/aave-app'
import { CompoundApp } from '@/utils/banks/compound-app'
import { CreamApp } from '@/utils/banks/cream-app'

export default {
  components: {
    DepositBankItem,
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
      amountDisplay: '0',
      balanceDisplay: '0',
      underlyingTokenPriceUSD: 0,
      lastUpdatedAt: dayjs(),
      currentTime: dayjs(),
    }
  },
  computed: {
    amountToUSD() {
      return (+this.amountDisplay * +this.underlyingTokenPriceUSD).toFixed(6)
    },
    isETH() {
      return _.get(this.underlyingToken, 'address', '').toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()
    },
    lastUpdatedAtDisplay() {
      return this.lastUpdatedAt ? this.lastUpdatedAt.to(this.currentTime) : '-'
    }
  },
  mounted() {
    this.banksList = [{
      icon: 'https://aave.com/favicon64.png', title: 'Aave',
      app: new AaveApp(this.$wallet)
    }, {
      icon: 'https://compound.finance/compound-components/assets/compound-mark.svg', title: 'Compound',
      app: new CompoundApp(this.$wallet)
    }, {
      icon: 'https://app.cream.finance/static/media/cream.29138554.svg', title: 'Cream',
      app: new CreamApp(this.$wallet)
    }]
    this.getUnderlyingAssetPriceUSD()
    this.getBalanceDisplay()
  },
  methods: {
    onSelectToken(token) {
      this.underlyingToken = token
      this.getUnderlyingAssetPriceUSD()
      this.getBalanceDisplay()
    },
    async getBalanceDisplay() {
      if (this.isETH) {
        this.balanceDisplay = await this.$wallet.getBalance()
      } else {
        const { address } = this.underlyingToken
        this.balanceDisplay = await this.$wallet.getBalance(address)
      }
    },
    async getUnderlyingAssetPriceUSD() {
      // const [,,,,priceUSD] = await this.bankApp.getAssetData(asset)
      // this.underlyingTokenPriceUSD = priceUSD
      const underlyingAssetAddress = this.underlyingToken.address
      if (!underlyingAssetAddress) return
      const underlyingTokenPriceUSD = await this.$wallet.getPriceUSD(underlyingAssetAddress)
      this.underlyingTokenPriceUSD = underlyingTokenPriceUSD
    },
    async refreshTable() {
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
}
</style>
