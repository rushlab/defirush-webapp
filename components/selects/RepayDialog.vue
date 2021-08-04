<template>
  <el-dialog class="dialog--repay" title="Repay"
    width="500px" top="10vh" :fullscreen="false" :append-to-body="true" :modal-append-to-body="true"
    :close-on-click-modal="false" :close-on-press-escape="false"
    :visible.sync="isVisible" @open="onDialogOpen" @close="onDialogClose">
    <div class="dialog__inner" v-loading="pending || isApproving || isRepaying" element-loading-background="rgba(0, 0, 0, 0)">
      <el-form :model="form">
        <el-form-item>
          <div class="input-hint">How much collateral do you want to repay?</div>
          <el-input
            class="dialog-input"
            v-model="form.amountDisplay"
            @input="onInputAmountDisplay"
            :disabled="!+amountMaxDisplay || !underlyingAssetDecimals">
            <div slot="append">{{ underlyingAssetSymbol }}</div>
          </el-input>
          <div class="balance-hint">Borrows: <strong class="balance__value">{{ amountMaxDisplay }} {{ underlyingAssetSymbol }}</strong></div>
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
        <p class="hints-title">You Will</p>
        <ul>
          <li>Repay {{ form.amountDisplay }} {{ underlyingAssetSymbol }}(≈ {{ formatCurrency(amountToUSD) }})</li>
          <li>Credit $20000 of borrow limit(待计算)</li>
        </ul>
      </div>
    </div>
    <div slot="footer" class="dialog-footer">
      <el-button
        v-if="needApprove"
        type="primary"
        class="footer__btn"
        :loading="isApproving"
        :disabled="pending || isApproving"
        @click="handleApprove">Approve</el-button>
      <el-button
        v-else
        type="primary"
        class="footer__btn"
        :loading="isRepaying"
        :disabled="pending || isRepaying"
        @click="handleRepay">Repay</el-button>
    </div>
  </el-dialog>
</template>

<script>
import _ from 'lodash'
import { mapState, mapGetters } from 'vuex'
import { ethers } from 'ethers'
import { formatCurrency } from '@/utils/formatter'

export default {
  name: 'RepayDialog',
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
      return +this.balanceDisplay > 0 ? (+this.form.amountDisplay / +this.balanceDisplay) * 100 : 0
    },
    needApprove() {
      if (this.isETH) return false
      return +this.allowanceDisplay < +this.form.amountDisplay
    },
    amountToUSD() {
      const { priceUSD = 0 } = this.assetData
      return (+this.form.amountDisplay * +priceUSD).toString()
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
    async onDialogOpen() {
      this.$emit('open')
      this.$emit('update:visible', true)
    },
    async getDialogData() {
      try {
        this.pending = true
        await Promise.all([
          this.getAccountAndAssetData(),
          this.updateAllowanceDisplay()
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
    // async getBalanceDisplay() {
    //   if (this.isETH) {
    //     this.balanceDisplay = await this.$wallet.getBalance()
    //   } else {
    //     const { address } = this.underlyingTokenData
    //     this.balanceDisplay = await this.$wallet.getBalance(address)
    //   }
    // },
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
@import '~/assets/stylesheets/components/dialog.scss';
</style>
