<template>
  <div>
    <h1>{{ bankName }}</h1>
    <div>userDeposits: {{ formatCurrency(accountData.userDepositsUSD) }}</div>
    <div>userBorrows: {{ formatCurrency(accountData.userBorrowsUSD) }}</div>
    <div>availableBorrows: {{ formatCurrency(accountData.availableBorrowsUSD) }}</div>
    <div style="margin-top: 1em;"></div>
    <el-card header="Deposits" shadow="never" :body-style="{'padding':0, 'marginBottom':'-1px'}">
      <el-table :data="deposits">
        <el-table-column label="Asset">
          <div slot-scope="{ row }" class="asset-info">
            <img :src="row.info.logoURI">
            <div><div>{{ row.info.symbol }}</div><div class="asset-name">{{ row.info.name }}</div></div>
          </div>
        </el-table-column>
        <el-table-column label="Supplying">
          <template slot-scope="{ row }">
            <div>{{ row.userDeposits }}</div>
            <div>{{ formatCurrency((+row.userDeposits) * (+row.priceUSD)) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="APY">
          <template slot-scope="{ row }">{{ formatPercentage(row.depositAPY) }}</template>
        </el-table-column>
        <el-table-column label="Action">
          <template slot-scope="{ row }">
            <el-button type="success" size="mini" round>Withdraw</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <div style="margin-top: 1em;"></div>
    <el-card header="Borrows" shadow="never" :body-style="{'padding':0, 'marginBottom':'-1px'}">
      <el-table :data="borrows">
        <el-table-column label="Asset">
          <div slot-scope="{ row }" class="asset-info">
            <img :src="row.info.logoURI">
            <div><div>{{ row.info.symbol }}</div><div class="asset-name">{{ row.info.name }}</div></div>
          </div>
        </el-table-column>
        <el-table-column label="Borrowing">
          <template slot-scope="{ row }">
            <div>{{ row.userBorrows }}</div>
            <div>{{ formatCurrency((+row.userBorrows) * (+row.priceUSD)) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="APY">
          <template slot-scope="{ row }">{{ formatPercentage(row.borrowAPY) }}</template>
        </el-table-column>
        <el-table-column label="Action">
          <template slot-scope="{ row }">
            <el-button type="primary" size="mini" round>Repay</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import _ from 'lodash'
import { formatCurrency } from '@/utils/formatter'
import { createBankApp } from '@/utils/banks/factory'

export default {
  // asyncData({ store, params }) {
  //   return {
  //     bankName: params.bankName,
  //   }
  // },
  data() {
    const bankName = this.$route.params.bankName
    const { app, title, logo } = createBankApp(bankName, this.$wallet)
    return {
      bankName,
      bankApp: app,
      bankTitle: title,
      bankLogo: logo,
      accountData: {
        userDepositsUSD: '0.00',
        userBorrowsUSD: '0.00',
        availableBorrowsUSD: '0.00',
      },
      deposits: [],
      borrows: [],
    }
  },
  mounted() {
    this.getAccountData()
    this.getAccountAssets()
  },
  methods: {
    formatCurrency,
    getAccountData() {
      return this.bankApp.getAccountData().then(({
        userDepositsUSD, userBorrowsUSD, availableBorrowsUSD
      }) => {
        this.accountData.userDepositsUSD = userDepositsUSD
        this.accountData.userBorrowsUSD = userBorrowsUSD
        this.accountData.availableBorrowsUSD = availableBorrowsUSD
      }).catch((error) => {
        console.log(error)
      })
    },
    async getAccountAssetData(asset) {
      const data = {
        info: this.$store.getters['tokens/getToken'](asset) || {},
        userDeposits: '0.00', userBorrows: '0.00',
        totalDeposits: '0.00', totalBorrows: '0.00',
        depositAPY: '0.00', borrowAPY: '0.00', priceUSD: '0.00'
      }
      try {
        const {
          userDeposits, userBorrows
        } = await this.bankApp.getAccountAssetData(asset)
        const {
          totalDeposits, totalBorrows,
          depositAPY, borrowAPY, priceUSD
        } = await this.bankApp.getAssetData(asset)
        Object.assign(data, {
          userDeposits, userBorrows,
          totalDeposits, totalBorrows,
          depositAPY, borrowAPY, priceUSD
        })
      } catch(error) {
        console.log(asset, error)
      }
      console.log(data)
      return data
    },
    async getAccountAssets() {
      try {
        const { deposits, borrows } = await this.bankApp.getAccountAssets()
        const _promises1 = _.map(deposits, (asset) => this.getAccountAssetData(asset))
        const _promises2 = _.map(borrows, (asset) => this.getAccountAssetData(asset))
        this.deposits = await Promise.all(_promises1)
        this.borrows = await Promise.all(_promises2)
      } catch(error) {
        console.log(error)
      }
    },
    formatPercentage(val) {
      return (+val * 100).toFixed(2) + '%'
    },
    handleRefresh() {
      this.getAccountData()
    }
  }
}
</script>

<style lang="scss" scoped>
/deep/ {
  .el-table__empty-block {
    display: none;
  }
}
.asset-info {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  img {
    width: 40px;
    display: block;
    margin-right: 10px;
  }
  .asset-name {
    font-size: 0.8em;
    opacity: 0.75;
    line-height: 1;
  }
}
</style>
