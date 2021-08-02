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
                <img :src="row.info.logoURI">
                <div><div>{{ row.info.symbol }}</div><div class="asset-name">{{ row.info.name }}</div></div>
              </div>
            </el-table-column>
            <el-table-column label="Supplying">
              <template slot-scope="{ row }">
                <div>{{ row.userDeposits }} {{ row.info.symbol }}</div>
                <div class="asset-value-to-usd">{{ formatCurrency(row.userDepositsUSD) }}</div>
              </template>
            </el-table-column>
            <el-table-column label="APY">
              <template slot-scope="{ row }">{{ formatPercentage(row.depositAPY) }}</template>
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
                <img :src="row.info.logoURI">
                <div><div>{{ row.info.symbol }}</div><div class="asset-name">{{ row.info.name }}</div></div>
              </div>
            </el-table-column>
            <el-table-column label="Borrowing">
              <template slot-scope="{ row }">
                <div>{{ row.userBorrows }} {{ row.info.symbol }}</div>
                <div class="asset-value-to-usd">{{ formatCurrency(row.userBorrowsUSD) }}</div>
              </template>
            </el-table-column>
            <el-table-column label="APY">
              <template slot-scope="{ row }">{{ formatPercentage(row.borrowAPY) }}</template>
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
      depositsMap: {
        // [assetAddress]: {
        //   info,
        //   data: []
        // }
      },  // 存放
      borrowsMap: {}
    }
  },
  computed: {
    totalEarnInYearUSD() {
      let _totalEarnInYearUSD = 0
      _.forEach(this.depositsMap, ({ data }, address) => {
        const res = _.sumBy(data, ({depositAPY, priceUSD, userDeposits}) => {
          return +userDeposits * +priceUSD * +depositAPY
        })
        _totalEarnInYearUSD += res
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
    deposits() {
      const results = []
      _.forEach(this.depositsMap, ({ info, data = [] }) => {
        let _userDeposits = 0,
            _userDepositsUSD = 0,
            _totalEarnInYearUSD = 0
        _.forEach(data, ({ depositAPY = '0', priceUSD = '0', userDeposits = '0' }) => {
          _userDeposits += +userDeposits
          _userDepositsUSD += +userDeposits * +priceUSD
          _totalEarnInYearUSD += (+userDeposits * +priceUSD * depositAPY)
        })
        results.push({
          info,
          userDeposits: _userDeposits.toString(),
          userDepositsUSD: _userDepositsUSD.toString(),
          depositAPY: _userDepositsUSD > 0 ? (_totalEarnInYearUSD / _userDepositsUSD).toString() : '0',
        })
      })
      return results
    },
    borrows() {
      const results = []
      _.forEach(this.borrowsMap, ({ info, data = [] }) => {
        let _userBorrows = 0,
            _userBorrowsUSD = 0,
            _totalEarnInYearUSD = 0
        _.forEach(data, ({ borrowAPY = '0', priceUSD = '0', userBorrows = '0' }) => {
          _userBorrows += +userBorrows
          _userBorrowsUSD += +userBorrows * +priceUSD
          _totalEarnInYearUSD += (+userBorrows * +priceUSD * borrowAPY)
        })
        results.push({
          info,
          userBorrows: _userBorrows.toString(),
          userBorrowsUSD: _userBorrowsUSD.toString(),
          borrowAPY: _userBorrowsUSD > 0 ? (_totalEarnInYearUSD / _userBorrowsUSD).toString() : '0',
        })
      })
      return results
    }
  },
  mounted() {
    this.banksList = [{
      icon: 'https://aave.com/favicon64.png', title: 'Aave',
      app: new AaveApp(this.$wallet)
    }, {
      icon: 'https://compound.finance/compound-components/assets/compound-mark.svg', title: 'Compound',
      app: new CompoundApp(this.$wallet)
    }, {
      icon: 'https://app.cream.finance/static/media/cream.29138554.svg', title: 'Cream',
      app: new CreamApp(this.$wallet)
    }]
    this.getAccountDataFromBanks()
  },
  methods: {
    formatCurrency,
    getAccountDataFromBanks() {
      const promiseList = this.banksList.map(({app}) => {
        return app.getAccountData()
      })
      return Promise.all(promiseList).then(resList => {
        let _userDepositsUSD = 0
        let _userBorrowsUSD = 0
        let _availableBorrowsUSD = 0
        _.forEach(resList, ({ userDepositsUSD, userBorrowsUSD, availableBorrowsUSD }) => {
          _userDepositsUSD += +userDepositsUSD
          _userBorrowsUSD += +userBorrowsUSD
          _availableBorrowsUSD += +availableBorrowsUSD
        })
        this.accountData = {
          userDepositsUSD: _userDepositsUSD.toString(),
          userBorrowsUSD: _userBorrowsUSD.toString(),
          availableBorrowsUSD: _availableBorrowsUSD.toString(),
        }
        this.getAccountAssetsFromBanks()
      })
    },
    async _getCollateralFromOneBank(bankApp) {
      const { deposits, borrows } = await bankApp.getAccountAssets()   // 1. 获取单个银行的资产列表；
      const depositsPromiseList = _.map(deposits, (asset) => {
        const info = this.$store.getters['tokens/getToken'](asset)
        if (!this.depositsMap.hasOwnProperty(asset)) {
          this.depositsMap = {
            ...this.depositsMap,
            [asset]: { info, data: [] }
          }
        }
        return Promise.all([
          bankApp.getAssetData(asset),                        // 2. 遍历存款列表，获取每个资产的 depositAPY 和 priceUSD
          bankApp.getAccountAssetData(asset)                  // 3. getAccountAssetData() 获取 用户的存款数量 userDeposits
        ]).then(resList => {
          const [ { depositAPY, borrowAPY, priceUSD }, { userDeposits, userBorrows } ] = resList
          const _depositsObj = { ...this.depositsMap[asset] }
          _depositsObj.data.push({
            depositAPY,
            priceUSD,
            userDeposits
          })
          this.depositsMap = {
            ...this.depositsMap,
            [asset]: _depositsObj
          }
        })
      })
      const borrowsPromiseList = _.map(borrows, (asset) => {
        const info = this.$store.getters['tokens/getToken'](asset)
        if (!this.borrowsMap.hasOwnProperty(asset)) {
          this.borrowsMap = {
            ...this.borrowsMap,
            [asset]: { info, data: [] }
          }
        }
        return Promise.all([
          bankApp.getAssetData(asset),                        // 2. 遍历存款列表，获取每个资产的 depositAPY 和 priceUSD
          bankApp.getAccountAssetData(asset)                  // 3. getAccountAssetData() 获取 用户的存款数量 userDeposits
        ]).then(resList => {
          const [ { depositAPY, borrowAPY, priceUSD }, { userDeposits, userBorrows } ] = resList
          const _borrowsObj = { ...this.borrowsMap[asset] }
          _borrowsObj.data.push({
            borrowAPY,
            priceUSD,
            userBorrows
          })
          this.borrowsMap = {
            ...this.borrowsMap,
            [asset]: _borrowsObj
          }
        })
      })
      return [
        ...depositsPromiseList,
        ...borrowsPromiseList
      ]
    },
    async getAccountAssetsFromBanks() {
      const promiseList = []
      _.forEach(this.banksList, ({app}) => {
        promiseList.push(this._getCollateralFromOneBank(app))
      })
      await Promise.all(promiseList)
      // this.depositsMap = {
      //   ...this.depositsMap
      // }
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
