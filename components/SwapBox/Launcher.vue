<template>
  <div class="launcher">
    <div v-if="isSignerAlive" class="active-wallet"><span>已连接钱包: MetaMask</span></div>
    <div v-if="isSignerAlive" v-loading="!!pending">
      <el-form ref="launcher" label-position="top">
        <el-form-item label="钱包地址">
          <el-input :value="walletAddress" readonly></el-input>
        </el-form-item>
        <el-form-item label="钱包余额">
          <el-input :value="walletBalance" readonly>
            <div class="token-symbol" slot="prepend">ETH</div>
          </el-input>
          <div class="token__actions">
            <el-button
              class="action-btn" size="mini" type="success" plain
              :disabled="!EtherFaucet"
              @click="onRequestEther">充值</el-button>
          </div>
        </el-form-item>
      </el-form>
      <el-form label-position="left">
        <el-form-item
          v-for="(value, symbol) in erc20TokenBalance" :key="symbol"
          class="token-item"
        >
          <el-input :value="value" readonly>
            <div class="token-symbol" slot="prepend">{{ symbol }}</div>
          </el-input>
          <div class="token__actions">
            <!-- <el-button class="action-btn" size="mini" type="warning" plain>转账</el-button> -->
            <!-- <el-button class="action-btn" size="mini" type="primary" plain>兑换</el-button> -->
          </div>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import { mapState } from 'vuex'
import { ethers } from "ethers"
import { BigNumber } from 'bignumber.js'

const ERC20_TOKENS = [
  { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  { symbol: 'USDT', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  { symbol: 'DAI', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18 },
  { symbol: '1INCH', address: '0x111111111117dc0aa78b770fa6a738034120c302', decimals: 18 },
  { symbol: "UNI", address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", decimals: 18 }
]

const ERC20_ABI = [
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address recipient, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
]

export default {
  name: 'Launcher',
  data() {
    const erc20TokenBalance = {}
    _.forEach(ERC20_TOKENS, ({ symbol }) => {
      erc20TokenBalance[symbol] = 0
    })
    return {
      connecting: false,
      pending: false,
      address: '',
      walletBalance: 0,
      ERC20_TOKENS,
      ERC20_ABI,
      erc20TokenBalance: { ...erc20TokenBalance },
      EtherFaucet: null
    }
  },
  created() {
    this.getEtherFaucetData()
  },
  mounted() {
    this.handleGetBalance()
  },
  computed: {
    ...mapState('auth', ['walletAddress', 'isAuthenticated', 'isSignerAlive']),
  },
  methods: {
    async handleGetBalance() {
      await this.getEtherBalance()
      await this.getERC20TokensBalance()
    },
    async getEtherBalance() {
      this.walletBalance = await this.$wallet.getBalance()
    },
    async getERC20TokensBalance(tokenAddres) {
      if (tokenAddres) {
        const token = _.find(ERC20_TOKENS, { address: tokenAddres })
        if (!!token) {
          this.erc20TokenBalance[token.symbol] = await this.getTokenBalance(token)
        }
      } else {
        _.forEach(this.ERC20_TOKENS, async (token) => {
          this.erc20TokenBalance[token.symbol] = await this.getTokenBalance(token)
        })
      }
    },
    async getTokenBalance(token) {
      const erc20Contract = new ethers.Contract(token.address, this.ERC20_ABI, this.$wallet.getProvider())
      const balance = await erc20Contract.balanceOf(this.walletAddress)
      return (new BigNumber(balance.toString())).shiftedBy(-token.decimals).toString()
    },
    async getEtherFaucetData() {
      // const res = await this.$axios.get('https://hardhat-dev.heidian.io/api/contracts.json')
      // const { EtherFaucet } = res.data
      this.EtherFaucet = {
        address: '0xB581C9264f59BF0289fA76D61B2D0746dCE3C30D',
        abi: [
          'function requestEther(uint256 amount)'
        ]
      }
    },
    onRequestEther() {
      this.$confirm('该操作会从私有链转移 1个ETH 到当前钱包', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.handleRequestEther()
      }).catch(() => {
      })
    },
    async handleRequestEther() {
      try {
        const contract = new ethers.Contract(
          this.EtherFaucet.address, this.EtherFaucet.abi, this.$wallet.getSigner())
        const amount = ethers.utils.parseEther('1')  // 获取 1 个 Ether
        await contract.requestEther(amount, {
          gasPrice: 0,
        }).then(this.$wallet.waitForTx)
        await this.getEtherBalance()
      } catch (error) {
        console.log(error)
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.active-wallet {
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
// .token-item {
//   position: relative;
//   &::after {
//     content: "";
//     display: block;
//     position: absolute;
//     left: 0;
//     right: 0;
//     bottom: -11px;
//     border-top: 1px solid #f0f0f0;
//   }
// }
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
