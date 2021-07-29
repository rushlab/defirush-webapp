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
            :disabled="!+balanceDisplay || !underlyingAssetDecimals">
            <div slot="append" v-if="underlyingAssetSymbol">{{ underlyingAssetSymbol }}</div>
          </el-input>
          <div class="balance-hint">Available: <strong class="balance__value">{{ balanceDisplay }} {{ underlyingAssetSymbol }}</strong></div>
        </el-form-item>
        <el-form-item>
          <el-slider
            :step="4" :marks="marks"
            v-model="form.amountSlideValue"
            :disabled="!+balanceDisplay || !underlyingAssetDecimals"></el-slider>
        </el-form-item>
      </el-form>
      <div class="dialog__hints">
        <p class="hints-title">You Will</p>
        <ul>
          <li>Withdraw {{ form.amountDisplay }} {{ underlyingAssetSymbol }}(≈ $-)</li>
          <li>Lock - ETH for liquidation reserve</li>
          <li>Pay - ETH for borrow fee</li>
        </ul>
      </div>
    </div>
    <div slot="footer" class="dialog-footer">
      <button class="footer__btn" v-if="needApprove" type="warning" @click="handleApprove">Approve</button>
      <button class="footer__btn" v-else type="primary" @click="handleDeposit" :loading="isWithdrawing">{{ isWithdrawing ? 'Withdrawing' : 'Withdraw' }}</button>
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
      return +this.balanceDisplay > 0 ? (+this.form.amountDisplay / +this.balanceDisplay) * 100 : 0
    },
    needApprove() {
      if (this.isETH) return false
      return +this.allowanceDisplay < +this.form.amountDisplay
    }
  },
  watch: {
    visible(newVal, oldValue) {
      this.isVisible = newVal
    },
    'form.amountSlideValue': {
      handler(newVal) {
        this.form.amountDisplay = (+this.balanceDisplay) * newVal / 100
      }
    }
  },
  mounted() {
    this.getAccountAndAssetData()
    this.updateAllowanceDisplay()
    this.getBalanceDisplay()
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
        this.isWithdrawing = true
        await this.bankApp.withdraw(this.underlyingTokenData.address, this.form.amountDisplay)
        this.$message({type: 'success', message: '存款成功!'})
        this.handleDepositSuccess()
      } catch (error) {
        console.log('handleDeposit error: ', error)
        this.$message.error(JSON.stringify(error))
      }
      this.isWithdrawing = false
    },
    handleDepositSuccess() {
      this.$emit('success')
      this.isVisible = false
    }
  }
}
</script>


<style lang="scss" scoped>
@import "./-Dialog.scss";
</style>
