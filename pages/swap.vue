<template>
  <div class="container">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="never">
          <launcher ref="launcher" @init="initProvider"/>
        </el-card>
      </el-col>
      <el-col :span="18">
        <el-card shadow="never">
          <div slot="header"><span class="card-header__title">兑换</span></div>
            <exchange @success="handleSwapSuccess"/>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { ethers } from "ethers"
import Launcher from '@/components/Launcher'
import Exchange from '@/components/SwapBox'

export default {
  components: {
    Launcher,
    Exchange,
  },
  data() {
    return {
      provider: null,
    }
  },
  mounted() {},
  methods: {
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
