<template>
  <div>
    <bank-select :value="bankName" @change="changeBankRoute"/>
    <el-card
      class="bank-data-card" v-loading="!!pending" shadow="never"
      element-loading-spinner="el-icon-loading"
    >
      <div class="card__row">
        <div class="data-item">
          <div class="data-item__label">Value locked in all banks</div>
          <price class="data-item__value text-larger" :value="userDepositsUSD"></price>
        </div>
      </div>
      <div class="card__row">
        <el-row :gutter="20">
          <el-col :span="6">
            <div class="data-item">
              <div class="data-item__label">Daily earning</div>
              <price class="data-item__value" :value="averageDailyEarnUSD"></price>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="data-item">
              <div class="data-item__label">APY</div>
              <price class="data-item__value" :value="averageDepositAPY"></price>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="data-item">
              <div class="data-item__label">Total credit</div>
              <price class="data-item__value" :value="userBorrowLimitUSD"></price>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="data-item">
              <div class="data-item__label">Total borrows</div>
              <price class="data-item__value" :value="userBorrowsUSD"></price>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>
    <div style="margin-top: 20px;"></div>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="card-white" header="Collateral" shadow="never" :body-style="{'padding':0}">
          <h2 slot="header">Collaterals</h2>
          <el-table
            :data="depositsTableData" v-loading="!!pending" class="no-bottom-border"
            element-loading-spinner="el-icon-loading" empty-text="No collateral positions"
          >
            <el-table-column label="" width="60" align="right">
              <template slot-scope="{ row }">
                <img :src="row.underlyingToken.logoURI" class="asset-image">
              </template>
            </el-table-column>
            <el-table-column label="Asset" width="100">
              <template slot-scope="{ row }">
                <div>{{ row.underlyingToken.symbol }}</div>
                <div class="cell-text-light">{{ row.underlyingToken.name }}</div>
              </template>
            </el-table-column>
            <el-table-column label="APY" width="80" align="center">
              <template slot-scope="{ row }">{{ formatPercentage(row.averageDepositAPY) }}</template>
            </el-table-column>
            <el-table-column label="Supplying" align="right">
              <template slot-scope="{ row }">
                <div>
                  <amount :value="row.userDeposits"></amount>
                  <span>{{ row.underlyingToken.symbol }}</span>
                </div>
                <price class="cell-text-light" :value="row.userDepositsUSD"></price>
              </template>
            </el-table-column>
            <el-table-column width="80" align="center">
              <template slot-scope="{ row }">
                <el-popover popper-class="tables-popover" placement="left" width="400" trigger="hover">
                  <el-table :data="banksDepositsTableData(row.underlyingToken)">
                    <el-table-column width="160" label="Bank">
                      <template slot-scope="{ row: popoverRow }">
                        <el-image :src="popoverRow.bank.logo" style="width: 28px; height: 28px; display: inline-block;vertical-align: middle;"></el-image>
                        <span style="display: inline-block;line-height: 28px;vertical-align: middle;">{{ popoverRow.bank.title }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column width="80" label="APY" align="center">
                      <template slot-scope="{ row: popoverRow }">{{ formatPercentage(popoverRow.depositAPY) }}</template>
                    </el-table-column>
                    <el-table-column label="Supplying" align="right">
                      <template slot-scope="{ row: popoverRow }">
                        <div>
                          <amount :value="popoverRow.userDeposits" :precise="false"></amount>
                          <span>{{ row.underlyingToken.symbol }}</span>
                        </div>
                        <price class="cell-text-light" :value="popoverRow.userDepositsUSD" :precise="false"></price>
                      </template>
                    </el-table-column>
                  </el-table>
                  <i slot="reference" class="el-icon-view"></i>
                </el-popover>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card header="Debts" shadow="never" :body-style="{'padding':0}">
          <h2 slot="header">Debts</h2>
          <el-table
            :data="borrowsTableData" v-loading="!!pending" class="no-bottom-border"
            element-loading-spinner="el-icon-loading" empty-text="No debt positions"
          >
            <el-table-column label="" width="60" align="right">
              <template slot-scope="{ row }">
                <img :src="row.underlyingToken.logoURI" class="asset-image">
              </template>
            </el-table-column>
            <el-table-column label="Asset" width="100">
              <template slot-scope="{ row }">
                <div>{{ row.underlyingToken.symbol }}</div>
                <div class="cell-text-light">{{ row.underlyingToken.name }}</div>
              </template>
            </el-table-column>
            <el-table-column label="APY" width="80" align="center">
              <template slot-scope="{ row }">{{ formatPercentage(row.averageBorrowAPY) }}</template>
            </el-table-column>
            <el-table-column label="Borrowing" align="right">
              <template slot-scope="{ row }">
                <div>
                  <amount :value="row.userBorrows"></amount>
                  <span>{{ row.underlyingToken.symbol }}</span>
                </div>
                <price class="cell-text-light" :value="row.userBorrowsUSD"></price>
              </template>
            </el-table-column>
            <el-table-column width="80" align="center">
              <template slot-scope="{ row }">
                <el-popover popper-class="tables-popover" placement="left" width="400" trigger="hover">
                  <el-table :data="banksBorrowsTableData(row.underlyingToken)">
                    <el-table-column width="160" label="Bank">
                      <template slot-scope="{ row: popoverRow }">
                        <el-image :src="popoverRow.bank.logo" style="width: 28px; height: 28px; display: inline-block;vertical-align: middle;"></el-image>
                        <span style="display: inline-block;line-height: 28px;vertical-align: middle;">{{ popoverRow.bank.title }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column width="80" label="APY" align="center">
                      <template slot-scope="{ row: popoverRow }">{{ formatPercentage(popoverRow.borrowAPY) }}</template>
                    </el-table-column>
                    <el-table-column label="Borrowing" align="right">
                      <template slot-scope="{ row: popoverRow }">
                        <div>
                          <amount :value="popoverRow.userBorrows" :precise="false"></amount>
                          <span>{{ row.underlyingToken.symbol }}</span>
                        </div>
                        <price class="cell-text-light" :value="popoverRow.userBorrowsUSD" :precise="false"></price>
                      </template>
                    </el-table-column>
                  </el-table>
                  <i slot="reference" class="el-icon-view"></i>
                </el-popover>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import _ from 'lodash'
import dayjs from 'dayjs'
import BankSelect from '@/components/BankSelect'
import { createBanks } from '@/utils/banks/factory'
import { getBankPortfolio } from './helper'

export default {
  components: {
    BankSelect,
  },
  data() {
    return {
      bankName: 'all',
      banks: [],
      bankPortfolioDict: {
        // [bank]: { summary, deposits, borrows }
      },
      pending: false
    }
  },
  computed: {
    userDepositsUSD() {
      const portfolios = _.values(this.bankPortfolioDict)
      return _.sumBy(portfolios, ({ summary }) => +summary.userDepositsUSD)
    },
    userBorrowLimitUSD() {
      const portfolios = _.values(this.bankPortfolioDict)
      return _.sumBy(portfolios, ({ summary }) => {
        const { userBorrowsUSD, availableBorrowsUSD } = summary
        return (+userBorrowsUSD) + (+availableBorrowsUSD)
      })
    },
    userBorrowsUSD() {
      const portfolios = _.values(this.bankPortfolioDict)
      return _.sumBy(portfolios, ({ summary }) => +summary.userBorrowsUSD)
    },
    totalAnnualYieldUSD() {
      const portfolios = _.values(this.bankPortfolioDict)
      let depositEarn = 0
      _.forEach(portfolios, (bankPortfolio) => {
        const depositsData = _.values(bankPortfolio.depositsDict)
        depositEarn += _.sumBy(depositsData, ({ userDepositsUSD, depositAPY }) => {
          return +userDepositsUSD * (+depositAPY)
        })
      })
      return depositEarn
    },
    averageDepositAPY() {
      const userDepositsUSD = this.userDepositsUSD
      const totalAnnualYieldUSD = this.totalAnnualYieldUSD
      return userDepositsUSD > 0 ? totalAnnualYieldUSD / userDepositsUSD : 0
    },
    averageDailyEarnUSD() {
      return this.totalAnnualYieldUSD / 365
    },
    depositsTableData() {
      const tableDict = {}
      const portfolios = _.values(this.bankPortfolioDict)
      _.forEach(portfolios, (bankPortfolio) => {
        _.forEach(bankPortfolio.depositsDict, (depositData, assetAddress) => {
          const { userDeposits, depositAPY, userDepositsUSD } = depositData
          const totalAnnualYieldUSD = +userDepositsUSD * (+depositAPY)
          const underlyingToken = this.getToken(assetAddress)
          if (!tableDict[assetAddress]) {
            tableDict[assetAddress] = {
              userDeposits: 0, userDepositsUSD: 0,
              totalAnnualYieldUSD: 0, averageDepositAPY: 0,
              underlyingToken
            }
          }
          tableDict[assetAddress].userDeposits += (+userDeposits)
          tableDict[assetAddress].userDepositsUSD += (+userDepositsUSD)
          tableDict[assetAddress].totalAnnualYieldUSD += (+totalAnnualYieldUSD)
          tableDict[assetAddress].averageDepositAPY =
            tableDict[assetAddress].userDepositsUSD > 0 ?
            +tableDict[assetAddress].totalAnnualYieldUSD / tableDict[assetAddress].userDepositsUSD : 0
        })
      })
      const tableData = _.values(tableDict)
      return tableData
    },
    borrowsTableData() {
      const tableDict = {}
      const portfolios = _.values(this.bankPortfolioDict)
      _.forEach(portfolios, (bankPortfolio) => {
        _.forEach(bankPortfolio.borrowsDict, (borrowData, assetAddress) => {
          const { userBorrows, borrowAPY, userBorrowsUSD } = borrowData
          const totalAnnualYieldUSD = +userBorrowsUSD * (+borrowAPY)
          const underlyingToken = this.getToken(assetAddress)
          if (!tableDict[assetAddress]) {
            tableDict[assetAddress] = {
              userBorrows: 0, userBorrowsUSD: 0,
              totalAnnualYieldUSD: 0, averageBorrowAPY: 0,
              underlyingToken
            }
          }
          tableDict[assetAddress].userBorrows += (+userBorrows)
          tableDict[assetAddress].userBorrowsUSD += (+userBorrowsUSD)
          tableDict[assetAddress].totalAnnualYieldUSD += (+totalAnnualYieldUSD)
          tableDict[assetAddress].averageBorrowAPY =
            tableDict[assetAddress].userBorrowsUSD > 0 ?
            +tableDict[assetAddress].totalAnnualYieldUSD / tableDict[assetAddress].userBorrowsUSD : 0
        })
      })
      const tableData = _.values(tableDict)
      return tableData
    },
  },
  mounted() {
    this.banks = createBanks(this.$wallet)
    this.fetchData()
  },
  methods: {
    formatPercentage(val) {
      return (+val * 100).toFixed(2) + '%'
    },
    getToken(asset) {
      return this.$store.getters['tokens/getToken'](asset)
    },
    async fetchData() {
      this.pending = true
      const promises = _.map(this.banks, async (bank) => {
        try {
          const portfolio = await getBankPortfolio(bank)
          // 这样强制触发更新
          this.bankPortfolioDict = {
            ...this.bankPortfolioDict,
            [bank.name]: portfolio,
          }
        } catch(err) {
          console.error(`${bank} fetchData`, err)
        }
      })
      await Promise.all(promises)
      this.pending = false
    },
    banksDepositsTableData(underlyingToken) {
      const tableData = []
      _.forEach(this.banks, (bank) => {
        const bankPortfolio = this.bankPortfolioDict[bank.name]
        if (!bankPortfolio) {
          return
        }
        const depositData = bankPortfolio.depositsDict[underlyingToken.address.toLowerCase()]
        if (depositData) {
          const { userDeposits, depositAPY, userDepositsUSD } = depositData
          tableData.push({
            bank: { logo: bank.logo, title: bank.title },
            userDeposits, depositAPY, userDepositsUSD,
          })
        }
      })
      return tableData
    },
    banksBorrowsTableData(underlyingToken) {
      const tableData = []
      _.forEach(this.banks, (bank) => {
        const bankPortfolio = this.bankPortfolioDict[bank.name]
        if (!bankPortfolio) {
          return
        }
        const borrowData = bankPortfolio.borrowsDict[underlyingToken.address.toLowerCase()]
        if (borrowData) {
          const { userBorrows, borrowAPY, userBorrowsUSD } = borrowData
          tableData.push({
            bank: { logo: bank.logo, title: bank.title },
            userBorrows, borrowAPY, userBorrowsUSD,
          })
        }
      })
      return tableData
    },
    changeBankRoute(bankName) {
      this.$router.push(`/portfolio/${bankName}`)
    },
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/stylesheets/variables.scss';
.bank-data-card {
  height: 200px;
  /deep/ .el-card__body {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
  }
}
.card__title {
  font-size: 16px;
  font-weight: 400;
  line-height: 1;
  margin-bottom: 18px;
  color: $--color-text-regular;
}
.card__value {
  font-size: 28px;
  line-height: 1;
  font-weight: 500;
  margin-bottom: 8px;
}
/deep/ {
  .el-card__header {
    border-bottom: none;
  }
  .el-progress-bar__outer {
    background-color: #DFE2E8;
  }
}
.asset-image {
  width: 40px;
  margin-left: 10px;
  display: block;
  border-radius: 50%;
}
.cell-text-light {
  color: $--color-text-regular;
  font-size: 0.9em;
  line-height: 1;
}
.card__row {
  width: 100%;
}
.card__row + .card__row {
  margin-top: 15px;
}
.data-item {
  padding: 10px;
}
.data-item__label {
  font-size: 16px;
  font-weight: 400;
  line-height: 1;
  opacity: .8;
  margin-bottom: 12px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}
.data-item__value {
  line-height: 1;
  font-weight: 400;
  font-size: 22px;
  &.text-larger {
    font-size: 28px;
  }
}
</style>
