import Vue from 'vue'
import _ from 'lodash'
import { ethers } from 'ethers'
import WalletConnectProvider from '@walletconnect/web3-provider'
import { MessageBox } from 'element-ui'
import { chains as ALL_CHAINS_LIST } from '@/utils/chains'
import { WalletApp } from './wallet-app'


async function initWallet(store, $wallet) {
  const signerProtocol = store.state.auth.signerProtocol
  let walletConnector = null
  if (signerProtocol === 'MetaMask') {
    walletConnector = global.ethereum
  } else if (signerProtocol === 'WalletConnect') {
    walletConnector = new WalletConnectProvider({
      rpc: _.fromPairs(ALL_CHAINS_LIST.map(({ chainId, rpcUrl }) => [ chainId, rpcUrl ]))
    })
    // const wc = await walletConnector.getWalletConnector({ disableSessionCreation: true })
    // if (wc.connected) {
    //   // subscribe 方法里面会调用 getWalletConnector, start 了以后 handleRequest 还是会调用 getWalletConnector
    //   // 所以这里不能直接 start, 要先判断下 wc.connected
    //   walletConnector.start()
    //   walletConnector.subscribeWalletConnector()
    // } else {
    //   walletConnector = null
    // }
    // // https://github.com/WalletConnect/walletconnect-monorepo/blob/v1.0/packages/providers/web3-provider/src/index.ts
  } else if (signerProtocol === 'Liquality') {
    walletConnector = global.rush
  }
  if (walletConnector) {
    await $wallet.setWalletConnector(signerProtocol, walletConnector)
  }
}


export default async ({ store }) => {

  /**
   * 需要访问 store, 所以这个全局变量在这里定义
   */
  const $wallet = new WalletApp(store)
  Vue.prototype.$wallet = $wallet

  // 没必要 await, 反而会导致页面打开的时候卡住
  initWallet(store, $wallet).then(() => {
    //
  }).catch((error) => {
    console.log(error.message || error.toString())
  })

  /**
   * 需要 auth store 初始化好了再 getTokens, 所以只能放在这儿
   * 另外, 这个没必要 await
   */
  store.dispatch('tokens/getTokens')

}
