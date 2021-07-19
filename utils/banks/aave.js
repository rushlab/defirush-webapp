import _ from 'lodash'
import { ethers } from 'ethers'
import { getTxAmount, handleApprove, getTokenBalance, getTokenBalanceFormatted } from '@/utils/transaction-helper'

import {
  lendingPoolAddress, lendingPoolABI,
  addressesProviderAddress, addressesProviderABI,
  priceOracleAddress, priceOracleABI,
  WETHGatewayAddress, WETHGatewayABI,
  WethTokenAddress,
  EthTokenAddress,
} from './aave-constants'

/**
 *
 * @param {ethers.Signer}     userWallet
 */
function Aave(userWallet) {
  // 初始化 Aave 银行
  this._initialize(userWallet);
}


Aave.prototype._initialize = function(userWallet) {
  this.userWallet = userWallet
  this.addressesProvider = new ethers.Contract(addressesProviderAddress, addressesProviderABI, userWallet)
  this.priceOracle = new ethers.Contract(priceOracleAddress, priceOracleABI, userWallet)
  this.lendingPool = new ethers.Contract(lendingPoolAddress, lendingPoolABI, userWallet)
  this.WETHGatewayInstance = null
}

Aave.prototype.getUserAccountData = async function() {
  console.log(this.userWallet)
  const msgSender = await this.userWallet.getAddress()
  return await this.lendingPool.callStatic.getUserAccountData(msgSender)
}

Aave.prototype.getUserAccountDataFormatted = async function() {
  const [
    totalCollateralETH,
    totalDebtETH,
    availableBorrowsETH,
    currentLiquidationThreshold,
    ltv,
    healthFactor,
  ] = await this.getUserAccountData()
  console.log('totalCollateralETH', totalCollateralETH)
  console.log('totalDebtETH', totalDebtETH)
  return {
    totalCollateralETH: ethers.utils.formatUnits(totalCollateralETH),
    totalDebtETH: ethers.utils.formatUnits(totalDebtETH),
    availableBorrowsETH: ethers.utils.formatUnits(availableBorrowsETH),
    currentLiquidationThreshold: (+currentLiquidationThreshold.div(100).toString()).toFixed(2) + '%',
    ltv: (+ltv.div(100).toString()).toFixed(2) + '%',
    healthFactor: totalDebtETH.isZero() ? ' - ' : ethers.utils.formatEther(healthFactor)
  }
}

/**
 *
 * @param {TokenAddress}      underlyingAssetAddress
 * @param {BigNumber}         amountToWei
 * @param {Address}           onBehalfOf
 * @returns {Transaction}
 */
Aave.prototype._handleDeposit = async function(underlyingAssetAddress, amountToWei, onBehalfOf) {
  if (!onBehalfOf) onBehalfOf = await this.userWallet.getAddress()
  const payload = [
    underlyingAssetAddress,   // address asset
    amountToWei,              // uint amount
    onBehalfOf,               // address onBehalfOf
    0                         // uint16 referralCode
  ]
  const tx = await this.lendingPool.connect(this.userWallet).deposit(...payload)
  const receipt = await tx.wait()
  console.log('@@@ _handleDeposit success', receipt)
  return receipt
}

/**
 * @description               获取 WETHGateway 实例
 * @returns                   WETHGatewayInstance
 */
 Aave.prototype._getWETHGatewayInstance = function() {
  if (!this.WETHGatewayInstance) {
    this.WETHGatewayInstance = new ethers.Contract(WETHGatewayAddress, WETHGatewayABI, this.userWallet)
  }
  return this.WETHGatewayInstance
}

/**
 *
 * @param {BigNumber}           amountToWei
 * @param {Address}             onBehalfOf
 * @returns {Transaction}
 */
Aave.prototype._handleDepositWETH = async function(amountToWei, onBehalfOf) {
  if (!onBehalfOf) onBehalfOf = await this.userWallet.getAddress()
  const payload = [
    this.lendingPool.address,   // address lendingPool contract
    onBehalfOf,                 // address onBehalfOf
    0,                          // uint16 referralCode
    {
      value: amountToWei
    }
  ]
  const wethGatewayInstance = this._getWETHGatewayInstance()
  const tx = await wethGatewayInstance.depositETH(...payload)
  const receipt = await tx.wait()
  console.log('@@@ _handleDepositWETH success', receipt)
  return receipt
}

/**
 *
 * @description                 执行 deposit 之前，应该对 erc20 token 进行 allowance 检查或者 approve
 * @param {TokenAddress}        underlyingAssetToken
 * @param {BigNumber}           amountToWei
 * @param {Address}             onBehalfOf
 */
Aave.prototype.deposit = async function(underlyingAssetAddress, amountToWei, onBehalfOf) {
  // 如果是 eth 存款，则使用 WETHGatewai.depositETH
  if (underlyingAssetAddress.toLowerCase() === WethTokenAddress || underlyingAssetAddress.toLowerCase() === EthTokenAddress) {
    return await this._handleDepositWETH(amountToWei, onBehalfOf)
  } else {
    return await this._handleDeposit(underlyingAssetAddress, amountToWei, onBehalfOf)
  }
}

/**
 * @description                 withdraw weth 之前需要对 aWETH 进行 allowance 检车或者 approve，以便lendingPool 销毁 aweth
 * @param                       {BigNumber} amountToWei
 * @param                       {Wallet Address} to
 */
Aave.prototype._handleWithdrawWETH = async function(amountToWei, to) {
  if (amountToWei === -1) amountToWei = ethers.constants.MaxUint256
  if (!to) to = await this.userWallet.getAddress()
  // const aWethTokenAddress = '0x030bA81f1c18d280636F32af80b9AAd02Cf0854e'
  // const erc20ABI = ["function approve(address spender, uint256 amount) external returns (bool)"]
  // const aWethInstance = new ethers.Contract(aWethTokenAddress, erc20ABI, this.userWallet)
  const payload = [
    this.lendingPool.address,
    amountToWei,
    to,
  ]
  const wethGatewayInstance = this._getWETHGatewayInstance()
  const tx = await wethGatewayInstance.withdrawETH(...payload)
  const receipt = await tx.wait()
  return receipt
}

/**
 *
 * @param                       {TokenAddress} underlyingAssetAddress
 * @param                       {*} amountToWei
 * @param                       {*} to
 * @returns
 */
Aave.prototype._handleWithdraw = async function(underlyingAssetAddress, amountToWei, to) {
  if (amountToWei === -1) amountToWei = ethers.constants.MaxUint256
  if (!to) to = await this.userWallet.getAddress()
  const tx = await this.lendingPool.connect(this.userWallet).withdraw(underlyingAssetAddress, amountToWei, to)
  const receipt = await tx.wait()
  return receipt
}

/**
 *
 * @param {TokenAddress}        underlyingAssetAddress
 * @param {BigNumber}           amountToWei 如果该值为 -1， 则全部取出
 * @param {Wallet Address}      to
 */
Aave.prototype.withdraw = async function(underlyingAssetAddress, amountToWei, to) {
  if (underlyingAssetAddress.toLowerCase() === WethTokenAddress || underlyingAssetAddress.toLowerCase() === EthTokenAddress) {
    return await this._handleWithdrawWETH(amountToWei, onBehalfOf)
  } else {
    return await this._handleWithdraw(nderlyingAssetAddress, amountToWei, to)
  }
}

Aave.prototype._handleBorrowWETH = async function(amountToWei, interestRateMode, referralCode) {
  const payload = [
    this.lendingPool.address,   // lendingPool
    amountToWei,                // uint amount
    interestRateMode,           // unit interestRateMode
    referralCode,               // referralCode
  ]
  const wethGatewayInstance = this._getWETHGatewayInstance()
  const tx = await wethGatewayInstance.borrowETH(...payload)
  const receipt = await tx.wait()
  return receipt
}

Aave.prototype._handleBorrow = async function(underlyingAssetAddress, amountToWei, referralCode = 0, interestRateMode, onBehalfOf) {
  const payload = [
    underlyingAssetAddress,     // address asset
    amountToWei,                // uint amount
    interestRateMode,           // unit interestRateMode
    referralCode,               // referralCode
    onBehalfOf,                 // address onBehalfOf
  ]
  const tx = await this.lendingPool.connect(this.userWallet).borrow(...payload)
  const receipt = await tx.wait()
  return receipt
}

Aave.prototype.borrow = async function(underlyingAssetAddress, amountToWei, referralCode = 0, interestRateMode, onBehalfOf) {
  if (underlyingAssetAddress.toLowerCase() === WethTokenAddress || underlyingAssetAddress.toLowerCase() === EthTokenAddress) {
    return await this._handleBorrowWETH(amountToWei, interestRateMode, onBehalfOf)
  } else {
    return await this._handleBorrow(underlyingAssetAddress, amountToWei, referralCode, interestRateMode, onBehalfOf)
  }
}


Aave.prototype._handleRepayWETH = async function(amountToWei, interestRateMode, onBehalfOf) {
  const payload = [
    this.lendingPool.address,   // lendingPool
    amountToWei,                // uint amount
    interestRateMode,           // unit interestRateMode
    onBehalfOf,                 // address onBehalfOf
    {
      value: amountToWei
    }
  ]

  const wethGatewayInstance = this._getWETHGatewayInstance()
  const tx = await wethGatewayInstance.borrowETH(...payload)
  const receipt = await tx.wait()
  return receipt
}

Aave.prototype._handleRepay = async function(underlyingAssetAddress, amountToWei, referralCode = 0, interestRateMode, onBehalfOf) {
  const payload = [
    underlyingAssetAddress,     // address asset
    amountToWei,                // uint amount
    interestRateMode,           // unit interestRateMode
    referralCode,               // referralCode
    onBehalfOf,                 // address onBehalfOf
  ]
  const tx = await this.lendingPool.connect(this.userWallet).borrow(...payload)
  const receipt = await tx.wait()
  return receipt
}

/**
 *
 * @description 如果是 ERC20 的还款，需要提前进行 allowance 检查或者 approve
 * @param {Token Address}       underlyingAssetAddress
 * @param {BigNumber}           amountToWei
 * @param {Integer}             referralCode
 * @param {Integer}             interestRateMode
 * @param {Wallet Address}      onBehalfOf
 * @returns {Receipt}
 */
Aave.prototype.repay = async function(underlyingAssetAddress, amountToWei, referralCode = 0, interestRateMode, onBehalfOf) {
  if (underlyingAssetAddress.toLowerCase() === WethTokenAddress || underlyingAssetAddress.toLowerCase() === EthTokenAddress) {
    return await this._handleRepayWETH(amountToWei, interestRateMode, onBehalfOf)
  } else {
    return await this._handleRepay(underlyingAssetAddress, amountToWei, referralCode, interestRateMode, onBehalfOf)
  }
}

export default Aave