<template>
  <div class="bank-counter">
    <div class="bank-counter__header">
      <el-select class="asset-select" :value="assetData.address" placeholder="请选择资产">
        <el-option :label="assetData.symbol" :value="assetData.address"/>
      </el-select>
      <span>银行余额：{{ bankBalance }}</span>
    </div>
    <div class="bank-counter__body">
      <div class="counter-table">
        <div class="counter-table__header">
          <h4 class="counter-table__label">存款</h4>
          <div class="counter-table__actions">
            <el-button
              size="small" type="primary" plain class="btn-action"
              :disabled="pendings.isDepositing || pendings.isWithdrawing"
              @click="onDeposit">{{ pendings.isDepositing ? '正在存款' : '存入100个 DAI' }}</el-button>
            <el-button
              size="small" type="waring" plain class="btn-action"
              :disabled="pendings.isDepositing || pendings.isWithdrawing"
              @click="onWithdraw">{{ pendings.isWithdrawing ? '正在取款' : '全部取款' }}</el-button>
          </div>
        </div>
        <div class="counter-table__body" v-loading="pendings.isDepositing || pendings.isWithdrawing">
          <el-form label-position="left" label-left="160px">
            <el-form-item label="钱包余额">
              <div class="form-item__value"><strong>{{ customerData.balance }}</strong> <span>{{ assetData.symbol }}</span></div>
            </el-form-item>
            <el-form-item label="存款余额">
              <div class="form-item__value"><strong>{{ customerData.aTokenBalance }}</strong> <span>{{ assetData.aTokenSymbol }}</span></div>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <div class="counter-table">
        <div class="counter-table__header">
          <h4 class="counter-table__label">借款(切换账户进行两步操作)</h4>
          <div class="counter-table__actions">
            <el-button
              size="small" type="primary" plain class="btn-action"
              @click="onApproveDelegation">ApproveDelegation</el-button>
            <el-button
              size="small" type="primary" plain class="btn-action"
              :disabled="pendings.isBorrowing || pendings.isRepaying"
              @click="onBorrow">{{ pendings.isBorrowing ? '正在借款' : '借款' }}</el-button>
            <!-- <el-button
              size="small" type="warning" plain class="btn-action"
              :disabled="pendings.isBorrowing || pendings.isRepaying"
              @click="onRepay">{{ pendings.isRepaying ? '正在还款' : '一键还款' }}</el-button> -->
          </div>
        </div>
        <div class="counter-table__body" v-loading="pendings.isBorrowing || pendings.isRepaying">
          <el-form label-position="left" label-left="160px">
            <el-form-item label="已借(可变利率)">
              <div class="form-item__value"><strong>{{ customerData.variableDebtTokenBalance }}</strong> <span>{{ assetData.symbol }}</span></div>
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
  ABI_EIP20,
  ABI_DebtToken,
  ABI_ProtocolDataProvider
} from '@/constants/contracts/aave/index.js'

const ABI_PriceOracle = [ "function getAssetPrice(address asset) view returns (uint256)" ]

/**
 * 本组件模拟用户授权第三方合约来进行 存、取、借、还
 * 角色分配：
 *    用户      - customer
 *    第三方合约 - this.signer
 * 存款步骤：
 *    1. customer 存款时，合约调用 approve 方法，获取对 customer 的 token/aToken 的 权限；
 *    2. 合约调用 tokenInstance.transferFrom 方法，把 customer 账户下数量为 amount 的 token 转移到合约账户下；
 *    3. 合约调用 aave.deposit 方法，存入 amount 个 token，并将 onBehalfOf 设为 customer.address, 这样 amount 个 aToken 就存在了 customer 账户下；
 * 取款步骤：
 *    1. 合约调用 aTokenContract.transferFrom 方法，将 amount 个 aToken 转移到合于账户下；
 *    2. 合约调用 aave.withdraw 方法，提取 amount 个 token 到 customer.address, 同时 aave 会销毁 合约账户下的 amount 个 aToken
 */
export default {
  name: 'BankCounter3rdParty',
  props: {
    provider: {
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
  },
  data() {
    return {
      signer: null,
      pendings: {
        isDepositing: false,
        isWithdrawing: false,
        isBorrowing: false,
        isRepaying: false,
      },
      bankBalance: '0.00',
      amount: 100,
      customerData: {
        // 另外一个钱包，
        walletAddress: '0x260B1BfAaEd136757193c5e5e4b9ec308D9cD27b',
        balance: '0.00',
        aTokenBalance: '0.00',
        variableDebtTokenBalance: '0.00'
      },
      assetData: {
        "aTokenAddress": "0x028171bCA77440897B824Ca71D1c56caC55b68A3",
        "aTokenSymbol": "aDAI",
        "stableDebtTokenAddress": "0x778A13D3eeb110A4f7bb6529F99c000119a08E92",
        "variableDebtTokenAddress": "0x6C3c78838c761c6Ac7bE9F59fe808ea2A6E4379d",
        "symbol": "DAI",
        "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        "decimals": 18
      }
    }
  },
  mounted() {
    this.updateAccountsData()
  },
  methods: {
    getSigner() {
      return this.provider.getSigner()
    },
    async getERC20TokenBalance(tokenAddress, walletAddress, decimals = 18) {
      const signer = this.getSigner()
      const erc20Contract = new ethers.Contract(tokenAddress, ABI_ERC20, signer)
      const balance = await erc20Contract.balanceOf(walletAddress)
      return ethers.utils.formatUnits(balance.toString(), decimals)
    },
    getTxAmount(amount, token) {
      // int => Big Number
      if (!token) return null
      const _amount = ethers.utils.parseUnits(amount + '', token.decimals)
      return _amount
    },
    async updateAccountsData() {
      // 更新 customer 的 aToken balance (存款)
      // 更新 customer 的 debtToken balance (借款)
      const balance = await this.getERC20TokenBalance(this.assetData.address, this.customerData.walletAddress)
      const aTokenBalance = await this.getERC20TokenBalance(this.assetData.aTokenAddress, this.customerData.walletAddress)
      const variableDebtTokenBalance = await this.getERC20TokenBalance(this.assetData.variableDebtTokenAddress, this.customerData.walletAddress)
      console.log(`
        balance: ${balance};
        aTokenBalance: ${aTokenBalance};
        variableDebtTokenBalance: ${variableDebtTokenBalance};
      `)
      this.customerData = {
        ...this.customerData,
        balance,
        aTokenBalance,
        variableDebtTokenBalance
      }
      const signer = this.getSigner()
      const msgSender = await signer.getAddress()
      const bankBalance = await this.getERC20TokenBalance(this.assetData.address, msgSender)
      this.bankBalance = bankBalance
    },

    async getApprovePayload(amount, assetAddress) {
      const signer = this.getSigner()
      const msgSender = await signer.getAddress()
      const amountToWei = this.getTxAmount(amount, this.assetData)
      const erc20Contract = new ethers.Contract(assetAddress, ABI_ERC20, signer)
      const allowance = await erc20Contract.callStatic.allowance(msgSender, this.lendingPool.address)
      if (allowance.lt(amountToWei)) {
        // allowance 已经足够完成这次交易的 amount, 则不再发起本次 approve
        return [erc20Contract, amountToWei]
      }
      return [erc20Contract, null]
    },
    async _handleApprove(amount, assetAddress) {
      const token = this.assetData
      try {
        const [erc20Contract, approveAmount] = await this.getApprovePayload(amount, assetAddress)
        if (!approveAmount) return;
        const tx = await erc20Contract.approve(this.lendingPool.address, approveAmount)
        const receipt = await tx.wait()  // 等待交易确认
      } catch (error) {
        console.log('@@@@@ _handleApprove error', error)
        throw error
      }
    },
    async onDeposit() {
      /**
       * 1. customer transfer 100 DAI   to Our Bank
       * 2. Our Bank deposit  100 DAI   to AAVE
       * 2. Our Bank transfer 100 aDAI  to customer
       */
      try {
        this.pendings.isDepositing = true
        const signer = this.getSigner()
        const msgSender = await signer.getAddress()
        const underlyingAssetAddress = this.assetData.address
        await this._handleApprove(this.amount, underlyingAssetAddress)
        const amount = this.getTxAmount(this.amount, this.assetData)
        const payload = [
          underlyingAssetAddress,           // address asset
          amount,                           // uint amount
          msgSender,  // address onBehalfOf
          0                                 // uint16 referralCode
        ]
        const tx = await this.lendingPool.connect(signer).deposit(...payload)
        const receipt = await tx.wait()
        // console.log(receipt)
        // Our Bank (contract) transfer 100 aDAI to customer
        const aDaiInstance = new ethers.Contract(this.assetData.aTokenAddress, ABI_ERC20, signer)
        const transferTx = await aDaiInstance.transfer(this.customerData.walletAddress, amount)
        console.log('@@@@@ transferTx', transferTx)
        if (transferTx.wait) {
          await transferTx.wait()
        }
        this._handleSuccess()
      } catch (error) {
        console.log(error)
        throw error
      }
      this.pendings.isDepositing = false
    },
    async onWithdraw() {
      /**
       * Our Bank withdraw 100 DAI from AAVE to customer wallet
       */
      try {
        this.pendings.isWithdrawing = true
        const signer = this.getSigner()
        const msgSender = await signer.getAddress()
        const amount = this.getTxAmount(this.customerData.aTokenBalance, this.assetData)
        console.log('@@@@@ withdraw amount', this.customerData.aTokenBalance, amount)
        const payload = [
          this.assetData.address,           // address asset
          amount,                           // uint amount
          msgSender,                        // address onBehalfOf
        ]
        const tx = await this.lendingPool.connect(signer).withdraw(...payload)
        const receipt = await tx.wait()
        this._handleSuccess()
      } catch (error) {
        console.log(error)
        throw error
      }
      this.pendings.isWithdrawing = false
    },
    async onApproveDelegation() {
      try {
        const delegator = this.getSigner()
        const amount = 50
        const debtTokenVariable = new ethers.Contract(this.assetData.variableDebtTokenAddress, ABI_DebtToken)
        const borrowAmount = this.getTxAmount(amount, this.assetData)

        const borrowTx = await debtTokenVariable.connect(delegator)
                                                .approveDelegation(this.customerData.walletAddress, borrowAmount)
        const receipt = await borrowTx.wait()
        console.log('@@@@@ onApproveDelegation receipt', receipt)
      } catch (error) {
        console.log('@@@@@ onApproveDelegation error', error)
      }
    },
    async onBorrow() {
      /**
       * Credit Delegation
       * https://docs.aave.com/developers/guides/credit-delegation
       */
      try {
        // variable
        // const delegatee = new ethers.Wallet(delegateePrivateKey, this.provider)
        const delegatee = this.getSigner()
        const delegateeAddress = await delegatee.getAddress()
        const amount = 50  // 借 100个 DAI
        const amountToWei = this.getTxAmount(amount, this.assetData)
        const interestRateMode = 2
        // approveDelegation
        const payload = [
          this.assetData.address,            // address asset
          amountToWei,                      // uint amount
          interestRateMode,                 // unit interestRateMode
          0,                                // referralCode
          delegateeAddress,  // address onBehalfOf
        ]
        const tx = await this.lendingPool.connect(delegatee).borrow(...payload)
        const receipt = await tx.wait()
        this._handleSuccess()

      } catch (error) {
        console.log('update debtBalanceVariable', error)
      }

    },
    onRepay() {},
    _handleSuccess() {
      this.$message({ message: `操作成功`, type: 'success' })
      this.updateAccountsData()
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