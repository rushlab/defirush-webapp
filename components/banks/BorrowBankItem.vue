<template>
  <div class="bank-item" >
    <el-table :data="[bankData]" style="width: 100%" v-loading="pending" :show-header="false">
      <el-table-column label="Bank" width="180">
        <div slot-scope="scope" class="table-cell">
          <el-image class="exchange__icon" fit="contain" :src="scope.row.icon"></el-image>
          <span class="exchange__title">{{ scope.row.title }}</span>
        </div>
      </el-table-column>
      <el-table-column label="Total Deposits">
        <template slot-scope="scope">
          <span>{{ accountAssetData ? accountAssetData.userDeposits : '-' }} {{ underlyingTokenData ? underlyingTokenData.symbol : '' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Total Borrows">
        <template slot-scope="scope">
          <span>{{ accountAssetData ? accountAssetData.userBorrows : '-' }} {{ underlyingTokenData ? underlyingTokenData.symbol : '' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Available Borrows">
        <template slot-scope="scope">
          <span>{{ availableBorrowsDisplay || '-' }} {{ underlyingTokenData ? underlyingTokenData.symbol : '' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Gas Fee" width="180">
        <template slot-scope="scope">
          <span>-</span>
        </template>
      </el-table-column>
      <el-table-column label="action" width="180">
        <template slot-scope="scope">
          <el-button type="primary" @click="isVisible = true" :disabled="disabled">Borrow</el-button>
        </template>
      </el-table-column>
    </el-table>
    <borrow-dialog
      v-if="isVisible && bankApp"
      :visible.sync="isVisible"
      :bankApp="bankApp"
      :underlying-token-data="underlyingTokenData"
      :available-borrows-display="availableBorrowsDisplay"
      @success="onBorrowSuccess"/>
  </div>

</template>

<script>
import _ from 'lodash'
import { mapState, mapGetters } from 'vuex'
import { ethers } from 'ethers'
import BorrowDialog from '@/components/selects/BorrowDialog'

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
    BorrowDialog
  },
  data() {
    return {
      isVisible: false,
      assetData: null,
      accountData: null,
      accountAssetData: null,
      pending: false,
    }
  },
  mounted() {
    this.getAccountData()
  },
  computed: {
    disabled() {
      return !this.$signer || _.isEmpty(this.bankData) || !this.bankApp || _.isEmpty(this.underlyingTokenData)
    },
    underlyingTokenAddress() {
      return _.get(this.underlyingTokenData, 'address')
    },
    availableBorrowsDisplay() {
      const availableBorrowsUSD = _.get(this.accountData, 'availableBorrowsUSD', '0')
      const priceUSD = _.get(this.assetData, 'priceUSD', '0')
      return +priceUSD ? (+availableBorrowsUSD / +priceUSD).toString() : ''
    },
  },
  watch: {
    underlyingTokenData() {
      this.getAssetData()
      this.getAccountAssetData()
    }
  },
  methods: {
    async getAssetData() {
      if (!this.$signer) return;
      const assetData = await this.bankApp.getAssetData(this.underlyingTokenAddress)
      this.assetData = assetData
      console.log('@@@ assetData', assetData)
    },
    async getAccountAssetData() {
      if (!this.$signer) return;
      const accountAssetData = await this.bankApp.getAccountAssetData(this.underlyingTokenAddress)
      this.accountAssetData = accountAssetData
      console.log('@@@ accountAssetData', accountAssetData)
    },
    async getAccountData() {
      if (!this.$signer) return;
      const accountData = await this.bankApp.getAccountData()
      this.accountData = accountData
      console.log('@@@ accountData', accountData)
    },
    onBorrowSuccess() {
      Promise.all([
        this.getAccountData(),
        this.getAccountAssetData()
      ])
    },
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
