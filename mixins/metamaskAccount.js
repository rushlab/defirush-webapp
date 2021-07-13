import _ from 'lodash'
import { ethers } from "ethers"

export default () => {
  return {
    props: {
      provider: {
        type: [Object, null],
        default: null
      },
    },
    data() {
      return {
        connecting: false,
        pending: false,
        signer: null,
        address: '',
        walletBalance: 0,
      }
    },
    mounted() {
      this.$nextTick(() => {
        if (window && window.ethereum) {
          this.initProviderWithMetaMask()
        }
      })
    },
    watch: {
      provider: {
        handler: async function(newProvider) {
          if (!newProvider) return
          this.handleUpdateProvider()
        },
      },
    },
    methods: {
      initProviderWithMetaMask() {
        if (window && window.ethereum) {
          this.connecting = true
          this.initProvider()
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
      async initProvider() {
        if (window && window.ethereum) {
          this._addEthereumListeners()
          this.handleUpdateMetaMaskProvider()
        }
      },
      _addEthereumListeners() {
        window.ethereum.on('chainChanged', (chainId) => {
          this.handleUpdateMetaMaskProvider()
        });
        window.ethereum.on('accountsChanged', (chainId) => {
          this.handleUpdateMetaMaskProvider()
        });
      },
      async handleUpdateMetaMaskProvider() {
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        this.$emit('update:provider', provider)
      },
      addProviderNetworkListener() {
        this.provider.on("network", (newNetwork, oldNetwork) => {
          if (oldNetwork) {
            window.location.reload()
          }
        });
      },
      async handleUpdateProvider() {
        if (!this.provider) return
        try {
          this.connecting = false
          this.pending = true
          this.signer = this.provider.getSigner()
          await this.handleGetAddress()  // getSigner 之后更新 Ether 或者 ERC20 token 余额
          this.onProviderUpdated && this.onProviderUpdated()

        } catch (error) {
          console.log(error)
        }
        this.pending = false
        this.addProviderNetworkListener()
      },
      async handleGetAddress() {
        if (!this.signer) return;
        this.address = await this.signer.getAddress()
      },
    },
  }
}