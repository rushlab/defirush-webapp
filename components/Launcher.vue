<template>
  <div class="launcher">
    <div class="metamask">
      <metamask-logo class="mm-logo"/>
    </div>
    <div v-if="!!$userWallet" class="avtive-waller"><span>已连接钱包: MetaMask</span></div>
    <div v-if="$userWallet" v-loading="!!pending">
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
              v-if="canRequestEther"
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
import { ABI as ERC20_ABI, TOKENS as ERC20_TOKENS } from '@/constants/erc20-tokens.js'
import MetamaskLogo from '@/components/MetamaskLogo'

export default {
  name: "Launcher",
  components: {
    MetamaskLogo,
  },
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
    ...mapState('user', ['walletAddress']),
    canRequestEther() {
      return _.get(this.$userWallet, 'provider.chainId') == 71337
    }
  },
  methods: {
    async handleGetBalance() {
      await this.getEtherBalance()
      await this.getERC20TokensBalance()
    },
    async getEtherBalance() {
      const balance = await this.$userWallet.getBalance()
      this.walletBalance = ethers.utils.formatUnits(balance)
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
      const erc20Contract = new ethers.Contract(token.address, this.ERC20_ABI, this.$userWallet)
      const balance = await erc20Contract.balanceOf(this.walletAddress)

      return (new BigNumber(balance.toString())).shiftedBy(-token.decimals).toString()
    },
    async getEtherFaucetData() {
      const res = await this.$axios.get('https://hardhat-dev.heidian.io/api/contracts.json')
      const { EtherFaucet } = res.data
      this.EtherFaucet = {...EtherFaucet}
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
        const contract = new ethers.Contract(this.EtherFaucet.address, this.EtherFaucet.abi, this.$userWallet)
        const amount = ethers.utils.parseEther('1')  // 获取 1 个 Ether
        const receipt = await contract.requestEther(amount, {
          gasPrice: 0,
        })
        console.log('@@@@@ receipt ', receipt)
        await receipt.wait()
        await this.getEtherBalance()
      } catch (error) {
        console.log(error)
      }
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


