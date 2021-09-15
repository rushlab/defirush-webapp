<template>
  <div class="overview">
    <nuxt-link class="address" :to="`/rush-wallet-proxy/proxies/${proxyAddress}`">{{ maskedWalletAddress }}</nuxt-link>
    <div class="actions">
      <div class="action-item" @click="$emit('openProxyAddressDialog')">
        <i class="el-icon-film"></i>
      </div>
      <div class="action-item" @click="execCopy(proxyAddress)">
        <i class="el-icon-copy-document"></i>
      </div>
      <a class="action-item" :href="'https://rinkeby.etherscan.io/address/' + proxyAddress" target="_blank">
        <i class="el-icon-view"></i>
      </a>
    </div>
    <div class="balance">{{ totalBalanceInUSD.toFixed(2) }} USD</div>
    <div class="transaction-btn-wrapper">
      <el-button type="primary" @click="$router.push(`/rush-wallet-proxy/proxies/${proxyAddress}/contract-interaction`)">Contract Interaction</el-button>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import { mapState } from 'vuex'
import { ethers } from "ethers"
import { copyToClipboard } from '@/utils/copy'
import VueQrcode from '@chenfengyuan/vue-qrcode'

const ERC20_TOKENS = [
  { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  { symbol: 'USDT', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  { symbol: 'DAI', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18 },
  { symbol: '1INCH', address: '0x111111111117dc0aa78b770fa6a738034120c302', decimals: 18 },
  { symbol: "UNI", address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", decimals: 18 }
]

const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address recipient, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
]


export default {
  name: 'WalletOverview',
  components: {
    Qrcode: VueQrcode
  },
  props: {
    proxyAddress: {
      type: String,
      default: ''
    },
  },
  data() {
    return {
      ERC20_TOKENS,
      customTokens: [],
      totalBalanceInUSD: 0,
      pending: false,
      dialogProxyAddressVisible: false
    }
  },
  computed: {
    walletTokens() {
      return [
        ...this.ERC20_TOKENS,
        ...this.customTokens
      ]
    },
    maskedWalletAddress() {
      if (!this.proxyAddress) {
        return ''
      }
      return this.proxyAddress.substr(0, 6) + '...' + this.proxyAddress.substr(this.proxyAddress.length - 4)
    },
  },
  watch: {
    proxyAddress: {
      handler(newVal) {
        this.updateProxyWalletBalance()
      },
      immediate: true
    }
  },
  mounted() {
    this.updateProxyWalletBalance()
  },
  methods: {
    execCopy(content) {
      copyToClipboard(content)
      this.$message({ type: 'success', message: 'Copied successfully!' })
    },
    getAssetPriceUSD(asset) {
      return new Promise((resolve) => {
        if (!asset) {
          resolve(0)
        }
        this.$wallet.getPriceUSD(asset).then(priceUSD => {
          resolve(priceUSD)
        }).catch(() => {
          resolve(0)
        })
      })
    },
    async getBalance(asset) {
      const provider = this.$wallet.getProvider()
      const address = this.proxyAddress
      if (!asset || this.$wallet.isETH(asset)) {
        const balance = await provider.getBalance(address)
        return ethers.utils.formatEther(balance)
      } else {
        // 否则就认为 asset 是 erc20
        const erc20 = new ethers.Contract(asset, [
          'function balanceOf(address account) view returns (uint256)',
          'function decimals() view returns (uint256)',
        ], provider);
        const [balance, decimals] = await Promise.all([erc20.balanceOf(address), erc20.decimals()])
        return ethers.utils.formatUnits(balance, decimals)
      }
    },
    updateProxyWalletBalance() {
      this.totalBalanceInUSD = 0
      if (!this.proxyAddress) {
        return
      }
      _.forEach(this.walletTokens, (token) => {
        Promise.all([
          this.getBalance(token.address),
          this.getAssetPriceUSD(token.address)
        ]).then(([balance, priceUSD]) => {
          this.totalBalanceInUSD += (+balance || 0) * (+priceUSD || 0)
        }).catch(err => {
          console.log(err)
        })
      })
    }
  },
}
</script>

<style lang="scss" scoped>
.overview {
  padding: 20px 10px;
  background-color: #f0f0f0;
  border-radius: 4px;
}
.address {
  display: block;
  width: 100%;
  line-height: 40px;
  text-align: center;
}
.actions {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 15px;
}
.action-item {
  cursor: pointer;
  padding: 0 10px;
  line-height: 20px;
}
.balance {
  width: 100%;
  text-align: center;
  font-weight: 500;
}
.transaction-btn-wrapper {
  margin-top: 20px;
  width: 100%;
  > .el-button {
    width: 100%;
  }
}
</style>
