<template>
  <el-dialog
    class="dialog-style-to-fix" :title="`Add Owner`"
    width="640px" top="10vh" :fullscreen="false" :append-to-body="true" :modal-append-to-body="true"
    :close-on-click-modal="false" :close-on-press-escape="false"
    :visible.sync="isVisible" @open="onDialogOpen" @close="onDialogClose"
  > 
    <div v-loading="pending">
      <div class="hints">Review the owner you want to replace from the active proxy wallet. Then specify the new owner you want to replace it with:</div>

      <el-form :model="form" :rules="formRules" label-position="top">
        <!-- <el-form-item label="Owner Name">
          <el-input v-model="form.name" placeholder="Owner name"></el-input>
        </el-form-item> -->
        <el-form-item label="New owner address" prop="address">
          <el-input v-model="form.address" placeholder="Owner address" @blur="handleChangeNewOwner"></el-input>
        </el-form-item>
        <el-form-item label="Any transaction requires the confirmation of">
          <el-input-number v-model="form.threshold" :min="1" :max="maxThreshold" :step="1" step-strictly @change="handleEstimateGas"></el-input-number> out of {{ maxThreshold }} owner(s)
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submit">Submit</el-button>
        </el-form-item>
      </el-form>
    </div>
  </el-dialog>
</template>

<script>
import { ethers } from 'ethers'
import { copyToClipboard } from '@/utils/copy'
import { prepareParamsForExecTransaction } from '@/utils/rush/index.ts'

export default {
  name: 'AddOwnerDialog',
  props: {
    visible: {
      type: Boolean,
      required: true
    },
    proxyInstance: Object,
  },
  data() {
    const checkAddress = async (rule, value, callback) => {
      if (!value) {
        callback(new Error('Address is required'))
      } else if (typeof value !== 'string') {
        callback(new Error('Invalid format of address'))
      } else if (!ethers.utils.isAddress(value)) {
        callback(new Error('Invalid address'))
      } else {
        callback()
      }
    }
    return {
      isVisible: this.visible,
      step: 1,
      pending: false,
      form: {
        name: '',
        address: '',
        threshold: 1,
      },
      currThreshold: 0,

      formRules: {
        address: [
          { validator: checkAddress, trigger: 'blur' }
        ],
        threshold: [
          { required: true, type: Number, trigger: 'change'}
        ]
      },
      estimatedGas: 0,
    }
  },
  computed: {
    maxThreshold() {
      const isValidOwner = ethers.utils.isAddress(this.form.address)
      return isValidOwner ? this.currThreshold + 1 : this.currThreshold
    }
  },
  mounted() {
    this.getThreshold()
  },
  methods: {
    copyToClipboard,
    async onDialogOpen() {
      this.$emit('open')
      this.$emit('update:visible', true)
    },
    onDialogClose() {
      this.form = {
        name: '',
        address: '',
      }
      this.$emit('close')
      this.$emit('update:visible', false)
    },
    async getThreshold() {
      try {
        const threshold = await this.proxyInstance.getThreshold()
        this.currThreshold = +threshold
        this.form.threshold = this.currThreshold
      } catch (error) {
        this.$message.error('Getting threshold failed')
      }
    },
    async checkNewOwnerExisted() {
      const isOwner = await this.proxyInstance.isOwner(this.form.address)
      return isOwner
    },
    async handleChangeNewOwner() {
      this.handleEstimateGas()
    },
    getTxParams() {
      const { address, threshold } = this.form
      if (!address || !threshold) return null
      const functionParams = {
        address,
        threshold: threshold.toString()
      }

      const senderAddress = this.$wallet.getAddress()
      const targetContractAddress = this.proxyInstance.address
      const targetContractABI = [
        "function addOwnerWithThreshold(address owner, uint256 _threshold) public"
      ]
      const functionName = 'addOwnerWithThreshold'
      return prepareParamsForExecTransaction({
        senderAddress,              // senderAddress
        targetContractAddress,      // targetContractAddress
        targetContractABI,          // targetContractABI
        functionName,               // functionName
        functionParams              // functionParams
      })
    },
    async handleEstimateGas() {
      const { address, threshold } = this.form
      if (!address || !threshold) return
      try {
        const params = this.getTxParams()
        const estimatedGas = await this.proxyInstance.estimateGas.execTransaction(...params)
        this.estimatedGas = estimatedGas
        console.log('@@@ estimatedGas', estimatedGas)
      } catch (error) {
        console.log(error)
      }
    },
    async submit() {
      try {
        this.pending = true
        const isOwner = await this.checkNewOwnerExisted()
        if (!!isOwner) {
          this.$message.error('Address already introduced, please check it')
          this.pending = false
          return
        }
        const { address, threshold } = this.form
        if (!address || !threshold) {
          this.$message.error('New owner and threshold are required')
        }
        const params = this.getTxParams()
        if (!params) return
        // console.log('estimateGas', await this.proxyInstance.estimateGas.execTransaction(...params))
        await this.proxyInstance.execTransaction(...params).then(this.$wallet.waitForTx)
        this.handleSuccess()
      } catch (error) {
        console.log(error)
        this.$message.error(JSON.stringify(error))
      }
      this.pending = false
    },
    handleSuccess() {
      this.$emit('success')
      this.isVisible = false
    }
  }
}
</script>

<style lang="scss" scoped>
.dialog__title {
  width: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: baseline;
  > span {
    font-size: 14px;
    font-weight: normal;
    opacity: 0.5;
    line-height: 20px;
    margin-left: 20px;
  }
}
.hints {
  margin-bottom: 20px;
}
</style>