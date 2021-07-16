import _ from 'lodash'
import { ethers } from 'ethers'

const URL = 'https://api.1inch.exchange/v3.0/1/tokens'

export const state = () => {
  return {
    pending: false,
    data: []
  }
}

export const mutations = {
  START_INIT(state) {
    state.pending = true
  },
  COMPLETE_INIT(state) {
    state.pending = false
  },
  set_data(state, payload = []) {
    state.data = payload
  }
}

export const actions = {
  getTokens({ commit }) {
    commit('START_INIT')
    return this.$axios.get(URL).then(({ data }) => {
      const { tokens = {} } = data
      const list = _.values(tokens)
      commit('set_data', list)
      commit('COMPLETE_INIT')
    }).catch(err => {
      commit('COMPLETE_INIT')
      throw err
    })
  }
}