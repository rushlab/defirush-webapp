export const state = () => {
  return {
    _appRefreshTimestamp: 0
  }
}

export const mutations = {
  _setAppRefreshTimestamp(state, payload) {
    state._appRefreshTimestamp = payload
  },
}

export const actions = {
  _refreshApp({ commit }) {
    commit('_setAppRefreshTimestamp', -1)
    setTimeout(() => {
      commit('_setAppRefreshTimestamp', (new Date()).valueOf())
    }, 1000)
  }
}
