<template>
  <div class="bank-item">
    <el-table :data="[bankData]" style="width: 100%" v-loading="!!pending" element-loading-spinner="el-icon-loading" :show-header="false">
      <el-table-column label="Bank" width="180">
        <div slot-scope="scope" class="table-cell">
          <el-image class="exchange__icon" fit="contain" :src="scope.row.icon"></el-image>
          <span class="exchange__title">{{ scope.row.title }}</span>
        </div>
      </el-table-column>
      <el-table-column label="锁仓量">
        <template slot-scope="scope">
          <span>{{ totalDepositsInUSD || '-' }} USD</span>
        </template>
      </el-table-column>
      <el-table-column label="APY">
        <template slot-scope="scope">
          <span>{{ depositAPY || '-' }} %</span>
        </template>
      </el-table-column>
      <el-table-column label="已存款金额">
        <template slot-scope="scope">
          <span>{{ userDepositsInUSD || '-' }} USD</span>
        </template>
      </el-table-column>
      <el-table-column label="Gas Fee" width="180">
        <template slot-scope="scope">
          <span>-</span>
        </template>
      </el-table-column>
      <el-table-column label="action" width="180">
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
      assetData: null,
      pending: false,
      disabled: false,
      userDeposits: '0'
    }
  },
  computed: {
    disabledDeposit() {
      return _.isEmpty(this.bankData) || !this.bankApp || _.isEmpty(this.underlyingTokenData) || this.disabled
    },
    disabledWithdraw() {
      return _.isEmpty(this.bankData) || !this.bankApp || _.isEmpty(this.underlyingTokenData)
    },
    underlyingTokenAddress() {
      return _.get(this.underlyingTokenData, 'address')
    },
    totalDepositsInUSD() {
      const { totalDeposits, priceUSD } = this.assetData || {}
      if (!totalDeposits || !priceUSD) return '-'
      return (+totalDeposits * +priceUSD).toString()
    },
    totalBorrowsInUSD() {
      const { totalBorrows, priceUSD } = this.assetData || {}
      if (!totalBorrows || !priceUSD) return '-'
      return (+totalBorrows * +priceUSD).toString()
    },
    depositAPY() {
      return this.assetData ? ((+this.assetData.depositAPY || 0) * 100).toFixed(2) : '-'
    },
    borrowAPY() {
      return this.assetData ? ((+this.assetData.borrowAPY || 0) * 100).toFixed(2) : '-'
    },
    userDepositsInUSD() {
      const { priceUSD } = this.assetData || {}
      const userDeposits = +this.userDeposits || 0
      if (!userDeposits || !priceUSD) return '-'
      return (+userDeposits * +priceUSD).toString()
    }
  },
  watch: {
    underlyingTokenAddress: {
      handler(newVal) {
        if (!newVal) return;
        this.getAllData()
      },
      immediate: true
    }
  },
  methods: {
    getAllData() {
      this.getAssetData()
      this.getAccountAssetData()
    },
    async getAssetData() {
      try {
        this.pending = true
        this.assetData = await this.bankApp.getAssetData(this.underlyingTokenAddress)
        this.disabled = false
      } catch (error) {
        console.log('@GetAssetData error', error)
        this.disabled = true
      }
      this.pending = false
    },
    async getAccountAssetData() {
      try {
        const { userDeposits } = await this.bankApp.getAccountAssetData(this.underlyingTokenAddress)
        this.userDeposits = userDeposits
      } catch (error) {
        console.log('@@@ getAccountAssetData error', error)
        this.userDeposits = '0'
      }
    },
    onDepositSuccess(amountDisplay) {
      this.getAllData()
    },
    estimateGas() {

    },
    handleWithdraw() {}
  },
}
</script>


<style lang="scss" scoped>
.bank-item {
  width: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
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
/deep/ {
  .el-loading-spinner {
    margin-top: 0;
    transform: translateY(-50%);
  }
}
</style>
