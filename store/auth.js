const AUTH_STORAGE_KEY = 'web3-wallet-auth'

/**
 * walletAddress: 用户钱包地址
 * isAuthenticated: 用户钱包地址已验证, 可以向 web 服务器请求个人信息
 * isSignerAlive: 浏览器钱包可用, 可以发送交易, 并且和 walletAddress 对应
 */
export const state = () => ({
  walletAddress: '',
  isAuthenticated: false,
  isSignerAlive: false,
})

export const mutations = {
  setAuthStatus(state, { walletAddress, isAuthenticated }) {
    state.walletAddress = walletAddress
    state.isAuthenticated = isAuthenticated
  },
  setSignerStatus(state, isSignerAlive) {
    state.isSignerAlive = !!isSignerAlive
  }
}

/**
 * 下面三个方法其实都不需要 async, 但以后可能需要, 因为需要向服务器验证, 先都加上 async
 */
export const actions = {
  async login({ dispatch, commit }, { address, message, signature }) {
    const content = JSON.stringify({
      address, message, signature,
      timestamp: (new Date()).valueOf()
    })
    global.localStorage.setItem(AUTH_STORAGE_KEY, content)
    commit('setAuthStatus', { walletAddress: address, isAuthenticated: true })
    commit('setSignerStatus', true)
  },
  async logout({ dispatch, commit }) {
    commit('setAuthStatus', { walletAddress: '', isAuthenticated: false })
    commit('setSignerStatus', false)
    global.localStorage.removeItem(AUTH_STORAGE_KEY)
  },
  async getLoginData({ dispatch, commit }) {
    const content = global.localStorage.getItem(AUTH_STORAGE_KEY)
    try {
      const { address, message, signature, timestamp } = JSON.parse(content)
      return { address, message, signature, timestamp }
    } catch(error) {}
  }
}
