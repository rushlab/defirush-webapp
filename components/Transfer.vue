<template>
  <div class="transfer">
    <el-form inline label-width="120px">
      <el-form-item label="FromAddress" class="charge-from-address">
        <el-input :value="fromAddress" readonly>
          <template slot="append">
            <el-button @click.stop="onSwitchAccount">切换账户</el-button>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="当前余额">
        <el-input :value="fromAddressBalance" readonly>
          <template slot="append">ETH</template>
        </el-input>
      </el-form-item>
    </el-form>
    <el-form inline label-width="120px">
      <el-form-item label="ToAddress" class="charge-from-address">
        <el-input v-model="toAddress" placeholder="请输入目标账户地址"></el-input>
      </el-form-item>
      <el-form-item label="充值金额">
        <el-input-number v-model="amount" :max="+fromAddressBalance">
          <template slot="append">ETH</template>
        </el-input-number>
      </el-form-item>
    </el-form>
    <el-form inline label-width="120px">
      <el-form-item>
        <el-button
          type="primary"
          :disabled="disableTransfer"
          :loading="!!pending"
          @click="onTransferBalance">{{ !!pending ? '正在转账' : '提交转账' }}</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import { ethers } from "ethers"
const { utils } = ethers

export default {
  name: 'Transfer',
  props: {
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
  },
  data() {
    return {
      pending: false,
      fromSigner: this.signer || null,

      fromAddress: '',
      fromAddressBalance: 0,
      toAddress: '',
      amount: 0
    }
  },
  computed: {
    disableTransfer() {
      return !!this.pending || !this.fromSigner || this.fromAddressBalance <= 0 || !this.toAddress
    }
  },
  watch: {
    signer: {
      handler: function(newSigner) {
        if (!newSigner) return;
        this.fromSigner = newSigner
        this.getSignerData()
      },
    },
  },
  mounted() {
    this.getSignerData()
  },
  methods: {
    onSwitchAccount() {
      this.$prompt('请输入账户私钥', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^(0x)?[a-fA-F0-9]{20,}$/,
        inputErrorMessage: '私钥格式不正确'
      }).then(async ({ value }) => {
        try {
          await this.onChangePrivateKey(value)
        } catch (error) {
          this.$message({
            type: 'error',
            message: '私钥不正确'
          });
        }
      }).catch(() => {

      });
    },
    async getSignerData() {
      if (!this.fromSigner) return;
      this.fromAddress = await this.fromSigner.getAddress()
      const balance = await this.fromSigner.getBalance()
      this.fromAddressBalance = ethers.utils.formatUnits(balance)
    },
    async onChangePrivateKey(value) {
      try {
        this.fromSigner = new ethers.Wallet(value, this.provider)
        this.getSignerData()
      } catch (error) {
        console.log(error)
        this.fromSigner = null
        this.fromAddress = ''
        this.fromAddressBalance = '0.00'
      }
    },
    _getSigner() {
      let signer = this.signer
      try {
        signer = this.fromSigner.connect(this.provider)
      } catch (error) {
        console.log('signer connect provider failed: ', error)
      }
      return signer
    },
    async onTransferBalance() {
      try {
        this.pending = true
        const to = this.toAddress
        const from = await this.fromSigner.getAddress()
        const txData = {
          from,
          to,
          value: ethers.utils.parseEther(this.amount + ''),
          nonce: await this.provider.getTransactionCount(from, 'latest'),
          gasPrice: '0x09184e72a'
        }
        console.log(txData)
        const signer = this._getSigner()
        const transaction = await signer.sendTransaction(txData)
        const receipt = await transaction.wait()
        console.log('@@@@@ receipt is', receipt)
        console.log('@@@@@ 转账成功', transaction)
        this.$message({ message: `恭喜你，转账成功，转账金额为 ${this.amount} ETH`, type: 'success' })
        this.$emit('success', to)
        this.pending = false
        this.getSignerData()
      } catch (error) {
        console.log('@@@@@ 转账失败', error)
        this.$message({ message: '恭喜你，转账成功', type: 'success' })
        this.pending = false
      }
    }
  },
}
</script>

<style lang="scss" scoped>
/deep/ {
  .charge-from-address .el-select,
  .charge-from-address .el-input {
    width: 400px;
  }
}
</style>

