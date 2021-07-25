import Vue from 'vue'
import _ from 'lodash'
import { ethers } from 'ethers'
import { MessageBox } from 'element-ui';


async function verifyLoginData({ chainId, address, message, signature, timestamp }) {
  // TODO 还需要验证一下 chainID 对不对
  if ((new Date()).valueOf() - timestamp > 86400 * 7 * 1000) {
    throw new Error('expired')
  }
  const signerAddress = await ethers.utils.verifyMessage(message, signature)
  if (signerAddress.toLowerCase() !== address.toLowerCase()) {
    throw new Error('invalid signature')
  }
  if (typeof global.ethereum !== 'undefined' && global.ethereum.isMetaMask) {
    const provider = new ethers.providers.Web3Provider(global.ethereum)
    const signer = provider.getSigner()
    const selectedAddress = await signer.getAddress().catch(() => {})  // 出错就返回空值
    if (selectedAddress && address.toLowerCase() === selectedAddress.toLowerCase()) {
      return { connected: true }
    } else  {
      throw new Error('address changed')
    }
  } else {
    // 登陆没问题, 可以看自己的数据, 但是浏览器钱包不可用,
    // 只有这种情况才会导致 isSignerAlive 是 false
    return { connected: false }
  }
}


function listenToMetaMask(store) {
  // TODO 还需要验证一下 chainID 对不对
  const handler = async () => {
    const { walletAddress } = store.state.auth
    const provider = new ethers.providers.Web3Provider(global.ethereum)
    const signer = provider.getSigner()
    const selectedAddress = await signer.getAddress()
    if (walletAddress && selectedAddress && walletAddress.toLowerCase() !== selectedAddress.toLowerCase()) {
      MessageBox.confirm('Current page will be reloaded by changing network or account?', 'Notice', {
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }).then(async () => {
        await store.dispatch('auth/logout')
        global.location.reload()
      }).catch(() => {})
    }
  }
  if (typeof global.ethereum !== 'undefined' && global.ethereum.isMetaMask) {
    global.ethereum.on('chainChanged', handler)
    global.ethereum.on('accountsChanged', handler)
  }
}


class WalletApp {
  constructor(store) {
    this.$store = store
  }

  getAddress() {
    return this.$store.state.auth.walletAddress
  }

  /**
   * 所有地方的 signer 都要通过这个方法来获得, 不要自己构造 signer
   */
  getSigner() {
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
  getProvider() {
    const signer = this.getSigner()
    if (signer) {
      return signer.provider
    } else {
      const chainId = this.$store.state.auth.chainId
      let url
      if (+chainId === 1) {
        url = 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
      } else {
        url = 'http://localhost:8545'
      }
      return new ethers.providers.JsonRpcProvider(url)
    }
  }

  _isETH(asset) {
    return asset.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase();
  }

  async getBalance(asset) {
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


export default async ({ store }) => {

  const loginData = await store.dispatch('auth/getLoginData')
  if (loginData) {
    try {
      const { connected } = await verifyLoginData(loginData)
      const { chainId, address } = loginData
      store.commit('auth/setWallet', { chainId: chainId, walletAddress: address })
      store.commit('auth/setSignerStatus', connected)
    } catch(error) {
      await store.dispatch('auth/logout')
    }
  }

  // 现在只支持 metamask, 回头再添加其他的
  listenToMetaMask(store);

  /**
   * 需要访问 store, 所以这个全局变量在这里定义
   */
  Vue.prototype.$wallet = new WalletApp(store)

}
