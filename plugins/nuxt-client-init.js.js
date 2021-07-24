import _ from 'lodash'
import { ethers } from 'ethers'
import { MessageBox } from 'element-ui';


async function verifyLoginData({ address, message, signature, timestamp }) {
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
      return { address, connected: true }
    } else  {
      throw new Error('address changed')
    }
  } else {
    // 登陆没问题, 可以看自己的数据, 但是浏览器钱包不可用,
    // 只有这种情况才会导致 isSignerAlive 是 false
    return { address, connected: false }
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

export default async ({ store }) => {
  store.dispatch('tokens/getTokens')

  const loginData = await store.dispatch('auth/getLoginData')
  if (loginData) {
    try {
      const { address, connected } = await verifyLoginData(loginData)
      store.commit('auth/setAuthStatus', { walletAddress: address, isAuthenticated: true })
      store.commit('auth/setSignerStatus', connected)
    } catch(error) {
      await store.dispatch('auth/logout')
    }
  }

  // 现在只支持 metamask, 回头再添加其他的
  listenToMetaMask(store);
}
