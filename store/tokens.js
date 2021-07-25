import _ from 'lodash'
import { ethers } from 'ethers'

const URL = 'https://api.1inch.exchange/v3.0/1/tokens'

export const state = () => {
  return {
    pending: false,
    data: []
    // [ { symbol, name, address, decimals, logoURI }, ... ]
  }
}

export const mutations = {
  START_REQUEST(state) {
    state.pending = true
  },
  COMPLETE_REQUEST(state) {
    state.pending = false
  },
  SET_DATA(state, payload = []) {
    state.data = payload
  }
}

export const actions = {
  getTokens({ commit }) {
    commit('START_REQUEST')
    return this.$axios.get(URL).then(({ data }) => {
      // { tokens: { [address]: { symbol, address } } }
      commit('COMPLETE_REQUEST')
      const common = []
      const rest = []
      for (const address in data.tokens) {
        const tokenData = data.tokens[address]
        if (/^(BTC|ETH|WBTC|WETH|USDC|USDT|DAI)$/.test(tokenData.symbol)) {
          common.push(tokenData)
        } else {
          rest.push(tokenData)
        }
      }
      commit('SET_DATA', [ ...common, ...rest ])
    }).catch(err => {
      commit('COMPLETE_REQUEST')
      throw err
    })
  }
}
