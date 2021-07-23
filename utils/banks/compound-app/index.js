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

class CompoundApp extends BankApp {
  constructor(signer) {
    super(signer);
    /* 都放到 this 下面, 代码里就不需要使用全局变量了, 避免和局部变量命名冲突 */
    this.addresses = addresses;
    this.markets = markets;
    this.cETH = (this.markets.find((item) => item.symbol === 'cETH')).address;
    this.comptroller = new ethers.Contract(this.addresses['Comptroller'], [
      'function enterMarkets(address[] calldata vTokens) returns (uint[] memory)',
      'function getAssetsIn(address account) view returns (address[] memory)',
      'function getAccountLiquidity(address account) view returns (uint, uint, uint)',
      'function markets(address vTokenAddress) view returns (bool, uint, bool)',
      'function oracle() view returns (address)',
    ], this.signer);
  }

  _isCETH(cToken) {
    return cToken.toLowerCase() === this.cETH.toLowerCase();
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

  /**
   * 返回 underlyingToken 的价格 in usd
   */
  async _getUnderlyingPriceMantissa(underlyingToken) {
    if (!this._priceOracle) {
      const _address = await this.comptroller.oracle();
      this._priceOracle = new ethers.Contract(_address, [
        'function getUnderlyingPrice(address cToken) view returns (uint)',
      ], this.provider);
    }
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const priceMantissa = await this._priceOracle.getUnderlyingPrice(cTokenAddr);
    return priceMantissa;
  }

  async getAssetData(underlyingToken) {
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const cToken = new ethers.Contract(cTokenAddr, [
      'function supplyRatePerBlock() view returns (uint)',
      'function borrowRatePerBlock() view returns (uint)',
      'function getCash() view returns (uint)',
      'function totalBorrows() view returns (uint)',
    ], this.provider);
    const [decimals, priceUsdMantissa] = await Promise.all([
      this._decimals(underlyingToken),
      this._getUnderlyingPriceMantissa(underlyingToken),
    ]);
    const [supplyRate, borrowRate, totalLiquidity, totalBorrows] = await Promise.all([
      cToken.supplyRatePerBlock(),
      cToken.borrowRatePerBlock(),
      cToken.getCash(),
      cToken.totalBorrows(),
    ]);
    const totalDeposits = totalLiquidity.add(totalBorrows);
    const depositAPY = _rateToApyDisplay(supplyRate);
    const borrowAPY = _rateToApyDisplay(borrowRate);
    return {
      totalDeposits: this._mantissaToDisplay(totalDeposits, decimals),
      totalBorrows: this._mantissaToDisplay(totalBorrows, decimals),
      depositAPY: depositAPY,
      borrowAPY: borrowAPY,
      // getUnderlyingPrice 返回的价格是 scale 过的, price decimals + token decimals = 36
      priceUSD: this._mantissaToDisplay(priceUsdMantissa, 36 - decimals),
    };
  }

  async getAccountData() {
    return {}
  }

  async getAccountAssetData(underlyingToken) {
    return {}
  }

  async enableUnderlying(underlyingToken) {
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    await this.comptroller.enterMarkets([cTokenAddr]);
  }

  async underlyingEnabled(underlyingToken) {
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const userMarkets = await this.comptroller.getAssetsIn(await this._userAddress());
    return userMarkets.map(a=>a.toLowerCase()).indexOf(cTokenAddr.toLowerCase()) >= 0;
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
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    // 这里最好检查 this.underlyingEnabled, 建议用户存款的同时也 enterMarket, 不然也没啥意义, 但先不这么做
    if (this._isCETH(cTokenAddr)) {
      const cToken = new ethers.Contract(cTokenAddr, ['function mint() payable'], this.signer);
      await cToken.mint({ value: amountMantissa }).then((tx) => tx.wait());
    } else {
      const allowanceMantissa = await this.underlyingAllowance(underlyingToken);
      if (allowanceMantissa.lt(amountMantissa)) {
        throw new Error('allowance of underlying token is not enough');
      }
      const cToken = new ethers.Contract(cTokenAddr, ['function mint(uint256)'], this.signer);
      await cToken.mint(amountMantissa).then((tx) => tx.wait());
    }
  }

  async borrow(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const cToken = new ethers.Contract(cTokenAddr, [
      'function borrow(uint borrowAmount) returns (uint)',
    ], this.signer);
    await cToken.borrow(amountMantissa).then((tx) => tx.wait());
  }

  async repay(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    if (this._isCETH(cTokenAddr)) {
      const cToken = new ethers.Contract(cTokenAddr, [
        'function repayBorrow() payable',
      ], this.signer);
      await cToken.repayBorrow({ value: amountMantissa }).then((tx) => tx.wait());
    } else {
      const cToken = new ethers.Contract(cTokenAddr, [
        'function repayBorrow(uint borrowAmount) returns (uint)',
      ], this.signer);
      await cToken.repayBorrow(amountMantissa).then((tx) => tx.wait());
    }
  }

  async repayAll(underlyingToken) {
    // 不支持 ETH 的 repayAll
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const cToken = new ethers.Contract(cTokenAddr, [
      'function repayBorrow(uint borrowAmount) returns (uint)',
    ], this.signer);
    const _max = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    await cToken.repayBorrow(_max).then((tx) => tx.wait());
  }

  async withdraw(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const cToken = new ethers.Contract(cTokenAddr, [
      'function redeemUnderlying(uint redeemAmount) returns (uint)',
    ], this.signer);
    await cToken.redeemUnderlying(amountMantissa).then((tx) => tx.wait());
  }

  async withdrawAll(underlyingToken) {
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const cToken = new ethers.Contract(cTokenAddr, [
      'function balanceOf(address account) view returns (uint)',
      'function redeem(uint redeemTokens) returns (uint)',
    ], this.signer);
    const balanceMantissa = await cToken.balanceOf(await this._userAddress());
    await cToken.redeem(balanceMantissa).then((tx) => tx.wait());
  }

}

module.exports = {
  CompoundApp
}
