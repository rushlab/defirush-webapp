<template>
  <div class="exchange">
    <el-form class="exchange__form" label-position="top">
      <el-form-item>
        <div slot="label" class="form-item__label">
          <div class="label-text">You Pay</div>
          <div class="token-balance">Balance: {{ fromTokenBalance }}</div>
        </div>
        <el-input placeholder="请输入支付数量" v-model="amount" class="input-with-select">
          <el-select v-model="fromTokenAddress" slot="prepend" placeholder="请选择" @change="handleChangeFromToken">
            <el-option
              v-for="opt in tokenOptions" :key="'fromTokenAddress-'+ opt.symbol"
              :label="opt.symbol"
              :value="opt.address"/>
          </el-select>
        </el-input>

      </el-form-item>
      <el-form-item >
        <div slot="label" class="form-item__label">
          <div class="label-text">You Receive</div>
          <div class="estmate-gas">
            <span v-if="estimateGasApprove">Approve预计消耗Gas：{{ estimateGasApprove }}</span>
            <span v-if="estimateGasSwap"> Swap预计消耗Gas：{{ estimateGasSwap }}</span>
          </div>
        </div>
        <el-input placeholder="返回目标Token数量" :value="quote.returnAmount" readonly class="input-with-select">
          <el-select v-model="toTokenAddress" slot="prepend" placeholder="请选择" @change="clearQuote">
            <el-option
              v-for="opt in tokenOptions" :key="'toTokenAddress-'+ opt.symbol"
              :label="opt.symbol"
              :value="opt.address"
              :disabled="opt.address === fromTokenAddress"
            />
          </el-select>
        </el-input>
      </el-form-item>

      <el-form-item>
        <el-button
          type="info"
          :disabled="disableQuote"
          :loading="!!quoting"
          @click="onClickQuote">{{ !!quoting ? '正在查询' : '查询可兑换数量' }}</el-button>
        <el-button
          type="warning"
          :disabled="disableEstimate"
          :loading="estimating"
          @click="handleEstimateGas">{{ !!estimating ? '正在估算' : '估算Gas' }}</el-button>
        <el-button
          type="primary"
          :disabled="disableSwap"
          :loading="!!pending"
          @click="swapWithContract">{{ !!pending ? '正在兑换' : '兑换(contract)' }}</el-button>
      </el-form-item>
    </el-form>

    <div class="distributions" v-if="quote && quote.distribution && quote.distribution.length">
      <div v-for="(item, index) in quote.distribution" :key="index" v-if="+item > 0">
        <span class="exchange-title">{{ splitExchanges[index] }}</span>
        <el-progress :percentage="+item"></el-progress>
      </div>
      <div v-for="(item, index) in quote.distribution" :key="index" v-if="+item <= 0">
        <span class="exchange-title">{{ splitExchanges[index] }}</span>
        <el-progress :percentage="+item"></el-progress>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from "ethers"
import OneSplitAudit from '@/constants/contracts/1inch'
import { ABI as ERC20_ABI, TOKENS as ERC20_TOKENS } from '@/constants/erc20-tokens.js'

const splitExchanges = [
    "Uniswap", "Kyber", "Bancor", "Oasis", "CurveCompound",
    "CurveUsdt", "CurveY", "CurveBinance", "CurveSynthetix",
    "UniswapCompound", "UniswapChai", "UniswapAave", "Mooniswap",
    "UniswapV2", "UniswapV2ETH", "UniswapV2DAI", "UniswapV2USDC",
    "CurvePax", "CurveRenBtc", "CurveTBtc", "DforceSwap", "Shellexchangers"
]

export default {
  name: 'Exchange',
  props: {
    provider: {
      type: Object,
      default: () => {
        return {}
      }
    },
  },
  data() {
    const tokenOptions = [
        { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
        ...ERC20_TOKENS
    ]
    return {
      signer: null,
      OneSplitAuditContract: null,
      // status
      pending: false,
      quoting: false,
      estimating: false,

      tokenOptions,
      splitExchanges,

      senderAddress: '',
      etherBalance: 0,

      fromTokenBalance: 0,

      fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      toTokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
      amount: 0,

      quote: {
        returnAmount: '0',
        distribution: [],
      },
      estimateGasSwap: 0,
      estimateGasApprove: 0,
    }
  },
  async mounted() {
    this.signer = this.provider.getSigner()
    this.getSignerData()
    this.updateContact(this.signer)
    this.updateFromTokenBalance()
  },
  computed: {
    disableQuote() {
      return this.etherBalance <= 0 ||
             this.fromTokenBalance <= 0 ||
             this.amount <= 0 ||
             !this.fromTokenAddress ||
             !this.toTokenAddress ||
             !this.OneSplitAuditContract ||
             !!this.quoting
    },
    disableEstimate() {
      return this.etherBalance <= 0 ||
             this.fromTokenBalance <= 0 ||
             this.amount <= 0 ||
             !this.fromTokenAddress ||
             !this.toTokenAddress ||
             !this.OneSplitAuditContract ||
             !!this.estimating
    },
    disableSwap() {
      return this.etherBalance <= 0 ||
             this.fromTokenBalance <= 0 ||
             this.amount <= 0 ||
             !this.fromTokenAddress ||
             !this.toTokenAddress ||
             !this.OneSplitAuditContract ||
             !!this.pending
    }
  },
  watch: {
    provider: {
      handler: function(newProvider) {
        if (!newProvider) return;
        this.signer = newProvider.getSigner()
        this.getSignerData()
        this.updateContact(this.signer)
      },
    },
  },
  methods: {
    updateContact(signer) {
      const { abi, contractAddress } = OneSplitAudit
      this.OneSplitAuditContract = new ethers.Contract(contractAddress, abi, signer)
    },
    async getSignerData() {
      if (!this.signer) return;
      this.senderAddress = await this.signer.getAddress()
      const balance = await this.signer.getBalance()
      this.etherBalance = ethers.utils.formatUnits(balance)
    },
    async getERC20TokenBalance(token) {
      const erc20Contract = new ethers.Contract(token.address, ERC20_ABI, this.signer)
      const balance = await erc20Contract.balanceOf(this.senderAddress)
      return ethers.utils.formatUnits(balance.toString(), token.decimals)
    },
    async updateFromTokenBalance() {
      const token = _.find(this.tokenOptions, { address: this.fromTokenAddress })
      if (!token) {
        this.fromTokenBalance = '0.00'
        return
      }
      if (token.symbol.toLowerCase() === 'eth') {
        // return ETH balance
        const balance = await this.signer.getBalance()
        this.fromTokenBalance = ethers.utils.formatUnits(balance)
      } else {
        this.fromTokenBalance = await this.getERC20TokenBalance(token)  // return erc20 token balance
      }
    },
    handleChangeFromToken() {
      this.updateFromTokenBalance()
      if (this.fromTokenAddress === this.toTokenAddress) {
        // 如果两者相同，理论上不允许兑换相同的代币
        this.toTokenAddress = ''
      }
      this.clearQuote()
    },
    clearQuote() {
      this.quote = {
        returnAmount: '',
        distributions: []
      }
    },
    onClickQuote() {
      this._getQuote()
    },
    parseTxAmount(amount) {
      // int => Big Number
      const token = _.find(this.tokenOptions, { address: this.fromTokenAddress })
      if (!token) return null
      const _amount = ethers.utils.parseUnits(amount + '', token.decimals)
      return _amount
    },
    async _getQuote() {
      const fromTokenAddress = this.fromTokenAddress
      const toTokenAddress = this.toTokenAddress
      const amount = this.parseTxAmount(this.amount)
      const parts = 100
      const flags = 0

      let quote = null
      this.quoting = true
      try {
        quote = await this.OneSplitAuditContract.callStatic.getExpectedReturn(fromTokenAddress, toTokenAddress, amount, parts, flags)
        const { decimals } = _.find(this.tokenOptions, { address: toTokenAddress })
        const returnAmount = ethers.utils.formatUnits(quote.returnAmount.toString(), decimals)
        this.quote = {
          returnAmount,
          distribution: quote.distribution || []
        }
      } catch (error) {
        console.log('Impossible to get the quote', error)
        throw error
      }
      this.quoting = false
      return quote
    },
    async swapWithContract() {
      // 该方法是直接利用 contract.swap
      try {
        this.pending = true
        await this.handleApprove()  // approve
        await this.handleSwap()
      } catch (error) {
        console.log('@@@@@ 兑换失败', error)
        const errMsg = error.data ? JSON.stringify(error.data) : (error.message || JSON.stringify(error))
        this.$message({ message: `兑换失败: ${errMsg}`, type: 'error' })
      }
      this.pending = false
    },
    async getApprovePayload() {
      const fromTokenAddress = this.fromTokenAddress
      const amount = this.parseTxAmount(this.amount)
      const token = _.find(this.tokenOptions, { address: fromTokenAddress })
      const erc20Contract = new ethers.Contract(token.address, ERC20_ABI, this.signer)
      const allowance = await erc20Contract.callStatic.allowance(this.senderAddress, this.OneSplitAuditContract.address)
      if (allowance.lt(amount)) {
        // allowance 已经足够完成这次交易的 amount, 则不再发起本次 approve
        return [erc20Contract, amount]
      }
      return [erc20Contract, null]
    },
    async handleApprove() {
      const fromToken = _.find(this.tokenOptions, { address: this.fromTokenAddress })
      if (!fromToken || fromToken.symbol.toLowerCase() === 'eth') return;
      try {
        const [erc20Contract, approveAmount] = await this.getApprovePayload()
        if (!approveAmount) return;
        const res = await erc20Contract.approve(this.OneSplitAuditContract.address, approveAmount)
        await res.wait()  // 等待交易确认
      } catch (error) {
        console.log('@@@@@ handleApprove error', error)
        throw error
      }
    },
    async getSwapPayload() {
      const fromTokenAddress = this.fromTokenAddress
      const toTokenAddress = this.toTokenAddress
      const amount = this.parseTxAmount(this.amount)
      const parts = 100
      const flags = 0
      const quote = await this._getQuote()

      const nonce = await this.signer.getTransactionCount('latest')
      const token = _.find(this.tokenOptions, { address: fromTokenAddress })
      const isETHSwap = token.symbol.toLowerCase() === 'eth'
      const txMsg = {
        nonce
      }
      if (isETHSwap) {
        // msg.value shoule be used only for ETH swap
        txMsg.value = amount
      }
      return [
        fromTokenAddress,
        toTokenAddress,
        amount,
        quote.returnAmount,
        quote.distribution,
        flags,
        txMsg,
      ]
    },
    async handleSwap() {
      await this._getEstimateGasSwap()
      const payload = await this.getSwapPayload()
      const transaction = await this.OneSplitAuditContract.swap(...payload)
      const receipt = await transaction.wait()
      this.$emit('success', {receipt, fromTokenAddress: this.fromTokenAddress, toTokenAddress: this.tokenOptions})


      this.handleSwapSuccess()
    },
    async handleEstimateGas() {
      if (this.estimating) return;
      this.estimating = true
      this.estimateGasSwap = 0
      this.estimateGasApprove = 0

      const fromToken = _.find(this.tokenOptions, { address: this.fromTokenAddress })
      if (!fromToken) return
      if (fromToken.symbol.toLowerCase() === 'eth') {
        // eth => erc20, 不需要 approve
        await this._getEstimateGasSwap()
      } else {
        // erc20 => other, 需要 approve, 目前只显示 approve的 estimateGas
        await this._getEstimateGasApprove()
      }
      this.estimating = false
    },
    async _getEstimateGasApprove() {
      const [erc20Contract, approveAmount] = await this.getApprovePayload()
      if (approveAmount) {
        let estimateGasApprove = await erc20Contract.estimateGas.approve(this.OneSplitAuditContract.address, approveAmount)
        estimateGasApprove = ethers.utils.parseUnits(estimateGasApprove.toString(), 'wei')
        this.estimateGasApprove = estimateGasApprove
      }
    },
    async _getEstimateGasSwap() {
      const payload = await this.getSwapPayload()
      const res = await this.OneSplitAuditContract.estimateGas.swap(...payload)
      const estimateGasSwap = ethers.utils.parseUnits(res.toString(), 'wei')
      this.estimateGasSwap = estimateGasSwap
    },
    handleSwapSuccess() {
      this.getSignerData()
      this.updateFromTokenBalance()
      this.amount = ''
      this.quote.returnAmount = ''
    }
  },
}
</script>

<style lang="scss" scoped>

.exchange {
  width: 100%;
  display: flex;
  justify-content: space-between;
}
.exchange__form {
  width: 100%;
  max-width: 480px;
}
.form-item__label {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
}
.token-balance {
  font-size: 12px;
  font-weight: 500;
  color: #2980b9;
}
.estmate-gas {
  font-size: 12px;
  font-weight: 500;
  color: #8e44ad;
}
.distributions {
  width: 100%;
  max-width: 480px;
  margin-left: 15px;
  height: 300px;
  overflow: auto;
}
.exchange-title {
  font-size: 12px;
  font-style: italic;
}
/deep/ {
  .el-from-item {
    position: relative;
  }
  .el-select .el-input {
    width: 100px;
  }
  .el-form-item__label {
    width: 100%;
  }
  .input-with-select .el-input-group__prepend {
    background-color: #ffffff;
    // background-color: #34495e;
    // color: #ffffff;
  }
}
</style>

