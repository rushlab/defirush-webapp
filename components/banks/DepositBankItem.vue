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
        <template slot-scope="{ row }">{{ depositAPYPercent }}</template>
      </el-table-column>
      <el-table-column label="TVL" align="right">
        <template slot-scope="{ row }">
          <div>
            <amount :value="assetData.totalDeposits" :precise="false"></amount>
            <span>{{ underlyingTokenData.symbol }}</span>
          </div>
          <price class="asset-value-to-usd" :value="totalDepositsInUSD" :precise="false"></price>
        </template>
      </el-table-column>
      <el-table-column label="Supplying" align="right">
        <template slot-scope="{ row }">
          <div>
            <amount :value="accountAssetData.userDeposits"></amount>
            <span>{{ underlyingTokenData.symbol }}</span>
          </div>
          <price class="asset-value-to-usd" :value="userDepositsInUSD"></price>
        </template>
      </el-table-column>
      <el-table-column label="Gas Fee" width="120" align="center">
        <template slot-scope="{ row }">-</template>
      </el-table-column>
      <el-table-column label="Action" width="160" align="center">
        <template slot-scope="{ row }">
          <el-button type="primary" size="small" round @click="handleClickBtn" :disabled="disabledDeposit">Deposit</el-button>
        </template>
      </el-table-column>
    </el-table>
    <deposit-dialog
      v-if="isVisible && bankApp"
      :visible.sync="isVisible"
      :bank-data="bankData"
      :bank-app="bankApp"
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
      pending: false,
      disabled: false,
      assetData: {},
      accountAssetData: {},
    }
  },
  computed: {
    ...mapState('auth', ['walletChainId', 'walletAddress', 'isAuthenticated', 'isSignerAlive']),
    disabledDeposit() {
      return _.isEmpty(this.underlyingTokenData) || this.disabled
    },
    underlyingTokenAddress() {
      return _.get(this.underlyingTokenData, 'address')
    },
    totalDepositsInUSD() {
      const { totalDeposits, priceUSD } = this.assetData
      return (+totalDeposits || 0) * (+priceUSD || 0)
    },
    depositAPYPercent() {
      const { depositAPY } = this.assetData
      return ((+depositAPY || 0) * 100).toFixed(2) + '%'
    },
    userDepositsInUSD() {
      const { priceUSD } = this.assetData
      const { userDeposits } = this.accountAssetData
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
    handleClickBtn() {
      if (!this.isSignerAlive) {
        this.$alert('Cannot handle asset deposit without connecting to wallet, please connect your wallet first!', 'Notice', {
          confirmButtonText: 'OK',
          callback: action => {

          }
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
  color: $--color-text-primary;
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
