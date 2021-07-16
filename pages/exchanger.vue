<template>
  <div class="container">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card v-if="$userWallet" >
          <launcher ref="launcher" @init="initProvider"/>
        </el-card>
      </el-col>

      <el-col :span="18">
        <el-card v-if="provider && signer" >
          <div slot="header"><span class="card-header__title">ETH转账(Address1 => Address2)</span></div>
          <transfer :provider="provider" :signer="signer"/>
        </el-card>

        <el-card v-if="$userWallet">
          <div slot="header"><span class="card-header__title">兑换</span></div>
            <exchange @success="handleSwapSuccess"/>
        </el-card>
      </el-col>
    </el-row>

  </div>
</template>

<script>
import { ethers } from "ethers"
// import Provider from '@/components/Provider'
import Launcher from '@/components/Launcher'
// import Wallet from '@/components/Wallet'
// import Transfer from '@/components/Transfer'
// import Swap from '@/components/Swap'
import Exchange from '@/components/Exchange'

export default {
  components: {
    Launcher,
    // Provider,
    // Wallet,
    // Transfer,
    // Swap,
    Exchange,
  },
  data() {
    return {
      providerType: '',
      provider: null,
      signer: null,
      wallet: null
    }
  },
  mounted() {
    // this.initRpcProvider()
  },
  methods: {
    async initRpcProvider() {
      this.provider = new ethers.providers.JsonRpcProvider('https://hardhat-dev.heidian.io', { chainId: 31337 } )
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
      this.provider = new ethers.providers.Web3Provider(window.ethereum)
      this.addProviderNetworkListener()
    },
    addProviderNetworkListener() {
      this.provider.on("network", (newNetwork, oldNetwork) => {
        if (oldNetwork) {
          window.location.reload()
        }
      });
    },
    handleSwapSuccess({receipt, fromToken, toToken}) {
      this.$refs.launcher.handleGetBalance()
      // if (toToken) {
      //   this.$refs.launcher.getERC20TokensBalance(toToken)
      // }
    }
  },
}
</script>

<style lang="scss" scoped>
.container {
  width: 100%;
  display: block;
}
/deep/ .el-card + .el-card {
  margin-top: 20px;
}
.card__head {
  width: 100%;
  position: relative;
}
.card-header__title {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.6;
}
</style>
