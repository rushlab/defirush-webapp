<template>
  <el-dialog
    class="dialog-style-to-fix" :title="`Deposit to ${bankData.title}`"
    width="500px" top="10vh" :fullscreen="false" :append-to-body="true" :modal-append-to-body="true"
    :close-on-click-modal="false" :close-on-press-escape="false"
    :visible.sync="isVisible" @open="onDialogOpen" @close="onDialogClose"
  >
    <div class="dialog__inner" v-loading="pending || isApproving || isDepositing">
      <el-form :model="form">
        <el-form-item>
          <div class="input-hint">How much collateral do you want to deposit?</div>
          <el-input
            class="dialog-input"
            v-model="form.amountDisplay"
            @input="onInputAmountDisplay"
            :disabled="pending || !+amountMaxDisplay || !underlyingAssetDecimals">
            <div slot="append">{{ underlyingAssetSymbol }}</div>
          </el-input>
          <div class="balance-hint">Wallet balance: <strong>{{ amountMaxDisplay }} {{ underlyingAssetSymbol }}</strong></div>
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
          <li>Deposit {{ form.amountDisplay }} {{ underlyingAssetSymbol }}(≈ {{ formatCurrency(amountToUSD) }})</li>
          <!-- <li>Credit $20000 of borrow limit(待计算)</li> -->
        </ul>
      </div>
    </div>
    <div slot="footer">
      <el-button
        v-if="!underlyingEnabled"
        :loading="isEnabling"
        :disabled="pending || isEnabling"
        @click="enableUnderlying">Enable Underlying</el-button>
      <el-button
        v-else-if="needApprove"
        :loading="isApproving"
        :disabled="pending || isApproving || !+form.amountDisplay"
        @click="handleApprove">Approve</el-button>
      <el-button
        v-else
        :loading="isDepositing"
        :disabled="pending || isDepositing || !+form.amountDisplay"
        @click="handleDeposit" >Deposit</el-button>
    </div>
  </el-dialog>
</template>

<script>
import _ from 'lodash'
import { mapState, mapGetters } from 'vuex'
import { ethers } from 'ethers'
import { formatCurrency, safeToFixed, stringToNumber } from '@/utils/formatter'

export default {
  name: 'DepositDialog',
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
      } else if (value > this.amountMaxDisplay) {
        callback(new Error('The maximum balance was exceeded'))
      } else {
        callback()
      }
    }
    return {
      isVisible: this.visible,
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
      underlyingEnabled: false,
      pending: false,
      isEnabling: false,
      isApproving: false,
      isDepositing: false
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
    needApprove() {
      if (this.isETH) return false
      return stringToNumber(this.allowanceDisplay) < stringToNumber(this.form.amountDisplay)
    },
    amountToUSD() {
      const { priceUSD = 0 } = this.assetData
      return (stringToNumber(this.form.amountDisplay) * stringToNumber(priceUSD)).toString()
    },
    amountMaxDisplay() {
      return this.balanceDisplay
    }
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
          this.checkUnderlyingEnabled(),
          this.updateAllowanceDisplay(),
          this.getBalanceDisplay(),
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
    async checkUnderlyingEnabled() {
      this.underlyingEnabled = await this.bankApp.underlyingEnabled(this.underlyingTokenData.address)
    },
    async enableUnderlying() {
      try {
        this.isEnabling = true
        await this.bankApp.enableUnderlying(this.underlyingTokenData.address)
        this.checkUnderlyingEnabled()
      } catch (error) {
        console.log(error)
        this.$message.error(JSON.stringify(error))
      }
      this.isEnabling = false
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
      this.form.amountDisplay = val.replace(re, '$1')
      this._updatePrecentageFromAmount()
    },
    _updatePrecentageFromAmount() {
      const amountMaxDisplay = stringToNumber(this.amountMaxDisplay)
      const amountDisplay = stringToNumber(this.form.amountDisplay)
      this.form.amountSlideValue = amountMaxDisplay > 0 ? (amountDisplay / amountMaxDisplay) * 100 : 0
    },
    onChangeSlideValue() {
      this._updateAmountFromPrecentage()
    },
    _updateAmountFromPrecentage() {
      const res = stringToNumber(this.amountMaxDisplay) * parseInt(this.form.amountSlideValue) / 100
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
    async handleDeposit() {
      try {
        this.isDepositing = true
        await this.bankApp.deposit(this.underlyingTokenData.address, this.form.amountDisplay)
        this.$message({type: 'success', message: 'Deposit action succeed!'})
        this.handleDepositSuccess()
      } catch (error) {
        console.log('handleDeposit error: ', error)
        this.$message.error(JSON.stringify(error))
      }
      this.isDepositing = false
    },
    handleDepositSuccess() {
      this.$emit('success')
      this.isVisible = false
    }
  }
}
</script>


<style lang="scss" scoped>
</style>
