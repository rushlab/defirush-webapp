const { ethers } = require('ethers');
const { BankApp } = require('../bank-app');
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
  constructor($wallet) {
    super($wallet);
    /* 都放到 this 下面, 代码里就不需要使用全局变量了, 避免和局部变量命名冲突 */
    this.addresses = addresses;
    this.markets = markets;
    this.comptroller = new ethers.Contract(this.addresses['Comptroller'], [
      'function enterMarkets(address[] calldata cTokens) returns (uint[] memory)',
      'function getAssetsIn(address account) view returns (address[] memory)',
      'function getAccountLiquidity(address account) view returns (uint, uint, uint)',
      'function markets(address cTokenAddress) view returns (bool, uint, bool)',
      'function oracle() view returns (address)',
    ], this.$wallet.getProvider());
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

  _getUnderlyingOfMarket(cTokenAddr) {
    const result = this.markets.find((item) => {
      return item.address.toLowerCase() === cTokenAddr.toLowerCase()
    });
    if (result) {
      return result.underlyingAddress;
    } else {
      throw new Error('Invalid cToken address');
    }
  }

  /**
   * 返回 cToken 的 underlyingToken 的价格 in usd
   */
  async _getUnderlyingPriceMantissa(cTokenAddr) {
    if (!this._priceOracle) {
      const _address = await this.comptroller.oracle();
      this._priceOracle = new ethers.Contract(_address, [
        'function getUnderlyingPrice(address cToken) view returns (uint)',
      ], this.$wallet.getProvider());
    }
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
    ], this.$wallet.getProvider());
    const [decimals, priceUsdMantissa] = await Promise.all([
      this._decimals(underlyingToken),
      this._getUnderlyingPriceMantissa(cTokenAddr),
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
    const _userAddress = this.$wallet.getAddress();
    const _1e18 = ethers.utils.parseUnits('1', 18);
    let totalBorrowsUSD = ethers.constants.Zero;
    let totalDepositsUSD = ethers.constants.Zero;
    const [,liquidityUSD,] = await this.comptroller.getAccountLiquidity(_userAddress);
    const cTokens = await this.comptroller.getAssetsIn(_userAddress);
    const _promises = cTokens.map(async (cTokenAddr) => {
      const {
        underlyingBalance, borrowBalance, underlyingValue, borrowValue
      } = await this._getCTokenData(cTokenAddr);
      // 不管 underlying 是啥, balance * price 的 decimals 始终是 36, 这里可以直接累加, 最后统一除以 1e36
      totalBorrowsUSD = totalBorrowsUSD.add(borrowValue);
      totalDepositsUSD = totalDepositsUSD.add(underlyingValue);
    });
    await Promise.all(_promises);
    // const availableCredit = totalBorrowsUSD.add(liquidityUSD);
    return {
      userDepositsUSD: this._mantissaToDisplay(totalDepositsUSD, 36),
      userBorrowsUSD: this._mantissaToDisplay(totalBorrowsUSD, 36),
      availableBorrowsUSD: this._mantissaToDisplay(liquidityUSD, 18),
    }
  }

  async getAccountAssets() {
    const _userAddress = this.$wallet.getAddress();
    const cTokens = await this.comptroller.getAssetsIn(_userAddress);
    const deposits = [];
    const borrows = [];
    const _promises = cTokens.map(async (cTokenAddr) => {
      const cToken = new ethers.Contract(cTokenAddr, [
        'function underlying() view returns (address)',
        'function getAccountSnapshot(address) view returns (uint,uint,uint,uint)',
      ], this.$wallet.getProvider());
      const [,cTokenBalance,borrowBalance,] = await cToken.getAccountSnapshot(_userAddress);
      const underlyingToken = this._getUnderlyingOfMarket(cTokenAddr);
      if (cTokenBalance.gt(0)) {
        deposits.push(underlyingToken);
      }
      if (borrowBalance.gt(0)) {
        borrows.push(underlyingToken);
      }
    });
    await Promise.all(_promises);
    return { deposits, borrows };
  }

  async _getCTokenData(cTokenAddr) {
    const _1e18 = ethers.utils.parseUnits('1', 18);
    const cToken = new ethers.Contract(cTokenAddr, [
      'function getAccountSnapshot(address) view returns (uint,uint,uint,uint)',
    ], this.$wallet.getProvider());
    const [
      _error, cTokenBalance, borrowBalance, exchangeRateMantissa
    ] = await cToken.getAccountSnapshot(this.$wallet.getAddress());
    const underlyingBalance = cTokenBalance.mul(exchangeRateMantissa).div(_1e18);
    const underlyingPriceMantissa = await this._getUnderlyingPriceMantissa(cTokenAddr);
    const borrowValue = borrowBalance.mul(underlyingPriceMantissa);
    const underlyingValue = underlyingBalance.mul(underlyingPriceMantissa);
    return { underlyingBalance, borrowBalance, underlyingValue, borrowValue };
  }

  async getAccountAssetData(underlyingToken) {
    const decimals = await this._decimals(underlyingToken);
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const { underlyingBalance, borrowBalance } = await this._getCTokenData(cTokenAddr);
    return {
      userDeposits: this._mantissaToDisplay(underlyingBalance, decimals),
      userBorrows: this._mantissaToDisplay(borrowBalance, decimals),
    }
  }

  async enableUnderlying(underlyingToken) {
    const signer = this.$wallet.getSigner();
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    await this.comptroller.connect(signer).enterMarkets([cTokenAddr]).then(this.$wallet.waitForTx);
  }

  async underlyingEnabled(underlyingToken) {
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const userMarkets = await this.comptroller.getAssetsIn(this.$wallet.getAddress());
    return userMarkets.map(a=>a.toLowerCase()).indexOf(cTokenAddr.toLowerCase()) >= 0;
  }

  async approveUnderlying(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    const spender = this._getMarketOfUnderlying(underlyingToken);
    await super._approve(underlyingToken, spender, amountMantissa);
  }

  async underlyingAllowance(underlyingToken) {
    const decimals = await this._decimals(underlyingToken);
    const spender = this._getMarketOfUnderlying(underlyingToken);
    const allowanceMantissa = await super._allowance(underlyingToken, spender);
    return this._mantissaToDisplay(allowanceMantissa, decimals);
  }

  async deposit(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    // 这里最好检查 this.underlyingEnabled, 建议用户存款的同时也 enterMarket, 不然也没啥意义, 但先不这么做
    if (this._isETH(underlyingToken)) {
      const cToken = new ethers.Contract(cTokenAddr, ['function mint() payable'], this.$wallet.getSigner());
      await cToken.mint({ value: amountMantissa }).then(this.$wallet.waitForTx);
    } else {
      // const allowanceMantissa = await this.underlyingAllowance(underlyingToken);
      const allowanceMantissa = await super._allowance(underlyingToken, cTokenAddr);
      if (allowanceMantissa.lt(amountMantissa)) {
        throw new Error('allowance of underlying token is not enough');
      }
      const cToken = new ethers.Contract(cTokenAddr, ['function mint(uint256)'], this.$wallet.getSigner());
      await cToken.mint(amountMantissa).then(this.$wallet.waitForTx);
    }
  }

  async borrow(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const cToken = new ethers.Contract(cTokenAddr, [
      'function borrow(uint borrowAmount) returns (uint)',
    ], this.$wallet.getSigner());
    await cToken.borrow(amountMantissa).then(this.$wallet.waitForTx);
  }

  async repay(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    if (this._isETH(underlyingToken)) {
      const cToken = new ethers.Contract(cTokenAddr, [
        'function repayBorrow() payable',
      ], this.$wallet.getSigner());
      await cToken.repayBorrow({ value: amountMantissa }).then(this.$wallet.waitForTx);
    } else {
      const cToken = new ethers.Contract(cTokenAddr, [
        'function repayBorrow(uint borrowAmount) returns (uint)',
      ], this.$wallet.getSigner());
      await cToken.repayBorrow(amountMantissa).then(this.$wallet.waitForTx);
    }
  }

  async repayAll(underlyingToken) {
    // 不支持 ETH 的 repayAll
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const cToken = new ethers.Contract(cTokenAddr, [
      'function repayBorrow(uint borrowAmount) returns (uint)',
    ], this.$wallet.getSigner());
    const _max = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    await cToken.repayBorrow(_max).then(this.$wallet.waitForTx);
  }

  async withdraw(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const cToken = new ethers.Contract(cTokenAddr, [
      'function redeemUnderlying(uint redeemAmount) returns (uint)',
    ], this.$wallet.getSigner());
    await cToken.redeemUnderlying(amountMantissa).then(this.$wallet.waitForTx);
  }

  async withdrawAll(underlyingToken) {
    const cTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const cToken = new ethers.Contract(cTokenAddr, [
      'function balanceOf(address account) view returns (uint)',
      'function redeem(uint redeemTokens) returns (uint)',
    ], this.$wallet.getSigner());
    const balanceMantissa = await cToken.balanceOf(this.$wallet.getAddress());
    await cToken.redeem(balanceMantissa).then(this.$wallet.waitForTx);
  }

}

module.exports = {
  CompoundApp
}
