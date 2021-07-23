const { ethers } = require('ethers');
const { BankApp } = require('../bank-apps');
const { addresses, markets } = require('./constants');

const _rateToApyDisplay = (rateMantissa) => {
  // APY = ((((Rate / ETH Mantissa * Blocks Per Day + 1) ^ Days Per Year)) - 1) * 100
  const blocksPerDay = 6570; // 13.15 seconds per block
  const daysPerYear = 365;
  const ethMantissa = 1e18;
  const rate = +rateMantissa.toString();
  // 这里不返回百分比, 最后不需要除以 100
  const apy = (((Math.pow((rate / ethMantissa * blocksPerDay) + 1, daysPerYear))) - 1);
  return apy.toString();
}

class CreamApp extends BankApp {
  constructor(signer) {
    super(signer);
    /* 都放到 this 下面, 代码里就不需要使用全局变量了, 避免和局部变量命名冲突 */
    this.addresses = addresses;
    this.markets = markets;
    this.crETH = (this.markets.find((item) => item.symbol === 'crETH')).address;
    this.comptroller = new ethers.Contract(this.addresses['Comptroller'], [
      'function enterMarkets(address[] calldata vTokens) returns (uint[] memory)',
      'function getAssetsIn(address account) view returns (address[] memory)',
      'function getAccountLiquidity(address account) view returns (uint, uint, uint)',
      'function markets(address vTokenAddress) view returns (bool, uint, bool)',
      'function oracle() view returns (address)',
    ], this.signer);
  }

  _isCrETH(crToken) {
    return crToken.toLowerCase() === this.crETH.toLowerCase();
  }

  _getMarketOfUnderlying(underlyingToken) {
    const result = this.markets.find((item) => {
      return item.underlyingAddress.toLowerCase() === underlyingToken.toLowerCase()
    });
    if (result) {
      return result.address;
    } else {
      throw new Error('Invalid underlying token address');
    }
  }

  async _getEtherUsdPriceMantissa(asset) {
    const chainLink = new ethers.Contract(this.addresses['ChainLink::ETHUSD'], [
      // returns: roundId, answer, startedAt, updatedAt, answeredInRound
      'function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)'
    ], this.provider);
    const [,priceETHUSD,,,] = await chainLink.latestRoundData();
    // ChainLink::ETHUSD 的 decimals 是 8
    return priceETHUSD;
  }

  /**
   * 返回 underlyingToken 的价格 in eth
   */
  async _getUnderlyingPriceMantissa(underlyingToken) {
    const priceOracle = new ethers.Contract(this.addresses['PriceOracleProxy'], [
      'function getUnderlyingPrice(address crToken) view returns (uint)',
    ], this.provider);
    const crTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const priceMantissa = await priceOracle.getUnderlyingPrice(crTokenAddr);
    return priceMantissa;
  }

  async getAssetData(underlyingToken) {
    const crTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const crToken = new ethers.Contract(crTokenAddr, [
      'function supplyRatePerBlock() view returns (uint)',
      'function borrowRatePerBlock() view returns (uint)',
      'function getCash() view returns (uint)',
      'function totalBorrows() view returns (uint)',
    ], this.provider);
    const [decimals, priceMantissa, priceEtherUsdMantissa] = await Promise.all([
      this._decimals(underlyingToken),
      this._getUnderlyingPriceMantissa(underlyingToken),
      this._getEtherUsdPriceMantissa(),
    ]);
    // getUnderlyingPrice 返回的价格是 scale 过的, price decimals + token decimals = 36
    // ChainLink::ETHUSD 的 decimals 是 8
    const priceUsdDisplay = ethers.utils.formatUnits(
      priceMantissa.mul(priceEtherUsdMantissa), 36 - decimals + 8);
    const [supplyRate, borrowRate, totalLiquidity, totalBorrows] = await Promise.all([
      crToken.supplyRatePerBlock(),
      crToken.borrowRatePerBlock(),
      crToken.getCash(),
      crToken.totalBorrows(),
    ]);
    const totalDeposits = totalLiquidity.add(totalBorrows);
    const depositAPY = _rateToApyDisplay(supplyRate);
    const borrowAPY = _rateToApyDisplay(borrowRate);
    return {
      totalDeposits: this._mantissaToDisplay(totalDeposits, decimals),
      totalBorrows: this._mantissaToDisplay(totalBorrows, decimals),
      depositAPY: depositAPY,
      borrowAPY: borrowAPY,
      priceUSD: priceUsdDisplay,
    };
  }

  async getAccountData() {
    return {}
  }

  async getAccountAssetData(underlyingToken) {
    return {}
  }

  async enableUnderlying(underlyingToken) {
    const crTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    await this.comptroller.enterMarkets([crTokenAddr]);
  }

  async underlyingEnabled(underlyingToken) {
    const crTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const userMarkets = await this.comptroller.getAssetsIn(await this._userAddress());
    return userMarkets.map(a=>a.toLowerCase()).indexOf(crTokenAddr.toLowerCase()) >= 0;
  }

  async approveUnderlying(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    const spender = this._getMarketOfUnderlying(underlyingToken);
    await super._approve(underlyingToken, spender, amountMantissa);
  }

  async underlyingAllowance(underlyingToken) {
    const spender = this._getMarketOfUnderlying(underlyingToken);
    return await super._allowance(underlyingToken, spender);
  }

  async deposit(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    const crTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    // 这里最好检查 this.underlyingEnabled, 建议用户存款的同时也 enterMarket, 不然也没啥意义, 但先不这么做
    if (this._isCrETH(crTokenAddr)) {
      const crToken = new ethers.Contract(crTokenAddr, ['function mint() payable'], this.signer);
      await crToken.mint({ value: amountMantissa }).then((tx) => tx.wait());
    } else {
      const allowanceMantissa = await this.underlyingAllowance(underlyingToken);
      if (allowanceMantissa.lt(amountMantissa)) {
        throw new Error('allowance of underlying token is not enough');
      }
      const crToken = new ethers.Contract(crTokenAddr, ['function mint(uint256)'], this.signer);
      await crToken.mint(amountMantissa).then((tx) => tx.wait());
    }
  }

  async borrow(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    const crTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const crToken = new ethers.Contract(crTokenAddr, [
      'function borrow(uint borrowAmount) returns (uint)',
    ], this.signer);
    await crToken.borrow(amountMantissa).then((tx) => tx.wait());
  }

  async repay(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    const crTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    if (this._isCrETH(crTokenAddr)) {
      const crToken = new ethers.Contract(crTokenAddr, [
        'function repayBorrow() payable',
      ], this.signer);
      await crToken.repayBorrow({ value: amountMantissa }).then((tx) => tx.wait());
    } else {
      const crToken = new ethers.Contract(crTokenAddr, [
        'function repayBorrow(uint borrowAmount) returns (uint)',
      ], this.signer);
      await crToken.repayBorrow(amountMantissa).then((tx) => tx.wait());
    }
  }

  async repayAll(underlyingToken) {
    // 不支持 ETH 的 repayAll
    const crTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const crToken = new ethers.Contract(crTokenAddr, [
      'function repayBorrow(uint borrowAmount) returns (uint)',
    ], this.signer);
    const _max = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    await crToken.repayBorrow(_max).then((tx) => tx.wait());
  }

  async withdraw(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    const crTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const crToken = new ethers.Contract(crTokenAddr, [
      'function redeemUnderlying(uint redeemAmount) returns (uint)',
    ], this.signer);
    await crToken.redeemUnderlying(amountMantissa).then((tx) => tx.wait());
  }

  async withdrawAll(underlyingToken) {
    const crTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const crToken = new ethers.Contract(crTokenAddr, [
      'function balanceOf(address account) view returns (uint)',
      'function redeem(uint redeemTokens) returns (uint)',
    ], this.signer);
    const balanceMantissa = await crToken.balanceOf(await this._userAddress());
    await crToken.redeem(balanceMantissa).then((tx) => tx.wait());
  }

}

module.exports = {
  CreamApp
}
