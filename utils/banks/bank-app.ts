import { ethers } from 'ethers'

const ERC20ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
];

export class BankApp implements BankAppInterface {
  $wallet: WalletInterface;

  constructor($wallet: WalletInterface) {
    this.$wallet = $wallet;
  }

  _isETH(asset: Address) {
    // 只在 bank app 内部使用, 其他地方直接用 $wallet.isETH
    return this.$wallet.isETH(asset)
  }

  _displayToMantissa(amountDisplay: AmountDisplay, decimals: number) {
    const re = new RegExp(`(\\d+\\.\\d{${decimals}})(\\d+)`);
    const amountDisplayTruncated = amountDisplay.toString().replace(re, '$1');
    return ethers.utils.parseUnits(amountDisplayTruncated, decimals);
  }

  _mantissaToDisplay(amountMantissa: AmountMantissa, decimals: number) {
    return ethers.utils.formatUnits(amountMantissa, decimals);
  }

  async _decimals(asset: Address) {
    if (this._isETH(asset)) {
      return 18;
    } else {
      // 否则就认为 asset 是 erc20
      // TODO: 配置一堆常用的 token 不需要重新计算 _decimals
      const erc20 = new ethers.Contract(asset, ERC20ABI, this.$wallet.getProvider());
      const decimals = await erc20.decimals();
      return +decimals.toString();
    }
  }

  async _approve(token: Address, spender: Address, amountMantissa: AmountMantissa) {
    const erc20 = new ethers.Contract(token, ERC20ABI, this.$wallet.getSigner());
    await erc20.approve(spender, amountMantissa).then(this.$wallet.waitForTx);
  }

  async _allowance(token: Address, spender: Address) {
    const erc20 = new ethers.Contract(token, ERC20ABI, this.$wallet.getProvider());
    const allowanceMantissa =  await erc20.allowance(this.$wallet.getAddress(), spender);
    return allowanceMantissa;
  }

  /* 每个银行单独实现的公共方法 */

  /**
   * 获得资产的 APY 和 TVL 等等
   *
   * @param      Address     underlyingToken  The underlying token
   * @return     Object      { totalDeposits, totalBorrows, depositAPY, borrowAPY, priceUSD }
   */
  async getAssetData(underlyingToken: Address) {
    throw new Error('getAssetData is not implemented');
  }

  /**
   * 获得当前用户的账户信息, 比如余额等等
   *
   * @return     Object      { userDepositsUSD, userBorrowsUSD, availableBorrowsUSD }
   */
  async getAccountData() {
    throw new Error('getAccountData is not implemented');
  }

  /**
   * 返回用户有头寸的资产
   *
   * @return     Array      { deposits: [address1, ...], borrows: [address1, ...] }
   */
  async getAccountAssets() {
    throw new Error('getAccountAssets is not implemented');
  }

  /**
   * 获得当前用户对应某个资产的信息, 比如
   *
   * @return     Object      { userDeposits, userBorrows }
   */
  async getAccountAssetData(underlyingToken: Address) {
    throw new Error('getAccountAssetData is not implemented');
  }

  /**
   * 把数量为 amountDisplay 的 underlyingToken 授权给银行 (ERC20 方法)
   * @param      Address     underlyingToken  The underlying token
   * @param      Number      amountDisplay    The amount in decimal
   */
  async approveUnderlying(underlyingToken: Address, amountDisplay: AmountDisplay) {
    throw new Error('approveUnderlying is not implemented');
  }

  /**
   * 已经授权给银行的 underlyingToken 的数量 (ERC20 方法)
   * @param      Address     underlyingToken  The underlying token
   * @return     Number      The allowance
   */
  async underlyingAllowance(underlyingToken: Address) {
    throw new Error('underlyingAllowance is not implemented');
  }

  /**
   * 对 underlyingToken 进行 enterMarkets 操作, 但 Aave 里什么也不需要做
   * @param      Address   underlyingToken  The underlying token
   */
  async enableUnderlying(underlyingToken: Address) {
    throw new Error('enableUnderlying is not implemented');
  }

  /**
   * 用户是否 enterMarkets, Aave 永远是 true 但是 Compound 需要通过 getAssetsIn 判断下
   * @param      Address   underlyingToken  The underlying token
   * @return     Boolean
   */
  async underlyingEnabled(underlyingToken: Address) {
    throw new Error('underlyingEnabled is not implemented');
  }

  /**
   * 存入数量为 amountDisplay 的 underlyingToken
   * @param      Address     underlyingToken  The underlying token
   * @param      Number      amountDisplay    The amount in decimal
   */
  async deposit(underlyingToken: Address, amountDisplay: AmountDisplay) {
    throw new Error('deposit is not implemented');
  }

  /**
   * 借出数量为 amountDisplay 的 underlyingToken
   * @param      Address     underlyingToken  The underlying token
   * @param      Number      amountDisplay    The amount in decimal
   */
  async borrow(underlyingToken: Address, amountDisplay: AmountDisplay) {
    throw new Error('borrow is not implemented');
  }

  /**
   * 偿还数量为 amountDisplay 的 underlyingToken 的借款
   * @param      Address     underlyingToken  The underlying token
   * @param      Number      amountDisplay    The amount in decimal
   */
  async repay(underlyingToken: Address, amountDisplay: AmountDisplay) {
    throw new Error('repay is not implemented');
  }

  /**
   * 偿还所有 underlyingToken 的借款
   * @param      Address     underlyingToken  The underlying token
   */
  async repayAll(underlyingToken: Address) {
    throw new Error('repayAll is not implemented');
  }

  /**
   * 取出数量为 amountDisplay 的 underlyingToken 的存款
   * @param      Address     underlyingToken  The underlying token
   * @param      Number      amountDisplay    The amount in decimal
   */
  async withdraw(underlyingToken: Address, amountDisplay: AmountDisplay) {
    throw new Error('withdraw is not implemented');
  }

  /**
   * 取出所有 underlyingToken 的存款
   * @param      Address     underlyingToken  The underlying token
   */
  async withdrawAll(underlyingToken: Address) {
    throw new Error('withdrawAll is not implemented');
  }

  /* 每个银行不需要单独实现, 统一实现, 直接调用我们自己写的 IBank 合约来计算 */

  // async totalUnderlyingBalance() {
  //   //
  // }

}
