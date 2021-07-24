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
  },
  methods: {
    _handleUpdateMetaMaskProvider() {
      this.$store.dispatch('user/resetAccount')
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
        const signedMsg = await this.$signer.signMessage(msg)
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
