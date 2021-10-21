<template>
  <el-dialog
    class="dialog-style-to-fix" :title="`Remove Owner`"
    width="640px" top="10vh" :fullscreen="false" :append-to-body="true" :modal-append-to-body="true"
    :close-on-click-modal="false" :close-on-press-escape="false"
    :visible.sync="isVisible" @open="onDialogOpen" @close="onDialogClose"
  > 
    <div v-loading="pending">
      <div class="hints">Review the owner you want to remove from the active Proxy:</div>

      <!-- <div class="current-owner">
        <span>{{ ownerAddress }} </span>
        <el-tooltip class="item" effect="dark" content="Click to copy" placement="top">
          <a href="javascript: void(0);" @click="() => copyToClipboard(ownerAddress)"><i class="el-icon-copy-document" ></i></a>
        </el-tooltip>
      </div> -->
      <el-form :model="form" label-position="top">
        <el-form-item label="Owner will be removed" prop="address">
          <el-input :value="ownerAddress" readonly></el-input>
        </el-form-item>
        <el-form-item label="Any transaction requires the confirmation of">
          <el-input-number v-model="form.threshold" :min="1" :max="maxThreshold" :step="1" step-strictly @change="handleEstimateGas"></el-input-number> out of {{ maxThreshold }} owner(s)
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submit">Remove</el-button>
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
  name: 'RemoveOwnerDialog',
  props: {
    visible: {
      type: Boolean,
      required: true
    },
    proxyInstance: Object,
    ownerAddress: String
  },
  data() {
    return {
      isVisible: this.visible,
      pending: false,
      form: {
        threshold: 1,
      },
      owners: [],
      currThreshold: 0,
      estimatedGas: 0,
    }
  },
  computed: {
    ownerCount() {
      return this.owners.length
    },
    maxThreshold() {
      return this.ownerCount - 1
    }
  },
  mounted() {
    this.getThreshold()
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
        threshold: null
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
      const isOwner = await this.proxyInstance.isOwner(this.ownerAddress)
      return isOwner
    },
    getTxParams() {
      const { threshold } = this.form
      const ownerAddress = this.ownerAddress
      const owners = this.owners
      if (!ownerAddress || !threshold || !owners || owners.length === 0) return null
      const index = owners.indexOf(ownerAddress)
      if (index < 0) return null
      const Address0x1 = '0x0000000000000000000000000000000000000001'
      const prevOwner = index === 0 ? Address0x1 : owners[index - 1]
      console.log(index, prevOwner)
      const functionParams = {
        prevOwner,
        owner: ownerAddress,
        threshold: threshold.toString()
      }
      console.log('@@@ functionParams', functionParams)
      const senderAddress = this.$wallet.getAddress()
      const targetContractAddress = this.proxyInstance.address
      const targetContractABI = [
        "function removeOwner(address prevOwner, address owner, uint256 _threshold) public"
      ]
      const functionName = 'removeOwner'
      return prepareParamsForExecTransaction({
        senderAddress,              // senderAddress
        targetContractAddress,      // targetContractAddress
        targetContractABI,          // targetContractABI
        functionName,               // functionName
        functionParams              // functionParams
      })
    },
    async handleEstimateGas() {
      try {
        const params = this.getTxParams()
        if (!params) return
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
        if (!isOwner) {
          this.$message.error('Current owner is not valid, please check it')
          this.pending = false
          return
        }
        const { threshold } = this.form
        if (!threshold) {
          this.$message.error('Threshold are required')
        }
        const params = this.getTxParams()
        if (!params) return
        console.log('estimateGas', await this.proxyInstance.estimateGas.execTransaction(...params))
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