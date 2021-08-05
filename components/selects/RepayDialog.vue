<template>
  <el-dialog class="dialog-style-to-fix" :title="`Repay ${bankData.title} debt`"
    width="500px" top="10vh" :fullscreen="false" :append-to-body="true" :modal-append-to-body="true"
    :close-on-click-modal="false" :close-on-press-escape="false"
    :visible.sync="isVisible" @open="onDialogOpen" @close="onDialogClose">
    <div class="dialog__inner" v-loading="pending || isApproving || isRepaying"
  >
      <el-form :model="form">
        <el-form-item>
          <div class="input-hint">
            <span>Wallet balance:&nbsp;</span><span class="collateral-value">{{ balanceDisplay }} {{ underlyingAssetSymbol }}</span>
          </div>
          <div class="input-hint">How much collateral do you want to repay?</div>
          <el-input
            class="dialog-input"
            v-model="form.amountDisplay"
            @input="onInputAmountDisplay"
            :disabled="pending || !+amountMaxDisplay || !underlyingAssetDecimals">
            <div slot="append">{{ underlyingAssetSymbol }}</div>
          </el-input>
          <div class="balance-hint">Borrows: <strong>{{ amountMaxDisplay }} {{ underlyingAssetSymbol }}</strong></div>
        </el-form-item>
        <el-form-item>
          <el-slider
            :step="4" :marks="marks"
            :show-tooltip="false"
            v-model="form.amountSlideValue"
            @change="onChangeSlideValue"
            :disabled="pending || !+amountMaxDisplay || !underlyingAssetDecimals"></el-slider>
        </el-form-item>
      </el-form>
      <div class="dialog__hints">
        <p class="hints-title">You Will</p>
        <ul>
          <li>Repay {{ form.amountDisplay }} {{ underlyingAssetSymbol }}(≈ {{ formatCurrency(amountToUSD) }})</li>
          <li>Credit $20000 of borrow limit(待计算)</li>
        </ul>
      </div>
    </div>
    <div slot="footer">
      <el-button
        v-if="needApprove"
        :loading="isApproving"
        :disabled="pending || isApproving || !+form.amountDisplay"
        @click="handleApprove">Approve</el-button>
      <el-button
        v-else
        :loading="isRepaying"
        :disabled="pending || isRepaying || !+form.amountDisplay"
        @click="handleRepay">Repay</el-button>
    </div>
  </el-dialog>
</template>

<script>
import _ from 'lodash'
import { mapState, mapGetters } from 'vuex'
import { ethers } from 'ethers'
import { formatCurrency, safeToFixed, stringToNumber } from '@/utils/formatter'

export default {
  name: 'RepayDialog',
  props: {
    visible: {
      type: Boolean,
      required: true
    },
    bankData: {
      type: Object,
      default: () => ({ title: '' })
    },
    bankApp: {
      type: Object,
      required: true
    },
    underlyingTokenData: {
      type: Object,
      required: true
    }
  },
  data() {
    const validationAmount = (rule, value, callback) => {
      value = stringToNumber(value)
      if (!value || value < 0) {
        callback(new Error('Amount is required'))
      } else if (value > this.balanceDisplay) {
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
      balanceDisplay: '0.00',
      pending: false,
      isRepaying: false
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
      return stringToNumber(this.balanceDisplay) > 0 ? (stringToNumber(this.form.amountDisplay) / stringToNumber(this.balanceDisplay)) * 100 : 0
    },
    needApprove() {
      if (this.isETH) return false
      return stringToNumber(this.allowanceDisplay) < stringToNumber(this.form.amountDisplay)
    },
    amountToUSD() {
      const { priceUSD = 0 } = this.assetData
      return (stringToNumber(this.form.amountDisplay) * stringToNumber(priceUSD)).toString()
    },
    amountMaxDisplay() {
      // 显示最大值为： 用户借贷的数量
      return _.get(this.accountAssetData, 'userBorrows') || 0
    },
  },
  watch: {
    visible(newVal, oldValue) {
      this.isVisible = newVal
    },
  },
  mounted() {
    this.getDialogData()
  },
  methods: {
    formatCurrency,
    stringToNumber,
    async onDialogOpen() {
      this.$emit('open')
      this.$emit('update:visible', true)
    },
    async getDialogData() {
      try {
        this.pending = true
        await Promise.all([
          this.getAccountAndAssetData(),
          this.updateAllowanceDisplay(),
          this.getBalanceDisplay()
        ])
      } catch (error) {
        this.$message.error(JSON.stringify(error))
      }
      this.pending = false
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
    async getBalanceDisplay() {
      if (this.isETH) {
        this.balanceDisplay = await this.$wallet.getBalance()
      } else {
        const { address } = this.underlyingTokenData
        this.balanceDisplay = await this.$wallet.getBalance(address)
      }
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
      this.form.amountSlideValue = stringToNumber(this.amountMaxDisplay) > 0 ? (stringToNumber(this.form.amountDisplay) / stringToNumber(this.amountMaxDisplay)) * 100 : 0
    },
    onChangeSlideValue() {
      this._updateAmountFromPrecentage()
    },
    _updateAmountFromPrecentage() {
      const res = (stringToNumber(this.amountMaxDisplay)) * parseInt(this.form.amountSlideValue) / 100
      this.form.amountDisplay = safeToFixed(res, this.underlyingAssetDecimals)
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
    async handleRepay() {
      try {
        this.isRepaying = true
        await this.bankApp.repay(this.underlyingTokenData.address, this.form.amountDisplay)
        this.$message({type: 'success', message: 'Repay succeed!'})
        this.handleRepaySuccess()
      } catch (error) {
        console.log('handleRepay error: ', error)
        this.$message.error(JSON.stringify(error))
      }
      this.isRepaying = false
    },
    handleRepaySuccess() {
      this.$emit('success')
      this.isVisible = false
    }
  }
}
</script>


<style lang="scss" scoped>
</style>
