<template>
  <div>
    <bank-select :value="bankName" @change="changeBankRoute"/>
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
                  <span>Utilization </span>
                  <el-tooltip
                    effect="dark" placement="top"
                    content="The ratio of your debt to your credit limit. If it hits 100%, your loan will be liquidated."
                  ><i class="el-icon-question"></i></el-tooltip>
                  <span
                    class="utilization-tag" :class="{'is-danger': isDanger}"
                  >{{ isDanger ? 'Danger' : 'Safe' }}: {{ formatPercentage(utilization) }}</span>
                </div>
                <div class="data-item__value">
                  <div class="utilization-progress-bar">
                    <el-progress
                      :stroke-width="16"
                      stroke-linecap="square"
                      :show-text="false"
                      :percentage="utilization * 100"
                      :color="progressCustomColors"
                    ></el-progress>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div style="margin-top: 1em;"></div>

    <el-card header="Deposits" shadow="never" :body-style="{'padding':0}">
      <h2 slot="header">Collateral</h2>
      <el-table
        :data="depositsTableData" v-loading="!!pending"
        empty-text="No collateral positions" class="no-bottom-border"
        element-loading-spinner="el-icon-loading"
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
        <el-table-column label="CF" width="80" align="center">
          <div class="table-column-label" slot="header">
            <span>CF </span>
            <el-tooltip effect="dark" content="Collateral factor" placement="top">
              <i class="el-icon-question"></i>
            </el-tooltip>
          </div>
          <template slot-scope="{ row }">-</template>
        </el-table-column>
        <el-table-column label="APY" width="160" align="center">
          <template slot-scope="{ row }">{{ formatPercentage(row.depositAPY) }}</template>
        </el-table-column>
        <el-table-column label="Supplying" align="right">
          <template slot-scope="{ row }">
            <div>{{ row.userDeposits }} {{ row.underlyingToken.symbol }}</div>
            <div class="cell-text-light">{{ formatCurrency(row.userDepositsUSD) }}</div>
          </template>
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
    <el-card header="Debts" shadow="never" :body-style="{'padding':0}">
      <h2 slot="header">Debts</h2>
      <el-table
        :data="borrowsTableData" v-loading="!!pending"
        empty-text="No debt positions" class="no-bottom-border"
        element-loading-spinner="el-icon-loading"
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
        <el-table-column label="" width="80" align="center"></el-table-column>
        <el-table-column label="APY" width="160" align="center">
          <template slot-scope="{ row }">{{ formatPercentage(row.borrowAPY) }}</template>
        </el-table-column>
        <el-table-column label="Borrowing" align="right">
          <template slot-scope="{ row }">
            <div>{{ row.userBorrows }} {{ row.underlyingToken.symbol }}</div>
            <div class="cell-text-light">{{ formatCurrency(row.userBorrowsUSD) }}</div>
          </template>
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
      :bank-data="bank"
      :bank-app="bank.app"
      :underlying-token-data="withdrawDialog.underlyingToken"
      @success="fetchData"
    ></withdraw-dialog>
    <repay-dialog
      v-if="bank && repayDialog.visible"
      :visible.sync="repayDialog.visible"
      :bank-data="bank"
      :bank-app="bank.app"
      :underlying-token-data="repayDialog.underlyingToken"
      @success="fetchData"
    ></repay-dialog>
  </div>
</template>

<script>
import _ from 'lodash'
import { mapState } from 'vuex'
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
      },
      pending: false
    }
  },
  computed: {
    ...mapState('auth', ['isSignerAlive']),
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
      return this.utilization > 0.8
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
      this.pending = true
      this.bankPortfolio = await getBankPortfolio(this.bank)
      this.pending = false
    },
    changeBankRoute(bankName) {
      this.$router.push(`/portfolio/${bankName}`)
    },
    onWithdraw(underlyingToken) {
      if (!this.isSignerAlive) {
        this.$alert('Cannot handle asset deposit without connecting to wallet, please connect your wallet first!', 'Notice', {
          confirmButtonText: 'OK',
          callback: action => {}
        })
      } else {
        this.withdrawDialog = {
          underlyingToken: { ...underlyingToken },
          visible: true,
        }
      }
    },
    onRepay(tokenData) {
      if (!this.isSignerAlive) {
        this.$alert('Cannot handle asset deposit without connecting to wallet, please connect your wallet first!', 'Notice', {
          confirmButtonText: 'OK',
          callback: action => {}
        })
      } else {
        this.repayDialog = {
          underlyingToken: { ...tokenData },
          visible: true,
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/stylesheets/variables.scss';
.bank-data-card {
  padding: 20px;
  height: 200px;
  background-color: $--background-color-base;
  box-shadow: 0 0 0 1px $--border-color-base;
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
  .el-loading-spinner {
    margin-top: 0;
    transform: translateY(-50%);
  }
  .el-loading-spinner i {
    color: $--color-text-primary;
  }
  .el-icon-question:hover {
    color: $--color-text-primary;
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
  background-color: $--color-success;
  border-radius: 4px;
  &.is-danger {
    background-color: $--color-danger;
  }
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
    color: #ffffff;
    border-left: 1px solid;
    padding-left: 5px;
  }
}
.utilization-hint {
  font-size: 14px;
  color: $--color-text-regular;
  margin-top: 10px;
}
</style>
