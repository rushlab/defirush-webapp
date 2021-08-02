import _ from 'lodash'
import { ethers } from 'ethers'

export const state = () => {
  return {
    pending: false,
    data: [],
    // [ { id, symbol, name, address, decimals, logoURI }, ... ]
    _tokens: {},
    // { [address]: { id, symbol, name, address, decimals, logoURI }, ... }
  }
}

export const getters = {
  getToken(state) {
    return (address) => state._tokens[address.toLowerCase()]
  }
}

export const mutations = {
  START_REQUEST(state) {
    state.pending = true
  },
  COMPLETE_REQUEST(state) {
    state.pending = false
  },
  SET_TOKENS(state, tokens = []) {
    const _tokens = {}
    for (const token of tokens) {
      _tokens[token.address.toLowerCase()] = token
    }
    state.data = [ ...tokens ]
    state._tokens = _tokens
  },
  SET_1INCH_TOKENS(state, tokens = {}) {
    const common = []
    const rest = []
    const _tokens = {}
    for (const address in tokens) {
      const tokenData = tokens[address]
      if (/^(BTC|ETH|WBTC|WETH|USDC|USDT|DAI)$/.test(tokenData.symbol)) {
        common.push(tokenData)
      } else {
        rest.push(tokenData)
      }
      _tokens[address.toLowerCase()] = tokenData
    }
    state.data = [ ...common, ...rest ]
    state._tokens = _tokens
  }
}

export const actions = {
  getTokens({ commit }) {
    commit('START_REQUEST')
    return this.$axios.get('/api/tokens').then(({ data }) => {
      commit('COMPLETE_REQUEST')
      commit('SET_TOKENS', data)
    }).catch(err => {
      commit('COMPLETE_REQUEST')
      throw err
    })
  },
  get1InchTokens({ commit }) {
    commit('START_REQUEST')
    const URL = 'https://api.1inch.exchange/v3.0/1/tokens'
    return this.$axios.get(URL).then(({ data }) => {
      // { tokens: { [address]: { symbol, address } } }
      commit('COMPLETE_REQUEST')
      commit('SET_TOKENS', data.tokens)
    }).catch(err => {
      commit('COMPLETE_REQUEST')
      throw err
    })
  }
}
