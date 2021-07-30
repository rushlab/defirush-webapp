const { ethers } = require('ethers');
const { BankApp } = require('../bank-app');
const { addresses } = require('./constants');


class AaveApp extends BankApp {
  constructor($wallet) {
    super($wallet);
    this.addresses = addresses;
    this.lendingPool = new ethers.Contract(this.addresses['LendingPool'], [
      'function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
      'function withdraw(address asset, uint256 amount, address to)',
      'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
      'function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf)',
      'function getUserAccountData(address user) view returns (uint256,uint256,uint256,uint256,uint256,uint256)',
      'function getUserConfiguration(address user) view returns (uint256)',
      'function getReservesList() view returns (address[])',
    ], this.$wallet.getProvider());
    this.wETHGateway = new ethers.Contract(this.addresses['WETHGateway'], [
      'function depositETH(address lendingPool, address onBehalfOf, uint16 referralCode) payable',
      'function withdrawETH(address lendingPool, uint256 amount, address to)',
      'function repayETH(address lendingPool, uint256 amount, uint256 rateMode, address onBehalfOf) payable',
      'function borrowETH(address lendingPool, uint256 amount, uint256 interestRateMode, uint16 referralCode)',
    ], this.$wallet.getProvider());
    this.protocolDataProvider = new ethers.Contract(this.addresses['ProtocolDataProvider'], [
      'function getReserveData(address) view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint40)',
      'function getUserReserveData(address,address) view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint40,bool)',
    ], this.$wallet.getProvider());
  }

  async _getEtherUsdPriceMantissa() {
    const chainLink = new ethers.Contract(this.addresses['ChainLink::ETHUSD'], [
      // returns: roundId, answer, startedAt, updatedAt, answeredInRound
      'function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)'
    ], this.$wallet.getProvider());
    const [,priceETHUSD,,,] = await chainLink.latestRoundData();
    // ChainLink::ETHUSD 的 decimals 是 8
    return priceETHUSD;
  }

  /**
   * 返回 asset 的 ETH 价格
   */
  async _getAssetPriceMantissa(asset) {
    if (!this._priceOracle) {
      const addressesProvider = new ethers.Contract(this.addresses['LendingPoolAddressesProvider'], [
        'function getPriceOracle() view returns (address)'
      ], this.$wallet.getProvider());
      const _address = await addressesProvider.getPriceOracle();
      this._priceOracle = new ethers.Contract(_address, [
        'function getAssetPrice(address) view returns(uint256)'
      ], this.$wallet.getProvider());
    }
    const priceInETH = this._priceOracle.getAssetPrice(asset);
    return priceInETH;
  }

  async getAssetData(underlyingToken) {
    if (this._isETH(underlyingToken)) {
      underlyingToken = this.addresses['WETH'];
    }
    const [decimals, priceAssetMantissa, priceEtherUsdMantissa] = await Promise.all([
      this._decimals(underlyingToken),
      this._getAssetPriceMantissa(underlyingToken),
      this._getEtherUsdPriceMantissa(),
    ]);
    // ChainLink::ETHUSD 的 decimals 是 8
    const priceUsdDisplay = ethers.utils.formatUnits(priceAssetMantissa.mul(priceEtherUsdMantissa), 18 + 8);
    const [
      availableLiquidity, totalStableDebt, totalVariableDebt,
      liquidityRate, variableBorrowRate, stableBorrowRate,
      averageStableBorrowRate, liquidityIndex, variableBorrowIndex, lastUpdateTimestamp,
    ] = await this.protocolDataProvider.getReserveData(underlyingToken);
    const totalBorrows = totalStableDebt.add(totalVariableDebt);
    const totalDeposits = totalStableDebt.add(totalVariableDebt).add(availableLiquidity);
    const depositAPY = liquidityRate;
    const borrowAPY = variableBorrowRate;
    return {
      totalDeposits: this._mantissaToDisplay(totalDeposits, decimals),
      totalBorrows: this._mantissaToDisplay(totalBorrows, decimals),
      // https://docs.aave.com/developers/v/2.0/guides/apy-and-apr
      depositAPY: this._mantissaToDisplay(depositAPY, 27),
      borrowAPY: this._mantissaToDisplay(borrowAPY, 27),
      priceUSD: priceUsdDisplay,
    };
  }

  async getAccountData() {
    const [
      totalCollateralETH,
      totalDebtETH,
      availableBorrowsETH,
      currentLiquidationThreshold,
      ltv,
      healthFactor,
    ] = await this.lendingPool.getUserAccountData(this.$wallet.getAddress());
    const priceEtherUsdMantissa = await this._getEtherUsdPriceMantissa();
    // ChainLink::ETHUSD 的 decimals 是 8
    return {
      userDepositsUSD: this._mantissaToDisplay(totalCollateralETH.mul(priceEtherUsdMantissa), 18 + 8),
      userBorrowsUSD: this._mantissaToDisplay(totalDebtETH.mul(priceEtherUsdMantissa), 18 + 8),
      availableBorrowsUSD: this._mantissaToDisplay(availableBorrowsETH.mul(priceEtherUsdMantissa), 18 + 8),
    }
    // const totalCreditETH = totalDebtETH.add(availableBorrowsETH);
    // const borrowLimitUsed = totalDebtETH.eq(0) ?
    //   '0.00' : this._mantissaToDisplay(totalDebtETH.mul('100000000').div(totalCreditETH), 8);
    // ltv: this._mantissaToDisplay(ltv, 4),
    //  ltv 貌似是 4 个 decimals, 文档没明确说明
    // healthFactor: this._mantissaToDisplay(healthFactor, 18),
    //  borrowLimitUsed 约等于 1 / healthFactor
  }

  async getAccountAssets() {
    let bitmask = await this.lendingPool.getUserConfiguration(this.$wallet.getAddress())
    const reserves = await this.lendingPool.getReservesList()
    const deposits = [];
    const borrows = [];
    for (const asset of reserves) {
      if (bitmask.mod(2).eq(1)) {
        borrows.push(asset);
      }
      bitmask = bitmask.div(2);
      if (bitmask.mod(2).eq(1)) {
        deposits.push(asset);
      }
      bitmask = bitmask.div(2);
    }
    return { deposits, borrows };
  }

  async getAccountAssetData(underlyingToken) {
    if (this._isETH(underlyingToken)) {
      underlyingToken = this.addresses['WETH'];
    }
    // aToken 和 debtToken 的 decimals 是和 underlyingToken 一样的
    const decimals = await this._decimals(underlyingToken);
    const [
      currentATokenBalance,
      currentStableDebt,
      currentVariableDebt,
      principalStableDebt,
      scaledVariableDebt,
      stableBorrowRate,
      liquidityRate,
      stableRateLastUpdated,
      usageAsCollateralEnabled,
    ] = await this.protocolDataProvider.getUserReserveData(underlyingToken, this.$wallet.getAddress());
    return {
      userDeposits: this._mantissaToDisplay(currentATokenBalance, decimals),
      userBorrows: this._mantissaToDisplay(currentVariableDebt.add(currentStableDebt), decimals),
    }
  }

  async approveUnderlying(underlyingToken, amountDisplay) {
    const decimals = await this._decimals(underlyingToken);
    const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
    const spender = this.lendingPool.address;
    await super._approve(underlyingToken, spender, amountMantissa);
  }

  async underlyingAllowance(underlyingToken) {
    const decimals = await this._decimals(underlyingToken);
    const spender = this.lendingPool.address;
    const allowanceMantissa = await super._allowance(underlyingToken, spender);
    return this._mantissaToDisplay(allowanceMantissa, decimals);
  }

  async enableUnderlying(underlyingToken) {}
  async underlyingEnabled(underlyingToken) { return true; }

  async deposit(underlyingToken, amountDisplay) {
    const signer = this.$wallet.getSigner();
    console.log('@@@ deposit.signer', signer)
    const onBehalfOf = this.$wallet.getAddress();
    if (this._isETH(underlyingToken)) {
      const amountMantissa = this._displayToMantissa(amountDisplay, 18);
      // depositETH(lendingPool, onBehalfOf, referralCode) payable
      const payload = [this.lendingPool.address, onBehalfOf, 0, { value: amountMantissa }];
      await this.wETHGateway.connect(signer).depositETH(...payload).then((tx) => tx.wait());
    } else {
      const decimals = await this._decimals(underlyingToken);
      const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
      // deposit(asset, amount, onBehalfOf, referralCode)
      const payload = [underlyingToken, amountMantissa, onBehalfOf, 0];
      await this.lendingPool.connect(signer).deposit(...payload).then((tx) => tx.wait());
    }
  }

  async borrow(underlyingToken, amountDisplay) {
    const signer = this.$wallet.getSigner();
    const rateMode = 2;
    const onBehalfOf = this.$wallet.getAddress();
    if (this._isETH(underlyingToken)) {
      /*
       * WETHGateway.borrowETH 需要先 approveDelegation 才行,
       * 目前暂不支持直接借 ETH, 直接 borrow WETH 就行了, 然后自己兑换成 ETH
       */
      throw new Error('Borrow ETH is not supported for the moment');
      const amountMantissa = this._displayToMantissa(amountDisplay, 18);
      // borrowETH(lendingPool, amount, interestRateMode, referralCode)
      const payload = [this.lendingPool.address, amountMantissa, rateMode, 0];
      await this.wETHGateway.connect(signer).borrowETH(...payload).then((tx) => tx.wait());
    } else {
      const decimals = await this._decimals(underlyingToken);
      const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
      // borrow(asset, amount, interestRateMode, referralCode, onBehalfOf)
      const payload = [underlyingToken, amountMantissa, rateMode, 0, onBehalfOf];
      await this.lendingPool.connect(signer).borrow(...payload).then((tx) => tx.wait());
    }
  }

  async repay(underlyingToken, amountDisplay) {
    const signer = this.$wallet.getSigner();
    const rateMode = 2;
    const onBehalfOf = this.$wallet.getAddress();
    if (this._isETH(underlyingToken)) {
      const amountMantissa = this._displayToMantissa(amountDisplay, 18);
      // repayETH(address lendingPool, uint256 amount, uint256 rateMode, address onBehalfOf)
      const payload = [this.lendingPool.address, amountMantissa, rateMode, onBehalfOf, { value: amountMantissa }];
      await this.wETHGateway.connect(signer).repayETH(...payload).then((tx) => tx.wait());
    } else {
      const decimals = await this._decimals(underlyingToken);
      const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
      // repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf)
      const payload = [underlyingToken, amountMantissa, rateMode, onBehalfOf];
      await this.lendingPool.connect(signer).repay(...payload).then((tx) => tx.wait());
    }
  }

  async repayAll(underlyingToken) {
    const signer = this.$wallet.getSigner();
    // 不支持 ETH 的 repayAll
    const rateMode = 2;
    const onBehalfOf = this.$wallet.getAddress();
    const _max = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    // repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf)
    const payload = [underlyingToken, _max, rateMode, onBehalfOf];
    await this.lendingPool.connect(signer).repay(...payload).then((tx) => tx.wait());
  }

  async withdraw(underlyingToken, amountDisplay) {
    const signer = this.$wallet.getSigner();
    const to = this.$wallet.getAddress();
    if (this._isETH(underlyingToken)) {
      /*
       * WETHGateway.withdrawETH 需要先 approve aWETH 给 WETHGateway 才行,
       * 目前暂不支持直接 withdraw ETH, 直接 withdraw WETH 就行了, 然后兑换成 ETH
       */
      throw new Error('Withdraw ETH is not supported for the moment');
      const amountMantissa = this._displayToMantissa(amountDisplay, 18);
      // withdrawETH(lendingPool, amount, to)
      const payload = [this.lendingPool.address, amountMantissa, to];
      await this.wETHGateway.connect(signer).withdrawETH(...payload).then((tx) => tx.wait());
    } else {
      const decimals = await this._decimals(underlyingToken);
      const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
      // withdraw(asset, amount, to)
      const payload = [underlyingToken, amountMantissa, to];
      await this.lendingPool.connect(signer).withdraw(...payload).then((tx) => tx.wait());
    }
  }

  async withdrawAll(underlyingToken) {
    const signer = this.$wallet.getSigner();
    // 同 withdraw, 目前暂不支持 withdraw ETH
    const to = this.$wallet.getAddress();
    const _max = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    // withdraw(asset, amount, to)
    const payload = [underlyingToken, _max, to];
    await this.lendingPool.connect(signer).withdraw(...payload).then((tx) => tx.wait());
  }
}

module.exports = {
  AaveApp
}
