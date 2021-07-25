const AUTH_STORAGE_KEY = 'web3-wallet-auth'

/**
 * chainId 和 address 可以唯一确定一个用户, 不需要在 store 里面记录使用了什么钱包接口
 * 使用什么钱包接口在获取 signer 的时候判断, signer 软件的切换不影响用户本身的信息
 *
 * walletAddress: 用户钱包地址
 * isAuthenticated: 用户钱包地址已验证, 可以向 web 服务器请求个人信息, 现在这个值完全对应于有没有 walletAddress
 * isSignerAlive: 浏览器钱包可用, 可以发送交易, 并且和 walletAddress 对应
 */
export const state = () => ({
  walletChainId: 1,
  walletAddress: '',
  isAuthenticated: false,
  isSignerAlive: false,
})

export const mutations = {
  setWallet(state, { walletChainId, walletAddress }) {
    state.walletChainId = +walletChainId
    state.walletAddress = walletAddress
    state.isAuthenticated = !!walletAddress
  },
  setSignerStatus(state, isSignerAlive) {
    state.isSignerAlive = !!isSignerAlive
  }
}

/**
 * 下面三个方法其实都不需要 async, 但以后可能需要, 因为需要向服务器验证, 先都加上 async
 */
export const actions = {
  async login({ dispatch, commit }, { chainId, address, message, signature }) {
    const content = JSON.stringify({
      chainId, address, message, signature,
      timestamp: (new Date()).valueOf()
    })
    global.localStorage.setItem(AUTH_STORAGE_KEY, content)
    commit('setWallet', { walletChainId: chainId, walletAddress: address })
    commit('setSignerStatus', true)
  },
  async logout({ dispatch, commit }) {
    commit('setWallet', { walletChainId: 1, walletAddress: '' })
    commit('setSignerStatus', false)
    global.localStorage.removeItem(AUTH_STORAGE_KEY)
  },
  async getLoginData({ dispatch, commit }) {
    const content = global.localStorage.getItem(AUTH_STORAGE_KEY)
    try {
      const { chainId, address, message, signature, timestamp } = JSON.parse(content)
      return { chainId, address, message, signature, timestamp }
    } catch(error) {}
  }
}
