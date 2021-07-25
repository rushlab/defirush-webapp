<template>
  <el-dialog class="dialog--deposit" title="Deposit"
    width="500px" top="5vh" :fullscreen="false" :append-to-body="true" :modal-append-to-body="true"
    :visible.sync="isVisible" @open="onDialogOpen" @close="onDialogClose">
    <div class="dialog__inner">
      <el-form :model="form" v-loading="isApproving">
        <el-form-item>
          <small>How much collateral do you want to deposit?</small>
          <el-input
            v-model="form.amountDisplay"
            @input="onInputAmountDisplay"
            :disabled="!+balanceDisplay || !underlyingAssetDecimals">
            <div slot="append">{{ underlyingAssetSymbol }}</div>
          </el-input>
          <small class="balance-hint">Available: <span class="balance__value">{{ balanceDisplay }} {{ underlyingAssetSymbol }}</span></small>
        </el-form-item>
        <el-form-item>
          <el-slider
            :step="4" :marks="marks"
            v-model="form.amountSlideValue"
            :disabled="!+balanceDisplay || !underlyingAssetDecimals"></el-slider>
        </el-form-item>
      </el-form>
      <div class="dialog__hints">
        <h3>You Will</h3>
        <ul>
          <li>Deposit {{ balanceDisplay }} {{ underlyingAssetSymbol }}(≈ $-)</li>
          <li>Lock - ETH for liquidation reserve</li>
          <li>Pay - ETH for borrow fee</li>
        </ul>
      </div>
    </div>
    <div slot="footer" class="dialog-footer">
      <el-button v-if="needApprove" type="warning" @click="handleApprove">Approve</el-button>
      <el-button v-else type="primary" @click="handleDeposit" :loading="isDepositing">{{ isDepositing ? 'Depositing' : 'Deposit' }}</el-button>
    </div>
  </el-dialog>
</template>

<script>
import _ from 'lodash'
import { mapState, mapGetters } from 'vuex'
import { ethers } from 'ethers'

export default {
  name: 'DepositDialog',
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
      allowanceDisplay: '0.00',
      balanceDisplay: '0.00',
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
    this.updateAllowanceDisplay()
    this.getBalanceDisplay()
  },
  methods: {
    async onDialogOpen() {
      this.$emit('open')
      this.$emit('update:visible', true)
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
        this.isDepositing = true
        await this.bankApp.deposit(this.underlyingTokenData.address, this.form.amountDisplay)
        this.$message({type: 'success', message: '存款成功!'})
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

.balance-hint {
  display: block;
  text-align: right;
  line-height: 20px;
  margin: 5px 0 10px;
}
/deep/ {
  .el-form-item {
    margin-bottom: 10px;
  }
  .el-slider__marks-text {
    // width: 38px;
    text-align: center;
  }
  .el-slider__marks-text:first-child {
    left: 11px !important;
    width: 22px;
  }
  .el-slider__marks-text:last-child {
    width: 32px;
    left: auto !important;
    right: -16px !important;
  }
}
.dialog__hints {
  padding: 20px;
  font-size: 0.8em;
}
</style>
