const { ethers, deployments, getNamedAccounts } = require('hardhat');


class WalletApp {

  constructor(signer) {
    if (!signer) {
      throw new Error('signer is required');
    }
    this.signer = signer;
    this.provider = this.signer.provider;
  }

  async _userAddress() {
    return await this.signer.getAddress();
  }

  _isETH(asset) {
    return asset.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase();
  }

  async assetBalance(asset) {
    if (this._isETH(asset)) {
      const balance = await this.provider.getBalance(await this._userAddress());
      return ethers.utils.formatEther(balance);
    } else {
      // 否则就认为 asset 是 erc20
      const erc20 = new ethers.Contract(asset, [
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint256)',
      ], this.provider);
      const [balance, decimals] = await Promise.all([
        erc20.balanceOf(await this._userAddress()),
        erc20.decimals(),
      ]);
      return ethers.utils.formatUnits(balance, decimals);
    }
  }

  async requestEther(amountInEther) {
    const EtherFaucet = await deployments.get('EtherFaucet');
    const faucet = new ethers.Contract(EtherFaucet.address, EtherFaucet.abi, this.signer);
    const amount = ethers.utils.parseEther(amountInEther.toString());
    await faucet.requestEther(amount, {
      gasPrice: 0
    }).then((tx) => tx.wait());
    console.log(`[Faucet] request ${amountInEther} ETH`);
  }

  async swapETHForExactTokens(ethAmountInEther, tokenAddress) {
    const { OneSplitAudit, DAI, USDC } = await getNamedAccounts();
    const erc20 = new ethers.Contract(tokenAddress, [
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
    ], this.provider);
    const [tokenName, tokenDecimals] = await Promise.all([erc20.symbol(), erc20.decimals()]);
    const oneInch = new ethers.Contract(OneSplitAudit, [
      'function swap(address fromToken, address toToken, uint256 amount, uint256 minReturn, uint256[] memory distribution, uint256 disableFlags) payable',
      'function getExpectedReturn(address fromToken, address toToken, uint256 amount, uint256 parts, uint256 featureFlags) view returns(uint256 returnAmount, uint256[] distribution)',
    ], this.provider);
    const fromToken = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';  // 1inch 里面这个表示 eth
    const toToken = tokenAddress;
    const amount = ethers.utils.parseEther(ethAmountInEther.toString());
    const parts = 20;
    const featureFlags = 0;
    const { returnAmount, distribution } = await oneInch.getExpectedReturn(
      fromToken, toToken, amount, parts, featureFlags);
    const minReturn = returnAmount;
    await oneInch.connect(this.signer).swap(fromToken, toToken, amount, minReturn, distribution, featureFlags, {
      value: amount
    }).then((tx) => tx.wait());
    console.log(`[1Inch] swap ${ethAmountInEther} ETH to ${ethers.utils.formatUnits(returnAmount, tokenDecimals)} ${tokenName}`);
  }

  async fillAssets() {
    await this.requestEther(10);
    const { DAI, USDC } = await getNamedAccounts();
    await this.swapETHForExactTokens(1, DAI);
    await this.swapETHForExactTokens(1, USDC);
  }

}

module.exports = {
  WalletApp
}
