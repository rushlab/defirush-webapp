<template>
  <div class="swap">
    <el-form inline label-width="120px">
      <el-form-item label="目标代币" class="charge-from-address">
        <el-select v-model="toToken" placeholder="选择需要兑换的代币">
          <el-option
            v-for="opt in toTokenOptions" :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="兑换ETH数量">
        <el-input-number v-model="amount" :max="+fromAddressBalance">
          <template slot="append">ETH</template>
        </el-input-number>
      </el-form-item>

      <el-form-item label="目标代币数量" v-if="quote.returnAmount">
        <el-input :value="quote.returnAmount" readonly></el-input>
      </el-form-item>
    </el-form>
    <el-form inline label-width="120px">
      <el-form-item>
        <el-button
          type="primary"
          :disabled="!amount || !toToken"
          :loading="!!pending"
          @click="onClickQuote">{{ !!pending ? '正在查询' : '查询可兑换数量' }}</el-button>
        <el-button
          type="primary"
          :disabled="disableSwap"
          :loading="!!pending"
          @click="swapWithContract">{{ !!pending ? '正在兑换' : '一键兑换' }}</el-button>
      </el-form-item>
    </el-form>
    <div class="distributions">
      <div v-for="(item, index) in quote.distribution" :key="index">
        <span>{{ splitExchanges[index] }}</span>
        <el-progress :percentage="+item"></el-progress>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from "ethers"
import OneSplitAudit from '@/constants/contracts/1inch'
import { BigNumber } from 'bignumber.js'
import { ABI as ERC20_ABI, TOKENS as ERC20_TOKENS } from '@/constants/erc20-tokens.js'

const splitExchanges = [
    "Uniswap", "Kyber", "Bancor", "Oasis", "CurveCompound",
    "CurveUsdt", "CurveY", "CurveBinance", "CurveSynthetix",
    "UniswapCompound", "UniswapChai", "UniswapAave", "Mooniswap",
    "UniswapV2", "UniswapV2ETH", "UniswapV2DAI", "UniswapV2USDC",
    "CurvePax", "CurveRenBtc", "CurveTBtc", "DforceSwap", "Shellexchangers"
]

export default {
  name: 'Swap',
  props: {
    provider: {
      type: Object,
      default: () => {
        return {}
      }
    },
  },
  data() {
    const toTokenOptions = _.map(ERC20_TOKENS, ({ symbol, address, decimals }) => {
      return {
        label: symbol,
        value: address,
        decimals
      }
    })
    return {
      signer: null,
      pending: false,
      contract: null,
      fromSigner: null,
      fromAddress: '',
      fromAddressBalance: 0,

      toToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
      toTokenOptions,
      amount: 0,
      splitExchanges,
      quote: {
        returnAmount: '',
        distribution: [],
      }
    }
  },
  async mounted() {
    this.signer = this.provider.getSigner()
    this.fromSigner = this.signer
    this.getSignerData()
    this.updateContact(this.signer)
  },
  computed: {
    disableSwap() {
      return !!this.pending || !this.fromSigner || this.fromAddressBalance <= 0 || !this.toToken || !this.contract
    }
  },
  watch: {
    provider: {
      handler: function(newProvider) {
        if (!newProvider) return;
        this.signer = newProvider.getSigner()
        this.fromSigner = this.signer
        this.getSignerData()
        this.updateContact(this.signer)
      },
    },
    immediate: true
  },
  methods: {
    updateContact(signer) {
      const { abi, contractAddress } = OneSplitAudit
      this.contract = new ethers.Contract(contractAddress, abi, signer)
    },
    async getSignerData() {
      if (!this.signer) return;
      this.fromAddress = await this.signer.getAddress()
      const balance = await this.signer.getBalance()
      this.fromAddressBalance = ethers.utils.formatUnits(balance)
    },
    onClickQuote() {
      const fromToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'  // ETH
      const toToken = this.toToken
      const amount = ethers.utils.parseEther(this.amount + '')
      this._getQuote(fromToken, toToken, amount)
    },
    async _getQuote(fromToken, toToken, amount, parts = 100, flags = 0) {
      let quote = null
      this.pending = true
      if (!fromToken) fromToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
      if (!toToken) toToken = this.toToken
      if (!amount) amount = ethers.utils.parseEther(this.amount + '')
      if (!parts) parts = 100
      if (!flags) flags = 0
      try {
        quote = await this.contract.callStatic.getExpectedReturn(fromToken, toToken, amount, parts, flags)
        const { decimals } = _.find(this.toTokenOptions, { value: toToken })
        const returnAmount = (new BigNumber(quote.returnAmount.toString())).shiftedBy(-decimals).toString()
        this.quote = {
          returnAmount,
          distribution: quote.distribution || []
        }
      } catch (error) {
        console.log('Impossible to get the quote', error)
      }
      this.pending = false
      return quote
    },
    _getSwapTxData(fromToken, toToken, amount, quote, flags = 0) {
      const fragment = 'swap'
      const values = [
        fromToken,
        toToken,
        amount,
        quote.returnAmount,
        quote.distribution,
        flags
      ]

      const data = this.contract.interface.encodeFunctionData(fragment, values)
      console.log('@@@@ _getSwapTxData', data)
      return data
    },
    _getSigner() {
      let signer = this.signer
      try {
        signer = this.fromSigner.connect(this.provider)
      } catch (error) {
        console.log('signer connect provider failed: ', error)
      }
      return signer
    },
    async swapWithContract() {
      // 该方法是直接利用 contract.swap
      try {
        this.pending = true
        const fromToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
        const toToken = this.toToken
        const to = this.contract.address
        const amount = ethers.utils.parseEther(this.amount + '')
        const parts = 100
        const flags = 0

        const quote = await this._getQuote()
        const transaction = await this.handleSwap(fromToken, toToken, amount, quote, flags)
        console.log('@@@@@ TRANSACTION is', transaction)
        const receipt = await transaction.wait()
        console.log('@@@@@ receipt is', receipt)
        this.$message({ message: `恭喜你，兑换成功，兑换消耗了 ${this.amount} ETH, 最终兑换数量为 ${ this.quote.returnAmount }`, type: 'success' })
        this.$emit('success', {receipt, fromToken, toToken})
        this.getSignerData()
        this.pending = false
      } catch (error) {
        console.log('@@@@@ 兑换失败', error)
        const errMsg = error.data ? JSON.stringify(error.data) : (error.message || JSON.stringify(error))
        this.$message({ message: `兑换失败: ${errMsg}`, type: 'error' })
        this.pending = false
      }
    },
    async handleSwap(fromToken, toToken, amount, quote, flags) {
      const nonce = await this.signer.getTransactionCount('latest')
      const transaction = await this.contract.swap(
        fromToken,
        toToken,
        amount,
        quote.returnAmount,
        quote.distribution,
        flags,
        {
          nonce,
          value: amount,
        }
      )
      return transaction
    },
    async onSubmit() {
      // 该方法是利用 singer.sendTransaction 发送交易数据
      try {
        this.pending = true
        const fromToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
        const toToken = this.toToken
        const to = this.contract.address
        const amount = ethers.utils.parseEther(this.amount + '')
        const parts = 100
        const flags = 0

        const quote = await this._getQuote()
        const data = this._getSwapTxData(fromToken, toToken, amount, quote)
        const nonce = await this.provider.getTransactionCount(this.fromAddress, 'latest')

        console.log('@@@@@ fromAddress', this.fromAddress, 'nonce is ', nonce)
        const txData = {
          nonce,
          from: this.fromAddress,
          to,
          value: amount,
          gasPrice: '0x09184e72a',
          gasLimit: '0x300000',
          data
        }
        console.log(txData)
        const signer = this._getSigner()
        const transaction = await signer.sendTransaction(txData)
        console.log('@@@@@ TRANSACTION is', transaction)
        const receipt = await transaction.wait()
        console.log('@@@@@ receipt is', receipt)
        this.$message({ message: `恭喜你，兑换成功，兑换消耗了 ${this.amount} ETH, 最终兑换数量为 ${ this.quote.returnAmount }`, type: 'success' })
        this.$emit('success', {receipt, fromToken, toToken})
        this.getSignerData()
        this.pending = false
      } catch (error) {
        console.log('@@@@@ 兑换失败', error)
        const errMsg = error.data ? JSON.stringify(error.data) : (error.message || JSON.stringify(error))
        this.$message({ message: `兑换失败: ${errMsg}`, type: 'error' })
        this.pending = false
      }
    }
  },
}
</script>

<style lang="scss" scoped>
/deep/ {
  .charge-from-address .el-select,
  .charge-from-address .el-input {
    width: 400px;
  }
}
</style>

