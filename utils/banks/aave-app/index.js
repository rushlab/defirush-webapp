import _ from 'lodash'
import { ethers } from 'ethers'
// import BankApp from '../bank-apps'
import BankApp from '../BankApp'

// import { getTxAmount, handleApprove, getTokenBalance, getTokenBalanceFormatted } from '@/utils/transaction-helper'

import {
  lendingPoolAddress, lendingPoolABI,
  addressesProviderAddress, addressesProviderABI,
  priceOracleAddress, priceOracleABI,
  WETHGatewayAddress, WETHGatewayABI,
  ProtocolDataProviderAddress, ProtocolDataProviderABI,
  WethTokenAddress,
  EthTokenAddress,
} from './constants'

import markets from './markets'


/**
 *
 * @param {ethers.Signer}     signer
 */
 export default class AaveApp extends BankApp {
  // 初始化 Aave 银行
  constructor(signer) {
    super(signer)
    // init contact instances
    this.addressesProvider = new ethers.Contract(addressesProviderAddress, addressesProviderABI, signer)
    this.priceOracle = new ethers.Contract(priceOracleAddress, priceOracleABI, signer)
    this.lendingPool = new ethers.Contract(lendingPoolAddress, lendingPoolABI, signer)
    this.dataProvider = new ethers.Contract(ProtocolDataProviderAddress, ProtocolDataProviderABI, signer)
    this.WETHGatewayInstance = null
    this.markets = markets
    this.aWETH = (this.markets.find((item) => item.aTokenSymbol === 'aWETH')).aTokenAddress
  }

  /**
   * 返回 asset 的美元价格, 单位是 us dollar
   */
   async _getAssetPrice(asset) {
    const chainLinkETHUSDAddress = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'
    const chainLinkETHUSD = new ethers.Contract(chainLinkETHUSDAddress, [
      'function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)'
    ], this.provider)
    const [priceInETH, [,priceETHUSD,,,]] = await Promise.all([
      this.priceOracle.getAssetPrice(asset),
      chainLinkETHUSD.latestRoundData(),
    ]);
    // ChainLink::ETHUSD 的 decimals 是 8
    return ethers.utils.formatUnits(priceInETH.mul(priceETHUSD), 18 + 8);
  }

  /**
   *
   * @param {Address} asset
   * @returns {Decimals} 返回 token.decimals
   */
  async _getERC20TokenDecimals(asset) {
    const erc20 = new ethers.Contract(asset, ['function decimals() view returns (uint256)'], this.provider)
    return +((await erc20.decimals()).toString())
  }

  async getAssetData(asset) {
    if (this._isETH(asset)) asset = WethTokenAddress
    const [decimals, priceUSD] = await Promise.all([
      this._getERC20TokenDecimals(asset),
      this._getAssetPrice(asset),
    ]);

    const [
      availableLiquidity, totalStableDebt, totalVariableDebt,
      liquidityRate, variableBorrowRate, stableBorrowRate,
      averageStableBorrowRate, liquidityIndex, variableBorrowIndex, lastUpdateTimestamp,
    ] = await this.dataProvider.getReserveData(asset);
    const totalBorrows = totalStableDebt.add(totalVariableDebt);
    const totalDeposits = totalStableDebt.add(totalVariableDebt).add(availableLiquidity);
    const depositAPY = liquidityRate;
    const borrowAPY = variableBorrowRate;
    return {
      totalDeposits: ethers.utils.formatUnits(totalDeposits, decimals),
      totalBorrows: ethers.utils.formatUnits(totalBorrows, decimals),
      // https://docs.aave.com/developers/v/2.0/guides/apy-and-apr
      depositAPY: ethers.utils.formatUnits(depositAPY, 27),
      borrowAPY: ethers.utils.formatUnits(borrowAPY, 27),
      priceUSD: priceUSD,
    };
  }

  /**
   *
   * @param {Address} underlyingToken
   * @returns {aTokenAddress}
   */
  _getMarketOfUnderlying(underlyingToken) {
    const result = this.markets.find((item) => {
      return item.address.toLowerCase() === underlyingToken.toLowerCase()
    })
    if (result) {
      return result.aTokenAddress
    } else {
      throw new Error('Invalid underlying token address');
    }
  }

  async enableUnderlying(underlyingToken) { return true }

  async underlyingEnabled(underlyingToken) { return true }

  async underlyingAllowance(underlyingToken) {
    const spender = this.lendingPool.address
    return await super._allowance(underlyingToken, spender)
  }

  /**
   * 把数量为 amount 的 underlyingToken 授权给银行 (ERC20 方法)
   * @param      Address     underlyingToken  The underlying token
   * @param      BigNumber   amount           The amount
   */
  async approveUnderlying(underlyingToken, amountDisplay) {
    const spender = this.lendingPool.address
    const decimals = await this._getERC20TokenDecimals(underlyingToken)
    console.log(`@@@ before approve amountDisplay: ${amountDisplay}, decimals is ${decimals}`)
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals)
    console.log(`@@@ before approve amountMantissa: ${amountMantissa}`)
    return await super._approve(underlyingToken, spender, amountMantissa)
  }

  async getUserAccountData() {
    const msgSender = await this.signer.getAddress()
    return await this.lendingPool.callStatic.getUserAccountData(msgSender)
  }

  async getUserAccountDataFormatted() {
    const [
      totalCollateralETH,
      totalDebtETH,
      availableBorrowsETH,
      currentLiquidationThreshold,
      ltv,
      healthFactor,
    ] = await this.getUserAccountData()
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
   * @param {TokenAddress}      underlyingToken
   * @param {BigNumber}         amountMantissa
   * @returns {Transaction}
   */
   async _handleDeposit(underlyingToken, amountMantissa) {
    const onBehalfOf = await this.signer.getAddress()
    const payload = [
      underlyingToken,          // address asset
      amountMantissa,           // uint amountMantissa
      onBehalfOf,               // address onBehalfOf
      0                         // uint16 referralCode
    ]
    const tx = await this.lendingPool.connect(this.signer).deposit(...payload)
    const receipt = await tx.wait()
    return receipt
  }

  /**
   * @description               获取 WETHGateway 实例
   * @returns                   WETHGatewayInstance
   */
   _getWETHGatewayInstance() {
    if (!this.WETHGatewayInstance) this.WETHGatewayInstance = new ethers.Contract(WETHGatewayAddress, WETHGatewayABI, this.signer)
    return this.WETHGatewayInstance
  }

  /**
   *
   * @param {BigNumber}           amountMantissa
   * @returns {Transaction}
   */
   async _handleDepositWETH(amountMantissa) {
    const onBehalfOf = await this.signer.getAddress()
    const payload = [
      this.lendingPool.address,   // address lendingPool contract
      onBehalfOf,                 // address onBehalfOf
      0,                          // uint16 referralCode
      {
        value: amountMantissa
      }
    ]
    const wethGatewayInstance = this._getWETHGatewayInstance()
    const tx = await wethGatewayInstance.depositETH(...payload)
    const receipt = await tx.wait()
    return receipt
  }

  /**
   *
   * @description                 执行 deposit 之前，应该对 erc20 token 进行 allowance 检查或者 approve
   * @param {TokenAddress}        underlyingAssetToken
   * @param {Decimals}            amountDisplay
   */
   async deposit(underlyingToken, amountDisplay) {
    // 如果是 eth 存款，则使用 WETHGatewai.depositETH
    if (this._isETH(underlyingToken)) {
      const amountMantissa = ethers.utils.parseEther(amountDisplay.toString())
      return await this._handleDepositWETH(amountMantissa)
    } else {
      const decimals = await this._getERC20TokenDecimals(underlyingToken)
      const amountMantissa = this._displayToMantissa(amountDisplay, decimals)
      return await this._handleDeposit(underlyingToken, amountMantissa)
    }
  }

  /**
   * @description                 withdraw weth 之前需要对 aWETH 进行 allowance 检车或者 approve，以便lendingPool 销毁 aweth
   * @param                       {BigNumber} amount
   */
  async _handleWithdrawWETH(amount) {
    const to = await this.signer.getAddress()
    const payload = [
      this.lendingPool.address,
      amount,
      to,
    ]
    const wethGatewayInstance = this._getWETHGatewayInstance()
    const tx = await wethGatewayInstance.withdrawETH(...payload)
    const receipt = await tx.wait()
    return receipt
  }

  /**
   *
   * @param                       {TokenAddress} underlyingToken
   * @param                       {*} amount
   * @returns
   */
  async _handleWithdraw(underlyingToken, amount) {
    const to = await this.signer.getAddress()
    const tx = await this.lendingPool.connect(this.signer).withdraw(underlyingToken, amount, to)
    const receipt = await tx.wait()
    return receipt
  }

  /**
   * 取出数量为 amount 的 underlyingToken 的存款
   * @param      Address     underlyingToken  The underlying token
   * @param      BigNumber   amount           The amount
   */
  async withdraw(underlyingToken, amount) {
    if (!amount) {
      throw new Error('Amount is required when withdraw')
    }
    if (this._isETH(underlyingToken)) {
      return await this._handleWithdrawWETH(amount)
    } else {
      return await this._handleWithdraw(underlyingToken, amount)
    }
  }

  /**
   * 取出所有 underlyingToken 的存款
   * @param      Address     underlyingToken  The underlying token
   */
  async withdrawAll(underlyingToken) {
    const amount = ethers.constants.MaxUint256
    if (this._isETH(underlyingToken)) {
      return await this._handleWithdrawWETH(amount)
    } else {
      return await this._handleWithdraw(underlyingToken, amount)
    }
  }

  async _handleBorrowWETH(amount, interestRateMode, referralCode) {
    const payload = [
      this.lendingPool.address,   // lendingPool
      amount,                // uint amount
      interestRateMode,           // unit interestRateMode
      referralCode,               // referralCode
    ]
    const wethGatewayInstance = this._getWETHGatewayInstance()
    const tx = await wethGatewayInstance.borrowETH(...payload)
    const receipt = await tx.wait()
    return receipt
  }

  async _handleBorrow(underlyingAssetAddress, amount, referralCode = 0, interestRateMode) {
    const payload = [
      underlyingAssetAddress,     // address asset
      amount,                // uint amount
      interestRateMode,           // unit interestRateMode
      referralCode,               // referralCode
      onBehalfOf,                 // address onBehalfOf
    ]
    const tx = await this.lendingPool.connect(this.signer).borrow(...payload)
    const receipt = await tx.wait()
    return receipt
  }

  async borrow(underlyingAssetAddress, amount, referralCode = 0, interestRateMode) {
    if (underlyingAssetAddress.toLowerCase() === WethTokenAddress || underlyingAssetAddress.toLowerCase() === EthTokenAddress) {
      return await this._handleBorrowWETH(amount, interestRateMode)
    } else {
      return await this._handleBorrow(underlyingAssetAddress, amount, referralCode, interestRateMode)
    }
  }


  async _handleRepayWETH(amount, interestRateMode) {
    const payload = [
      this.lendingPool.address,   // lendingPool
      amount,                // uint amount
      interestRateMode,           // unit interestRateMode
      onBehalfOf,                 // address onBehalfOf
      {
        value: amount
      }
    ]

    const wethGatewayInstance = this._getWETHGatewayInstance()
    const tx = await wethGatewayInstance.borrowETH(...payload)
    const receipt = await tx.wait()
    return receipt
  }

  async _handleRepay(underlyingAssetAddress, amount, referralCode = 0, interestRateMode) {
    const payload = [
      underlyingAssetAddress,     // address asset
      amount,                // uint amount
      interestRateMode,           // unit interestRateMode
      referralCode,               // referralCode
      onBehalfOf,                 // address onBehalfOf
    ]
    const tx = await this.lendingPool.connect(this.signer).borrow(...payload)
    const receipt = await tx.wait()
    return receipt
  }

  /**
   *
   * @description 如果是 ERC20 的还款，需要提前进行 allowance 检查或者 approve
   * @param {Token Address}       underlyingAssetAddress
   * @param {BigNumber}           amount
   * @param {Integer}             referralCode
   * @param {Integer}             interestRateMode
   * @param {Wallet Address}      onBehalfOf
   * @returns {Receipt}
   */
  async repay(underlyingAssetAddress, amount, referralCode = 0, interestRateMode) {
    if (underlyingAssetAddress.toLowerCase() === WethTokenAddress || underlyingAssetAddress.toLowerCase() === EthTokenAddress) {
      return await this._handleRepayWETH(amount, interestRateMode)
    } else {
      return await this._handleRepay(underlyingAssetAddress, amount, referralCode, interestRateMode)
    }
  }
}
