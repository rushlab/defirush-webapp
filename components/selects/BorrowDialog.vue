<template>
  <el-dialog class="dialog--borrow" title="Borrow"
    width="500px" top="10vh" :fullscreen="false" :append-to-body="true" :modal-append-to-body="true"
    :visible.sync="isVisible" @open="onDialogOpen" @close="onDialogClose">
    <div class="dialog__inner">
      <el-form :model="form" v-loading="isApproving">
        <el-form-item>
          <div class="input-hint">How much collateral do you want to borrow?</div>
          <el-input
            class="dialog-input"
            v-model="form.amountDisplay"
            @input="onInputAmountDisplay"
            :disabled="!+availableBorrowsDisplay || !underlyingAssetDecimals">
            <div slot="append">{{ underlyingAssetSymbol }}</div>
          </el-input>
          <div class="balance-hint">Available: <strong class="balance__value">{{ availableBorrowsDisplay }} {{ underlyingAssetSymbol }}</strong></div>
        </el-form-item>
        <el-form-item>
          <el-slider
            :step="4" :marks="marks"
            v-model="form.amountSlideValue"
            :disabled="!+availableBorrowsDisplay || !underlyingAssetDecimals"></el-slider>
        </el-form-item>
      </el-form>
      <div class="dialog__hints">
        <h3>You Will</h3>
        <ul>
          <li>Borrow {{ form.amountDisplay }} {{ underlyingAssetSymbol }}(≈ $-)</li>
        </ul>
      </div>
    </div>
    <div slot="footer" class="dialog-footer">
      <button class="footer__btn" v-if="needApprove" @click="handleApprove">APPROVE</button>
      <button class="footer__btn" v-else @click="handleBorrow" :loading="isBorrowing">{{ isBorrowing   ? 'BORROWING' : 'BORROW' }}</button>
    </div>
  </el-dialog>
</template>

<script>
import _ from 'lodash'
import { mapState, mapGetters } from 'vuex'
import { ethers } from 'ethers'

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
    },
    availableBorrowsDisplay: {
      type: [String, Number],
      default: '0'
    }
  },
  data() {
    const validationAmount = (rule, value, callback) => {
      if (!value || !+value || +value < 0) {
        callback(new Error('Amount is required'))
      } else if (value > this.availableBorrowsDisplay) {
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
      allowanceMantissa: ethers.constants.Zero,
      isBorrowing  : false
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
      return +this.availableBorrowsDisplay > 0 ? (+this.form.amountDisplay / +this.availableBorrowsDisplay) * 100 : 0
    },
    needApprove() {
      return false
    }
  },
  watch: {
    visible(newVal, oldValue) {
      this.isVisible = newVal
    },
    'form.amountSlideValue': {
      handler(newVal) {
        this.form.amountDisplay = (+this.availableBorrowsDisplay / 100 * newVal).toString()
      }
    }
  },
  mounted() {
    this.updateAllowanceMantissa()
  },
  methods: {
    async onDialogOpen() {
      this.$emit('open')
      this.$emit('update:visible', true)
    },
    async updateAllowanceMantissa() {
      if (this.isETH) return
      this.allowanceMantissa = await this.bankApp.underlyingAllowance(this.underlyingTokenData.address)
      console.log('@@@ this.allowanceMantissa', this.allowanceMantissa)
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
@import "@/assets/stylesheets/variables.scss";

.input-hint {
  font-size: 16px;
}
.balance-hint {
  display: block;
  text-align: right;
  line-height: 20px;
  margin: 5px 0 10px;
  color: #777E90;
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
    color: #3ACB6E;
  }
  .el-input-group--append .el-input__inner {
    border-right: none;
  }
  .el-input-group__append {
    background-color: transparent;
    border-left: none;
    font-size: 15px;
  }
}
/deep/ .el-input.dialog-input  {
  .el-input__inner {
    height: 72px;
    line-height: 72px;
    font-size: 20px;
  }
}
.dialog__hints {
  padding: 0;
  margin-top: 60px;
  h3 {
    font-size: 18px;
  }
  ul {
    padding-left: 20px;
    margin-top: 10px;
  }
  li {
    line-height: 1.7;
  }
}
.dialog-footer {
  height: 80px;
  // border-top: 1px solid $color-border;
}
.footer__btn {
  display: block;
  height: 80px;
  width: 100%;
  background-color: transparent;
  line-height: 40px;
  padding: 20px;
  text-align: center;
  outline: none;
  appearance: none;
  border: none;
  position: relative;
  cursor: pointer;
  font-size: 28px;
  font-weight: 400;
  text-transform: uppercase;
  &:hover,
  &:active {
    // background-color: orange;
    opacity: 0.7;
  }
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    border-top: 1px solid $color-border;
  }
}
</style>
