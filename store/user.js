import _ from 'lodash'
import { ethers } from 'ethers'

export const state = () => ({
  pending: false,
  provider: null,
  signer: null,
  wallet: null
})


export const mutations = {
  START_INIT(state) {
    state.pending = true
  },
  COMPLETE_INIT(state) {
    state.pending = false
  },
  set_provider(state, provider) {
    state.provider = provider ? _.cloneDeep(provider) : null
  },
  set_signer(state, signer) {
    state.signer = signer
  },
  set_wallet(state, wallet) {
    state.wallet = wallet
  }
}


export const actions = {
  initProvider({ commit }, { providerType }) {
    return new Promise(async (resolve, reject) => {
      try {
        let provider;
        commit('START_INIT')
        if (providerType === 'metamask' && window && window.ethereum) {
          await window.ethereum.enable()
          provider = new ethers.providers.Web3Provider(window.ethereum)
        } else {
          // rpc
          provider = new ethers.providers.JsonRpcProvider()
        }
        const signer = provider.getSigner()
        commit('set_provider', provider)
        commit('set_signer', signer)
        commit('set_wallet', null)
        resolve(provider)
      } catch (error) {
        reject(error)
      }
    })
  },
  async getWallet({ commit, state }, { privateKey }) {
    console.log(state.state)
    return new Promise(async (resolve, reject) => {
      try {
        const wallet = new ethers.Wallet(privateKey, state.provider)
        commit('set_wallet', wallet)
        resolve(wallet)
      } catch (error) {
        reject(error)
      }
    })
  },
  getWalletBalance({ commit, state }) {
    return state.wallet.getBalance()
  },
  getWalletAddress({ commit, state }) {
    return state.wallet.getAddress()
  },
}