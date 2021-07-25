import { ethers } from 'ethers'


export class WalletApp implements WalletInterface {
  $store: any

  constructor(store: any) {
    this.$store = store
  }

  getAddress(): Address {
    return this.$store.state.auth.walletAddress
  }

  /**
   * 所有地方的 signer 都要通过这个方法来获得, 不要自己构造 signer
   */
  getSigner(): Signer {
    if (this.$store.state.auth.isSignerAlive) {
      // 目前只支持
      if (typeof global.ethereum !== 'undefined' && global.ethereum.isMetaMask) {
        const provider = new ethers.providers.Web3Provider(global.ethereum)
        return provider.getSigner()
      }
    }
  }

  /**
   * 所有地方的 provider 都要通过这个方法来获得, 不要自己构造 provider
   */
  getProvider(): Provider {
    const signer = this.getSigner()
    if (signer) {
      return signer.provider
    } else {
      const { walletChainId } = this.$store.state.auth
      let url
      if (+walletChainId === 1) {
        url = 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
      } else {
        url = 'http://localhost:8545'
      }
      return new ethers.providers.JsonRpcProvider(url)
    }
  }

  _isETH(asset: Address): Boolean {
    return asset.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase();
  }

  async getBalance(asset: Address): Promise<AmountDisplay> {
    const provider = this.getProvider();
    const address = this.getAddress();
    if (!asset || this._isETH(asset)) {
      const balance = await provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } else {
      // 否则就认为 asset 是 erc20
      const erc20 = new ethers.Contract(asset, [
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint256)',
      ], provider);
      const [balance, decimals] = await Promise.all([erc20.balanceOf(address), erc20.decimals()]);
      return ethers.utils.formatUnits(balance, decimals);
    }
  }

}
