<template>
  <el-dialog class="dialog--borrow" title="Borrow"
    width="500px" top="10vh" :fullscreen="false" :append-to-body="true" :modal-append-to-body="true"
    :visible.sync="isVisible" @open="onDialogOpen" @close="onDialogClose">
    <div class="dialog__inner" v-loading="isApproving || isBorrowing" element-loading-background="rgba(0, 0, 0, 0)">
      <el-form :model="form">
        <el-form-item>
          <div class="collateral-info">
            <span class="collateral-label">Current Debt:&nbsp;</span><span class="collateral-value">{{ formatCurrency(currentDebtUSD) }}</span>
          </div>
          <div class="collateral-info">
            <span class="collateral-label">Current Collateral Ratio:&nbsp;</span><span class="collateral-value">{{ collateralRatio }}</span>
          </div>

          <div class="input-hint">How much collateral do you want to borrow?</div>
          <el-input
            class="dialog-input"
            v-model="form.amountDisplay"
            @input="onInputAmountDisplay"
            :disabled="!+amountMaxDisplay || !underlyingAssetDecimals">
            <div slot="append">{{ underlyingAssetSymbol }}</div>
          </el-input>
          <!-- <div class="balance-hint">Available: <strong class="balance__value">{{ amountMaxDisplay }} {{ underlyingAssetSymbol }}</strong></div> -->
          <div class="balance-hint">Borrow Rate: <strong class="balance__value">{{ formatPercentage(assetData.borrowAPY) }}</strong></div>
        </el-form-item>
        <el-form-item>
          <el-slider
            :step="4" :marks="marks"
            :show-tooltip="false"
            v-model="form.amountSlideValue"
            @change="onChangeSlideValue"
            :disabled="!+amountMaxDisplay || !underlyingAssetDecimals"></el-slider>
        </el-form-item>
      </el-form>
      <div class="dialog__hints">
        <h3>You Will</h3>
        <ul>
          <li>Borrow {{ form.amountDisplay }} {{ underlyingAssetSymbol }} (≈ {{ formatCurrency(amountToUSD) }})</li>
          <li>Increate current debt to {{ formatCurrency(increasedTotalDebetUSD) }} USD</li>
          <li>Decrease collateral ratio to {{ updatedCollateralRatio }}</li>
        </ul>
      </div>
    </div>
    <div slot="footer" class="dialog-footer">
      <button class="footer__btn" v-if="needApprove" @click="handleApprove">Approve</button>
      <button class="footer__btn" v-else @click="handleBorrow" :loading="isBorrowing">{{ isBorrowing   ? 'Borrowing' : 'Borrow' }}</button>
    </div>
  </el-dialog>
</template>

<script>
import _ from 'lodash'
import { mapState, mapGetters } from 'vuex'
import { ethers } from 'ethers'
import { formatCurrency } from '@/utils/formatter'

export default {
  name: 'BorrowDialog',
  props: {
    visible: {
      type: Boolean,
      required: true
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
  data() {
    const validationAmount = (rule, value, callback) => {
      if (!value || !+value || +value < 0) {
        callback(new Error('Amount is required'))
      } else if (value > this.amountMaxDisplay) {
        callback(new Error('The maximum balance was exceeded'))
      } else {
        callback()
      }
    }
    return {
      isVisible: this.visible,
      isApproving: false,
      marks: {
        0: '0%',
        25: '25%',
        50: '50%',
        75: '75%',
        100: 'MAX',
      },
      form: {
        amountDisplay: '0',
        amountSlideValue: 0,
      },
      formRules: {
        amountDisplay: [
          { validator: validationAmount, trigger: 'blur' }
        ]
      },
      accountData: {},
      assetData: {},
      accountAssetData: {},

      userBorrowsDisplay: 0,
      priceUSD: 0,
      allowanceMantissa: ethers.constants.Zero,
      isBorrowing: false
    }
  },
  computed: {
    underlyingAssetSymbol() {
      return this.underlyingTokenData ? this.underlyingTokenData.symbol : ''
    },
    underlyingAssetDecimals() {
      return _.get(this.underlyingTokenData, 'decimals')
    },
    isETH() {
      return _.get(this.underlyingTokenData, 'address', '').toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()
    },
    availableBorrowsDisplay() {
      const { availableBorrowsUSD = 0 } = this.accountData
      const { priceUSD = 0 } = this.assetData
      return priceUSD == 0 ? '-' : (+availableBorrowsUSD / +priceUSD).toString()
    },
    amountMaxDisplay() {
      return this.availableBorrowsDisplay
    },
    needApprove() {
      return false
    },
    currentDebtUSD() {
      return _.get(this.accountData, 'userBorrowsUSD', 0)
    },
    collateralRatio() {
      const { userBorrowsUSD = 0, userDepositsUSD = 0} = this.accountData
      return userBorrowsUSD == 0 ? '-' : ((+userDepositsUSD / +userBorrowsUSD * 100).toFixed(2) + '%')
    },
    amountToUSD() {
      const { priceUSD = 0 } = this.assetData
      return (+this.form.amountDisplay * +priceUSD).toString()
    },
    increasedTotalDebetUSD() {
      return +this.currentDebtUSD + +this.amountToUSD
    },
    updatedCollateralRatio() {
      const { userDepositsUSD = 0} = this.accountData
      return this.increasedTotalDebetUSD == 0 ? '-' : ((+userDepositsUSD / +this.increasedTotalDebetUSD * 100).toFixed(2) + '%')
    }
  },
  watch: {
    visible(newVal, oldValue) {
      this.isVisible = newVal
    },
  },
  mounted() {
    this.getAccountAndAssetData()
    this.updateAllowanceMantissa()
  },
  methods: {
    formatCurrency,
    formatPercentage(val) {
      return (+val * 100).toFixed(2) + '%'
    },
    async onDialogOpen() {
      this.$emit('open')
      this.$emit('update:visible', true)
    },
    async getAccountAndAssetData() {
      const underlyingToken = this.underlyingTokenData.address
      const [
        accountData, assetData, accountAssetData
      ] = await Promise.all([
        this.bankApp.getAccountData(),  // 获取当前可借贷余额 availableBorrowsUSD
        this.bankApp.getAssetData(underlyingToken),  // 获取 underlyingToken priceUSD
        this.bankApp.getAccountAssetData(underlyingToken),
      ])
      this.accountData = accountData
      this.assetData = assetData
      this.accountAssetData = accountAssetData
    },
    async updateAllowanceMantissa() {
      if (this.isETH) return
      this.allowanceMantissa = await this.bankApp.underlyingAllowance(this.underlyingTokenData.address)
    },
    onDialogClose() {
      this.form.amountDisplay = ''
      this.$emit('close')
      this.$emit('update:visible', false)
    },
    onInputAmountDisplay(val) {
      const re = new RegExp(`(\\d+\\.\\d{${this.underlyingAssetDecimals}})(\\d+)`)
      const amountDisplay = val.replace(re, '$1')
      this.form.amountDisplay = amountDisplay
      this._updatePrecentageFromAmount()
    },
    _updatePrecentageFromAmount() {
      this.form.amountSlideValue = +this.amountMaxDisplay > 0 ? (+this.form.amountDisplay / +this.amountMaxDisplay) * 100 : 0
    },
    onChangeSlideValue() {
      this._updateAmountFromPrecentage()
    },
    _updateAmountFromPrecentage() {
      this.form.amountDisplay = (+this.amountMaxDisplay) * +this.form.amountSlideValue / 100
    },
    async handleApprove() {
      try {
        this.isApproving = true
        await this.bankApp.approveUnderlying(this.underlyingTokenData.address, this.form.amountDisplay)
        await this.updateAllowanceMantissa()
      } catch (error) {
        console.log('handleApprove error: ', error)
        this.$message.error(JSON.stringify(error))
      }
      this.isApproving = false
    },
    async handleBorrow() {
      try {
        this.isBorrowing   = true
        await this.bankApp.borrow(this.underlyingTokenData.address, this.form.amountDisplay)
        this.$message({type: 'success', message: '借款成功!'})
        this.handleBorrowSuccess()
      } catch (error) {
        console.log('handleBorrow error: ', error)
        this.$message.error(JSON.stringify(error))
      }
      this.isBorrowing   = false
    },
    handleBorrowSuccess() {
      this.$emit('success')
      this.isVisible = false
    }
  }
}
</script>


<style lang="scss" scoped>
@import "./-Dialog.scss";
.collateral-info {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  font-size: 16px;
  font-weight: 400;
  line-height: 20px;
  margin-bottom: 25px;
  &:first-child {
    margin-bottom: 8px;
  }
}
.collateral-label {
  color: $color-text-light;
}
.collateral-value {
  color: $color-text;
}
</style>
