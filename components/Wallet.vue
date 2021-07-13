<template>
  <div class="wallet">
    <el-form v-if="!!editing || !address" ref="form" :model="form" :disabled="disabledForm">
      <el-form-item label="钱包类型">
        <el-select v-model="form.walletType" placeholder="请选择钱包类型">
          <el-option
            v-for="option in walletTypeOptions" :key="option.value"
            :label="option.label"
            :value="option.value"></el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="钱包私钥" v-if="form.walletType === 'privateKey'">
        <el-input v-model="form.privateKey" placeholder="请输入钱包私钥 private key"></el-input>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="onChangeWallet">确定</el-button>
        <el-button type="warning" @click="onCancel">取消</el-button>
      </el-form-item>
    </el-form>
    <el-form v-else ref="walletForm" label-position="top" :disabled="disabledForm">
      <el-form-item label="钱包地址">
        <el-input :value="address" readonly></el-input>
      </el-form-item>
      <el-form-item label="钱包余额">
        <el-input :value="walletBalance" readonly>
          <template slot="append">ETH</template>
        </el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onGetBalance">更新余额</el-button>
        <el-button type="warning" @click="editing = true">切换钱包</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from "ethers"

export default {
  name: "Wallet",
  props: {
    walletType: {
      type: String,
      default: 'privateKey'
    },
    provider: {
      type: Object,
      default: () => {
        return {}
      }
    },
    signer: {
      type: Object,
      default: () => {
        return {}
      }
    },
    wallet: {
      type: Object,
      default: () => {
        return {}
      }
    }
  },
  data() {
    return {
      editing: false,
      address: '',
      walletBalance: 0,
      walletTypeOptions: [
        { label: 'Private Key', value: 'privateKey' },
        { label: 'Metamask', value: 'metamask' },
      ],
      form: {
        walletType: 'privateKey',
        privateKey: '',
      }
    }
  },
  watch: {
    signer: {
      handler: async function(newSigner) {
        if (!newSigner) return;
        this.onGetBalance()
      },
      immediate: true
    },
  },
  computed: {
    disabledForm() {
      return _.isEmpty(this.provider)
    }
  },
  methods: {
    async onGetBalance() {
      if (!this.wallet && !this.signer) return;
      const signer = this.wallet || this.signer
      const balance = await signer.getBalance()
      this.walletBalance = ethers.utils.formatUnits(balance)
      this.address = await signer.getAddress()
    },
    // async onRequestEther() {
    //   try {
    //     const res = await this.$axios.get('https://hardhat-dev.heidian.io/api/contracts.json')
    //     const { EtherFaucet } = res.data
    //     const contract = new ethers.Contract(EtherFaucet.address, EtherFaucet.abi, this.signer)
    //     console.log(contract)
    //   } catch (error) {
    //     console.log(error)
    //   }
    // },
    onChangeWallet() {
      const { walletType, privateKey } = this.form
      if (walletType === 'metamask') {
        this.$emit('changeWallet', 'metamask')
      } else {
        !!privateKey && this.$emit('changeWallet', privateKey)
      }
      this.editing = false
    },
    onCancel() {
      this.form.privateKey = ''
      this.editing = false
    }
  },
}
</script>

<style lang="scss" scoped>
/deep/ {
  .el-input,
  .el-select {
    width: 100%;
  }
}
</style>


