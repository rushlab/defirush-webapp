<template>
  <el-dialog class="dialog--withdraw" title="Withdraw"
    width="500px" top="10vh" :fullscreen="false" :append-to-body="true" :modal-append-to-body="true"
    :visible.sync="isVisible" @open="onDialogOpen" @close="onDialogClose">
    <div class="dialog__inner" v-loading="isApproving || isWithdrawing" element-loading-background="rgba(0, 0, 0, 0)">
      <el-form :model="form">
        <el-form-item>
          <div class="input-hint">How much collateral do you want to widthdraw?</div>
          <el-input
            class="dialog-input"
            v-model="form.amountDisplay"
            @input="onInputAmountDisplay"
            :disabled="!+amountMaxDisplay || !underlyingAssetDecimals">
            <div slot="append" v-if="underlyingAssetSymbol">{{ underlyingAssetSymbol }}</div>
          </el-input>
          <div class="balance-hint">Available: <strong class="balance__value">{{ amountMaxDisplay }} {{ underlyingAssetSymbol }}</strong></div>
        </el-form-item>
        <el-form-item class="form__slider">
          <el-slider
            :step="4" :marks="marks"
            :show-tooltip="false"
            v-model="form.amountSlideValue"
            @change="onChangeSlideValue"
            :disabled="!+amountMaxDisplay || !underlyingAssetDecimals"></el-slider>
        </el-form-item>
      </el-form>
      <div class="dialog__hints">
        <p class="hints-title">You Will</p>
        <ul>
          <li>Withdraw {{ form.amountDisplay }} {{ underlyingAssetSymbol }}(≈ {{ formatCurrency(amountToUSD) }})</li>
          <li>Lock - ETH for liquidation reserve</li>
          <li>Pay - ETH for borrow fee</li>
        </ul>
      </div>
    </div>
    <div slot="footer" class="dialog-footer">
      <button class="footer__btn" v-if="needApprove" type="warning" @click="handleApprove">Approve</button>
      <button class="footer__btn" v-else type="primary" @click="handleWithdraw" :loading="isWithdrawing">{{ isWithdrawing ? 'Withdrawing' : 'Withdraw' }}</button>
    </div>
  </el-dialog>
</template>

<script>
import _ from 'lodash'
import { mapState, mapGetters } from 'vuex'
import { ethers } from 'ethers'
import { formatCurrency } from '@/utils/formatter'

export default {
  name: 'WithdrawDialog',
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
      assetData: {},
      accountData: {},
      accountAssetData: {},
      allowanceDisplay: '0.00',
      // balanceDisplay: '0.00',
      isWithdrawing: false
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
    amountPrecentage() {
      return +this.amountMaxDisplay > 0 ? (+this.form.amountDisplay / +this.amountMaxDisplay) * 100 : 0
    },
    needApprove() {
      return false
      // if (this.isETH) return false
      // return +this.allowanceDisplay < +this.form.amountDisplay
    },
    amountToUSD() {
      const { priceUSD = 0 } = this.assetData
      return (+this.form.amountDisplay * +priceUSD).toString()
    },
    amountMaxDisplay() {
      return _.get(this.accountAssetData, 'userDeposits') || 0
    }
  },
  watch: {
    visible(newVal, oldValue) {
      this.isVisible = newVal
    },
  },
  mounted() {
    this.getAccountAndAssetData()
    this.updateAllowanceDisplay()
    // this.getBalanceDisplay()
  },
  methods: {
    formatCurrency,
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
    async updateAllowanceDisplay() {
      if (this.isETH) return
      this.allowanceDisplay = await this.bankApp.underlyingAllowance(this.underlyingTokenData.address)
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
        await this.updateAllowanceDisplay()
      } catch (error) {
        console.log('handleApprove error: ', error)
        this.$message.error(JSON.stringify(error))
      }
      this.isApproving = false
    },
    async handleWithdraw() {
      try {
        this.isWithdrawing = true
        await this.bankApp.withdraw(this.underlyingTokenData.address, this.form.amountDisplay)
        this.$message({type: 'success', message: 'Success!'})
        this.handleWithdrawSuccess()
      } catch (error) {
        console.log('handleWithdraw error: ', error)
        this.$message.error(JSON.stringify(error))
      }
      this.isWithdrawing = false
    },
    handleWithdrawSuccess() {
      this.$emit('success')
      this.isVisible = false
    }
  }
}
</script>


<style lang="scss" scoped>
@import "./-Dialog.scss";
</style>
