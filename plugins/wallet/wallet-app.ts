import axios from 'axios'
import { ethers } from 'ethers'
import { MessageBox, Notification } from 'element-ui'


export class WalletApp implements WalletInterface {
  $store: any

  constructor(store: any) {
    this.$store = store
  }

  getAddress(): Address {
    // return this.$store.state.auth.walletAddress
    // 无论如何返回个有效的地址, 这样合约不会出现无效地址(ENS)的错误, 0地址不会有余额没关系
    const address = this.$store.state.auth.walletAddress
    return address || '0x0000000000000000000000000000000000000000'
  }

  /**
   * 所有地方的 signer 都要通过这个方法来获得, 不要自己构造 signer
   */
  getSigner(): Signer {
    const provider = this.getProvider()
    const address = this.getAddress()
    if (this.$store.state.auth.isSignerAlive) {
      return provider.getSigner(address)
    } else {
      // MessageBox.confirm('Current page will be reloaded by changing network or account?', 'Notice', {
      //   confirmButtonText: 'Yes',
      //   cancelButtonText: 'Cancel',
      //   type: 'warning'
      // }).then(() => global.location.reload()).catch(() => {})
      return new ethers.VoidSigner(address, provider)
    }
  }

  /**
   * 所有地方的 provider 都要通过这个方法来获得, 不要自己构造 provider
   */
  getProvider(): Provider {
    if (this.$store.state.auth.isSignerAlive) {
      // const signer = this.getSigner()
      // return signer.provider
      if (typeof global.ethereum !== 'undefined' && global.ethereum.isMetaMask) {
        return new ethers.providers.Web3Provider(global.ethereum)
      } else {
        throw new Error('Requires MetaMask') // 目前只支持 metamask
      }
    } else {
      const { walletChainId } = this.$store.state.auth
      let url
      if (+walletChainId === 1) {
        url = 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
      } else {
        // url = 'http://localhost:8545'
        url = 'https://hardhat-dev.defirush.io'
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
      message: `<p>The Transaction has been confirmed.</p><a href="https://etherscan.io/tx/${hash}" target="_blank">${hash.substr(0, 20)}...</a>`,
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
