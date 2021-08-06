import Vue from 'vue'
import _ from 'lodash'
import { ethers } from 'ethers'
import { MessageBox } from 'element-ui'
import { WalletApp } from './wallet-app'


async function verifyLoginData({ chainId, address, message, signature }) {
  // TODO 还需要验证一下 chainID 对不对
  const [_tip, _address, _timestamp] = message.split('\n')
  if ((new Date()).valueOf() - _timestamp > 86400 * 7 * 1000) {
    throw new Error('expired')
  }
  if (_address.toLowerCase() !== address.toLowerCase()) {
    throw new Error('invalid address')
  }
  const signerAddress = await ethers.utils.verifyMessage(message, signature)
  if (signerAddress.toLowerCase() !== address.toLowerCase()) {
    throw new Error('invalid signature')
  }
  let connected = false
  let selectedChainId = 0
  let selectedAddress = ''
  if (typeof global.ethereum !== 'undefined' && global.ethereum.isMetaMask) {
    const provider = new ethers.providers.Web3Provider(global.ethereum)
    const signer = provider.getSigner()
    try {
      selectedChainId = +((await signer.provider.getNetwork()).chainId)
      selectedAddress = await signer.getAddress()
    } catch(err) {}
  }
  if (!selectedChainId || !selectedAddress) {
    connected = false
  } else if (+chainId === selectedChainId && address.toLowerCase() === selectedAddress.toLowerCase()) {
    connected = true
  } else {
    throw new Error('address changed')
  }
  // 如果无法读取地址, 但之前登录过, 这时候可以看自己的数据但是浏览器钱包不可用,
  // 只有这种情况才会导致 isSignerAlive 是 false
  return { connected }
}


function listenToMetaMask(store) {
  const handler = async () => {
    const { walletChainId, walletAddress } = store.state.auth
    // if (!walletAddress) {
    //   return
    // }
    const provider = new ethers.providers.Web3Provider(global.ethereum)
    const signer = provider.getSigner()
    let selectedChainId = 0
    let selectedAddress = ''
    try {
      selectedChainId = +((await signer.provider.getNetwork()).chainId)
      selectedAddress = await signer.getAddress()
    } catch(error) {}  // 无法获取就直接忽略, 然后更新 signer 状态
    if (!selectedChainId || !selectedAddress) {
      store.commit('auth/setSignerStatus', false)
    } else if (+walletChainId === selectedChainId && walletAddress.toLowerCase() === selectedAddress.toLowerCase()) {
      store.commit('auth/setSignerStatus', true)
    } else {
      await store.dispatch('auth/logout')
      MessageBox.confirm('Current page will be reloaded by changing network or account?', 'Notice', {
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }).then(() => global.location.reload()).catch(() => {})
    }
  }
  if (typeof global.ethereum !== 'undefined' && global.ethereum.isMetaMask) {
    global.ethereum.on('chainChanged', handler)
    global.ethereum.on('accountsChanged', handler)
  }
}


export default async ({ store }) => {

  const loginData = await store.dispatch('auth/getLoginData')
  if (loginData) {
    try {
      const { connected } = await verifyLoginData(loginData)
      const { chainId, address } = loginData
      store.commit('auth/setWallet', { walletChainId: chainId, walletAddress: address })
      store.commit('auth/setSignerStatus', connected)
    } catch(error) {
      console.log(error)
      await store.dispatch('auth/logout')
    }
  }

  // 现在只支持 metamask, 回头再添加其他的
  listenToMetaMask(store)

  /**
   * 需要访问 store, 所以这个全局变量在这里定义
   */
  Vue.prototype.$wallet = new WalletApp(store)

}
