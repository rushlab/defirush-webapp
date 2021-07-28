<template>
  <div class="bank-item" >
    <el-table :data="[bankData]" style="width: 100%" v-loading="!!pending" element-loading-spinner="el-icon-loading" :show-header="false">
      <el-table-column label="Bank" width="180">
        <div slot-scope="scope" class="table-cell">
          <el-image class="exchange__icon" fit="contain" :src="scope.row.icon"></el-image>
          <span class="exchange__title">{{ scope.row.title }}</span>
        </div>
      </el-table-column>
      <el-table-column label="锁仓量">
        <template slot-scope="scope">
          <span>{{ totalBorrowsInUSD || '-' }} USD</span>
        </template>
      </el-table-column>
      <el-table-column label="APY">
        <template slot-scope="scope">
          <span>{{ borrowAPY || '-' }} %</span>
        </template>
      </el-table-column>
      <!-- <el-table-column label="已贷款金额">
        <template slot-scope="scope">
          <span>{{ userBorrowsInUSD || '-' }} USD</span>
        </template>
      </el-table-column> -->
      <el-table-column label="可贷款金额">
        <template slot-scope="scope">
          <span>{{ availableBorrowsDisplay || '-' }} USD</span>
        </template>
      </el-table-column>
      <el-table-column label="Gas Fee" width="180">
        <template slot-scope="scope">
          <span>-</span>
        </template>
      </el-table-column>
      <el-table-column label="action" width="180">
        <template slot-scope="scope">
          <el-button type="primary" size="small" round @click="isVisible = true" :disabled="disabledBorrow">Borrow</el-button>
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
      assetData: null,
      accountData: null,
      userBorrows: 0,
      pending: false,
      disabled: false,
    }
  },
  mounted() {
    this.getAllData()
  },
  computed: {
    disabledBorrow() {
      return _.isEmpty(this.bankData) || !this.bankApp || _.isEmpty(this.underlyingTokenData) || this.disabled
    },
    underlyingTokenAddress() {
      return _.get(this.underlyingTokenData, 'address')
    },
    availableBorrowsDisplay() {
      const availableBorrowsUSD = _.get(this.accountData, 'availableBorrowsUSD', '0')
      const priceUSD = _.get(this.assetData, 'priceUSD', '0')
      return +priceUSD ? (+availableBorrowsUSD / +priceUSD).toString() : ''
    },
    totalBorrowsInUSD() {
      const { totalBorrows, priceUSD } = this.assetData || {}
      if (!totalBorrows || !priceUSD) return '-'
      return (+totalBorrows * +priceUSD).toString()
    },
    borrowAPY() {
      return this.assetData ? ((+this.assetData.borrowAPY || 0) * 100).toFixed(2) : '-'
    },
    userBorrowsInUSD() {
      const { priceUSD  = '0' } = this.assetData || {}
      const userBorrows = +this.userBorrows || 0
      if (!userBorrows || !priceUSD) return '-'
      return (+userBorrows * +priceUSD).toString()
    }
  },
  watch: {
    underlyingTokenAddress: {
      handler(newVal) {
        if (!newVal) {
          this.resetData()
          return
        }
        this.getAllData()
      },
      immediate: true
    }
  },
  methods: {
    resetData() {
      this.assetData = null
      this.accountData = null
      this.userBorrows = 0
      this.pending = false
      this.disabled = false
    },
    getAllData() {
      this.getAssetData()
      this.getAccountData()
      // this.getAccountAssetData()  // 显示可借贷额度的，不需要显示已借贷金额
    },
    async getAssetData() {
      /**
       * trycatch 包一下，这样对于当前bankApp不支持的 underlyingAsset，可以直接将状态置为 disabled
       */
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
        const { userBorrows } = await this.bankApp.getAccountAssetData(this.underlyingTokenAddress)
        console.log('@@@@ userBorrows', userBorrows)
        this.userBorrows = userBorrows
      } catch (error) {
        console.log('@@@ getAccountAssetData error', error)
        this.userBorrows = '0'
      }
    },
    async getAccountData() {
      const accountData = await this.bankApp.getAccountData()
      this.accountData = accountData
    },
    onBorrowSuccess() {
      this.getAllData()
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
/deep/ {
  .el-loading-spinner {
    margin-top: 0;
    transform: translateY(-50%);
  }
}
</style>
