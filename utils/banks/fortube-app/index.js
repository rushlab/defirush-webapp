const { ethers } = require('ethers');
const { BankApp } = require('../bank-app');
const { addresses, markets } = require('./constants');

class ForTubeApp extends BankApp {
  constructor($wallet) {
    super($wallet);
    /* 都放到 this 下面, 代码里就不需要使用全局变量了, 避免和局部变量命名冲突 */
    this.addresses = addresses;
    this.markets = markets;
    this.bankcontroller = new ethers.Contract(this.addresses['BankController'], [
      'function deposit(address token, uint256 amount)',
      'function tokenDecimals(address token) view returns (uint256)',
      'function getFTokeAddress(address underlying) view returns (address)',
      'function getTotalDepositAndBorrow(address account) view returns (uint256, uint256)',
      'function fetchAssetPrice(address token) view returns (uint256, bool)',
      'function oracle() view returns(address)',
      'function getAssetsIn(address account) view returns (address[])',
      'function getAccountLiquidity(address account) view returns (uint256, uint256)'
    ], this.$wallet.getProvider());
    this.bank = new ethers.Contract(this.addresses['Bank'], [
      'function borrow(address underlying, uint256 borrowAmount)',
      'function deposit(address token, uint256 amount) payable',
      'function repay(address token, uint256 repayAmount) payable',                                  // User repayment
      'function withdraw(address underlying, uint256 withdrawTokens) returns (uint256)',             // The user specifies a certain amount of ftoken and retrieves the underlying assets
      'function withdrawUnderlying(address underlying, uint256 withdrawAmount) returns (uint256)',   // The user retrieves a certain amount of underlying assets
    ], this.$wallet.getProvider());
  }

  _getUnderlyingOfMarket(fTokenAddr) {
    const result = this.markets.find((item) => {
      return item.address.toLowerCase() === fTokenAddr.toLowerCase()
    });
    if (result) {
      return result.underlyingAddress;
    } else {
      throw new Error('Invalid cToken address');
    }
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

  async getAssetData(underlyingToken) {
    const fTokenAddr = await this.bankcontroller.getFTokeAddress(underlyingToken);
    const fToken = new ethers.Contract(fTokenAddr, [
      'function getSupplyRate() public view returns (uint256)',
      'function getBorrowRate() public view returns (uint256)',
      'function APR() public view returns (uint256)',
      'function APY() public view returns (uint256)',
      'function totalCash() public view returns (uint256)',
      'function totalBorrows() public view returns (uint256)',
    ], this.$wallet.getProvider());

    const decimals = await this._decimals(underlyingToken);
    const [priceUsdMantissa, oracleSet] = await this.bankcontroller.fetchAssetPrice(underlyingToken);
    const [depositAPY, borrowAPY, totalLiquidity, totalBorrows] = await Promise.all([
      fToken.APY(),
      fToken.APR(),
      fToken.totalCash(),
      fToken.totalBorrows()
    ]);
    const totalDeposits = totalLiquidity.add(totalBorrows);

    return {
      totalDeposits: this._mantissaToDisplay(totalDeposits, decimals),
      totalBorrows: this._mantissaToDisplay(totalBorrows, decimals),
      depositAPY: this._mantissaToDisplay(depositAPY, 18),
      borrowAPY: this._mantissaToDisplay(borrowAPY, 18),
      //
      priceUSD: this._mantissaToDisplay(priceUsdMantissa, 18),
    };

  }

  /**
   * 返回用户有头寸的资产
   *
   * @return     Array      { deposits: [address1, ...], borrows: [address1, ...] }
   */

  async getAccountAssets() {
    const _userAddress = this.$wallet.getAddress();
    const fTokens = await this.bankcontroller.getAssetsIn(_userAddress);
    const deposits = [];
    const borrows = [];
    const _promises = fTokens.map(async (fTokenAddr) => {
      const fTokens = new ethers.Contract(fTokenAddr, [
        'function underlying() view returns (address)',
        'function getAccountState(address account) view returns (uint256, uint256, uint256)'
      ], this.$wallet.getProvider());
      const [fTokensBalance,borrowBalance] = await fTokens.getAccountState(_userAddress);
      const underlyingToken = this._getUnderlyingOfMarket(fTokenAddr);
      if (fTokensBalance.gt(0)) {
        deposits.push(underlyingToken);
      }
      if (borrowBalance.gt(0)) {
        borrows.push(underlyingToken);
      }
    });
    await Promise.all(_promises);
    return { deposits, borrows };
  }

/**
   * 获得当前用户的账户信息, 比如余额等等
   *
   * @return     Object      { userDepositsUSD, userBorrowsUSD, availableBorrowsUSD }
   */

  async getAccountData() {
    const _userAddress = this.$wallet.getAddress();
    const [deposit, borrow] = await this.bankcontroller.getTotalDepositAndBorrow(_userAddress);
    const [availableBorrows,] = await this.bankcontroller.getAccountLiquidity(_userAddress);
    let totalDeposits = ethers.constants.Zero;
    let totalBorrows = ethers.constants.Zero;

    const fTokens = await this.bankcontroller.getAssetsIn(_userAddress);

    const _promises = fTokens.map(async (fTokenAddr) => {

      const _1e18 = ethers.utils.parseUnits('1', 18);

      const fToken = new ethers.Contract(fTokenAddr, [
        'function getAccountState(address account) view returns (uint256, uint256, uint256)',
        'function underlying() view returns (address)'
      ], this.$wallet.getProvider());
      const underlyingToken = await fToken.underlying();

      const decimals = await this._decimals(underlyingToken);
      const _1eDiff = ethers.utils.parseUnits('1', 18 - decimals);

      const [fTokenBalance, borrowBalance, exchangeRate] = await fToken.getAccountState(_userAddress);

      const underlyingBalance = fTokenBalance.mul(exchangeRate).div(_1e18);

      const [priceUsdMantissa, oracleSet] = await this.bankcontroller.fetchAssetPrice(underlyingToken);
      const underlyingDepositValueUSD = underlyingBalance.mul(priceUsdMantissa).mul(_1eDiff);
      //                         decimals              18                    18 - decimals
      const borrowValueUSD = borrowBalance.mul(priceUsdMantissa).mul(_1eDiff);
      //                         decimals           18           18 - decimals


      // console.log("1edecimal", _1edecimal.toString(), underlyingValueUSD.toString());

      totalDeposits = totalDeposits.add(underlyingDepositValueUSD);
      totalBorrows = totalBorrows.add(borrowValueUSD);

    });

    await Promise.all(_promises);

    return {
      userDepositsUSD: this._mantissaToDisplay(totalDeposits, 18 + 18),
      userBorrowsUSD: this._mantissaToDisplay(totalBorrows, 18 + 18),
      availableBorrowsUSD: this._mantissaToDisplay(availableBorrows, 18),
    }
  }


  /**
 * 获得当前用户对应某个资产的信息, 比如
 *
 * @return     Object      { userDeposits, userBorrows }
 */

  async getAccountAssetData(underlyingToken) {

    const decimals = await this._decimals(underlyingToken);
    const _userAddress = this.$wallet.getAddress();
    const _1e18 = ethers.utils.parseUnits('1', 18);
    const fTokenAddr = await this.bankcontroller.getFTokeAddress(underlyingToken);
    const fToken = new ethers.Contract(fTokenAddr, [
      'function getAccountState(address account) view returns (uint256, uint256, uint256)'
    ], this.$wallet.getProvider());
    const [fTokenBalance, borrowBalance, exchangeRate] = await fToken.getAccountState(_userAddress);
    const underlyingBalance = fTokenBalance.mul(exchangeRate).div(_1e18);
    return {
      userDeposits: this._mantissaToDisplay(underlyingBalance, decimals),
      userBorrows: this._mantissaToDisplay(borrowBalance, decimals)
    }
  }

  async enableUnderlying(underlyingToken) {}
  async underlyingEnabled(underlyingToken) { return true; }

  async approveUnderlying(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    // const spender = this._getMarketOfUnderlying(underlyingToken);
    const spender = this.addresses['BankController'];
    await super._approve(underlyingToken, spender, amountMantissa);
  }

  async underlyingAllowance(underlyingToken) {

    const decimals = await this._decimals(underlyingToken);
    const spender = this.addresses['BankController'];
    const allowanceMantissa = await super._allowance(underlyingToken, spender);
    return this._mantissaToDisplay(allowanceMantissa, decimals);

  }


  async deposit(underlyingToken, amountDisplay) {
    const signer = this.$wallet.getSigner();
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    if (this._isETH(underlyingToken)) {
      await this.bank.connect(signer).deposit(underlyingToken, amountMantissa, {
        value: amountMantissa
      }).then(this.$wallet.waitForTx);
    } else {
      const spender = this.addresses['BankController'];
      // const allowanceMantissa = await this.underlyingAllowance(underlyingToken);
      const allowanceMantissa = await super._allowance(underlyingToken, spender);
      if (allowanceMantissa.lt(amountMantissa)) {
        throw new Error('allowance of underlying token is not enough');
      }
      await this.bank.connect(signer)
        .deposit(underlyingToken, amountMantissa).then(this.$wallet.waitForTx);
    }
  }

  async borrow(underlyingToken, amountDisplay) {
    const signer = this.$wallet.getSigner();
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    await this.bank.connect(signer)
      .borrow(underlyingToken, amountMantissa).then(this.$wallet.waitForTx);
  }

  async repay(underlyingToken, amountDisplay) {
    const signer = this.$wallet.getSigner();
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    await this.bank.connect(signer)
      .repay(underlyingToken, amountMantissa).then(this.$wallet.waitForTx);
  }

  async repayAll(underlyingToken) {
    const signer = this.$wallet.getSigner();
    const _max = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    await this.bank.connect(signer)
      .repay(underlyingToken, _max).then(this.$wallet.waitForTx);
  }

  async withdraw(underlyingToken, amountDisplay) {
    const signer = this.$wallet.getSigner();
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    await this.bank.connect(signer)
      .withdrawUnderlying(underlyingToken, amountMantissa).then(this.$wallet.waitForTx);
  }

  async withdrawAll(underlyingToken) {
    const signer = this.$wallet.getSigner();
    const fTokenAddr = await this.bankcontroller.getFTokeAddress(underlyingToken);
    const fToken = new ethers.Contract(fTokenAddr, [
      'function balanceOfUnderlying(address) returns (uint256)',
      'function balanceOf(address) view returns (uint256)'
    ], this.$wallet.getProvider());
    const balanceMantissa = await fToken.balanceOf(this.$wallet.getAddress());
    await this.bank.connect(signer)
      .withdraw(underlyingToken, balanceMantissa).then(this.$wallet.waitForTx);;
  }
}

module.exports = {
  ForTubeApp
}
