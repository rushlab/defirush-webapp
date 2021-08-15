export default function ({ $axios, store }) {
  $axios.onRequest(async (config) => {
    if (/^\/api\//.test(config.url)) {
      const apiToken = store.state.auth['web3ApiToken']
      if (apiToken) {
        config.headers.common['Authorization'] = `Web3WalletAuth ${apiToken}`
      }
    }
    return config
  })
}
