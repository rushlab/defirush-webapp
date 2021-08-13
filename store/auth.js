import _ from 'lodash'
import { chains as ALL_CHAINS_LIST } from '@/utils/chains'
const CHAIN_STORAGE_KEY = 'web3-chain-id'
const AUTH_STORAGE_KEY = 'web3-wallet-auth'

const getStateFromStorage = () => {
  const state = {
    chainId: 1,
    walletAddress: '',
    _apiToken: '',
  }
  /* determine chainId */
  const chainId = +global.localStorage.getItem(CHAIN_STORAGE_KEY)
  if (_.find(ALL_CHAINS_LIST, { chainId })) {
    state.chainId = chainId
  }
  /* decode login data */
  try {
    const content = global.localStorage.getItem(AUTH_STORAGE_KEY)
    const { chainId, address, message, signature } = JSON.parse(content)
    const [_tip, _address, _timestamp] = message.split('\n')
    if ((new Date()).valueOf() - (+_timestamp) > 86400 * 7 * 1000) {
      throw new Error('expired')
    }
    if (_address.toLowerCase() !== address.toLowerCase()) {
      throw new Error('invalid address')
    }
    const signerAddress = ethers.utils.verifyMessage(message, signature)
    if (signerAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error('invalid signature')
    }
    // 执行到这里 content 就没问题, 然后再 _setApiToken
    state._apiToken = btoa(content)
    state.walletAddress = address
  } catch(error) {
    console.error(error)
    global.localStorage.removeItem(AUTH_STORAGE_KEY)
  }
  /**/
  return state
}

/**
 * chainId 和 address 可以唯一确定一个用户, 不需要在 store 里面记录使用了什么钱包接口
 * 使用什么钱包接口在获取 signer 的时候判断, signer 软件的切换不影响用户本身的信息
 *
 * walletAddress: 用户钱包地址
 * isAuthenticated: 用户钱包地址已验证, 可以向 web 服务器请求个人信息, 现在这个值完全对应于有没有 walletAddress
 * isSignerAlive: 浏览器钱包可用, 可以发送交易, 并且和 walletAddress 对应
 */
export const state = () => {
  const { chainId, walletAddress, _apiToken } = getStateFromStorage()
  return {
    chainId,  // chainId 一定存在于 ALL_CHAINS_LIST, 其他地方可以放心使用
    walletAddress,
    _apiToken,  // 只给 axios 用
    isAuthenticated: !!walletAddress,
    isSignerAlive: false,
  }
}

export const mutations = {
  _setApiToken(state, token) {
    state._apiToken = token
  },
  setChainId(state, chainId) {
    chainId = +chainId
    if (chainId !== state.chainId && _.find(ALL_CHAINS_LIST, { chainId })) {
      // 改变 chainId 以后所有信息重置
      state.chainId = chainId
      state.setWallet = ''
      state.setSignerStatus = false
      state._setApiToken = ''
      global.localStorage.removeItem(AUTH_STORAGE_KEY)
      global.localStorage.setItem(CHAIN_STORAGE_KEY, chainId)
    }
  },
  setWallet(state, walletAddress) {
    state.walletAddress = walletAddress
    state.isAuthenticated = !!walletAddress
  },
  setSignerStatus(state, isSignerAlive) {
    state.isSignerAlive = !!isSignerAlive
  }
}

/**
 * 下面三个方法其实都不需要 async, 但以后可能需要, 因为需要向服务器验证,
 * 所以先都用 actions 不用 mutations, 而 actions 一定要 async
 */
export const actions = {
  async login({ dispatch, commit, state }, { chainId, address, message, signature }) {
    if (state.chainId !== chainId) {
      throw new Error('chain id doesn\'t match')
    }
    const content = JSON.stringify({ chainId, address, message, signature })
    global.localStorage.setItem(AUTH_STORAGE_KEY, content)
    commit('_setApiToken', btoa(content))
    commit('setWallet', address)
    commit('setSignerStatus', true)
  },
  async logout({ dispatch, commit, state }) {
    commit('_setApiToken', '')
    commit('setWallet', '')
    commit('setSignerStatus', false)
    global.localStorage.removeItem(AUTH_STORAGE_KEY)
  },
  async getLoginData({ dispatch, commit }) {
    const content = global.localStorage.getItem(AUTH_STORAGE_KEY)
    try {
      const { chainId, address, message, signature } = JSON.parse(content)
      // 执行到这里 content 就没问题, 然后再 _setApiToken
      commit('_setApiToken', btoa(content))
      return { chainId, address, message, signature }
    } catch(error) {}
  }
}
