<template>
  <el-dialog class="dialog-style-to-fix" :title="`Repay ${bankData.title} debt`"
    width="500px" top="10vh" :fullscreen="false" :append-to-body="true" :modal-append-to-body="true"
    :close-on-click-modal="false" :close-on-press-escape="false"
    :visible.sync="isVisible" @open="onDialogOpen" @close="onDialogClose"
  >
    <div v-loading="pending || isApproving || isRepaying">
      <el-form :model="form">
        <el-form-item>
          <div class="input-hint">
            <span>Wallet balance:&nbsp;</span><span class="collateral-value">{{ balanceDisplay }} {{ underlyingTokenData.symbol }}</span>
          </div>
          <div class="input-hint">How much collateral do you want to repay?</div>
          <el-input
            class="dialog-input"
            v-model="form.amountDisplay"
            @input="onInputAmountDisplay"
            :disabled="pending || !+amountMaxDisplay">
            <div slot="append">{{ underlyingTokenData.symbol }}</div>
          </el-input>
          <div class="balance-hint">Borrows: <strong>{{ amountMaxDisplay }} {{ underlyingTokenData.symbol }}</strong></div>
        </el-form-item>
        <el-form-item>
          <el-slider
            :step="4" :marks="marks"
            :show-tooltip="false"
            v-model="form.amountSlideValue"
            @change="onChangeSlideValue"
            :disabled="pending || !+amountMaxDisplay"></el-slider>
        </el-form-item>
      </el-form>
      <div class="dialog__hints">
        <p class="hints-title">You Will</p>
        <ul>
          <li>Repay {{ form.amountDisplay }} {{ underlyingTokenData.symbol }}(≈ {{ formatCurrency(amountToUSD) }})</li>
          <li>Credit $20000 of borrow limit(待计算)</li>
        </ul>
      </div>
    </div>
    <div slot="footer" class="call-to-action">
      <el-button
        v-if="needApprove"
        type="dark" @click="handleApprove"
        :loading="isApproving" :disabled="pending || isApproving || !+form.amountDisplay"
      >Approve</el-button>
      <el-button
        v-else
        type="dark" @click="handleRepay"
        :loading="isRepaying" :disabled="pending || isRepaying || !+form.amountDisplay"
      >Repay</el-button>
    </div>
  </el-dialog>
</template>

<script>
import _ from 'lodash'
import { mapState, mapGetters } from 'vuex'
import { ethers } from 'ethers'
import { formatCurrency, safeToFixed, toNumberOrZero } from '@/utils/formatter'

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
      value = toNumberOrZero(value)
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
    isETH() {
      return this.$wallet.isETH(this.underlyingTokenData.address)
    },
    amountPrecentage() {
      return toNumberOrZero(this.balanceDisplay) > 0 ? (toNumberOrZero(this.form.amountDisplay) / toNumberOrZero(this.balanceDisplay)) * 100 : 0
    },
    needApprove() {
      if (this.isETH) return false
      return toNumberOrZero(this.allowanceDisplay) < toNumberOrZero(this.form.amountDisplay)
    },
    amountToUSD() {
      const { priceUSD = 0 } = this.assetData
      return (toNumberOrZero(this.form.amountDisplay) * toNumberOrZero(priceUSD)).toString()
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
    toNumberOrZero,
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
        this.$message.error(error.message || error.toString())
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
      const re = new RegExp(`(\\d+\\.\\d{${this.underlyingTokenData.decimals}})(\\d+)`)
      const amountDisplay = val.replace(re, '$1')
      this.form.amountDisplay = amountDisplay
      this._updatePrecentageFromAmount()
    },
    _updatePrecentageFromAmount() {
      this.form.amountSlideValue = toNumberOrZero(this.amountMaxDisplay) > 0 ? (toNumberOrZero(this.form.amountDisplay) / toNumberOrZero(this.amountMaxDisplay)) * 100 : 0
    },
    onChangeSlideValue() {
      this._updateAmountFromPrecentage()
    },
    _updateAmountFromPrecentage() {
      const res = (toNumberOrZero(this.amountMaxDisplay)) * parseInt(this.form.amountSlideValue) / 100
      this.form.amountDisplay = safeToFixed(res, this.underlyingTokenData.decimals)
    },
    async handleApprove() {
      try {
        this.isApproving = true
        await this.bankApp.approveUnderlying(this.underlyingTokenData.address, this.form.amountDisplay)
        await this.updateAllowanceDisplay()
      } catch (error) {
        console.log('handleApprove error: ', error)
        this.$message.error(error.message || error.toString())
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
        this.$message.error(error.message || error.toString())
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
