<template>
  <el-dialog
    class="dialog-style-to-fix" :title="`Replace Owner`"
    width="640px" top="10vh" :fullscreen="false" :append-to-body="true" :modal-append-to-body="true"
    :close-on-click-modal="false" :close-on-press-escape="false"
    :visible.sync="isVisible" @open="onDialogOpen" @close="onDialogClose"
  > 
    <div v-loading="pending">
      <div class="hints">Review the owner you want to replace from the active Safe. Then specify the new owner you want to replace it with:</div>

      <el-form :model="form" :rules="formRules" label-position="top">
        <!-- <el-form-item label="Owner Name">
          <el-input v-model="form.name" placeholder="Owner name"></el-input>
        </el-form-item> -->
        <el-form-item label="Owner will be replaced(Readonly)">
          <el-input :value="oldOwner" placeholder="Current owner" readonly></el-input>
        </el-form-item>
        <el-form-item label="New owner address" prop="address">
          <el-input v-model="form.address" placeholder="Owner address" @blur="handleChangeNewOwner"></el-input>
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
    oldOwner: String
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
      pending: false,
      form: {
        name: '',
        address: '',
      },
      owners: [],

      formRules: {
        address: [
          { validator: checkAddress, trigger: 'blur' }
        ]
      },
      estimatedGas: 0,
    }
  },
  mounted() {
    this.getOwners()
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
    async getOwners() {
      try {
        const owners = await this.proxyInstance.getOwners()
        this.owners = [ ...owners ]
      } catch (error) {
        this.$message.error('Getting owners failed')
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
      const { address: newOwner } = this.form
      const oldOwner = this.oldOwner // current owner will be replaced
      const owners = this.owners
      if (!newOwner || owners.length < 1) return null
      const index = owners.indexOf(oldOwner)
      if (index < 0) return null
      const Address0x1 = '0x0000000000000000000000000000000000000001'
      const prevOwner = index === 0 ? Address0x1 : owners[index - 1]

      const functionParams = {
        prevOwner,
        oldOwner,
        newOwner
      }

      const senderAddress = this.$wallet.getAddress()
      const targetContractAddress = this.proxyInstance.address
      const targetContractABI = [
        "function swapOwner(address prevOwner, address oldOwner, address newOwner) public"
      ]
      const functionName = 'swapOwner'
      return prepareParamsForExecTransaction({
        senderAddress,              // senderAddress
        targetContractAddress,      // targetContractAddress
        targetContractABI,          // targetContractABI
        functionName,               // functionName
        functionParams              // functionParams
      })
    },
    async handleEstimateGas() {
      const { address } = this.form
      if (!address) return
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
        const { address } = this.form
        if (!address) {
          this.$message.error('New owner is required')
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