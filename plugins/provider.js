import Vue from 'vue'
import { ethers } from 'ethers'
import _ from 'lodash'

Vue.mixin({
  computed: {
    $signer() {
      if (!global.ethereum) return null
      const provider = new ethers.providers.Web3Provider(global.ethereum)
      return provider.getSigner()
    },
    $jsonRpcProvider() {
      let url
      if (_.get(window.ethereum, 'chainId') === '0x1') {
        url = 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
      } else {
        // 其他忘了的 RPC json
        url = 'http://localhost:8545'
      }
      return new ethers.providers.JsonRpcProvider(url)
    }
  }
})
