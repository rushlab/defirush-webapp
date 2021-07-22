import { BigNumber, ethers } from "ethers"

/**
 *
 * @param {Number} amount
 * @param {Integer} decimals
 * @returns {BigNumber}
 */
export function getTxAmount(amount, decimals) {
  return ethers.utils.parseUnits(amount + '', decimals)
}

export async function getAllowance(token, spender, signer) {
  const abi = [ 'function allowance(address owner, address spender) external view returns (uint256)']
  const erc20 = new ethers.Contract(token, abi, signer)
  const msgSender = await signer.getAddress()
  return await erc20.callStatic.allowance(msgSender, spender)
}

/**
 * @description       Handle token asset approval
 * @param             {Address} underlyingAssetAddress
 * @param             {BigNumber} amountMantissa
 * @param             {Signer} signer
 */
export async function handleApprove(underlyingAssetAddress, amountMantissa, signer) {
  const abi = [ 'function approve(address spender, uint256 amount) external returns (bool)', 'function allowance(address owner, address spender) external view returns (uint256)']
  const tokenContract = new ethers.Contract(underlyingAssetAddress, abi, signer)
  const msgSender = await signer.getAddress()
  const allowance = await tokenContract.callStatic.allowance(msgSender, this.underlyingAssetToken.cTokenAddress)
  if (allowance.lt(amountMantissa)) {
    const tx = await tokenContract.approve(this.underlyingAssetToken.cTokenAddress, amountMantissa)
    const receipt = await tx.wait()
    console.log('@@@ ERC20 token approved', receipt)
  } else {
    console.log('@@@ ERC20 token has enough allowance')
  }
}

/**
 * @description       Get balance of ERC20 token
 * @param             {Address} underlyingAssetAddress
 * @param             {Signer} signer
 * @returns           {BigNumber}
 */
export async function getTokenBalance(underlyingAssetAddress, signer) {
  const abi = ['function balanceOf(address account) external view returns (uint256)']
  const erc20Contract = new ethers.Contract(underlyingAssetAddress, abi, signer)
  const msgSender = await signer.getAddress()
  const balance = await erc20Contract.balanceOf(msgSender)
  return balance
}

/**
 *
 * @param {ERC20Token} underlyingAssetToken
 * @param {Signer} signer
 * @returns {String}
 */
export async function getTokenBalanceFormatted(underlyingAssetToken, signer) {
  const balance = await getTokenBalance(underlyingAssetToken.address, signer)
  return ethers.utils.formatUnits(balance.toString(), underlyingAssetToken.decimals)
}
