<template>
  <div class="bank-item">
    <el-table
      :data="[bankData]"
      style="width: 100%"
      v-loading="!!pending"
      element-loading-spinner="el-icon-loading"
      element-loading-background="transparent"
      :show-header="false"
      border>
      <el-table-column label="Bank" width="200">
        <div slot-scope="scope" class="table-cell">
          <el-image class="exchange__icon" fit="contain" :src="scope.row.logo"></el-image>
          <span class="exchange__title">{{ scope.row.title }}</span>
        </div>
      </el-table-column>
      <el-table-column label="锁仓量">
        <template slot-scope="scope">
          <div>{{ assetData.totalDeposits || '0' }} {{ underlyingTokenData.symbol }}</div>
          <div class="asset-value-to-usd">{{totalDepositsInUSD}}</div>
        </template>
      </el-table-column>
      <el-table-column label="APY">
        <template slot-scope="scope">{{ depositAPYPercent }}</template>
      </el-table-column>
      <el-table-column label="已存款金额">
        <template slot-scope="scope">
          <div>{{ accountAssetData.userDeposits || '0' }} {{ underlyingTokenData.symbol }}</div>
          <div class="asset-value-to-usd">{{ userDepositsInUSD }}</div>
        </template>
      </el-table-column>
      <el-table-column label="Gas Fee" width="120">
        <template slot-scope="scope"></template>
      </el-table-column>
      <el-table-column label="Action" width="120">
        <template slot-scope="scope">
          <el-button type="primary" size="small" round @click="isVisible = true" :disabled="disabledDeposit">Deposit</el-button>
        </template>
      </el-table-column>
    </el-table>
    <deposit-dialog
      v-if="isVisible && bankApp"
      :visible.sync="isVisible"
      :bankApp="bankApp"
      :underlying-token-data="underlyingTokenData"
      @success="onDepositSuccess"/>
  </div>

</template>

<script>
import _ from 'lodash'
import { mapState, mapGetters } from 'vuex'
import { ethers } from 'ethers'
import { formatCurrency } from '@/utils/formatter'
import DepositDialog from '@/components/selects/DepositDialog'

export default {
  name: 'DepositBankItem',
  props: {
    bankData: {
      type: Object,
      default: () => ({})
    },
    bankApp: {
      type: Object,
      default: () => ({})
    },
    underlyingTokenData: {
      type: Object,
      default: () => ({})
    }
  },
  components: {
    DepositDialog
  },
  data() {
    return {
      isVisible: false,
      pending: false,
      disabled: false,
      assetData: {},
      accountAssetData: {},
    }
  },
  computed: {
    disabledDeposit() {
      return _.isEmpty(this.underlyingTokenData) || this.disabled
    },
    underlyingTokenAddress() {
      return _.get(this.underlyingTokenData, 'address')
    },
    totalDepositsInUSD() {
      const { totalDeposits, priceUSD } = this.assetData
      return formatCurrency((+totalDeposits || 0) * (+priceUSD || 0))
    },
    depositAPYPercent() {
      const { depositAPY } = this.assetData
      return ((+depositAPY || 0) * 100).toFixed(2) + '%'
    },
    userDepositsInUSD() {
      const { priceUSD } = this.assetData
      const { userDeposits } = this.accountAssetData
      return formatCurrency((+userDeposits || 0) * (+priceUSD || 0))
    }
  },
  mounted() {
    this.getAllData()
  },
  methods: {
    async getAllData() {
      this.pending = true
      try {
        await Promise.all([
          this.getAssetData(),
          this.getAccountAssetData()
        ])
      } catch(error) {}
      this.pending = false
    },
    async getAssetData() {
      /**
       * trycatch 包一下，这样对于当前bankApp不支持的 underlyingAsset，可以直接将状态置为 disabled
       */
      try {
        this.assetData = await this.bankApp.getAssetData(this.underlyingTokenAddress)
        this.disabled = false
      } catch (error) {
        this.disabled = true
      }
    },
    async getAccountAssetData() {
      try {
        this.accountAssetData = await this.bankApp.getAccountAssetData(this.underlyingTokenAddress)
      } catch (error) {}
    },
    onDepositSuccess(amountDisplay) {
      this.getAllData()
    },
    estimateGas() {},
  },
}
</script>


<style lang="scss" scoped>
@import '@/assets/stylesheets/variables.scss';
.bank-item {
  width: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
  color: $color-text;
}
.item__column {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 10px 20px;
}
.exchange {
  flex: 1;
}
.exchange__icon {
  width: 40px;
  height: 40px;
  margin-right: 10px;
}
.exchange__title {
  font-size: 14px;
}
.apy {
  width: 15%;
}
.tvl {
  width: 15%;
}
.gas-fee {
  width: 15%;
}
.actions {
  flex: 1;
}
.table-cell {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}
.asset-value-to-usd {
  color: $color-text-light;
}
/deep/ {
  .el-loading-spinner {
    margin-top: 0;
    transform: translateY(-50%);
  }
  .el-table {
    color: $color-text;
  }
  .el-table td {
    border-top: 1px solid $color-border;
    border-right: none;
  }
}
</style>
