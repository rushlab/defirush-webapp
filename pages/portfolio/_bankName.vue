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
      <el-row :gutter="20">
        <el-col :span="12">
          <div class="card__child">
            <div class="card__row">
              <div class="data-item">
                <div class="data-item__label">Value locked in bank</div>
                <div class="data-item__value text-larger">{{ formatCurrency(userDepositsUSD) }}</div>
              </div>
            </div>
            <div class="card__row">
              <el-row :gutter="20">
                <el-col :span="12">
                  <div class="data-item">
                    <div class="data-item__label">Daily earning</div>
                    <div class="data-item__value">{{ formatCurrency(averageDailyEarnUSD) }}</div>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="data-item">
                    <div class="data-item__label">APY</div>
                    <div class="data-item__value">{{ formatPercentage(averageDepositAPY) }}</div>
                  </div>
                </el-col>
              </el-row>
            </div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="card__child">
            <div class="card__row">
              <el-row :gutter="20">
                <el-col :span="12">
                  <div class="data-item">
                    <div class="data-item__label">Borrow limit</div>
                    <div class="data-item__value">{{ formatCurrency(userBorrowLimitUSD) }}</div>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="data-item">
                    <div class="data-item__label">Total borrows</div>
                    <div class="data-item__value">{{ formatCurrency(userBorrowsUSD) }}</div>
                  </div>
                </el-col>
              </el-row>
            </div>
            <div class="card__row">
              <div class="data-item">
                <div class="data-item__label">
                  <span>Utilization</span> <span class="utilization-tag" :class="{'is-danger': isDanger}">{{ isDanger ? 'Safe' : 'Danger' }}: {{ formatPercentage(utilization) }}</span>
                </div>
                <div class="data-item__value">
                  <div class="utilization-progress-bar">
                    <el-progress
                      :stroke-width="16"
                      stroke-linecap="square"
                      :show-text="false"
                      :percentage="utilization * 100"
                      :color="progressCustomColors"></el-progress>
                  </div>
                  <div class="utilization-hint">The ratio of your debt to your credit limit. If it hits 100%, your loan will be liquidated.</div>
                </div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div style="margin-top: 1em;"></div>

    <el-card header="Deposits" shadow="never" :body-style="{'padding':0, 'marginBottom':'-1px'}">
      <h2 slot="header">Collateral</h2>
      <el-table :data="depositsTableData">
        <el-table-column label="Asset">
          <div slot-scope="{ row }" class="asset-info">
            <img :src="row.underlyingToken.logoURI">
            <!-- <div class="asset-icon" :style="{backgroundImage: `url(${row.info.logoURI})`}"></div> -->
            <div>
              <div>{{ row.underlyingToken.symbol }}</div>
              <div class="asset-name">{{ row.underlyingToken.name }}</div>
            </div>
          </div>
        </el-table-column>
        <el-table-column label="Supplying">
          <template slot-scope="{ row }">
            <div>{{ row.userDeposits }} {{ row.underlyingToken.symbol }}</div>
            <div class="asset-value-to-usd">{{ formatCurrency(row.userDepositsUSD) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="CF">
          <template slot-scope="{ row }">-</template>
        </el-table-column>
        <el-table-column label="APY" width="160">
          <div class="table-column-label" slot="header">
            <span>APY</span><!--
            --><el-tooltip effect="dark" content="Collateral factor" placement="top">
              <i class="el-icon-question"></i>
            </el-tooltip>
          </div>
          <template slot-scope="{ row }">{{ formatPercentage(row.depositAPY) }}</template>
        </el-table-column>
        <el-table-column label="Action" width="200" align="center">
          <template slot-scope="{ row }">
            <el-button
              type="success" size="mini" round
              @click="() => onWithdraw(row.underlyingToken)"
            >Withdraw</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <div style="margin-top: 1em;"></div>
    <el-card header="Borrows" shadow="never" :body-style="{'padding':0, 'marginBottom':'-1px'}">
      <h2 slot="header">Borrows</h2>
      <el-table :data="borrowsTableData">
        <el-table-column label="Asset">
          <div slot-scope="{ row }" class="asset-info">
            <img :src="row.underlyingToken.logoURI">
            <div>
              <div>{{ row.underlyingToken.symbol }}</div>
              <div class="asset-name">{{ row.underlyingToken.name }}</div>
            </div>
          </div>
        </el-table-column>
        <el-table-column label="Borrowing">
          <template slot-scope="{ row }">
            <div>{{ row.userBorrows }} {{ row.underlyingToken.symbol }}</div>
            <div>{{ formatCurrency(row.userBorrowsUSD) }}</div>
          </template>
        </el-table-column>
        <el-table-column></el-table-column>
        <el-table-column label="APY" width="160">
          <template slot-scope="{ row }">{{ formatPercentage(row.borrowAPY) }}</template>
        </el-table-column>
        <el-table-column label="Action" width="200" align="center">
          <template slot-scope="{ row }">
            <el-button
              type="primary" size="mini" round
              @click="() => onRepay(row.underlyingToken)"
            >Repay</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <withdraw-dialog
      v-if="bank && withdrawDialog.visible"
      :visible.sync="withdrawDialog.visible"
      :bank-app="bank.app"
      :underlying-token-data="withdrawDialog.underlyingToken"
    ></withdraw-dialog>
    <repay-dialog
      v-if="bank && repayDialog.visible"
      :visible.sync="repayDialog.visible"
      :bank-app="bank"
      :underlying-token-data="repayDialog.underlyingToken"
    ></repay-dialog>
  </div>
</template>

<script>
import _ from 'lodash'
import dayjs from 'dayjs'
import BankSelect from '@/components/BankSelect'
import WithdrawDialog from '@/components/selects/WithdrawDialog'
import RepayDialog from '@/components/selects/RepayDialog'

import { formatCurrency } from '@/utils/formatter'
import { createBankApp } from '@/utils/banks/factory'

import { getBankPortfolio } from './helper'

export default {
  // asyncData({ store, params }) {
  //   return {
  //     bankName: params.bankName,
  //   }
  // },
  components: {
    BankSelect,
    WithdrawDialog,
    RepayDialog,
  },
  data() {
    const bankName = this.$route.params.bankName
    const bank = createBankApp(bankName, this.$wallet)
    return {
      bankName,
      bank,
      bankPortfolio: {
        summary: {},
        depositsDict: {},  // { [asset]: assetData }
        borrowsDict: {},  // { [asset]: assetData }
      },
      progressCustomColors: [
        {color: '#0cb444', percentage: 80},
        {color: '#e74c3c', percentage: 100},
      ],
      withdrawDialog: {
        visible: false,
        underlyingToken: null,
      },
      repayDialog: {
        visible: false,
        underlyingToken: null,
      }
    }
  },
  computed: {
    userDepositsUSD() {
      const { userDepositsUSD } = this.bankPortfolio.summary
      return +userDepositsUSD
    },
    userBorrowLimitUSD() {
      const { userBorrowsUSD, availableBorrowsUSD } = this.bankPortfolio.summary
      return (+userBorrowsUSD) + (+availableBorrowsUSD)
    },
    userBorrowsUSD() {
      const { userBorrowsUSD } = this.bankPortfolio.summary
      return +userBorrowsUSD
    },
    utilization() {
      const userBorrowLimitUSD = this.userBorrowLimitUSD
      const userBorrowsUSD = this.userBorrowsUSD
      return userBorrowLimitUSD > 0 ? (userBorrowsUSD / userBorrowLimitUSD) : 0
    },
    isDanger() {
      return this.utilization <= 0.8
    },
    totalAnnualYieldUSD() {
      const depositsData = _.values(this.bankPortfolio.depositsDict)
      const depositEarn = _.sumBy(depositsData, ({ userDepositsUSD, depositAPY }) => {
        return +userDepositsUSD * (+depositAPY)
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
      const tableData = []
      _.forEach(this.bankPortfolio.depositsDict, (depositData, assetAddress) => {
        const { userDeposits, depositAPY, userDepositsUSD } = depositData
        const underlyingToken = this.getToken(assetAddress)
        tableData.push({ userDeposits, depositAPY, userDepositsUSD, underlyingToken })
      })
      return tableData
    },
    borrowsTableData() {
      const tableData = []
      _.forEach(this.bankPortfolio.borrowsDict, (borrowData, assetAddress) => {
        const { userBorrows, borrowAPY, userBorrowsUSD } = borrowData
        const underlyingToken = this.getToken(assetAddress)
        tableData.push({ userBorrows, borrowAPY, userBorrowsUSD, underlyingToken })
      })
      return tableData
    },
  },
  mounted() {
    this.fetchData()
  },
  methods: {
    formatCurrency,
    formatPercentage(val) {
      return (+val * 100).toFixed(2) + '%'
    },
    getToken(asset) {
      return this.$store.getters['tokens/getToken'](asset)
    },
    async fetchData() {
      this.bankPortfolio = await getBankPortfolio(this.bank)
    },
    changeBankRoute(bankName) {
      this.$router.push(`/portfolio/${bankName}`)
    },
    onWithdraw(underlyingToken) {
      this.withdrawDialog = {
        underlyingToken: { ...underlyingToken },
        visible: true,
      }
    },
    onRepay(tokenData) {
      this.repayDialog = {
        underlyingToken: { ...tokenData },
        visible: true,
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/stylesheets/variables.scss';
.bank-data-card {
  padding: 20px;
  height: 240px;
  background-color: $color-bg-page;
  box-shadow: 0 0 0 1px $color-border;
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
.utilization-tag {
  margin-left: 15px;
  font-size: 14px;
  color: #ffffff;
  line-height: 16px;
  height: 30px;
  padding: 7px 10px;
  background-color: rgb(12, 180, 68);
  border-radius: 4px;
}
.utilization-progress-bar {
  position: relative;
  &::after {
    content: "80% risky";
    position: absolute;
    left: 80%;
    top: 0;
    line-height: 16px;
    font-size: 12px;
    color: #777E91;
    border-left: 1px solid;
    padding-left: 5px;
  }
}
.utilization-hint {
  font-size: 14px;
  color: $color-text-light;
  margin-top: 10px;
}
.asset-icon {
  display: inline-block;
  width: 24px;
  height: 24px;
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
  clip-path: polygon(0 25%,
                     50% 0, 100% 25%,
                     100% 75%,
                     50% 100%,
                     0 75%);

}
</style>
