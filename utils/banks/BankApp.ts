import { ethers } from 'ethers'

const ERC20ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

// 类型声明参见 src/types/index.ts

export default class BankApp implements BankAppInterface {
  signer: typeof Signer;
  provider: typeof Provider;
  _userAddress: Address | null;
  constructor(signer: typeof Signer) {
    if (!signer) {
      throw new Error('signer is required');
    }
    this.signer = signer;
    this.provider = this.signer.provider;
    this._userAddress = null;
  }

  _isETH(asset: Address) {
    return asset.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase();
  }

  async _getUserAddress() {
    if (!this._userAddress) this._userAddress = await this.signer.getAddress()
    return this._userAddress
  }

  async _approve(token: Address, spender: Address, amountMantissa: AmountMantissa) {
    const erc20 = new ethers.Contract(token, ERC20ABI, this.provider);
    return await erc20.connect(this.signer).approve(spender, amountMantissa);
  }

  async _allowance(token: Address, spender: Address): Promise<AmountMantissa> {
    const erc20 = new ethers.Contract(token, ERC20ABI, this.provider);
    const msgSender = await this.signer.getAddress()
    return await erc20.allowance(msgSender, spender);
  }

  _displayToMantissa(amountDisplay: AmountDisplay, decimals: number): AmountMantissa {
    console.log('@@@ _displayToMantissa ', amountDisplay, decimals)
    console.log('tofixed', (+amountDisplay).toFixed(decimals));
    console.log('yyy', ethers.utils.parseUnits((+amountDisplay).toFixed(decimals), decimals).toString());
    console.log('xxx', ethers.utils.parseUnits(amountDisplay, decimals).toString());
    const re = new RegExp(`(\\d+\\.\\d{${decimals}})(\\d+)`)
    amountDisplay = amountDisplay.replace(re, '$1')
    return ethers.utils.parseUnits(amountDisplay, decimals)
  }

  _mantissaToDisplay(amountMantissa: AmountMantissa, decimals: number): AmountDisplay {
    return ethers.utils.formatUnits(amountMantissa, decimals)
  }

  /* 每个银行单独实现的公共方法 */

  /**
   * 获得资产的 APY 和 TVL 等等
   *
   * @param      Address     asset  The underlying token
   * @return     Object      { totalDeposits, totalBorrows, depositAPY, borrowAPY, price }
   */
  async getAssetData(asset: Address): Promise<AssetData> {
    throw new Error('getAssetData is not implemented');
  }

  /**
   * 获得当前用户的账户信息, 比如余额等等
   *
   * @return     Object      {  }
   */
  async getAccountData() {
    throw new Error('getAccountData is not implemented');
  }

  /**
   * 获得当前用户对应某个资产的信息, 比如
   *
   * @return     Object      {  }
   */
  async getAccountAssetData(asset: Address) {
    throw new Error('getAccountAssetData is not implemented');
  }

  /**
   * 把数量为 amount 的 underlyingToken 授权给银行 (ERC20 方法)
   * @param      Address     underlyingToken  The underlying token
   * @param      String      amountDisplay   The amountDisplay
   */
  async approveUnderlying(underlyingToken: Address, amountDisplay: AmountDisplay) {
    throw new Error('approveUnderlying is not implemented');
  }

  /**
   * 已经授权给银行的 underlyingToken 的数量 (ERC20 方法)
   * @param      Address     underlyingToken  The underlying token
   * @return     BigNumber   The allowance
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
   * 存入数量为 amount 的 underlyingToken
   * @param      Address     underlyingToken  The underlying token
   * @param      String      amountDisplay   The amountDisplay
   */
  async deposit(underlyingToken: Address, amountDisplay: AmountDisplay) {
    throw new Error('deposit is not implemented');
  }

  /**
   * 借出数量为 amount 的 underlyingToken
   * @param      Address     underlyingToken  The underlying token
   * @param      String      amountDisplay   The amountDisplay
   */
  async borrow(underlyingToken: Address, amountDisplay: AmountDisplay) {
    throw new Error('borrow is not implemented');
  }

  /**
   * 偿还数量为 amount 的 underlyingToken 的借款
   * @param      Address     underlyingToken  The underlying token
   * @param      String      amountDisplay   The amountDisplay
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
   * 取出数量为 amount 的 underlyingToken 的存款
   * @param      Address     underlyingToken  The underlying token
   * @param      String      amountDisplay   The amountDisplay
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
