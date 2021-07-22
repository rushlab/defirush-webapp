import { ethers } from 'ethers'

const ERC20ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

export default class BankApp {

  constructor(signer) {
    if (!signer) {
      throw new Error('signer is required');
    }
    this.signer = signer;
    this.provider = this.signer.provider;
  }

  _isETH(asset) {
    return asset.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase();
  }

  async _approve(token, spender, amount) {
    const erc20 = new ethers.Contract(token, ERC20ABI, this.provider);
    const allowance = await erc20.connect(this.signer).approve(spender, amount);
  }

  async _allowance(token, spender) {
    const erc20 = new ethers.Contract(token, ERC20ABI, this.provider);
    const msgSender = await this.signer.getAddress()
    return await erc20.allowance(msgSender, spender);
  }

  /* 每个银行单独实现的公共方法 */

  /**
   * 获得资产的 APY 和 TVL 等等
   *
   * @param      Address     asset  The underlying token
   * @return     Object      { totalDeposits, totalBorrows, depositAPY, borrowAPY, price }
   */
  async getAssetData(asset) {
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
  async getAccountAssetData(asset) {
    throw new Error('getAccountAssetData is not implemented');
  }

  /**
   * 把数量为 amount 的 underlyingToken 授权给银行 (ERC20 方法)
   * @param      Address     underlyingToken  The underlying token
   * @param      BigNumber   amount           The amount
   */
  async approveUnderlying(underlyingToken, amount) {
    throw new Error('approveUnderlying is not implemented');
  }

  /**
   * 已经授权给银行的 underlyingToken 的数量 (ERC20 方法)
   * @param      Address     underlyingToken  The underlying token
   * @return     BigNumber   The allowance
   */
  async underlyingAllowance(underlyingToken) {
    throw new Error('underlyingAllowance is not implemented');
  }

  /**
   * 对 underlyingToken 进行 enterMarkets 操作, 但 Aave 里什么也不需要做
   * @param      Address   underlyingToken  The underlying token
   */
  async enableUnderlying(underlyingToken) {
    throw new Error('enableUnderlying is not implemented');
  }

  /**
   * 用户是否 enterMarkets, Aave 永远是 true 但是 Compound 需要通过 getAssetsIn 判断下
   * @param      Address   underlyingToken  The underlying token
   * @return     Boolean
   */
  async underlyingEnabled(underlyingToken) {
    throw new Error('underlyingEnabled is not implemented');
  }

  /**
   * 存入数量为 amount 的 underlyingToken
   * @param      Address     underlyingToken  The underlying token
   * @param      BigNumber   amount           The amount
   */
  async deposit(underlyingToken, amount) {
    throw new Error('deposit is not implemented');
  }

  /**
   * 借出数量为 amount 的 underlyingToken
   * @param      Address     underlyingToken  The underlying token
   * @param      BigNumber   amount           The amount
   */
  async borrow(underlyingToken, amount) {
    throw new Error('borrow is not implemented');
  }

  /**
   * 偿还数量为 amount 的 underlyingToken 的借款
   * @param      Address     underlyingToken  The underlying token
   * @param      BigNumber   amount           The amount
   */
  async repay(underlyingToken, amount) {
    throw new Error('repay is not implemented');
  }

  /**
   * 偿还所有 underlyingToken 的借款
   * @param      Address     underlyingToken  The underlying token
   */
  async repayAll(underlyingToken) {
    throw new Error('repayAll is not implemented');
  }

  /**
   * 取出数量为 amount 的 underlyingToken 的存款
   * @param      Address     underlyingToken  The underlying token
   * @param      BigNumber   amount           The amount
   */
  async withdraw(underlyingToken, amount) {
    throw new Error('withdraw is not implemented');
  }

  /**
   * 取出所有 underlyingToken 的存款
   * @param      Address     underlyingToken  The underlying token
   */
  async withdrawAll(underlyingToken) {
    throw new Error('withdrawAll is not implemented');
  }

  /* 每个银行不需要单独实现, 统一实现, 直接调用我们自己写的 IBank 合约来计算 */

  // async totalUnderlyingBalance() {
  //   //
  // }

}
