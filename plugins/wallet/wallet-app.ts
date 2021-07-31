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

  _getFeedRegistry() {
    const FeedRegistryAddress = '0xd441F0B98BcF34749391A3879A94caA95ffDB74D'
    const provider = this.getProvider()
    const feedRegistryInterfaceABI = [
      'function latestRoundData(address asset, address denomination) view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)'
    ];
    return new ethers.Contract(FeedRegistryAddress, feedRegistryInterfaceABI, provider)
  }

  /**
   *
   * @param asset underlyingToken address
   * @returns 当前assetToken 对 USD的价格
   */
  async getPriceUSD(asset: Address): Promise<AmountDisplay> {
    const contract = this._getFeedRegistry()
    // const USD = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    // const LINK = '0x514910771AF9Ca656af840dff83E8264EcF986CA';
    const USD = '0x0000000000000000000000000000000000000348';
    const roundData = await contract.callStatic.latestRoundData(asset, USD)
    const [,price,,,] = roundData
    const priceUsdDisplay = ethers.utils.formatUnits(price, 8)
    return priceUsdDisplay
  }

}
