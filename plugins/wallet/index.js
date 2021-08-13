import Vue from 'vue'
import _ from 'lodash'
import { ethers } from 'ethers'
import { MessageBox } from 'element-ui'
import { WalletApp } from './wallet-app'


async function checkSignerStatus(store) {
  const { chainId, walletAddress } = store.state.auth
  let selectedChainId = 0
  let selectedAddress = ''
  if (typeof global.ethereum !== 'undefined' && global.ethereum.isMetaMask) {
    const provider = new ethers.providers.Web3Provider(global.ethereum)
    const signer = provider.getSigner()
    try {
      const [ network, address ] = await Promise.all([provider.getNetwork(), signer.getAddress()])
      selectedChainId = +network.chainId
      selectedAddress = address
    } catch(err) {}
  }
  if (chainId === selectedChainId && walletAddress.toLowerCase() === selectedAddress.toLowerCase()) {
    store.commit('auth/setSignerStatus', true)
  } else {
    // 如果 metamask 里的地址和登录着的不同没关系, 依然可以看数据只是不能发送交易, 这种情况就是 isSignerAlive 为 false
    store.commit('auth/setSignerStatus', false)
  }
  // MessageBox.confirm(
  //   'Page will be reloaded because the network or your wallet account is changed',
  //   'Network/Account Changed', {
  //   confirmButtonText: 'OK',
  //   cancelButtonText: 'DO NOT REFRESH',
  //   type: 'warning'
  // }).then(() => global.location.reload()).catch(() => {})
}


export default async ({ store }) => {
  /**
   * 只处理 signer status, 这里不需要处理登录状态, store 里都处理好了
   */
  await checkSignerStatus(store)

  /**
   * 现在只支持 metamask, 回头再添加其他的
   */
  if (typeof global.ethereum !== 'undefined' && global.ethereum.isMetaMask) {
    const handler = () => checkSignerStatus(store)
    global.ethereum.on('chainChanged', handler)
    global.ethereum.on('accountsChanged', handler)
  }

  /**
   * 需要 auth store 初始化好了再 getTokens, 但是要再 $wallet 初始化之前
   */
  await store.dispatch('tokens/getTokens')

  /**
   * 需要访问 store, 所以这个全局变量在这里定义
   */
  Vue.prototype.$wallet = new WalletApp(store)
}
