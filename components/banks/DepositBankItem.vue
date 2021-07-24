<template>
  <div class="bank-item" >
    <!-- <div class="item__column exchange">
      <el-image class="exchange__icon" fit="contain" :src="bankData.icon"></el-image>
      <span class="exchange__title">{{ bankData.title }}</span>
    </div>
    <div class="item__column total-deposit">{{ totalDepositsInUSD || '-' }} USD</div>
    <div class="item__column total-borrow">{{ totalBorrowsInISD || '-' }} USD</div>
    <div class="item__column apy">{{ depositAPY || '-' }}%</div>
    <div class="item__column tvl">{{ borrowAPY || '-' }}%</div>
    <div class="item__column gas-fee"> - </div>
    <div class="item__column actions">
      <el-button type="primary" @click="isVisible = true" :disabled="disabledDeposit">Deposit</el-button>
      <el-button type="primary" @click="handleWithdraw" :disabled="disabledWithdraw">Withdraw</el-button>
    </div> -->
    <el-table :data="[bankData]" style="width: 100%" v-loading="pending" :show-header="false">
      <el-table-column label="Bank" width="180">
        <div slot-scope="scope" class="table-cell">
          <el-image class="exchange__icon" fit="contain" :src="scope.row.icon"></el-image>
          <span class="exchange__title">{{ scope.row.title }}</span>
        </div>
      </el-table-column>
      <el-table-column label="Total Deposit">
        <template slot-scope="scope">
          <span>{{ totalDepositsInUSD || '-' }} USD</span>
        </template>
      </el-table-column>
      <el-table-column label="Deposit APY">
        <template slot-scope="scope">
          <span>{{ depositAPY || '-' }} %</span>
        </template>
      </el-table-column>
      <el-table-column label="Total Borrow">
        <template slot-scope="scope">
          <span>{{ totalBorrowsInISD || '-' }} USD</span>
        </template>
      </el-table-column>
      <el-table-column label="Borrow APY">
        <template slot-scope="scope">
          <span>{{ borrowAPY || '-' }} %</span>
        </template>
      </el-table-column>
      <el-table-column label="Gas Fee" width="180">
        <template slot-scope="scope">
          <span>-</span>
        </template>
      </el-table-column>
      <el-table-column label="action" width="180">
        <template slot-scope="scope">
          <el-button type="primary" @click="isVisible = true" :disabled="disabledDeposit">Deposit</el-button>
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
    }
  },
  computed: {
    disabledDeposit() {
      return !this.$signer || _.isEmpty(this.bankData) || !this.bankApp || _.isEmpty(this.underlyingTokenData)
    },
    disabledWithdraw() {
      return !this.$signer || _.isEmpty(this.bankData) || !this.bankApp || _.isEmpty(this.underlyingTokenData)
    },
    underlyingTokenAddress() {
      return _.get(this.underlyingTokenData, 'address')
    },
    totalDepositsInUSD() {
      const { totalDeposits, priceUSD } = this.assetData || {}
      if (!totalDeposits || !priceUSD) return '-'
      return (+totalDeposits * +priceUSD).toString()
    },
    totalBorrowsInISD() {
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
  },
  watch: {
    underlyingTokenAddress: {
      handler(newVal) {
        !!newVal && this.getAssetData(newVal)
      },
      immediate: true
    }
  },
  methods: {
    async getAssetData(asset) {
      this.pending = true
      this.assetData = await this.bankApp.getAssetData(asset)
      console.log('@@@@ getAssetData', this.assetData)
      this.pending = false
    },
    onDepositSuccess(amountDisplay) {
      if (!this.$signer) return;
      this.getAssetData(this.underlyingTokenAddress)
    },
    handleWithdraw() {

    }
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
</style>
