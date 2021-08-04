const { ethers } = require('ethers');
const { BankApp } = require('../bank-app');
const { addresses, markets } = require('./constants');

class ForTubeApp extends BankApp {
  constructor($wallet) {
    super($wallet);
    /* 都放到 this 下面, 代码里就不需要使用全局变量了, 避免和局部变量命名冲突 */
    this.addresses = addresses;
    this.markets = markets;
    this.fETH = (this.markets.find((item) => item.symbol === 'fETH')).address;
    this.bankcontroller = new ethers.Contract(this.addresses['BankController'], [
      'function deposit(address token, uint256 amount)',
      'function tokenDecimals(address token) view returns (uint256)',
      'function getFTokeAddress(address underlying) view returns (address)',
      'function getTotalDepositAndBorrow(address account) view returns (uint256, uint256)',
      'function fetchAssetPrice(address token) view returns (uint256, bool)',
      'function oracle() view returns(address)',
      'function getAssetsIn(address account) view returns (address[])',
      'function getAccountLiquidity(address account) view returns (uint256, uint256)'
    ], this.$wallet.getSigner());

    this.bank = new ethers.Contract(this.addresses['Bank'], [
      'function borrow(address underlying, uint256 borrowAmount)',
      'function deposit(address token, uint256 amount) payable',
      'function repay(address token, uint256 repayAmount) payable',                                  // User repayment
      'function withdraw(address underlying, uint256 withdrawTokens) returns (uint256)',             // The user specifies a certain amount of ftoken and retrieves the underlying assets
      'function withdrawUnderlying(address underlying, uint256 withdrawAmount) returns (uint256)',   // The user retrieves a certain amount of underlying assets
    ], this.$wallet.getSigner());

    
  }

  _isFETH(fToken) {
    return fToken.toLowerCase() === this.fETH.toLowerCase();
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


  async _getUnderlyingPriceMantissa(underlyingToken) {
    if (!this._priceOracle) {

      const _address = await this.bankcontroller.oracle();
      this._priceOracle = new ethers.Contract(_address, [
      ], this.$wallet.getProvider());
    }

    const fTokenAddr = this._getMarketOfUnderlying(underlyingToken);
    const priceMantissa = await this._priceOracle.getUnderlyingPrice(fTokenAddr);

    return priceMantissa;
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

    const decimals = await this.bankcontroller.tokenDecimals(fTokenAddr);
    const [priceUsdMantissa, oracleSet] = await this.bankcontroller.fetchAssetPrice(underlyingToken);

    const [supplyRate, borrowRate, totalLiquidity, totalBorrows] = await Promise.all([
      fToken.getSupplyRate(),
      fToken.getBorrowRate(),
      fToken.totalCash(),
      fToken.totalBorrows()
    ]);


    const totalDeposits = totalLiquidity.add(totalBorrows);

    const depositAPY = await fToken.APR();
    const borrowAPY = await fToken.APY();

    console.log(`total deposit = ${totalDeposits}, total borrow = ${totalBorrows}, priceUsdMantissa = ${priceUsdMantissa},
                 decimals = ${decimals}, totalLiquidity = ${totalLiquidity}, depositAPY = ${depositAPY}, borrowAPY = ${borrowAPY}`)


    return {
      totalDeposits: this._mantissaToDisplay(totalDeposits, decimals),
      totalBorrows: this._mantissaToDisplay(totalBorrows, decimals),
      depositAPY: depositAPY,
      borrowAPY: borrowAPY,
      // getUnderlyingPrice 返回的价格是 scale 过的, price decimals + token decimals = 36
      priceUSD: this._mantissaToDisplay(priceUsdMantissa, 36 - decimals),
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

    // console.log(`fTokens = ${fTokens}`)

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

    return {
      userDepositsUSD: this._mantissaToDisplay(deposit, 18),
      userBorrowsUSD: this._mantissaToDisplay(borrow, 18),
      availableBorrowsUSD: this._mantissaToDisplay(availableBorrows, 18),
      // availableBorrowsUSD: 0
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
    // const spender = this._getMarketOfUnderlying(underlyingToken);
    const spender = this.addresses['BankController'];
    return await super._allowance(underlyingToken, spender);
  }

  async deposit(underlyingToken, amountDisplay) {

    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);

    const fTokenAddr = this._getMarketOfUnderlying(underlyingToken);

    // console.log(`underlyingToken = ${underlyingToken}, amountDisplay = ${amountDisplay}, amountMantissa = ${amountMantissa}`)

    if (this._isFETH(fTokenAddr)) {
      await this.bank.deposit(underlyingToken, amountMantissa, {
        value: amountMantissa
      }).then(this.$wallet.waitForTx);
    } else {
      const allowanceMantissa = await this.underlyingAllowance(underlyingToken);
      console.log(`allowance mantissa = ${allowanceMantissa}`)
      if (allowanceMantissa.lt(amountMantissa)) {
        throw new Error('allowance of underlying token is not enough');
      }
      await this.bank.deposit(underlyingToken, amountMantissa).then(this.$wallet.waitForTx);
    }

  }

  async borrow(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    await this.bank.borrow(underlyingToken, amountMantissa).then(this.$wallet.waitForTx);
  }

  async repay(underlyingToken, amountDisplay) {

    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);

    this.bank.repay(underlyingToken, amountMantissa).then(this.$wallet.waitForTx);

  }

  async repayAll(underlyingToken) {

    const fTokenAddr = await this.bankcontroller.getFTokeAddress(underlyingToken);
    const fToken = new ethers.Contract(fTokenAddr, [
      'function accountBorrows(address) view returns (uint256)'
    ], this.$wallet.getSigner());

    // const ftokenBalanceMantissa = await fToken.balanceOf(this.$wallet.getAddress());
    // let borrowsMantissa = await fToken.accountBorrows(this.$wallet.getAddress());
    // console.log(`ftoken addr = ${fTokenAddr}, account borrows = ${borrowsMantissa}`);

    const _max = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    await this.bank.repay(underlyingToken, _max).then(this.$wallet.waitForTx);

  }

  async withdraw(underlyingToken, amountDisplay) {

    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);

    await this.bank.withdrawUnderlying(underlyingToken, amountMantissa).then(this.$wallet.waitForTx);

  }

  async withdrawAll(underlyingToken) {


    const fTokenAddr = await this.bankcontroller.getFTokeAddress(underlyingToken);
    const fToken = new ethers.Contract(fTokenAddr, [
      'function balanceOfUnderlying(address) returns (uint256)',
      'function balanceOf(address) view returns (uint256)'
    ], this.$wallet.getSigner());

    const balanceMantissa = await fToken.balanceOf(this.$wallet.getAddress());

    await this.bank.withdraw(underlyingToken, balanceMantissa).then(this.$wallet.waitForTx);;

  }
}

module.exports = {
  ForTubeApp
}
