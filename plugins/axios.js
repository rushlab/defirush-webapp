export default function ({ $axios, store }) {
  $axios.onRequest(async (config) => {
    if (/^\/api\//.test(config.url)) {
      const apiToken = store.state.auth['_apiToken']
      if (apiToken) {
        config.headers.common['Authorization'] = `Web3WalletAuth ${apiToken}`
      }
    }
    return config
  })
}
