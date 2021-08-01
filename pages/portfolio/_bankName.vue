<template>
  <div>
    <div class="page--borrow">
      <el-form>
        <el-form-item>
          <bank-select :value="bankName" @change="changeBankRoute"/>
        </el-form-item>
      </el-form>
    </div>

    <!-- <div class="bank-data">
      <el-row :gutter="20">
        <el-col :span="8">
          <div class="bank-data-card">
            <div class="card__title">Available Credit</div>
            <div class="card__value">{{ formatCurrency(+accountData.userBorrowsUSD + +accountData.availableBorrowsUSD) }}</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="bank-data-card">
            <div class="card__title">Total Debt</div>
            <div class="card__value">{{ formatCurrency(accountData.userBorrowsUSD) }}</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="bank-data-card">
            <div class="card__title">Credit Limit</div>
            <div class="card__value">{{ formatCurrency(accountData.availableBorrowsUSD) }}</div>
          </div>
        </el-col>
      </el-row>
    </div> -->

    <div class="bank-data-card">
      <el-row :gutter="20">
        <el-col :span="12">
          <div class="card__child">
            <div class="card__row">
              <div class="data-item">
                <div class="data-item__label">Value locked in bank</div>
                <div class="data-item__value text-larger">{{ formatCurrency(+accountData.userBorrowsUSD + +accountData.availableBorrowsUSD) }}</div>
              </div>
            </div>
            <div class="card__row">
              <el-row :gutter="20">
                <el-col :span="12">
                  <div class="data-item">
                    <div class="data-item__label">Daily earning</div>
                    <div class="data-item__value">{{ formatCurrency(dailyEarnUSD) }}</div>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="data-item">
                    <div class="data-item__label">APY</div>
                    <div class="data-item__value">{{ formatPercentage(bankDepositAPY) }}</div>
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
                    <div class="data-item__label">Total credit</div>
                    <div class="data-item__value">{{ formatCurrency(totalCredit) }}</div>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="data-item">
                    <div class="data-item__label">Total borrows</div>
                    <div class="data-item__value">{{ formatCurrency(+accountData.userBorrowsUSD) }}</div>
                  </div>
                </el-col>
              </el-row>
            </div>
            <div class="card__row">
              <div class="data-item">
                <div class="data-item__label">
                  <span>Utilization</span> <span class="utilization-tag" :class="{'is-danger': isDanger}">{{ isDanger ? 'Safe' : 'Danger' }}: {{ safetyPrecentage }}%</span>
                </div>
                <div class="data-item__value">
                  <div class="utilization-progress-bar">
                    <el-progress
                      :stroke-width="16"
                      stroke-linecap="square"
                      :show-text="false"
                      :percentage="safetyPrecentage"
                      :color="customColors"></el-progress>
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
      <el-table :data="deposits" border>
        <el-table-column label="Asset">
          <div slot-scope="{ row }" class="asset-info">
            <img :src="row.info.logoURI">
            <!-- <div class="asset-icon" :style="{backgroundImage: `url(${row.info.logoURI})`}"></div> -->
            <div><div>{{ row.info.symbol }}</div><div class="asset-name">{{ row.info.name }}</div></div>
          </div>
        </el-table-column>
        <el-table-column label="Supplying">
          <template slot-scope="{ row }">
            <div>{{ row.userDeposits }} {{ row.info.symbol }}</div>
            <div class="asset-value-to-usd">{{ formatCurrency((+row.userDeposits) * (+row.priceUSD)) }}</div>
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
            <el-button type="success" size="mini" round @click="() => onWithdraw(row.info)">Withdraw</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <div style="margin-top: 1em;"></div>
    <el-card header="Borrows" shadow="never" :body-style="{'padding':0, 'marginBottom':'-1px'}">
      <h2 slot="header">Borrows</h2>
      <el-table :data="borrows" border>
        <el-table-column label="Asset">
          <div slot-scope="{ row }" class="asset-info">
            <img :src="row.info.logoURI">
            <div><div>{{ row.info.symbol }}</div><div class="asset-name">{{ row.info.name }}</div></div>
          </div>
        </el-table-column>
        <el-table-column label="Borrowing">
          <template slot-scope="{ row }">
            <div>{{ row.userBorrows }} {{ row.info.symbol }}</div>
            <div>{{ formatCurrency((+row.userBorrows) * (+row.priceUSD)) }}</div>
          </template>
        </el-table-column>
        <el-table-column></el-table-column>
        <el-table-column label="APY" width="160">
          <template slot-scope="{ row }">{{ formatPercentage(row.borrowAPY) }}</template>
        </el-table-column>
        <el-table-column label="Action" width="200" align="center">
          <template slot-scope="{ row }">
            <el-button type="primary" size="mini" round @click="() => onRepay(row.info)">Repay</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <withdraw-dialog
      v-if="bankApp && withdrawDialogVisible"
      :visible.sync="withdrawDialogVisible"
      :bank-app="bankApp"
      :underlying-token-data="withdrawAssetTokenData"
    />
    <repay-dialog
      v-if="bankApp && repayDialogVisible"
      :visible.sync="repayDialogVisible"
      :bank-app="bankApp"
      :underlying-token-data="repayAssetTokenData"
    />
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

export default {
  asyncData({ store, params }) {
    return {
      bankName: params.bankName,
    }
  },
  components: {
    BankSelect,
    WithdrawDialog,
    RepayDialog
  },
  data() {
    const bankName = this.$route.params.bankName
    const { app, title, logo } = createBankApp(bankName, this.$wallet)
    return {
      currentChain: "Ethereum",
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
      customColors: [
        {color: '#0cb444', percentage: 80},
        {color: '#e74c3c', percentage: 100},
      ],
      withdrawDialogVisible: false,
      withdrawAssetTokenData: null,
      repayDialogVisible: false,
      repayAssetTokenData: null,
    }
  },
  computed: {
    totalCredit() {
      const { userBorrowsUSD, availableBorrowsUSD } = this.accountData
      return +userBorrowsUSD + +availableBorrowsUSD
    },
    safetyPrecentage() {
      const { userBorrowsUSD } = this.accountData
      return this.totalCredit > 0 ? +((+userBorrowsUSD * 100 / this.totalCredit).toFixed(2)) : 0
    },
    isDanger() {
      return this.safetyPrecentage <= 80
    },
    totalEarnInYearUSD() {
      const _totalEarnInYearUSD = _.sumBy(this.deposits, ({ userDeposits, priceUSD, depositAPY }) => {
        return +userDeposits * +priceUSD * +depositAPY
      })
      return _totalEarnInYearUSD
    },
    bankDepositAPY() {
      const { userDepositsUSD } = this.accountData
      return +userDepositsUSD ? this.totalEarnInYearUSD / +userDepositsUSD : ''
    },
    dailyEarnUSD() {
      return this.totalEarnInYearUSD / 365
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
    },
    changeBankRoute(bankName) {
      this.$router.push(`/portfolio/${bankName}`)
    },
    onWithdraw(tokenData) {
      this.withdrawAssetTokenData = {...tokenData}
      this.withdrawDialogVisible = true
    },
    onRepay(tokenData) {
      this.repayAssetTokenData = {...tokenData}
      this.repayDialogVisible = true
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
