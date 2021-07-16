import Vue from 'vue'
import { ethers } from 'ethers'
import _ from 'lodash'


Vue.mixin({
  mounted() {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('chainChanged', this._handleUpdateMetaMaskProvider)
      window.ethereum.on('accountsChanged', this._handleUpdateMetaMaskProvider)
    }
  },
  computed: {
    $userWallet() {
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
  },
  methods: {
    _handleUpdateMetaMaskProvider() {
      this.$confirm('Current page will be reloaded by changing network or account?', 'Notice', {
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }).then(() => {
        window.location.reload()
      }).catch(() => {

      })
    },
    async $initWeb3Provider() {
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const signer = provider.getSigner()
        const walletAddress = await signer.getAddress()
        this.$store.commit('user/set_walletAddress', walletAddress)
      } else {
        this.$confirm('请先安装 MetaMask 扩展应用', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          window.open('https://metamask.io/download.html')
        }).catch(() => {

        })
      }
    },
    async $verifyWallet() {
      if (typeof window !== 'undefined' && window.ethereum) {
        const walletAddress = this.$store.state.user.walletAddress
        const msg = `Please sign to let us verify that you are the owner of this address\n ${walletAddress}`
        const signedMsg = await this.$userWallet.signMessage(msg)
        console.log('signedMsg: ', signedMsg)
        const msgSender = await ethers.utils.verifyMessage(msg, signedMsg)
        console.log('msgSender is', msgSender)
        this.$store.commit('user/set_isAuthenticated', true)
        const payload = {
          msgSender,
          msg,
          signedMsg
        }
        window.localStorage.setItem('_aggregation_bank_user_info', JSON.stringify(payload))
      }
    }
  }
})

export default async (ctx, inject) => {
  const { store } = ctx
  store.dispatch('tokens/getTokens')
  if (typeof window === 'undefined' || !window.ethereum) return;  // 如果没有安装 metamask，不处理，由用户自己发起登录

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    const currentSignerAddress = await signer.getAddress()

    let cachedAggregationBankUserInfo = null
    const cachedResult = window.localStorage.getItem('_aggregation_bank_user_info')
    if (cachedResult) {
      cachedAggregationBankUserInfo = JSON.parse(cachedResult)
    }
    if (!cachedAggregationBankUserInfo) {
      // 没有缓存的信息，不用验证，只需要获取 signerAddress 同步到 store， 验证的步骤留给用户
      store.commit('user/set_walletAddress', currentSignerAddress)
      return;
    } // 没有已登录信息，用户需要重新执行 connect 和 verify
    const { msgSender, msg, signedMsg } = cachedAggregationBankUserInfo

    if (currentSignerAddress !== msgSender) {
      // 判断缓存的 msgSender 和当前 metamask 账户的地址是否一致，如果不一致，清空 state 和 localStorage
      store.dispatch('user/resetAccount')
    } else {
      const _msgSender = await ethers.utils.verifyMessage(msg, signedMsg)
      if (msgSender !== _msgSender) {
        store.dispatch('user/resetAccount')
      } else {
        store.commit('user/set_isAuthenticated', true)
      }
    }
    store.commit('user/set_walletAddress', msgSender)
  } catch (error) {

  }

}
