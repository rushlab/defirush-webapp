import _ from 'lodash'
import { ethers } from 'ethers'
import { chains as ALL_CHAINS_LIST } from '@/utils/chains'
const SIGNER_PROTOCOL_STORAGE_KEY = 'web3-signer-protocol'
const CHAIN_STORAGE_KEY = 'web3-chain-id'
const AUTH_STORAGE_KEY = 'web3-wallet-auth'

const _require = (condition, errMsg) => {
  if (!condition) {
    throw new Error(errMsg)
  }
}

const getChainIdFromStorage = () => {
  const chainId = +global.localStorage.getItem(CHAIN_STORAGE_KEY)
  if (_.find(ALL_CHAINS_LIST, { chainId })) {
    return chainId
  }
}

const getSignerProtocolFromStorage = (expectChainId) => {
  try {
    const signerProtocol = global.localStorage.getItem(SIGNER_PROTOCOL_STORAGE_KEY)
    _require(
      ['MetaMask', 'WalletConnect', null].includes(signerProtocol),
      `signer protocol ${signerProtocol} not supported`
    )
    return signerProtocol
  } catch(error) {
    console.debug('getStateFromStorage', error.message)
  }
}

const getAuthFromStorage = (expectChainId) => {
  try {
    const content = global.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!content) { throw new Error('no auth storage') }
    const { chainId, address, message, signature } = JSON.parse(content)
    _require(chainId === expectChainId, 'wrong chain')
    const [_tip, _address, _timestamp] = message.split('\n')
    _require((new Date()).valueOf() - (+_timestamp) < 86400 * 7 * 1000, 'expired')
    _require(_address.toLowerCase() === address.toLowerCase(), 'invalid address')
    const signerAddress = ethers.utils.verifyMessage(message, signature)
    _require(signerAddress.toLowerCase() === address.toLowerCase(), 'invalid signature')
    return {
      web3ApiToken: btoa(content),
      walletAddress: address,
    }
  } catch(error) {
    console.debug('getStateFromStorage', error.message)
    global.localStorage.removeItem(AUTH_STORAGE_KEY)
    return {}
  }
  /**/
  return state
}

/**
 * chainId 和 address 可以唯一确定一个用户, 不需要在 store 里面记录使用了什么钱包接口
 * 使用什么钱包接口在获取 signer 的时候判断, signer 软件的切换不影响用户本身的信息
 *
 * walletAddress: 用户钱包地址
 * isAuthenticated: 用户钱包地址已验证, 可以向 web 服务器请求个人信息
 * isSignerAlive: 浏览器钱包可用, 可以发送交易, 并且和 walletAddress 对应
 */
export const state = () => {
  const chainId = getChainIdFromStorage()
  const { walletAddress, web3ApiToken } = getAuthFromStorage(chainId)
  const signerProtocol = getSignerProtocolFromStorage(chainId)
  return {
    storageKeys: {
      SIGNER_PROTOCOL_STORAGE_KEY,
      CHAIN_STORAGE_KEY,
      AUTH_STORAGE_KEY,
    },
    /* 1. store 里存着的 chainId 一定存在于 ALL_CHAINS_LIST, 其他地方可以放心使用 */
    chainId: chainId || 1,
    /* 2. web3ApiToken 只给 axios 用 */
    walletAddress: walletAddress || '',
    web3ApiToken: web3ApiToken || '',
    isAuthenticated: !!walletAddress,
    /* 3. isSignerAlive 信息要 await 验证, 一开始的时候先设置成 false */
    signerProtocol: signerProtocol || '',
    isSignerAlive: false,
  }
}

export const mutations = {
  _setChainId(state, chainId) {
    // 私有 mutation, 只在 actions 里使用
    state.chainId = chainId || 1
    global.localStorage.setItem(CHAIN_STORAGE_KEY, chainId)
  },
  _setAddress(state, address) {
    state.walletAddress = address || ''
  },
  _setAuth(state, payload) {
    // 私有 mutation, 只在 actions 里使用
    if (payload) {
      const { chainId, address, message, signature } = payload
      // TODO: 确认一下 chainId 和 address 与 store 对应
      const _data = JSON.stringify({ chainId, address, message, signature })
      state.isAuthenticated = true
      state.web3ApiToken = btoa(_data)
      global.localStorage.setItem(AUTH_STORAGE_KEY, _data)
    } else {
      state.isAuthenticated = false
      state.web3ApiToken = ''
      global.localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  },
  _setSignerProtocol(state, signerProtocol) {
    // 私有 mutation, 只在 actions 里使用
    if (signerProtocol) {
      state.signerProtocol = signerProtocol || ''
      global.localStorage.setItem(SIGNER_PROTOCOL_STORAGE_KEY, signerProtocol)
    } else {
      state.signerProtocol = ''
      global.localStorage.removeItem(SIGNER_PROTOCOL_STORAGE_KEY)
    }
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
  async connectWallet({ dispatch, commit, state }, { address, protocol }) {
    // if (state.chainId !== chainId) {
    //   throw new Error('chain id doesn\'t match')
    // }
    if (!['MetaMask', 'WalletConnect', null].includes(protocol)) {
      throw new Error(`signer protocol ${protocol} not supported`)
    }
    if (state.isAuthenticated && state.walletAddress !== address) {
      throw new Error('connecting address is different with user authenticated address')
    }
    commit('_setAddress', address)
    commit('_setSignerProtocol', protocol)
    commit('setSignerStatus', true)
  },
  async authenticate({ dispatch, commit, state }, { message, signature }) {
    const chainId = state.chainId
    const address = state.walletAddress
    const signerAddress = ethers.utils.verifyMessage(message, signature)
    if (signerAddress.toLowerCase() === address.toLowerCase()) {
      commit('_setAuth', { chainId, address, message, signature })
    } else {
      throw new Error('invalid signature')
    }
  },
  async logout({ dispatch, commit, state }) {
    commit('_setAddress', null)
    commit('_setAuth', null)
    commit('_setSignerProtocol', null)
    commit('setSignerStatus', false)
  },
  async switchChain({ dispatch, commit, state }, { chainId }) {
    chainId = +chainId
    if (chainId !== state.chainId && _.find(ALL_CHAINS_LIST, { chainId })) {
      // 改变 chainId 以后所有信息重置
      commit('_setChainId', chainId)
      commit('_setAuth', null)
      commit('_setSignerProtocol', null)
      commit('setSignerStatus', false)
    }
  }
}
