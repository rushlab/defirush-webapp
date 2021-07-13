<template>
  <div class="deposit">
    <el-form class="deposit__form" label-position="top">
      <el-form-item>
        <div slot="label" class="form-item__label">
          <div class="label-text">存款</div>
          <div class="token-balance" v-if="assetBalance">余额: {{ assetBalance }}</div>
        </div>
        <el-input placeholder="请输入存入数量" v-model="amount" class="input-with-select">
          <el-select class="asset-select" v-model="assetAddress" slot="prepend" placeholder="请选择" @change="handleChangeFromToken">
            <el-option
              v-for="opt in tokenOptions" :key="'assetAddress-'+ opt.symbol"
              :label="opt.symbol"
              :value="opt.address"/>
          </el-select>
        </el-input>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="onDeposit">存款</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from 'ethers'
import { ABI as ABI_ERC20 } from '@/constants/erc20-tokens.js'
import { ABI_EIP20 } from '@/constants/contracts/aave/index.js'

export default {
  name: 'Deposit',
  props: {
    provider: {
      type: Object,
      default: () => {
        return {}
      }
    },
    lendingPool: {
      type: Object,
      default: () => {
        return {}
      }
    }
  },
  data() {
    return {
      signer: null,
      pending: false,
      senderAddress: '',
      assetBalance: '',
      amount: 0,
      assetAddress: '',
      tokenOptions: []
    }
  },
  async mounted() {
    this.signer = this.provider.getSigner()
    this.senderAddress = await this.signer.getAddress()
    await this.getAaveTokens()
  },
  watch: {
    provider: {
      handler: async function(newProvider) {
        if (!newProvider) return;
        this.signer = newProvider.getSigner()
        this.senderAddress = await this.signer.getAddress()
      },
    },
  },
  methods: {
    async getAaveTokens() {
      const { data } = await this.$axios.get('https://aave.github.io/aave-addresses/mainnet.json')
      const { proto } = data
      this.tokenOptions = proto
    },
    // getSigner() {
    //   return this.provider ? this.provider.getSigner() : null
    // },
    // async getSenderAddress() {
    //   const signer = this.getSigner()
    //   return signer ? await this.signer.getAddress() : ''
    // },
    async getERC20TokenBalance(token) {
      const erc20Contract = new ethers.Contract(token.address, ABI_ERC20, this.signer)
      const balance = await erc20Contract.balanceOf(this.senderAddress)
      return ethers.utils.formatUnits(balance.toString(), token.decimals)
    },
    async updateFromTokenBalance() {
      const token = _.find(this.tokenOptions, { address: this.assetAddress })
      if (!token) {
        this.assetBalance = '0.00'
        return
      }
      if (token.symbol.toLowerCase() === 'eth') {
        // return ETH balance
        const balance = await this.signer.getBalance()
        this.assetBalance = ethers.utils.formatUnits(balance)
      } else {
        this.assetBalance = await this.getERC20TokenBalance(token)  // return erc20 token balance
      }
    },
    async updateReserveData() {
      const token = _.find(this.tokenOptions, { address: this.assetAddress })
      console.log(token.aTokenAddress, token.aTokenSymbol)
      const aTokenContract = new ethers.Contract(token.aTokenAddress, ABI_EIP20, this.signer)
      console.log('@aTokenContract', aTokenContract)
      const balance = await aTokenContract.callStatic.balanceOf(this.senderAddress)
      const aTokenBalance = ethers.utils.formatUnits(balance.toString(), token.decimals)
      // const data = await this.lendingPool.callStatic.getReserveData(token.aTokenAddress)
      console.log('aToken balance: ', aTokenBalance)
    },
    handleChangeFromToken() {
      this.updateFromTokenBalance()
      this.updateReserveData()
    },
    parseTxAmount(amount) {
      // int => Big Number
      const token = _.find(this.tokenOptions, { address: this.assetAddress })
      if (!token) return null
      const _amount = ethers.utils.parseUnits(amount + '', token.decimals)
      return _amount
    },
    async getApprovePayload() {
      const assetAddress = this.assetAddress
      const amount = this.parseTxAmount(this.amount)
      const token = _.find(this.tokenOptions, { address: assetAddress })
      const erc20Contract = new ethers.Contract(token.address, ABI_ERC20, this.signer)
      const allowance = await erc20Contract.callStatic.allowance(this.senderAddress, this.lendingPool.address)
      if (allowance.lt(amount)) {
        // allowance 已经足够完成这次交易的 amount, 则不再发起本次 approve
        return [erc20Contract, amount]
      }
      return [erc20Contract, null]
    },
    async handleApprove() {
      const token = _.find(this.tokenOptions, { address: this.assetAddress })
      if (!token || token.symbol.toLowerCase() === 'eth') return;
      try {
        const [erc20Contract, approveAmount] = await this.getApprovePayload()
        if (!approveAmount) return;
        const res = await erc20Contract.approve(this.lendingPool.address, approveAmount)
        await res.wait()  // 等待交易确认
      } catch (error) {
        console.log('@@@@@ handleApprove error', error)
        throw error
      }
    },
    async handleDeopsit() {
      const amount = this.parseTxAmount(this.amount)
      const payload = [
        this.assetAddress,   // address asset
        amount,              // uint amount
        this.senderAddress,  // address onBehalfOf
        0                    // uint16 referralCode
      ]
      const tx = await this.lendingPool.connect(this.signer).deposit(...payload)
      const receipt = await tx.wait()
      console.log('receipt', receipt)
    },
    async onDeposit() {
      try {
        this.pending = true
        await this.handleApprove()
        await this.handleDeopsit()
      } catch (error) {
        console.log(error)
        throw error
      }
      this.pending = false
    }
  },
}
</script>

<style lang="scss" scoped>

.deposit {
  width: 100%;
  display: flex;
  justify-content: space-between;
}
.deposit__form {
  width: 100%;
  max-width: 480px;
}
.form-item__label {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
}
.token-balance {
  font-size: 12px;
  font-weight: 500;
  color: #2980b9;
}
.estmate-gas {
  font-size: 12px;
  font-weight: 500;
  color: #8e44ad;
}
.distributions {
  width: 100%;
  max-width: 480px;
  margin-left: 15px;
  height: 300px;
  overflow: auto;
}
.deposit-title {
  font-size: 12px;
  font-style: italic;
}

/deep/ {
  .el-from-item {
    position: relative;
  }
  .el-select .el-input {
    width: 100px;
  }
  .el-form-item__label {
    width: 100%;
  }
  .input-with-select .el-input-group__prepend {
    background-color: #ffffff;
    // background-color: #34495e;
    // color: #ffffff;
  }
}
</style>