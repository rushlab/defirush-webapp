<template>
  <div class="exchange">
    <el-form class="exchange__form" label-position="top">
      <el-form-item>
        <div slot="label" class="form-item__label">
          <div class="label-text">You Pay</div>
          <div class="token-balance">Balance: {{ fromTokenBalance }}</div>
        </div>
        <el-input placeholder="请输入支付数量" v-model="amount">
          <el-button slot="append" class="input__button" type="text" @click="onClickSelect('fromToken')">{{ fromToken ? fromToken.symbol : '请选择' }}</el-button>
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
        <el-input placeholder="返回目标Token数量" :value="quote.returnAmount" readonly>
          <el-button slot="append" class="input__button" type="text" @click="onClickSelect('toToken')">{{ toToken ? toToken.symbol : '请选择' }}</el-button>
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
    <token-select-dialog
      :visible.sync="tokenSelectDialogVisible"
      @select="onSelectToken"
    />
  </div>
</template>

<script>
import _ from 'lodash'
import { mapState } from 'vuex'
import { ethers } from 'ethers'
import TokenSelectDialog from '@/components/selects/TokenSelectDialog'

import OneSplitAuditABI from './oneSplitAudit.json'
const OneSplitAuditContractAddress = '0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E'

const ERC20_ABI = [
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address recipient, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
]

const splitExchanges = [
    'Uniswap', 'Kyber', 'Bancor', 'Oasis', 'CurveCompound',
    'CurveUsdt', 'CurveY', 'CurveBinance', 'CurveSynthetix',
    'UniswapCompound', 'UniswapChai', 'UniswapAave', 'Mooniswap',
    'UniswapV2', 'UniswapV2ETH', 'UniswapV2DAI', 'UniswapV2USDC',
    'CurvePax', 'CurveRenBtc', 'CurveTBtc', 'DforceSwap', 'Shellexchangers'
]

export default {
  name: 'Exchange',
  components: {
    TokenSelectDialog
  },
  data() {
    return {
      signer: null,
      oneSplitAuditContract: null,
      // status
      pending: false,
      quoting: false,
      estimating: false,
      splitExchanges,

      senderAddress: '',
      etherBalance: 0,

      fromTokenBalance: 0,

      fromToken: null,
      toToken: null,
      amount: 0,

      quote: {
        returnAmount: '0',
        distribution: [],
      },
      estimateGasSwap: 0,
      estimateGasApprove: 0,

      tokenSelectDialogVisible: false,
      tokenSelectTarget: null
    }
  },
  async mounted() {
    this.getUserWalletData()
    this.updateFromTokenBalance()
  },
  computed: {
    ...mapState('tokens', {
      tokenList: state => state.data
    }),
    fromTokenAddress() {
      return this.formToken ? this.formToken.address : ''
    },
    toTokenAddress() {
      return this.toToken ? this.toToken.address : ''
    },
    disableQuote() {
      return this.etherBalance <= 0 ||
             this.fromTokenBalance <= 0 ||
             this.amount <= 0 ||
             !this.fromToken ||
             !this.toToken ||
             !!this.quoting
    },
    disableEstimate() {
      return this.etherBalance <= 0 ||
             this.fromTokenBalance <= 0 ||
             this.amount <= 0 ||
             !this.fromToken ||
             !this.toToken ||
             !!this.estimating
    },
    disableSwap() {
      return this.etherBalance <= 0 ||
             this.fromTokenBalance <= 0 ||
             this.amount <= 0 ||
             !this.fromToken ||
             !this.toToken ||
             !!this.pending
    }
  },
  methods: {
    onClickSelect(target) {
      this.tokenSelectTarget = target
      this.tokenSelectDialogVisible = true
    },
    onSelectToken(token) {
      if (!this.tokenSelectTarget) {
        console.log('@@@ WARNING: tokenSelectTarget is undefined')
      } else {
        this[this.tokenSelectTarget] = { ...token }
        if (this.tokenSelectTarget === 'fromToken') {
          this.handleChangeFromToken()
        }
        this.tokenSelectTarget = null
      }
      this.clearQuote()
    },
    getOneSplitAuditContract() {
      if (this.oneSplitAuditContract) return this.oneSplitAuditContract;
      const oneSplitAuditContract = new ethers.Contract(
        OneSplitAuditContractAddress, OneSplitAuditABI, this.$wallet.getSigner())
      this.oneSplitAuditContract = oneSplitAuditContract
      return oneSplitAuditContract
    },
    async getUserWalletData() {
      this.senderAddress = await this.$wallet.getAddress()
      this.etherBalance = await this.$wallet.getBalance()
    },
    async updateFromTokenBalance() {
      const token = this.fromToken
      if (!token) {
        this.fromTokenBalance = '0.00'
        return
      }
      this.fromTokenBalance = await this.$wallet.getBalance(token.address)
    },
    handleChangeFromToken() {
      this.updateFromTokenBalance()
      if (this.fromTokenAddress === this.toTokenAddress) {
        // 如果两者相同，理论上不允许兑换相同的代币
        this.toToken = null
      }
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
      const token = _.find(this.tokenList, { address: this.fromTokenAddress })
      if (!token) return null
      const _amount = ethers.utils.parseUnits(amount + '', token.decimals)
      return _amount
    },
    getTxAmount(amount, decimals) {
      // int => Big Number
      const _amount = ethers.utils.parseUnits(amount + '', decimals)
      return _amount
    },
    async _getQuote() {
      const amount = this.getTxAmount(this.amount, this.fromToken.decimals)
      const parts = 100
      const flags = 0

      let quote = null
      this.quoting = true
      try {
        const oneSplitAuditContract = this.getOneSplitAuditContract()
        const payload = [
          this.fromToken.address,
          this.toToken.address,
          amount,
          parts,
          flags
        ]
        quote = await oneSplitAuditContract.callStatic.getExpectedReturn(...payload)
        const returnAmount = ethers.utils.formatUnits(quote.returnAmount.toString(), this.toToken.decimals)
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
      const { address, decimals } = this.fromToken
      const amount = this.getTxAmount(this.amount, decimals)
      const erc20Contract = new ethers.Contract(address, ERC20_ABI, this.$wallet.getSigner())
      const oneSplitAuditContract = this.getOneSplitAuditContract()
      const allowance = await erc20Contract.callStatic.allowance(this.senderAddress, oneSplitAuditContract.address)
      if (allowance.lt(amount)) {
        // allowance 已经足够完成这次交易的 amount, 则不再发起本次 approve
        return [erc20Contract, amount]
      }
      return [erc20Contract, null]
    },
    async handleApprove() {
      if (!this.fromToken || this.fromToken.symbol.toLowerCase() === 'eth') return;
      try {
        const oneSplitAuditContract = this.getOneSplitAuditContract()
        const [erc20Contract, approveAmount] = await this.getApprovePayload()
        if (!approveAmount) return;
        const res = await erc20Contract.approve(oneSplitAuditContract.address, approveAmount)
        await res.wait()  // 等待交易确认
      } catch (error) {
        console.log('@@@@@ handleApprove error', error)
        throw error
      }
    },
    async getSwapPayload() {
      const amount = this.getTxAmount(this.amount, this.fromToken.decimals)
      const parts = 100
      const flags = 0
      const quote = await this._getQuote()
      const signer = this.$wallet.getSigner()
      const nonce = await signer.getTransactionCount('latest')
      const isETHSwap = this.$wallet.isETH(this.fromToken.symbol)
      const txMsg = {
        nonce
      }
      if (isETHSwap) {
        // msg.value shoule be used only for ETH swap
        txMsg.value = amount
      }
      return [
        this.fromToken.address,
        this.toToken.address,
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
      const oneSplitAuditContract = this.getOneSplitAuditContract()
      const transaction = await oneSplitAuditContract.swap(...payload)
      const receipt = await transaction.wait()
      this.$emit('success', {receipt, fromTokenAddress: this.fromTokenAddress, toTokenAddress: this.tokenList})
      this.handleSwapSuccess()
    },
    async handleEstimateGas() {
      if (this.estimating) return;
      this.estimating = true
      this.estimateGasSwap = 0
      this.estimateGasApprove = 0

      if (this.fromToken.symbol.toLowerCase() === 'eth') {
        // eth => erc20, 不需要 approve
        await this._getEstimateGasSwap()
      } else {
        // erc20 => other, 需要 approve, 目前只显示 approve的 estimateGas
        await this._getEstimateGasApprove()
      }
      this.estimating = false
    },
    async _getEstimateGasApprove() {
      const oneSplitAuditContract = this.getOneSplitAuditContract()
      const [erc20Contract, approveAmount] = await this.getApprovePayload()
      if (approveAmount) {
        let estimateGasApprove = await erc20Contract.estimateGas.approve(oneSplitAuditContract.address, approveAmount)
        estimateGasApprove = ethers.utils.parseUnits(estimateGasApprove.toString(), 'wei')
        this.estimateGasApprove = estimateGasApprove
      }
    },
    async _getEstimateGasSwap() {
      const oneSplitAuditContract = this.getOneSplitAuditContract()
      const payload = await this.getSwapPayload()
      const res = await oneSplitAuditContract.estimateGas.swap(...payload)
      const estimateGasSwap = ethers.utils.parseUnits(res.toString(), 'wei')
      this.estimateGasSwap = estimateGasSwap
    },
    handleSwapSuccess() {
      this.getUserWalletData()
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
}
.input__button {
  min-width: 100px;
  text-align: center;
  padding: 12px 20px;
}
</style>

