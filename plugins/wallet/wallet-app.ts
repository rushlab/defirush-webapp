import _ from 'lodash'
import axios from 'axios'
import { ethers } from 'ethers'
import WalletConnectProvider from '@walletconnect/web3-provider'
import { MessageBox, Notification } from 'element-ui'
import { chains as ALL_CHAINS_LIST } from '@/utils/chains'

/**
 * wallet 里面的信息都是从 store 里取的, 是一个 utilities 合集, 不要存储额外信息
 * 登录信息和 wallet connect 等连接信息在 store 里面处理好
 */
export class WalletApp implements WalletInterface {
  $store: any
  _walletConnector: any
  _rpcUrls: any  // { [chainId]: rpcUrl, ... }

  constructor(store: any) {
    this.$store = store
    this._walletConnector = null
    this._rpcUrls = _.fromPairs(ALL_CHAINS_LIST.map(({ chainId, rpcUrl }) => [ chainId, rpcUrl ]))
  }

  isETH(asset: Address): boolean {
    return asset.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase();
  }

  getChainId(): number {
    const chainId = this.$store.state.auth.chainId
    return chainId
  }

  getAddress(): Address {
    // return this.$store.state.auth.walletAddress
    // 无论如何返回个有效的地址, 这样合约不会出现无效地址(ENS)的错误, 0地址不会有余额没关系
    const address = this.$store.state.auth.walletAddress
    return address || '0x0000000000000000000000000000000000000000'
  }

  setWalletConnector(walletConnector: any) {
    this._walletConnector = walletConnector
  }

  /**
   * 所有地方的 signer 都要通过这个方法来获得, 不要自己构造 signer
   */
  getSigner(): Signer {
    const address = this.getAddress()
    if (this._walletConnector) {
      const provider = new ethers.providers.Web3Provider(this._walletConnector)
      return provider.getSigner(address)
    } else {
      const provider = this.getProvider()
      return new ethers.VoidSigner(address, provider)
    }
    // if (this.$store.state.auth.isSignerAlive) {
    //   const signerProtocol = this.$store.state.auth.signerProtocol
    //   if (signerProtocol === 'MetaMask') {
    //     const provider = new ethers.providers.Web3Provider(global.ethereum)
    //     return provider.getSigner(address)
    //   } else if (signerProtocol === 'WalletConnect') {
    //     // TODO 这样好像会导致很多 session
    //     const walletConnector = new WalletConnectProvider({
    //       rpc: { ...this._rpcUrls }
    //     })
    //     // walletConnector.enable()
    //     // https://github.com/WalletConnect/walletconnect-monorepo/blob/v1.0/packages/providers/web3-provider/src/index.ts
    //     walletConnector.start()
    //     const provider = new ethers.providers.Web3Provider(walletConnector)
    //     return provider.getSigner(address)
    //   }
    // }
  }

  /**
   * 所有地方的 provider 都要通过这个方法来获得, 不要自己构造 provider
   */
  getProvider(): Provider {
    const chainId = this.getChainId()
    const rpcUrl = this._rpcUrls[chainId]
    return new ethers.providers.JsonRpcProvider(rpcUrl)
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
      message: `<p>Transaction hash:</p><a href="https://etherscan.io/tx/${hash}" target="_blank">${hash.substr(0, 20)}...</a>`,
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
    if (!asset || this.isETH(asset)) {
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
   * @param asset underlyingToken address
   * @returns 当前 assetToken 对 USD的价格
   */
  async getPriceUSD(asset: Address): Promise<AmountDisplay> {
    const token = this.$store.getters['tokens/getToken'](asset)
    if (!token) {
      return '0.00'
    }
    try {
      const res = await axios.get(`/api/tokens/${token.id}/price/`, {
        params: { currency: 'usd' }
      })
      const price = res.data['usd'].toString()
      return price
    } catch(err) {
      console.log(err)
      return '0.00'
    }
  }

}
