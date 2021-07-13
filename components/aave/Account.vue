<template>
  <div class="launcher">
    <div class="metamask">
      <metamask-logo class="mm-logo"/>
      <el-button
        v-if="!signer"
        class="mm-btn" type="text" size="small"
        :loading="!!connecting"
        @click="initProviderWithMetaMask">{{ !!connecting ? '正在连接...' : '点击连接'}}</el-button>
    </div>
    <div v-if="!!signer" class="avtive-waller"><span>已连接钱包: MetaMask</span></div>
    <div v-if="signer" v-loading="!!pending">
      <el-form ref="launcher" label-position="top" :disabled="disabledForm">
        <el-form-item label="钱包地址">
          <el-input :value="address" readonly></el-input>
        </el-form-item>
        <el-form-item label="钱包余额">
          <el-input :value="walletBalance" readonly>
            <div class="token-symbol" slot="prepend">ETH</div>
          </el-input>
        </el-form-item>
      </el-form>
      <el-form label-position="left" label-width="200px">
        <el-form-item
          v-for="(value, key) in userAccountData" :key="key"
          class="token-item"
          :label="key"
        >
          <el-input :value="value" readonly></el-input>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from "ethers"
import MetamaskLogo from '@/components/MetamaskLogo'

import {
  ABI_LendingPool,
  ABI_LendingPoolAddressesProvider,
  Address_LendingPoolAddressesProvider } from '@/constants/contracts/aave/index.js'
import { Provider } from '@ethersproject/providers';


export default {
  name: "Launcher",
  props: {
    provider: {
      type: [Object, null],
      default: null
    },
    lendingPool: {
      type: [Object, null],
      default: null
    }
  },
  components: {
    MetamaskLogo,
  },
  data() {

    return {
      connecting: false,
      pending: false,
      signer: null,
      address: '',
      walletBalance: 0,
      userAccountData: {
        totalCollateralETH: 0,
        totalDebtETH: 0,
        availableBorrowsETH: 0,
        currentLiquidationThreshold: 0,
        ltv: 0,
        healthFactor: 0,
      }
    }
  },
  async mounted() {
    await this.getAaveTokens()
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
    lendingPool(newVal) {
      this.updateUserAccountData()
    }
  },
  computed: {
    disabledForm() {
      return !this.provider || _.isEmpty(this.provider)
    }
  },
  methods: {
    async getAaveTokens() {
      const { data } = await this.$axios.get('https://aave.github.io/aave-addresses/mainnet.json')
      const { proto } = data
    },
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
        await this.handleGetBalance()
        await this.initLendingPoolInstance()

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
    async initLendingPoolInstance() {
      const providerInstance = new ethers.Contract(Address_LendingPoolAddressesProvider, ABI_LendingPoolAddressesProvider, this.signer)
      const priceOracleAddress = await providerInstance.callStatic.getPriceOracle()
      const providerAddress = await providerInstance.callStatic.getLendingPool()
      const lendingPoolInstance = new ethers.Contract(providerAddress, ABI_LendingPool, this.signer)

      this.$emit('update:addressesProvider', providerInstance)
      this.$emit('update:priceOracleAddress', priceOracleAddress)
      this.$emit('update:lendingPool', lendingPoolInstance)
    },
    async updateAccount() {
      this.handleGetBalance()
      this.updateUserAccountData()
    },
    async updateUserAccountData() {
      const [
        totalCollateralETH,
        totalDebtETH,
        availableBorrowsETH,
        currentLiquidationThreshold,
        ltv,
        healthFactor,
      ] = await this.lendingPool.callStatic.getUserAccountData(this.address)
      // console.log(`
      //   totalCollateralETH: ${totalCollateralETH},
      //   totalDebtETH: ${totalDebtETH},
      //   availableBorrowsETH: ${availableBorrowsETH},
      //   currentLiquidationThreshold: ${currentLiquidationThreshold},
      //   ltv: ${ltv},
      //   healthFactor: ${healthFactor}`)
      this.userAccountData = {
        totalCollateralETH: ethers.utils.formatUnits(totalCollateralETH),
        totalDebtETH: ethers.utils.formatUnits(totalDebtETH),
        availableBorrowsETH: ethers.utils.formatUnits(availableBorrowsETH),
        currentLiquidationThreshold: (+currentLiquidationThreshold.div(100).toString()).toFixed(2) + '%',
        ltv: (+ltv.div(100).toString()).toFixed(2) + '%',
        healthFactor: totalDebtETH.isZero() ? ' - ' : ethers.utils.formatEther(healthFactor)
      }
    },
    async handleGetBalance() {
      await this.getEtherBalance()
      // await this.getERC20TokensBalance()
    },
    async getEtherBalance() {
      const balance = await this.signer.getBalance()
      this.walletBalance = ethers.utils.formatUnits(balance)
    },
  },
}
</script>

<style lang="scss" scoped>
.metamask {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.mm-logo {
  width: 60px;
  height: 60px;
}
.mm-btn {
  margin-left: 15px;
}
.avtive-waller {
  text-align: center;
  margin: 10px auto;
  position: relative;
  > span {
    font-size: 12px;
    line-height: 12px;
    font-weight: 500;
    color: #2ecc71;
    display: inline-block;
    vertical-align: middle;
  }
  &::before {
    content: "";
    display: inline-block;
    vertical-align: middle;
    margin-right: 5px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    box-shadow: inset 0 0 8px #2ecc71,
                0 0 2px 0px #a0c4af;
  }
}
.token-symbol {
  width: 40px;
  text-align: center;
}

.token__actions {
  margin-top: 5px;
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.action-btn + .action-btn {
  margin-left: 10px;
}
/deep/ {
  .el-input,
  .el-select {
    width: 100%;
  }
}
</style>
