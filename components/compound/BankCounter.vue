<template>
  <div class="bank-counter" v-loading="!!pendings.isEntering">
    <div class="bank-counter__header">
      <el-select class="asset-select" v-model="sharing.underlyingAssetAddress" placeholder="请选择资产" @change="onChangeAsset">
        <el-option
          v-for="opt in cTokens" :key="'assetAddress-'+ opt.symbol"
          :label="opt.symbol"
          :value="opt.address"/>
      </el-select>
      <div class="exchange-rate" v-if="underlyingAssetToken">
        <span v-if="pendings.isQuoting">正在查询兑换率...</span>
        <span v-else><strong>1</strong> {{ underlyingAssetToken.cTokenSymbol }} &asymp; <strong>{{ formCToken.exchangeRateCurrent }}</strong> {{ underlyingAssetToken.symbol }} </span>
      </div>
    </div>
    <div class="bank-counter__body">
      <div class="counter-table">
        <div class="counter-table__header">
          <h4 class="counter-table__label">存款</h4>
          <div class="counter-table__actions">
            <el-button
              size="small" type="primary" plain class="btn-action"
              :disabled="!underlyingAssetToken || pendings.isDepositing || pendings.isWithdrawing || !+formCToken.collateralFactorMantissa"
              @click="onDeposit">{{ pendings.isDepositing ? '正在存款' : '存款' }}</el-button>
            <el-button
              size="small" type="waring" plain class="btn-action"
              :disabled="!underlyingAssetToken || pendings.isDepositing || pendings.isWithdrawing"
              @click="onWithdraw">{{ pendings.isWithdrawing ? '正在取款' : '取款' }}</el-button>
          </div>
        </div>
        <div class="counter-table__body" v-loading="pendings.isDepositing || pendings.isWithdrawing">
          <el-form label-position="left" label-left="160px">
            <el-form-item label="钱包余额">
              <div class="form-item__value"><strong>{{ sharing.underlyingAssetBalance }}</strong> <span>{{ underlyingAssetTokenSymbol }}</span></div>
            </el-form-item>
            <!-- <el-form-item label="cToken">
              <div class="form-item__value"><strong>{{ underlyingAssetToken ? underlyingAssetToken.cTokenAddress : '' }}</strong></span></div>
            </el-form-item> -->
            <el-form-item label="存款余额">
              <div class="form-item__value"><strong>{{ formCToken.cTokenBalance }}</strong> <span>{{ formCToken.cTokenSymbol }}</span></div>
            </el-form-item>
            <el-form-item label="抵押因子">
              <div class="form-item__value"><strong>{{ formCToken.collateralFactorMantissa ? formCToken.collateralFactorMantissa * 100 : '-' }}</strong> <span>%</span></div>
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
              :disabled="pendings.isBorrowing || pendings.isRepaying"
              @click="onBorrow">{{ pendings.isBorrowing ? '正在借款' : '借款' }}</el-button>
            <el-button
              size="small" type="warning" plain class="btn-action"
              :disabled="pendings.isBorrowing || pendings.isRepaying"
              @click="onRepay">{{ pendings.isRepaying ? '正在还款' : '一键还款' }}</el-button>
          </div>
        </div>
        <div class="counter-table__body" v-loading="pendings.isBorrowing || pendings.isRepaying">
          <el-form label-position="left" label-left="160px">
            <el-form-item label="已借">
              <div class="form-item__value"><strong>{{ borrowBalanceFormatted }}</strong> <span>{{ underlyingAssetTokenSymbol }}</span></div>
            </el-form-item>
            <el-form-item label="可借">
              <div class="form-item__value"><strong>{{ formCToken.canBorrowBalance }}</strong> <span>{{ underlyingAssetTokenSymbol }}</span></div>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from 'ethers'

import { ABI as ABI_ERC20 } from '@/constants/erc20-tokens.js'
import {
  Address_cEther, Address_cToken, Address_comptroller,
  ABI_cToken, ABI_cEther, ABI_comptroller,
} from '@/constants/contracts/compound'
import cTokens from '@/constants/contracts/compound/cTokens'

export default {
  name: 'CompoundBankCounter',
  props: {
    provider: {
      type: Object,
      default: () => {
        return {}
      }
    },
  },
  data() {
    return {
      cTokens,
      pendings: {
        isEntering: false,
        isQuoting: false,
        isDepositing: false,
        isWithdrawing: false,
        isBorrowing: false,
        isRepaying: false,
      },
      sharing: {
        underlyingAssetAddress: '',
        underlyingAssetBalance: '',
      },
      cTokenContract: null,
      formCToken: {
        cTokenBalance: '',
        borrowBalanceStored: '',
        cTokenSymbol: '',
        exchangeRateCurrent: '',
        canBorrowBalance: '',
        collateralFactorMantissa: ''
      },
      compTroller: null,
      priceFeed: null,
    }
  },
  computed: {
    underlyingAssetToken() {
      const token = _.find(this.cTokens, { address: this.sharing.underlyingAssetAddress })
      return token
    },
    underlyingAssetTokenSymbol() {
      const token = this.underlyingAssetToken
      return token ? token.symbol : ''
    },
    borrowBalanceFormatted() {
      return this.formCToken.borrowBalanceStored ? ethers.utils.formatUnits(this.formCToken.borrowBalanceStored.toString(), this.underlyingAssetToken.decimals) : ''
    }
  },
  mounted() {
    // this.enterMarkets()
  },
  methods: {
    getSigner() {
      return this.provider.getSigner()
    },
    getCTokenContract() {
      const signer = this.getSigner()
      const cTokenContract = new ethers.Contract(this.underlyingAssetToken.cTokenAddress, ABI_cToken, signer)
      return cTokenContract
    },
    getComptrollerContract() {
      if (this.compTroller) return this.compTroller
      const compTroller = new ethers.Contract(Address_comptroller, ABI_comptroller, this.provider)
      this.compTroller = compTroller
      return compTroller
    },
    getPriceFeed() {
      if (this.priceFeed) return this.priceFeed
      const priceFeed = new ethers.Contract(
        '0x841616a5CBA946CF415Efe8a326A621A794D0f97',
        ['function price(string memory symbol) external view returns (uint)'],
        this.provider
      )
      this.priceFeed = priceFeed
      return priceFeed
    },
    getTxAmount(amount, decimals) {
      // int => Big Number
      const _amount = ethers.utils.parseUnits(amount + '', decimals)
      return _amount
    },
    async _updateUnderlyingAssetBalance() {
      const signer = this.getSigner()
      const msgSender = await signer.getAddress()
      const erc20Contract = new ethers.Contract(this.underlyingAssetToken.address, ABI_ERC20, signer)
      const balance = await erc20Contract.callStatic.balanceOf(msgSender)
      this.sharing.underlyingAssetBalance = ethers.utils.formatUnits(balance.toString(), this.underlyingAssetToken.decimals)
    },
    async _updateCTokenBalance() {
      const signer = this.getSigner()
      const msgSender = await signer.getAddress()
      const cTokenContract = this.getCTokenContract()
      const balance = await cTokenContract.callStatic.balanceOf(msgSender)
      this.formCToken.cTokenBalance = ethers.utils.formatUnits(balance.toString(), this.underlyingAssetToken.cTokenDecimals)
      this.formCToken.cTokenSymbol = this.underlyingAssetToken.cTokenSymbol

      const borrowBalance = await cTokenContract.callStatic.borrowBalanceStored(msgSender)
      this.formCToken.borrowBalanceStored = borrowBalance
    },
    async _updateborrowBalanceStored() {
      // TODO
      const signer = this.getSigner()
      const msgSender = await signer.getAddress()
      const compTroller = this.getComptrollerContract()

    },
    async _getPriceToUSD() {
      const priceFeed = this.getPriceFeed()
      const price = await priceFeed.callStatic.price(this.underlyingAssetTokenSymbol)
      return price
    },
    async _updateCanBorrowBalance() {
      const signer = this.getSigner()
      const msgSender = await signer.getAddress()
      const compTroller = this.getComptrollerContract()
      // 获取抵押银子
      const [, collateralFactorMantissa, ] = await compTroller.connect(signer).callStatic.markets(this.underlyingAssetToken.cTokenAddress)
      this.formCToken.collateralFactorMantissa = ethers.utils.formatUnits(collateralFactorMantissa, 18)
      // 计算可借贷额度
      const [errorCode, liquidity, shortfall] = await compTroller.connect(signer).callStatic.getAccountLiquidity(msgSender)
      if (errorCode == 0) {
        if (+(shortfall.toString()) < 0) {
          this.$message.error('即将被清算')
        } else {
          const priceToUSD = await this._getPriceToUSD()
          const canBorrowBalance = liquidity.div(1e12).div(priceToUSD).toString()  // 1e12 是因为 liquidity 是 USD的价格，decimals 是6
          this.formCToken.canBorrowBalance = canBorrowBalance
        }
      }
    },
    onChangeAsset() {
      this.updateFinanceData()
      this.quoteExchangeRateCurrent()
    },
    updateFinanceData() {
      this._updateUnderlyingAssetBalance()
      this._updateCTokenBalance()
      this._updateborrowBalanceStored()
      this._updateCanBorrowBalance()
    },
    async enterMarkets() {
      this.pendings.isEntering = true
      const cTokenContracts = _.map(this.cTokens, 'cTokenAddress')
      const signer = this.getSigner()
      const compTroller = this.getComptrollerContract()
      const tx = await compTroller.connect(signer).enterMarkets(cTokenContracts)
      await tx.wait()
      this.pendings.isEntering = false
    },
    async quoteExchangeRateCurrent() {
      try {
        this.pendings.isQuoting = true
        const cTokenContract = this.getCTokenContract()
        let exchangeRateCurrent = await cTokenContract.callStatic.exchangeRateCurrent()
        exchangeRateCurrent = exchangeRateCurrent / Math.pow(10, 18 + this.underlyingAssetToken.decimals - 8)
        this.formCToken.exchangeRateCurrent = exchangeRateCurrent.toFixed(6)
      } catch (error) {
        console.log('quoteExchangeRateCurrent failed: ', error)
      }
      this.pendings.isQuoting = false
    },
    async _handleApproveToCToken(assetTokenAddress, amountToWei) {
      const signer = this.getSigner()
      const msgSender = await signer.getAddress()
      const abi = [ 'function approve(address spender, uint256 amount) external returns (bool)', 'function allowance(address owner, address spender) external view returns (uint256)']
      const tokenContract = new ethers.Contract(assetTokenAddress, abi, signer)
      const allowance = await tokenContract.callStatic.allowance(msgSender, this.underlyingAssetToken.cTokenAddress)
      if (allowance.lt(amountToWei)) {
        const tx = await tokenContract.approve(this.underlyingAssetToken.cTokenAddress, amountToWei)
        const receipt = await tx.wait()
      }
    },
    async onDeposit() {
      this.$prompt(`请输入存款金额(不得超过当前余额：${this.sharing.underlyingAssetBalance})`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^\d{1,}(\.\d+)?$/,
        inputErrorMessage: '存款金额必须是正数'
      }).then(({ value }) => {
        value = +value
        if (value <= 0) {
          this.$message.error('存款金额必须是正数')
        } else if (value > +this.sharing.underlyingAssetBalance) {
          this.$message.error(`存款金额不得超过当前余额：${this.sharing.underlyingAssetBalance}`)
        } else {
          // 处理存款
          this._handleDeposit(value)
        }
      }).catch(() => {})
    },
    async _handleDeposit(amount) {
      try {
        this.pendings.isDepositing = true
        const signer = this.getSigner()
        const msgSender = await signer.getAddress()
        const amountToWei = this.getTxAmount(amount, this.underlyingAssetToken.decimals)
        // approve, 会判断 allowance 是否足够完成存款，否则发起 approve
        await this._handleApproveToCToken(this.sharing.underlyingAssetAddress, amountToWei)
        // mint 存款
        const cTokenContract = this.getCTokenContract()
        const tx = await cTokenContract.mint(amountToWei)
        const receipt = await tx.wait()
        console.log('@@@ deposit receipt', receipt)
        this.$message({type: 'success', message: '操作成功'})
        this.updateFinanceData()
        this.$emit('success')
      } catch (error) {
        console.log('@@@ deposit fail', error)
        this.$message.error('操作失败')
      }
      this.pendings.isDepositing = false
    },
    onWithdraw() {
      this.$prompt(`请输入取款金额(不得超过当前cToken余额：${this.formCToken.cTokenBalance})`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^\d{1,}(\.\d+)?$/,
        inputErrorMessage: '取款金额必须是正数'
      }).then(({ value }) => {
        value = +value
        if (value <= 0) {
          this.$message.error('取款金额必须是正数')
        } else if (value > +this.formCToken.cTokenBalance) {
          this.$message.error(`取款金额不得超过当前cToken余额：${this.formCToken.cTokenBalance}`)
        } else {
          this._handleWithdraw(value)
        }
      }).catch(() => {})
    },
    async _handleWithdraw(amount) {
      try {
        this.pendings.isWithdrawing = true
        const signer = this.getSigner()
        const msgSender = await signer.getAddress()
        const amountToWei = this.getTxAmount(amount, this.underlyingAssetToken.cTokenDecimals)
        const cTokenContract = this.getCTokenContract()
        const tx = await cTokenContract.redeem(amountToWei)
        const receipt = await tx.wait()
        console.log('@@@ withdraw receipt', receipt)
        this.$message({type: 'success', message: '操作成功'})
        this.updateFinanceData()
        this.$emit('success')
      } catch (error) {
        console.log('@@@ withdraw fail', error)
        this.$message.error('操作失败')
      }
      this.pendings.isWithdrawing = false
    },
    onBorrow() {
      this.$prompt(`请输入借贷数量(不得超过当前可借贷额度：${this.formCToken.canBorrowBalance})`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^\d{1,}(\.\d+)?$/,
        inputErrorMessage: '借贷金额必须是正数'
      }).then(({ value }) => {
        value = +value
        if (value <= 0) {
          this.$message.error('借贷数量必须是正数')
        } else if (value > +this.formCToken.canBorrowBalance) {
          this.$message.error(`借贷金额不得超过当前Token可借贷额度：${this.formCToken.canBorrowBalance}`)
        } else {
          this._handleBorrow(value)
        }
      }).catch(() => {})
    },
    async _handleBorrow(amount) {
      try {
        this.pendings.isBorrowing = true
        const signer = this.getSigner()
        const msgSender = await signer.getAddress()
        const amountToWei = this.getTxAmount(amount, this.underlyingAssetToken.decimals)
        const cTokenContract = this.getCTokenContract()
        const tx = await cTokenContract.borrow(amountToWei)
        const receipt = await tx.wait()
        console.log('@@@ borrow receipt', receipt)
        this.$message({type: 'success', message: '操作成功'})
        this.updateFinanceData()
        this.$emit('success')
      } catch (error) {
        console.log('@@@ borrow fail', error)
        this.$message.error('操作失败')
      }
      this.pendings.isBorrowing = false
    },
    onRepay() {
      this._handleRepayBorrow()
    },
    async _handleRepayBorrow(amount) {
      try {
        this.pendings.isRepaying = true
        const signer = this.getSigner()
        const msgSender = await signer.getAddress()
        // const amountToWei = this.formCToken.borrowBalanceStored // .mul(2)
        const amountToWei = ethers.constants.MaxUint256
        await this._handleApproveToCToken(this.sharing.underlyingAssetAddress, amountToWei)
        const cTokenContract = this.getCTokenContract()
        const tx = await cTokenContract.repayBorrow(amountToWei)
        const receipt = await tx.wait()
        console.log('@@@ repay receipt', receipt)
        this.$message({type: 'success', message: '操作成功'})
        this.updateFinanceData()
        this.$emit('success')
      } catch (error) {
        console.log('@@@ repay fail', error)
        this.$message.error('操作失败')
      }
      this.pendings.isRepaying = false
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
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.exchange-rate {
  font-size: 12px;
  color: #60a3bc;
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