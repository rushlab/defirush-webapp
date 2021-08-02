import axios from 'axios'
import { ethers } from 'ethers'
import { MessageBox, Notification } from 'element-ui'


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

  /**
   * 管理全局的 transaction 状态, 比如
   *  await contract.method(args).then(this.$waitForTx)
   * 或者
   *  const tx = await contract.method(args)
   *  await this.$waitForTx(tx)
   */
  async waitForTx(tx: any) {
    const hash = tx.hash
    const notify: any = {
      dangerouslyUseHTMLString: true,
      message: `<a href="https://etherscan.io/tx/${hash}" target="_blank">${hash.substr(0, 20)}...</a>`,
      position: 'bottom-right',
      showClose: true,
      duration: 0,
    }
    const pending = Notification.warning({ ...notify, title: 'Transaction is pending' })
    try {
      await tx.wait()
      pending.close()
      Notification.success({
        ...notify,
        title: 'Transaction confirmed',
        duration: 10 * 1000
      })
    } catch(err) {
      pending.close()
      Notification.error({ ...notify, title: 'Transaction reverted' })
      // transaction 的错误会继续抛出, 但是页面上一般不需要做什么, 页面上处理合约执行的错误就行了
      throw err
    }
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

  /**
   *
   * @param asset underlyingToken address
   * @returns 当前 assetToken 对 USD的价格
   */
  async getPriceUSD(asset: Address): Promise<AmountDisplay> {
    const token = this.$store.getters['tokens/getToken'](asset)
    try {
      const res = await axios.get(`/api/tokens/${token.id}/price/`, {
        params: {
          currency: 'usd'
        }
      })
      const price = res.data['usd'].toString()
      return price
    } catch(err) {
      console.log(err)
      return '0.00'
    }
  }

}
