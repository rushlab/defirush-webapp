<template>
  <div class="interaction-function">
    <h3>{{ name }}</h3>
    <el-form :data="formData" label-position="top">
      <el-form-item
        v-for="(field, index) in formData"
        :key="name + '-' + index + '-'+ field.name"
        :label="`${field.name || `<input>`} (${field.type})`">
        <el-input v-model="field.value"></el-input>
      </el-form-item>
      <el-form-item v-if="!isConstactFunction">
        <el-button v-if="functionItem.stateMutability === 'view'" type="primary" :disabled="disabled" :loading="!!pending" @click="execQuery">Query</el-button>
        <el-button v-else type="primary" :disabled="disabled" :loading="!!pending" @click="execFunction">Write</el-button>
      </el-form-item>
      <el-form-item v-if="result" :label="`result`">
        <el-input :value="result" readonly></el-input>
      </el-form-item>
      <!-- <div v-if="result" class="query-result" >{{ result }}</div> -->
    </el-form>
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from 'ethers'

const proxyABI = [
  'event ExecutionFailure(bytes32 txHash, uint256 payment)',
  'event ExecutionSuccess(bytes32 txHash, uint256 payment)',
  'function payETH(address to, uint256 amount)',
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)',
  'function requiredTxGas(address to, uint256 value, bytes calldata data, uint8 operation) external returns (uint256)',
  'function encodeTransactionData(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes memory)',
]

const initFormFieldsByInputs = ({ stateMutability, inputs }) => {
  const form = []
  _.forEach(inputs, ipt => {
    form.push({
      name: ipt.name,
      type: ipt.type,
      value: ''
    })
  })
  if (stateMutability === 'payable') {
    form.push({
      name: 'payableAmount',
      type: 'ETH',
      value: ''
    })
  }
  return form
}

export default {
  name: 'InteractionFunctionItem',
  props: {
    contract: {
      type: [Object, null],
      default: null
    },
    functionItem: {
      type: Object,
      default: () => ({})
    },
    name: {
      type: String,
      default: ''
    },
    proxyAddress: {
      type: String,
      default: ''
    }
  },
  data() {
    const formData = initFormFieldsByInputs(this.functionItem)
    return {
      formData,
      pending: false,
      result: ''
    }
  },
  computed: {
    isConstactFunction() {
      const { constant, inputs = [] } = this.functionItem
      return !!constant && inputs.length === 0
    },
    disabled() {
      return _.some(this.formData, field => !field.value)
    }
  },
  mounted() {
    if (this.isConstactFunction) {
      this.getConstantValue()
    }
  },
  methods: {
    async getConstantValue() {
      const res = await this.contract.callStatic[this.name]()
      this.result = res.toString()
    },
    async execQuery() {
      const txOptions = _.map(this.formData, 'value')
      const res = await this.contract.callStatic[this.name](...txOptions)
      this.result = res.toString()
    },
    _getSendTransactionPayload() {
      const payableAmount = _.find(this.formData, { name: 'payableAmount' }) ? _.find(this.formData, { name: 'payableAmount' }).value : null
      const txOptions = _.map(_.filter(this.formData, (field) => {
        return field.name !== 'payableAmount'
      }), 'value')
      const data = this.contract.interface.encodeFunctionData(this.name, txOptions)
      const result = {
        to: this.contract.address,
        data
      }
      if (!!payableAmount) {
        result.value = payableAmount
      }
      console.log('@@@ _getSendTransactionPayload', payableAmount, txOptions, result)
      return result
    },
    async execFunction() {
      try {
        this.pending = true
        const userProxy = new ethers.Contract(this.proxyAddress, proxyABI, this.$wallet.getSigner())
        const { to, value = '0', data } = this._getSendTransactionPayload()
        // return
        const operation = '0'
        const safeTxGas = ethers.BigNumber.from('0')
        const baseGas = '0'
        const gasPrice = '0'
        const gasToken = '0x0000000000000000000000000000000000000000'
        const refundReceiver = '0x0000000000000000000000000000000000000000'
        const signatures = ethers.utils.arrayify('0x')

        const res = await userProxy.execTransaction(
          to, // to,
          value, // value,
          data, // data,
          operation, // operation,
          safeTxGas, // safeTxGas,
          baseGas, // baseGas,
          gasPrice, // gasPrice,
          gasToken, // gasToken,
          refundReceiver, // refundReceiver,
          signatures, // signatures,
        ).then(this.$wallet.waitForTx)
        console.log('@@@ execTransaction.res', res)
      } catch (error) {
        this.$message.error(error.message || error.toString())
      }
      this.pending = false
    }
  },
}
</script>