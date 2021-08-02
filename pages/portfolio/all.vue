<template>
  <div>
    <div class="page--borrow">
      <el-form>
        <el-form-item>
          <bank-select :value="bankName" @change="changeBankRoute"/>
        </el-form-item>
      </el-form>
    </div>

    <div class="bank-data-card">
      <div class="card__row">
        <div class="data-item">
          <div class="data-item__label">Value locked in all banks</div>
          <div class="data-item__value text-larger">{{ formatCurrency(accountData.userDepositsUSD) }}</div>
        </div>
      </div>
      <div class="card__row">
        <el-row :gutter="20">
          <el-col :span="6">
            <div class="data-item">
              <div class="data-item__label">Daily earning</div>
              <div class="data-item__value">{{ formatCurrency(dailyEarnUSD) }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="data-item">
              <div class="data-item__label">APY</div>
              <div class="data-item__value">{{ formatPercentage(userDepositAPY) }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="data-item">
              <div class="data-item__label">Total credit</div>
              <div class="data-item__value">{{ formatCurrency(+accountData.userBorrowsUSD + +accountData.availableBorrowsUSD) }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="data-item">
              <div class="data-item__label">Total borrows</div>
              <div class="data-item__value">{{ formatCurrency(+accountData.userBorrowsUSD) }}</div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>
    <div style="margin-top: 20px;"></div>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card header="Collateral" shadow="never" :body-style="{'padding':0, 'marginBottom':'-1px'}">
          <h2 slot="header">Collateral</h2>
          <el-table :data="deposits">
            <el-table-column label="Asset">
              <div slot-scope="{ row }" class="asset-info">
                <img :src="tokensInfo[row.asset].logoURI">
                <div><div>{{ tokensInfo[row.asset].symbol }}</div><div class="asset-name">{{ tokensInfo[row.asset].name }}</div></div>
              </div>
            </el-table-column>
            <el-table-column label="Supplying">
              <template slot-scope="{ row }">
                <div>{{ row.userDeposits }} {{ tokensInfo[row.asset].symbol }}</div>
                <div class="asset-value-to-usd">{{ formatCurrency(row.userDepositsUSD) }}</div>
              </template>
            </el-table-column>
            <el-table-column label="APY">
              <template slot-scope="{ row }">
                <div class="col-apy">
                  <span>{{ formatPercentage(row.depositAPY) }}</span>
                  <el-popover
                    popper-class="apy-popover"
                    placement="left"
                    width="320"
                    class="apy-popover"
                    trigger="click">
                    <el-table :data="row.depositAPYList" :border="false">
                      <el-table-column width="200" property="" label="Bank">
                        <template slot-scope="{ row }">
                          <el-image :src="row.bank.logo" style="width: 28px; height: 28px; display: inline-block;vertical-align: middle;"></el-image>
                          <span style="display: inline-block;line-height: 28px;vertical-align: middle;">{{ row.bank.title }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column width="120" property="apy" label="APY">
                        <template slot-scope="{ row }">
                          <span>{{ formatPercentage(row.depositAPY) }}</span>
                        </template>
                      </el-table-column>
                    </el-table>
                    <i slot="reference" class="el-icon-view"></i>
                  </el-popover>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card header="Debts" shadow="never" :body-style="{'padding':0, 'marginBottom':'-1px'}">
          <h2 slot="header">Debts</h2>
          <el-table :data="borrows">
            <el-table-column label="Asset">
              <div slot-scope="{ row }" class="asset-info">
                <img :src="tokensInfo[row.asset].logoURI">
                <div><div>{{ tokensInfo[row.asset].symbol }}</div><div class="asset-name">{{ tokensInfo[row.asset].name }}</div></div>
              </div>
            </el-table-column>
            <el-table-column label="Borrowing">
              <template slot-scope="{ row }">
                <div>{{ row.userBorrows }} {{ tokensInfo[row.asset].symbol }}</div>
                <div class="asset-value-to-usd">{{ formatCurrency(row.userBorrowsUSD) }}</div>
              </template>
            </el-table-column>
            <el-table-column label="APY">
              <template slot-scope="{ row }">
                <div class="col-apy">
                  <span>{{ formatPercentage(row.borrowAPY) }}</span>
                  <el-popover
                    popper-class="apy-popover"
                    placement="left"
                    width="320"
                    trigger="click">
                    <el-table :data="row.borrowAPYList" :border="false">
                      <el-table-column width="200" property="" label="Bank">
                        <template slot-scope="{ row }">
                          <el-image :src="row.bank.logo" style="width: 28px; height: 28px; display: inline-block;vertical-align: middle;"></el-image>
                          <span style="display: inline-block;line-height: 28px;vertical-align: middle;">{{ row.bank.title }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column width="120" property="apy" label="APY">
                        <template slot-scope="{ row }">
                          <span>{{ formatPercentage(row.borrowAPY) }}</span>
                        </template>
                      </el-table-column>
                    </el-table>
                    <i slot="reference" class="el-icon-view"></i>
                  </el-popover>
                </div>
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
import { AaveApp } from '@/utils/banks/aave-app'
import { CompoundApp } from '@/utils/banks/compound-app'
import { CreamApp } from '@/utils/banks/cream-app'
import BankSelect from '@/components/BankSelect'
import WithdrawDialog from '@/components/selects/WithdrawDialog'
import RepayDialog from '@/components/selects/RepayDialog'

import { formatCurrency } from '@/utils/formatter'
import { createBankApp } from '@/utils/banks/factory'

import { getAccountDataOfBank } from './helper'

export default {
  asyncData({ store, params }) {
    return {
      bankName: 'all',
    }
  },
  components: {
    BankSelect,
    WithdrawDialog,
    RepayDialog
  },
  data() {
    return {
      banksList: [],
      accountData: {
        userDepositsUSD: '0.00',
        userBorrowsUSD: '0.00',
        availableBorrowsUSD: '0.00',
      },
      bankDataList: [],
      tokensInfo: {},
      deposits: [],
      borrows: [],
    }
  },
  computed: {
    totalEarnInYearUSD() {
      let _totalEarnInYearUSD = 0
      _.forEach(this.bankDataList, ({ depositsData, borrowsData }) => {
        _.forEach(depositsData, ({ userEarnUSDInYear }) => {
          _totalEarnInYearUSD += +userEarnUSDInYear
        })
        // _.forEach(borrowsData, ({ userEarnUSDInYear }) => {
        //   _totalEarnInYearUSD -= +userEarnUSDInYear
        // })
      })
      return _totalEarnInYearUSD
    },
    userDepositAPY() {
      const { userDepositsUSD } = this.accountData
      return +userDepositsUSD ? this.totalEarnInYearUSD / +userDepositsUSD : ''
    },
    dailyEarnUSD() {
      return this.totalEarnInYearUSD / 365
    },
  },
  mounted() {
    this.banksList = _.map(['aave', 'compound', 'cream'], (bankName) => createBankApp(bankName, this.$wallet))
    this.getBanksData()
  },
  methods: {
    formatCurrency,
    getAccountDataOfBank,
    async getBanksData() {
      const promiseList = _.map(this.banksList, (bank) => {
        return this.getAccountDataOfBank(bank)
      })
      this.bankDataList = await Promise.all(promiseList)
      this.updateBankData()
    },
    updateBankData() {
      let deposits = []
      let borrows = []
      _.forEach(this.bankDataList, ({ bank, depositsData, borrowsData }) => {
        _.forEach(depositsData, ({ asset, userDeposits = '0.00', depositAPY = '0', priceUSD = '0.00', userDepositsUSD = '0.00', userEarnUSDInYear = '0.00' }) => {
          // 遍历资产列表，获取资产信息
          if (!this.tokensInfo.hasOwnProperty(asset)) {
            this.tokensInfo[asset] = this.$store.getters['tokens/getToken'](asset) || {}
          }
          // 更新资产数据
          let currentAsset = _.find(deposits, { asset })
          if (currentAsset) {
            currentAsset.userDeposits = (+currentAsset.userDeposits + +userDeposits).toString()
            currentAsset.userDepositsUSD = (+currentAsset.userDepositsUSD + +userDepositsUSD).toString()
            currentAsset.depositAPYList.push({ bank, depositAPY })
            currentAsset.userEarnUSDInYear = (+currentAsset.userEarnUSDInYear + +userEarnUSDInYear).toString()
            currentAsset.depositAPY = +currentAsset.userDepositsUSD > 0 ? (+currentAsset.userEarnUSDInYear / +currentAsset.userDepositsUSD).toString() : '0'
          } else {
            deposits.push({
              asset,
              userDeposits,
              userDepositsUSD,
              userEarnUSDInYear,
              depositAPY, // 当前 APY，用于加权平均
              depositAPYList: [{ bank, depositAPY }],
            })
          }
        })
        _.forEach(borrowsData, ({ asset, userBorrows = '0.00', borrowAPY = '0', priceUSD = '0.00', userBorrowsUSD = '0.00', userEarnUSDInYear = '0.00' }) => {
          if (!this.tokensInfo.hasOwnProperty(asset)) {
            this.tokensInfo[asset] = this.$store.getters['tokens/getToken'](asset) || {}
          }
          // 更新资产数据
          let currentAsset = _.find(borrows, { asset })
          if (currentAsset) {
            currentAsset.userBorrows = (+currentAsset.userBorrows + +userBorrows).toString()
            currentAsset.userBorrowsUSD = (+currentAsset.userBorrowsUSD + +userBorrowsUSD).toString()
            currentAsset.borrowAPYList.push({ bank, borrowAPY })
            currentAsset.userEarnUSDInYear = (+currentAsset.userEarnUSDInYear + +userEarnUSDInYear).toString()
            currentAsset.borrowAPY = +currentAsset.userBorrowsUSD > 0 ? (+currentAsset.userEarnUSDInYear / +currentAsset.userBorrowsUSD).toString() : '0'
          } else {
            borrows.push({
              asset,
              userBorrows,
              userBorrowsUSD,
              userEarnUSDInYear,
              borrowAPY,
              borrowAPYList: [{ bank, borrowAPY }]
            })
          }
        })
      })
      this.deposits = deposits
      this.borrows = borrows
    },
    formatPercentage(val) {
      return (+val * 100).toFixed(2) + '%'
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
  padding: 20px;
  height: 200px;
  background-color: $color-bg-page;
  box-shadow: 0 0 0 1px $color-border;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
}
.card__title {
  font-size: 16px;
  font-weight: 400;
  line-height: 1;
  margin-bottom: 18px;
  color: $color-text-light;
}
.card__value {
  font-size: 28px;
  line-height: 1;
  font-weight: 500;
  margin-bottom: 8px;
}
/deep/ {
  .el-card {
    background-color: $color-bg-page;
    box-shadow: 0 0 0 1px $color-border;
    border-radius: 0;
  }
  .el-table__empty-block {
    display: none;
  }
  .el-table__body {
    color: $color-text;
  }
  .el-table th, .el-table tr {
    background-color: $color-bg-page;
  }
  .el-table--border th, .el-table--border td {
    // border-right-color: $color-border;
  }
  .el-table th.is-leaf, .el-table td {
    border-bottom-color: $color-border;
  }
  .el-progress-bar__outer {
    background-color: #DFE2E8;
  }
}
.asset-info {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  color: $color-text;
  img {
    width: 40px;
    display: block;
    margin-right: 10px;
  }
  .asset-name {
    font-size: 0.8em;
    // opacity: 0.75;
    color: $color-text-light;
    line-height: 1;
  }
}
.asset-value-to-usd {
  color: $color-text-light;
}
.card__row {
  width: 100%;
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

.table-card {
  padding: 20px;
  width: 100%;
  background-color: $color-bg-page;
  box-shadow: 0 0 0 1px $color-border;
}
</style>
