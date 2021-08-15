import Vue from 'vue'
import _ from 'lodash'
import { ethers } from 'ethers'
import WalletConnectProvider from '@walletconnect/web3-provider'
import { MessageBox } from 'element-ui'
import { chains as ALL_CHAINS_LIST } from '@/utils/chains'
import { WalletApp } from './wallet-app'


async function checkSignerStatus(store, walletConnector) {
  const { chainId, walletAddress, signerProtocol } = store.state.auth
  let selectedChainId = 0
  let selectedAddress = ''
  try {
    await walletConnector.enable()
    // metamask 其实不需要, 但是 walletConnect 需要,
    // 但是如果 app 上断开连接会导致下一次刷新网页的时候先弹出一个二维码, 不大好
    const provider = new ethers.providers.Web3Provider(walletConnector)
    const signer = provider.getSigner()
    const [ network, address ] = await Promise.all([provider.getNetwork(), signer.getAddress()])
    selectedChainId = +network.chainId
    selectedAddress = address
  } catch(error) {}
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

  // TODO: 这一段可以移到 $wallet 里面
  // 只处理 signer status, 这里不需要处理登录状态, store 里都处理好了
  const signerProtocol = store.state.auth.signerProtocol
  let walletConnector = null
  if (signerProtocol === 'MetaMask') {
    walletConnector = global.ethereum
  } else if (signerProtocol === 'WalletConnect') {
    walletConnector = new WalletConnectProvider({
      rpc: _.fromPairs(ALL_CHAINS_LIST.map(({ chainId, rpcUrl }) => [ chainId, rpcUrl ]))
    })
  }
  if (walletConnector) {
    await checkSignerStatus(store, walletConnector)
    const handler = () => checkSignerStatus(store, walletConnector)
    walletConnector.on('chainChanged', handler)
    walletConnector.on('accountsChanged', handler)
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
