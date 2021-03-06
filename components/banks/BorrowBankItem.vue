<template>
  <div class="bank-item">
    <el-table
      :data="[bankData]" v-loading="!!pending"
      element-loading-spinner="el-icon-loading"
      :show-header="false" class="no-bottom-border"
    >
      <el-table-column label="" width="60">
        <template slot-scope="{ row }">
          <el-image class="bank-image" fit="contain" :src="row.logo"></el-image>
        </template>
      </el-table-column>
      <el-table-column label="Bank" width="100" prop="title"></el-table-column>
      <el-table-column label="APY" width="100" align="center">
        <template slot-scope="{ row }">{{ borrowAPYPercent }}</template>
      </el-table-column>
      <el-table-column label="Total borrows" align="right">
        <template slot-scope="{ row }">
          <div>
            <amount :value="assetData.totalBorrows" :precise="false"></amount>
            <span>{{ underlyingTokenData.symbol }}</span>
          </div>
          <price class="asset-value-to-usd" :value="totalBorrowsInUSD" :precise="false"></price>
        </template>
      </el-table-column>
      <!-- <el-table-column label="已借款金额">
        <template slot-scope="{ row }"><price :value="userBorrowsInUSD"></price></template>
      </el-table-column> -->
      <el-table-column label="Available" align="right">
        <template slot-scope="{ row }">
          <div>
            <amount :value="availableBorrows"></amount>
            <span>{{ underlyingTokenData.symbol }}</span>
          </div>
          <price class="asset-value-to-usd" :value="accountData.availableBorrowsUSD"></price>
        </template>
      </el-table-column>
      <el-table-column label="Gas Fee" width="120" align="center">
        <template slot-scope="{ row }">-</template>
      </el-table-column>
      <el-table-column label="Action" width="160" align="center">
        <template slot-scope="{ row }">
          <el-button type="success" size="small" round @click="handleClickBtn" :disabled="disabledBorrow">Borrow</el-button>
        </template>
      </el-table-column>
    </el-table>
    <borrow-dialog
      v-if="isVisible && bankApp"
      :visible.sync="isVisible"
      :bank-data="bankData"
      :bank-app="bankApp"
      :underlying-token-data="underlyingTokenData"
      @success="onBorrowSuccess"/>
  </div>

</template>

<script>
import _ from 'lodash'
import { mapState, mapGetters } from 'vuex'
import { ethers } from 'ethers'
import BorrowDialog from '@/components/dialogs/BorrowDialog'

export default {
  name: 'BorrowBankItem',
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
      assetData: {},
      accountData: {},
      accountAssetData: {},
      userBorrows: 0,
      pending: false,
      disabled: false,
    }
  },
  computed: {
    ...mapState('auth', ['isSignerAlive']),
    disabledBorrow() {
      return _.isEmpty(this.underlyingTokenData) || this.disabled
    },
    availableBorrows() {
      const { availableBorrowsUSD } = this.accountData
      const { priceUSD } = this.assetData
      return +(+priceUSD ? (+availableBorrowsUSD / +priceUSD).toFixed(6) : '0')
    },
    totalBorrowsInUSD() {
      const { totalBorrows, priceUSD } = this.assetData
      return (+totalBorrows || 0) * (+priceUSD || 0)
    },
    borrowAPYPercent() {
      const { borrowAPY } = this.assetData
      return ((+borrowAPY || 0) * 100).toFixed(2) + '%'
    },
    userBorrowsInUSD() {
      const { priceUSD } = this.assetData
      const { userBorrows } = this.accountAssetData
      return (+userDeposits || 0) * (+priceUSD || 0)
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
          this.getAccountData(),
          // this.getAccountAssetData(),  // 显示可借贷额度的，不需要显示已借贷金额
        ])
      } catch(error) {}
      this.pending = false
    },
    async getAssetData() {
      /* trycatch 包一下，这样对于当前bankApp不支持的 underlyingAsset，可以直接将状态置为 disabled */
      try {
        this.assetData = await this.bankApp.getAssetData(this.underlyingTokenData.address)
        this.disabled = false
      } catch (error) {
        console.error(error)
        this.disabled = true
      }
    },
    async getAccountAssetData() {
      try {
        this.accountAssetData = await this.bankApp.getAccountAssetData(this.underlyingTokenData.address)
      } catch (error) {
        console.error(error)
      }
    },
    async getAccountData() {
      try {
        this.accountData = await this.bankApp.getAccountData()
      } catch (error) {
        console.error(error)
      }
    },
    onBorrowSuccess() {
      this.getAllData()
    },
    handleClickBtn() {
      if (!this.isSignerAlive) {
        this.$alert('Cannot handle asset borrow without connecting to wallet, please connect your wallet first!', 'Notice', {
          confirmButtonText: 'OK',
          callback: action => {}
        })
      } else {
        this.isVisible = true
      }
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
}
.bank-image {
  width: 40px;
  margin-left: 10px;
  display: block;
  border-radius: 50%;
}
.asset-value-to-usd {
  color: $--color-text-regular;
}
</style>
