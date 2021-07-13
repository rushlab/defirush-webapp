<template>
  <div class="bank-counter">
    <div class="bank-counter__header">
      <el-select class="asset-select" v-model="assetAddress" placeholder="请选择资产" @change="changeAssetAddress">
        <el-option
          v-for="opt in tokenOptions" :key="'assetAddress-'+ opt.symbol"
          :label="opt.symbol"
          :value="opt.address"/>
      </el-select>
    </div>
    <div class="bank-counter__body">
      <div class="counter-table">
        <div class="counter-table__header">
          <h4 class="counter-table__label">存款</h4>
          <div class="counter-table__actions">
            <el-button
              size="small" type="primary" plain class="btn-action"
              :disabled="depositPending || withdrawPending"
              @click="onDeposit">{{ depositPending ? '正在存款' : '存款' }}</el-button>
            <el-button
              size="small" type="waring" plain class="btn-action"
              :disabled="depositPending || withdrawPending"
              @click="onWithdraw">{{ withdrawPending ? '正在取款' : '取款' }}</el-button>
          </div>
        </div>
        <div class="counter-table__body" v-loading="depositPending || withdrawPending">
          <el-form label-position="left" label-left="160px">
            <el-form-item label="钱包余额">
              <div class="form-item__value"><strong>{{ assetBalance }}</strong> <span>{{ assetTokenSymbol }}</span></div>
            </el-form-item>
            <el-form-item label="存款余额">
              <div class="form-item__value"><strong>{{ aTokenBalance }}</strong> <span>{{ aTokenSymbol }}</span></div>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <div class="counter-table">
        <div class="counter-table__header">
          <h4 class="counter-table__label">借款</h4>
          <div class="counter-table__actions">
            <el-button
              size="small" type="primary" plain class="btn-action"
              :disabled="borrowPending || repayPending"
              @click="borrowDialogVisible = true">{{ borrowPending ? '正在借款' : '借款' }}</el-button>
            <el-button
              size="small" type="warning" plain class="btn-action"
              :disabled="borrowPending || repayPending"
              @click="onRepay">{{ repayPending ? '正在还款' : '一键还款' }}</el-button>
          </div>
        </div>
        <div class="counter-table__body" v-loading="borrowPending || repayPending">
          <el-form label-position="left" label-left="160px">
            <!-- <el-form-item label="已借(固定利率)">
              <div class="form-item__value"><strong>{{ debtBalanceStable }}</strong> <span>{{ assetTokenSymbol }}</span></div>
            </el-form-item> -->
            <el-form-item label="已借(可变利率)">
              <div class="form-item__value"><strong>{{ debtBalanceVariable }}</strong> <span>{{ assetTokenSymbol }}</span></div>
            </el-form-item>
            <el-form-item label="健康因子">
              <div class="form-item__value"><strong>{{ userAccountData.healthFactor }}</strong><span></span></div>
            </el-form-item>
            <!-- <el-form-item label="贷款增值">
              <div class="form-item__value"><strong>{{ loanToValue }}</strong> <span>{{ assetTokenSymbol }}</span></div>
            </el-form-item>
            <el-form-item label="可供使用">
              <div class="form-item__value"><strong>{{ availableToYou }}</strong> <span>{{ assetTokenSymbol }}</span></div>
            </el-form-item> -->
          </el-form>
        </div>
      </div>
    </div>

    <!-- Dialogs -->
    <el-dialog
      title="借贷"
      width="480px"
      :modal-append-to-body="true"
      :append-to-body="true"
      :visible.sync="borrowDialogVisible"
      @closed="onCloseBorrowDialog">
      <el-form :model="borrowForm" label-position="left" label-width="120px" class="dialog__form" :disabled="borrowPending">
        <el-form-item label="借贷标的">
          <el-select v-model="borrowForm.assetAddress" placeholder="请选择借贷标的" @change="handleEstimatedBorrowAmount">
            <el-option
              v-for="opt in tokenOptions" :key="'borrow-asset-'+ opt.symbol"
              :label="opt.symbol"
              :value="opt.address"/>
          </el-select>
          <span v-if="estimatingBorrowAmount" class="estimated-borrow-amount">查询借贷额度...</span>
          <span v-else class="estimated-borrow-amount">最多可借贷约：{{ estimatedBorrowAmount || 0 }}</span>
        </el-form-item>
        <el-form-item label="借贷数量">
          <el-input-number
            v-model="borrowForm.amount"
            controls-position="right"
            autocomplete="off"
            placeholder="请填写借贷数量"
            :min="0"></el-input-number>
        </el-form-item>
        <el-form-item label="利率类型">
          <el-select v-model="borrowForm.interestRateMode" placeholder="请选择利率类型">
            <!-- <el-option label="固定利率" :value="1"/> -->
            <el-option label="可变利率" :value="2"/>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="borrowDialogVisible = false" :disabled="borrowPending">取消</el-button>
        <el-button type="primary" @click="handleBorrow" :disabled="borrowPending">{{ borrowPending ? '正在借款': '确定' }}</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from 'ethers'
import { ABI as ABI_ERC20 } from '@/constants/erc20-tokens.js'
import {
  ABI_EIP20,
  ABI_DebtToken,
  ABI_ProtocolDataProvider,
  Address_WETHGateway,
  ABI_WETHGateway
} from '@/constants/contracts/aave/index.js'
import AaveTokens from '@/constants/contracts/aave/Tokens.js'
const ABI_PriceOracle = [ "function getAssetPrice(address asset) view returns (uint256)" ]

export default {
  name: 'BankCounter',
  props: {
    provider: {
      type: Object,
      default: () => {
        return {}
      }
    },
    addressesProvider: {
      type: Object,
      default: () => {
        return {}
      }
    },
    lendingPool: {
      type: Object,
      default: () => {
        return {}
      }
    },
    priceOracleAddress: {
      type: String,
      default: ''
    }
  },
  data() {
    return {

      depositPending: false,
      withdrawPending: false,
      borrowPending: false,
      repayPending: false,
      borrowDialogVisible: false,
      estimatingBorrowAmount: false,

      signer: null,
      senderAddress: '',
      assetAddress: '',

      assetBalance: '0',
      aTokenBalance: '0',
      debtBalanceStable: '0',
      debtBalanceVariable: '0',
      // healthFactor: ' - ',
      loanToValue: '0',
      availableToYou: '0',


      userAccountData: {
        totalCollateralETH: 0,
        totalDebtETH: 0,
        availableBorrowsETH: 0,
        currentLiquidationThreshold: 0,
        ltv: 0,
        healthFactor: ' - ',
      },
      amount: 0,
      tokenOptions: AaveTokens.proto,
      estimatedBorrowAmount: '',
      borrowForm: {
        assetAddress: '',
        amount: 0,
        interestRateMode: 2
      }
    }
  },
  async mounted() {
    this.signer = this.getSigner()
    this.senderAddress = await this.getSenderAddress()
    // this.tokenOptions = await this.getAaveTokens()
    this._updateUserAccountData()
  },
  computed: {
    assetToken() {
      const token = _.find(this.tokenOptions, { address: this.assetAddress })
      return token
    },
    assetTokenSymbol() {
      const token = this.assetToken
      return token ? token.symbol : ''
    },
    aTokenSymbol() {
      const token = this.assetToken
      return token ? token.aTokenSymbol : ''
    }
  },
  watch: {
    provider: {
      handler: async function(newProvider) {
        if (!newProvider) return;
        this.signer = newProvider.getSigner()
        this.senderAddress = await this.getSenderAddress()
      },
    },
  },
  methods: {
    /**
     * ************* get methods *************
     */
    getSigner() {
      return this.provider ? this.provider.getSigner() : null
    },
    async getAaveTokens() {
      const { data } = await this.$axios.get('https://aave.github.io/aave-addresses/mainnet.json')
      const { proto } = data
      return proto
    },
    async getSenderAddress() {
      const signer = this.getSigner()
      return signer ? await signer.getAddress() : ''
    },
    getTokenFromAddress(address) {
      return _.find(this.tokenOptions, { address })
    },
    async getERC20TokenBalance(token) {
      const signer = this.getSigner()
      const erc20Contract = new ethers.Contract(token.address, ABI_ERC20, signer)
      const balance = await erc20Contract.balanceOf(this.senderAddress)
      return ethers.utils.formatUnits(balance.toString(), token.decimals)
    },
    getTxAmount(amount, token) {
      // int => Big Number
      if (!token) return null
      const _amount = ethers.utils.parseUnits(amount + '', token.decimals)
      return _amount
    },
    async getApprovePayload(amount, assetAddress) {
      const signer = this.getSigner()
      const assetToken = this.getTokenFromAddress(assetAddress)
      const amountToWei = this.getTxAmount(amount, assetToken)
      const erc20Contract = new ethers.Contract(assetAddress, ABI_ERC20, signer)
      const allowance = await erc20Contract.callStatic.allowance(this.senderAddress, this.lendingPool.address)
      if (allowance.lt(amountToWei)) {
        // allowance 已经足够完成这次交易的 amount, 则不再发起本次 approve
        return [erc20Contract, amountToWei]
      }
      return [erc20Contract, null]
    },
    async getProtocolDataProvider() {
      if (this.protocalDataProviderInstance) return this.protocalDataProviderInstance
      const address = await this.addressesProvider.callStatic.getAddress(ethers.utils.formatBytes32String(1))
      const protocalDataProviderInstance = new ethers.Contract(address, ABI_ProtocolDataProvider, this.signer)
      this.protocalDataProviderInstance = protocalDataProviderInstance
      return protocalDataProviderInstance
    },
    /**
     * ************* Private methods: utils / handers *************
     */
    async _updateAssetTokenBalance() {
      const signer = this.getSigner()
      // const token = this.assetToken
      const token = this.getTokenFromAddress(this.assetAddress)
      if (!token) {
        this.assetBalance = '0'
        return
      }
      // if (token.symbol.toLowerCase() === 'weth') {
      //   // return ETH balance
      //   const balance = await signer.getBalance()
      //   this.assetBalance = ethers.utils.formatUnits(balance)
      // } else {
      this.assetBalance = await this.getERC20TokenBalance(token)  // return erc20 token balance
      // }
    },
    async _updateATokenBalance() {
      const signer = this.getSigner()
      const token = this.assetToken
      const aTokenContract = new ethers.Contract(token.aTokenAddress, ABI_EIP20, signer)
      const balance = await aTokenContract.callStatic.balanceOf(this.senderAddress)
      const aTokenBalance = ethers.utils.formatUnits(balance.toString(), token.decimals)
      this.aTokenBalance = aTokenBalance
    },
    async _updateDebtBalance() {
      const signer = this.getSigner()
      const token = this.assetToken
      try {
        // variable
        const debtTokenVariable = new ethers.Contract(token.variableDebtTokenAddress, ABI_DebtToken, signer)
        // 这个余额好像是转换成ETH的余额了
        const balanceVariable = await debtTokenVariable.callStatic.balanceOf(this.senderAddress)
        const debtBalanceVariable = ethers.utils.formatUnits(balanceVariable.toString(), token.decimals)
        this.debtBalanceVariable = debtBalanceVariable

      } catch (error) {
        console.log('update debtBalanceVariable', error)
      }

      // try {
      //   // stable
      //   const debtTokenStable = new ethers.Contract(token.StableDebtTokenAddress, ABI_DebtToken, signer)
      //   const balanceStable = await debtTokenStable.callStatic.balanceOf(this.senderAddress)
      //   const debtBalanceStable = ethers.utils.formatUnits(balanceStable.toString(), token.decimals)
      //   this.debtBalanceStable = debtBalanceStable
      // } catch (error) {
      //   console.log('update debtBalanceStable', error)
      // }
    },
    async _handleApprove(amount, assetAddress) {
      const token = this.getTokenFromAddress(assetAddress)
      console.log('before approve', token)
      if (!token || token.symbol.toLowerCase() === 'weth') return;
      try {
        const [erc20Contract, approveAmount] = await this.getApprovePayload(amount, assetAddress)
        if (!approveAmount) return;
        const tx = await erc20Contract.approve(this.lendingPool.address, approveAmount)
        const receipt = await tx.wait()  // 等待交易确认
        console.log('@@@@@ _handleApprove success', receipt)
      } catch (error) {
        console.log('@@@@@ _handleApprove error', error)
        throw error
      }
    },
    async _handleDeposit() {
      try {
        this.depositPending = true
        await this._handleApprove(this.amount, this.assetAddress)
        const amount = this.getTxAmount(this.amount, this.assetToken)
        // 如果是 eth 存款，则使用 WETHGatewai.depositETH
        const token = this.getTokenFromAddress(this.assetAddress)
        if (token.symbol.toLowerCase() === 'weth') return (await this._handleDepositWETH(amount))
        const payload = [
          this.assetAddress,   // address asset
          amount,              // uint amount
          this.senderAddress,  // address onBehalfOf
          0                    // uint16 referralCode
        ]
        const tx = await this.lendingPool.connect(this.signer).deposit(...payload)
        const receipt = await tx.wait()
        this._handleDepositSuccess()
      } catch (error) {
        console.log(error)
        throw error
      }
      this.depositPending = false
    },
    _handleDepositSuccess() {
      this.$message({ message: `恭喜你，存款操作成功`, type: 'success' })
      this._updateAssetTokenBalance()
      this._updateATokenBalance()
      this._updateUserAccountData()
      this.$emit('success')
    },
    async _handleWithdraw(widthAmount) {
      if (!widthAmount || +widthAmount <= 0) return;
      try {
        this.withdrawPending = true
        const amount = this.getTxAmount(widthAmount, this.assetToken)
        const token = this.getTokenFromAddress(this.assetAddress)
        if (token.symbol.toLowerCase() === 'weth') return (await this._handleWithdrawWETH(amount, token))

        const payload = [
          this.assetAddress,   // address asset
          amount,              // uint amount
          this.senderAddress,  // address onBehalfOf
        ]
        const tx = await this.lendingPool.connect(this.signer).withdraw(...payload)
        const receipt = await tx.wait()
        this._handleWithdrawSuccess()
      } catch (error) {
        console.log(error)
        throw error
      }
      this.withdrawPending = false
    },
    _handleWithdrawSuccess() {
      this.$message({ message: `恭喜你，取款成功`, type: 'success' })
      this._updateAssetTokenBalance()
      this._updateATokenBalance()
      this._updateUserAccountData()
      this.$emit('success')
    },
    async handleEstimatedBorrowAmount() {
      const { assetAddress = ''} = this.borrowForm
      if (!assetAddress) {
        this.estimatedBorrowAmount = ''
        return
      }
      try {
        this.estimatingBorrowAmount = true
        const priceOracleContract = new ethers.Contract(this.priceOracleAddress, ABI_PriceOracle, this.signer)
        const price = await priceOracleContract.callStatic.getAssetPrice(assetAddress)
        await this._updateUserAccountData()
        const { availableBorrowsETH } = this.userAccountData
        this.estimatedBorrowAmount = (+availableBorrowsETH.div(price).toString()).toFixed(2)
      } catch (error) {
        console.log(error)
      }
      this.estimatingBorrowAmount = false
    },
    async handleBorrow() {
      const {
        assetAddress,
        amount,
        interestRateMode
      } = this.borrowForm
      try {
        const priceOracleContract = new ethers.Contract(this.priceOracleAddress, ABI_PriceOracle, this.signer)
        const price = await priceOracleContract.callStatic.getAssetPrice(assetAddress)

        await this._updateUserAccountData()
        const { availableBorrowsETH } = this.userAccountData
        const borrowAmount = price.mul(+amount)

        console.log('@@@@@ availableBorrowsETH', availableBorrowsETH)
        console.log('@@@@@ borrowAmount', ethers.utils.formatEther(borrowAmount))
        if (availableBorrowsETH.lt(borrowAmount)) {
          this.$message({ type: 'warning', message: '借款金额超过了可借款额度，请调整借款数量' })
          return
        }

        const debtAssetToken = this.getTokenFromAddress(this.borrowForm.assetAddress)
        const amountToWei = this.getTxAmount(amount, debtAssetToken)
        this.borrowPending = true
        if (debtAssetToken.symbol.toLowerCase() === 'eth') return (await this._handleBorrowWETH(amountToWei))
        const payload = [
          assetAddress,        // address asset
          amountToWei,         // uint amount
          interestRateMode,    // unit interestRateMode
          0,                   // referralCode
          this.senderAddress,  // address onBehalfOf
        ]
        const tx = await this.lendingPool.connect(this.signer).borrow(...payload)
        const receipt = await tx.wait()
        this._handleBorrowSuccess()
      } catch (error) {
        console.log(error)
        throw error
      }
      this.borrowPending = false
    },
    _handleBorrowSuccess() {
      this.$message({ message: `恭喜你，借款成功`, type: 'success' })
      this._updateAssetTokenBalance()
      this._updateATokenBalance()
      this._updateDebtBalance()
      this._updateUserAccountData()
      this.$emit('success')
      this.borrowDialogVisible = false
    },
    onCloseBorrowDialog() {
      this.borrowForm = {
        assetAddress: '',
        amount: 0,
        interestRateMode: 2
      }
    },
    async handleRepay() {
      // 文档中写的 amount = type(uint).max 来还清所有贷款金额
      try {
        const assetAddress = this.assetAddress
        const token =  this.getTokenFromAddress(assetAddress)
        const _debtBalanceVariable = +this.debtBalanceVariable * 1.05
        const amountToWei = ethers.constants.MaxUint256
        this.repayPending = true

        // 如果是 eth 存款，则使用 WETHGatewai.depositETH
        if (token.symbol.toLowerCase() === 'weth') {
          const _amountToWei = this.getTxAmount(_debtBalanceVariable, token)
          return (await this._handleRepayWETH(_amountToWei))
        }

        await this._handleApprove(_debtBalanceVariable.toString(), assetAddress)
        const payload = [
          assetAddress,        // address asset
          amountToWei,                  // uint amount
          2,                   // unit interestRateMode
          this.senderAddress,  // address onBehalfOf
        ]
        console.log('=======', payload)
        const tx = await this.lendingPool.connect(this.signer).repay(...payload)
        const receipt = await tx.wait()
        this._handleRepaySuccess()
      } catch (error) {
        console.log(error)
        throw error
      }
      this.repayPending = false
    },
    _handleRepaySuccess() {
      this.$message({ message: `恭喜你，还款成功`, type: 'success' })
      this._updateAssetTokenBalance()
      this._updateATokenBalance()
      this._updateDebtBalance()
      this._updateUserAccountData()
      this.$emit('success')
    },
    async _updateUserAccountData() {
      const [
        totalCollateralETH,
        totalDebtETH,
        availableBorrowsETH,
        currentLiquidationThreshold,
        ltv,
        healthFactor,
      ] = await this.lendingPool.getUserAccountData(this.senderAddress)
      console.log(`
        totalCollateralETH: ${totalCollateralETH},
        totalDebtETH: ${totalDebtETH},
        availableBorrowsETH: ${availableBorrowsETH},
        currentLiquidationThreshold: ${currentLiquidationThreshold},
        ltv: ${ltv},
        healthFactor: ${healthFactor}`)
      // const _healthFactor = totalDebtETH.isZero() ? ' - ' : totalCollateralETH.mul(currentLiquidationThreshold.div(100)).div(totalDebtETH)
      // console.log(_healthFactor.toString(), healthFactor.toString())
      this.userAccountData = {
        totalCollateralETH,
        totalDebtETH,
        availableBorrowsETH,
        currentLiquidationThreshold,
        ltv,
        healthFactor: totalDebtETH.isZero() ? ' - ' : ethers.utils.formatEther(healthFactor)
      }
    },

    /**
     * ************* WETHGateway methods ***************
     */
    async _handleDepositWETH(amount) {
      const payload = [
        this.lendingPool.address,
        this.senderAddress,        // address onBehalfOf
        0,                         // uint16 referralCode
        {
          value: amount
        }
      ]
      const wethGatewayInstance = new ethers.Contract(Address_WETHGateway, ABI_WETHGateway, this.signer)
      const tx = await wethGatewayInstance.depositETH(...payload)
      const receipt = await tx.wait()
      this._handleDepositSuccess()
      this.depositPending = false
    },
    async _handleWithdrawWETH(amount, token) {
      const erc20Contract = new ethers.Contract(token.aTokenAddress, ABI_ERC20, this.signer)
      const allowance = await erc20Contract.callStatic.allowance(this.senderAddress, Address_WETHGateway)
      let payload = null
      if (allowance.lt(amount)) {
        // allowance 已经足够完成这次交易的 amount, 则不再发起本次 approve
        const _tx = await erc20Contract.approve(Address_WETHGateway, ethers.constants.MaxUint256)
        await _tx.wait()  // 等待交易确认
        payload = [
          this.lendingPool.address,
          ethers.constants.MaxUint256,
          this.senderAddress,        // address onBehalfOf
        ]
      } else {
        payload = [
          this.lendingPool.address,
          allowance,
          this.senderAddress,        // address onBehalfOf
        ]
      }

      const wethGatewayInstance = new ethers.Contract(Address_WETHGateway, ABI_WETHGateway, this.signer)
      const tx = await wethGatewayInstance.withdrawETH(...payload)
      const receipt = await tx.wait()
      this._handleWithdrawSuccess()
      this.withdrawPending = false
    },
    async _handleBorrowWETH(amount) {
      const payload = [
        this.lendingPool.address,
        amount,                              // uint amount
        this.borrowForm.interestRateMode,    // unit interestRateMode
        0,                                   // referralCode
      ]
      const wethGatewayInstance = new ethers.Contract(Address_WETHGateway, ABI_WETHGateway, this.signer)
      const tx = await wethGatewayInstance.borrowETH(...payload)
      const receipt = await tx.wait()
      this._handleBorrowSuccess()
      this.borrowPending = false
    },
    async _handleRepayWETH(amount) {
      const payload = [
        this.lendingPool.address,
        // ethers.constants.NegativeOne,
        amount,
        2,
        this.senderAddress,        // address onBehalfOf
        {
          value: amount
        }
      ]
      console.log('@@@@@ _handleRepayWETH payload', payload)
      const wethGatewayInstance = new ethers.Contract(Address_WETHGateway, ABI_WETHGateway, this.signer)
      const tx = await wethGatewayInstance.repayETH(...payload)
      const receipt = await tx.wait()
      this._handleRepaySuccess()
      this.repayPending = false
    },
    /**
     * ************* UI Methods ***************
     */
    async changeAssetAddress() {
      this._updateAssetTokenBalance()
      this._updateATokenBalance()
      this._updateDebtBalance()
      try {
        const protocalDataProviderInstance = await this.getProtocolDataProvider()
        // console.log('@@@@@ protocalDataProviderInstance', await protocalDataProviderInstance.callStatic.getReserveData(this.senderAddress))
      } catch (error) {
        console.log(error)
      }
    },
    async onDeposit() {
      const token = this.getTokenFromAddress(this.assetAddress)
      if (token.symbol.toLowerCase() === 'weth') {
        // ETH 存款，需要使用 WETHGateway
        const _assetBalance = await this.signer.getBalance()
        const ETHBalance = ethers.utils.formatEther(_assetBalance)
        if (ETHBalance <= 0) {
          this.$message({
            message: '当前Token钱包余额为0，不可操作存款',
            type: 'warning'
          })
          return
        }

        this.amount = 0
        this.$prompt(`请输入存款金额(不得超过当前余额：${ETHBalance})`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputPattern: /^\d{1,}(\.\d+)?$/,
          inputErrorMessage: '存款金额必须是正数'
        }).then(({ value }) => {
          value = +value
          if (value <= 0) {
            this.$message.error('存款金额必须是正数')
          } else if (value > +ETHBalance) {
            this.$message.error(`存款金额不得超过当前余额：${ETHBalance}`)
          } else {
            this.amount = value
            this._handleDeposit()
          }
        }).catch(() => {})
        return
      }
      if (!this.assetBalance || _.isNaN(+this.assetBalance) || +this.assetBalance <= 0) {
        this.$message({
          message: '当前Token钱包余额为0，不可操作存款',
          type: 'warning'
        })
        return
      }
      this.amount = 0
      this.$prompt(`请输入存款金额(不得超过当前余额：${this.assetBalance})`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^\d{1,}(\.\d+)?$/,
        inputErrorMessage: '存款金额必须是正数'
      }).then(({ value }) => {
        value = +value
        if (value <= 0) {
          this.$message.error('存款金额必须是正数')
        } else if (value > +this.assetBalance) {
          this.$message.error(`存款金额不得超过当前余额：${this.assetBalance}`)
        } else {
          this.amount = value
          this._handleDeposit()
        }
      }).catch(() => {})
    },
    async onWithdraw() {
      if (!this.aTokenBalance || _.isNaN(+this.aTokenBalance) || +this.aTokenBalance <= 0) {
        this.$message({
          message: '当前Token存款余额为0，不可进行取款操作',
          type: 'warning'
        })
        return
      }
      this.$prompt(`请输入取款金额(不得超过当前余额：${this.aTokenBalance})`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^\d{1,}(\.\d+)?$/,
        inputErrorMessage: '取款金额必须是正数'
      }).then(({ value }) => {
        value = +value
        if (value <= 0) {
          this.$message.error('取款金额必须是正数')
        } else if (value > +this.aTokenBalance) {
          this.$message.error(`取款金额不得超过当前余额：${this.aTokenBalance}`)
        } else {
          this._handleWithdraw(value)
        }
      }).catch(() => {})
    },
    async onBorrow() {
      await this._updateUserAccountData()
      const { availableBorrowsETH } = this.userAccountData
      if (availableBorrowsETH.lte(0)) {
        this.$message({
          message: '当前账户可用借贷余额不足，不可进行借款操作',
          type: 'warning'
        })
        return
      }
      this.borrowDialogVisible = true
    },
    async onRepay() {
      this.handleRepay()
    },
  },
}
</script>

<style lang="scss" scoped>

.bank-counter {
  width: 100%;
  max-width: 480px;
}

.bank-counter__header {
  margin-bottom: 10px;
  padding-bottom: 10px;
}
.counter-table {
  box-shadow: 0 0 0 1px #e0e0e0;
  border-radius: 3px;
  margin-bottom: 20px;
}
.counter-table__header {
  padding: 10px 15px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid #e0e0e0;
  background-color: #ecf0f1;
}

.counter-table__body {
  padding: 10px 15px;
  width: 100%;
}

.form-item__value {
  text-align: right;
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
.deposit-title {
  font-size: 12px;
  font-style: italic;
}

/deep/ {
  .counter-table .el-form-item {
    position: relative;
    margin-bottom: 0;
  }
  .counter-table .el-form-item + .counter-table .el-form-item {
    margin-top: 10px;
  }

  .el-select .el-input {
    width: 100px;
  }

  .dialog__form .el-select,
  .dialog__form .el-select .el-input {
    width: 100%;
  }

  .el-select.asset-select .el-input {
    width: 160px;
  }

  .input-with-select .el-input-group__prepend {
    background-color: #ffffff;
  }
}

.estimated-borrow-amount {
  position: absolute;
  left: 0;
  bottom: -15px;
  font-size: 12px;
  color: #2980b9;
  line-height: 12px;
}
</style>