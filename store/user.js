import _ from 'lodash'
import { ethers } from 'ethers'

export const state = () => ({
  pending: false,
  walletAddress: null,
  isAuthenticated: false
})

export const mutations = {
  START_INIT(state) {
    state.pending = true
  },
  COMPLETE_INIT(state) {
    state.pending = false
  },
  set_walletAddress(state, payload) {
    state.walletAddress = payload
  },
  set_isAuthenticated(state, payload) {
    state.isAuthenticated = payload
  },
  reset(state) {
    state.balance = null
    state.walletAddress = null
    state.isAuthenticated = false
    window.localStorage.removeItem('_aggregation_bank_user_info')
  }
}

export const actions = {
  resetAccount({ commit }) {
    commit('reset')
  }
}