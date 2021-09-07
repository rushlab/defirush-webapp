<!-- dialog 返回的是整个对象, select 组件返回 id -->
<template>
  <el-dialog
    class="dialog--connect" :title="dialogTitle" width="840px" top="10vh"
    :append-to-body="true" :modal-append-to-body="true"
    :close-on-click-modal="false" :close-on-press-escape="false"
    :visible.sync="isVisible" @open="onDialogOpen" @close="onDialogClose"
  >
    <div v-loading="pending">
      <template v-if="step === 'connect'">
        <!-- 选择钱包，点击链接 -->
        <div class="dialog__notice">Please select a wallet to connect:</div>
        <div class="wallet-items">
          <button class="wallet-btn" @click="connectMetaMask">
            <img class="wallet-icon" src="~/assets/icons/metamask-fox.svg" alt="">
            <span> MetaMask</span>
          </button>
          <button class="wallet-btn" @click="connectWalletConnect">
            <img class="wallet-icon" src="~/assets/icons/wallet-connect.png" alt="">
            <span> WalletConnect</span>
          </button>
          <button class="wallet-btn" @click="connectLiquality">
            <img class="wallet-icon" src="~/assets/icons/logo-liquality.svg" alt="">
            <span> Liquality</span>
          </button>
        </div>
        <el-link href="/" target="_blank">What is a wallet?</el-link>
      </template>
      <template v-if="step === 'verify'">
        <!-- 没有验证过，点击进行验证 -->
        <div class="dialog__notice">Please sign to let us verify that you are the owner of this address</div>
        <div class="address-to-verify">{{ address }}</div>
      </template>
    </div>
    <div v-if="step === 'verify'" slot="footer" class="call-to-action">
      <el-button
        type="dark" @click="verifyUserWallet"
        :disabled="pending" :loading="pending"
      >Verify</el-button>
    </div>
  </el-dialog>
</template>

<script>
import _ from 'lodash'
import { ethers } from 'ethers'
import { mapState, mapGetters, mapActions } from 'vuex'
import WalletConnectProvider from '@walletconnect/web3-provider'
import { chains as ALL_CHAINS_LIST } from '@/utils/chains'

export default {
  name: 'ConnectWalletDialog',
  components: {},
  props: {
    visible: {
      type: Boolean,
      required: true
    },
  },
  data() {
    return {
      isVisible: this.visible,
      protocol: '',
      address: '',
      signer: null,
      verified: false,
      pending: false,
    }
  },
  computed: {
    dialogTitle() {
      return {
        'connect': 'Select a wallet',
        'verify': 'Verify',
        'done': 'Connected',
      }[this.step]
    },
    step() {
      if (!this.address) {
        return 'connect'
      } else if (this.address && !this.verified) {
        return 'verify'
      } else if (this.address && this.verified) {
        return 'done'
      }
    }
  },
  mounted() {},
  methods: {
    resetStatus() {
      this.protocol = ''
      this.address = ''
      this.signer = null
      this.verified = false
      this.pending = false
    },
    onDialogOpen() {
      this.resetStatus()
      // this.$emit('open')
      this.$emit('update:visible', true)
    },
    onDialogClose() {
      // this.$emit('close')
      this.$emit('update:visible', false)
    },
    async connectMetaMask() {
      if (!(typeof global.ethereum !== 'undefined' && global.ethereum.isMetaMask)) {
        this.$confirm('请先安装 MetaMask 扩展应用', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          window.open('https://metamask.io/download.html')
        }).catch(() => {})
        return
      }
      this.pending = true
      this.protocol = 'MetaMask'
      try {
        await this.switchToCurrentChain()
        await this.$wallet.setWalletConnector(this.protocol, global.ethereum)
        this.address = this.$wallet.getAddress()
      } catch(error) {
        console.log(error)
        this.$message.error(error.message || error.toString())
        this.isVisible = false
      }
      this.pending = false
    },
    async connectWalletConnect() {
      this.pending = true
      this.protocol = 'WalletConnect'
      const walletConnector = new WalletConnectProvider({
        rpc: _.fromPairs(ALL_CHAINS_LIST.map(({ chainId, rpcUrl }) => [ chainId, rpcUrl ]))
      })
      try {
        await this.$wallet.setWalletConnector(this.protocol, walletConnector)
        this.address = this.$wallet.getAddress()
      } catch(error) {
        console.log(error)
        this.$message.error(error.message || error.toString())
        this.isVisible = false
      }
      this.pending = false
    },
    async connectLiquality() {
      if (!(typeof global.rush !== 'undefined' && global.rush.isLiquality)) {
        this.$confirm('请先安装 Liquality 扩展应用', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          window.open('https://liquality.io/')
        }).catch(() => {})
        return
      }
      this.pending = true
      this.protocol = 'Liquality'
      try {
        await this.$wallet.setWalletConnector(this.protocol, global.rush)
        this.address = this.$wallet.getAddress()
      } catch(error) {
        console.log(error)
        this.$message.error(error.message || error.toString())
        this.isVisible = false
      }
      this.pending = false
    },
    async verifyUserWallet() {
      const signer = this.$wallet.getSigner()
      const address = this.$wallet.getAddress()
      const tip = 'Please sign to let us verify that you are the owner of this address'
      const timestamp = (new Date()).valueOf()
      // TODO 这里为了保证 ethereum 和 eth 的签名结果一致，把address开头的 0x 去掉
      // const message = `${tip}\n${address.substr(2)}\n${timestamp}`
      const message = `${tip}\n${address}\n${timestamp}`
      this.pending = true
      try {
        // const signature = await signer.signMessage(message)
        const _connector = this.$wallet._connector
        const signature = await _connector.request({
          method: 'personal_sign',
          params: [ message, address ]
        })
        await this.$store.dispatch('auth/authenticate', { message, signature })
        this.verified = true
      } catch(error) {
        console.log(error)
        this.$message.error(error.message || error.toString())
      }
      this.isVisible = false
      this.pending = false
      this.$store.dispatch('_refreshApp')
    },
    async switchToCurrentChain() {
      const chainId = this.$store.state.auth.chainId
      const chainIdHex = '0x' + chainId.toString(16)
      const { chainName, nativeCurrency, rpcUrl } = _.find(ALL_CHAINS_LIST, { chainId })  // 一定存在
      try {
        await global.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      } catch (error) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (error.code === 4902) {
          await global.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{ chainId: chainIdHex, chainName, nativeCurrency, rpcUrls: [ rpcUrl ] }],
          })
        } else {
          throw error
        }
      }
    }
  },
  watch: {
    visible(newVal) {
      this.isVisible = newVal
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@/assets/stylesheets/variables.scss";
.wallet-items {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 40px;
  margin-bottom: 50px;
}
.wallet-btn {
  height: 66px;
  padding: 15px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  border: none;
  background-color: #E6E8EC;
  flex: 1;
  cursor: pointer;
  &:hover,
  &:active {
    box-shadow: inset 0 0 1px 0px rgba(0, 0, 0, 0.2);
  }
  & + & {
    margin-left: 25px;
  }
  .wallet-icon {
    width: 36px;
    margin-right: 15px;
  }
  > span {
    font-size: 18px;
    font-weight: 400;
    line-height: 28px;
  }
}
.dialog__notice {
  margin-bottom: 10px;
  color: $--color-text-regular;
}
.address-to-verify {
  margin-top: 40px;
  margin-bottom: 30px;
  color: $--color-text-primary;
  background-color: #E6E8EC;
  font-size: 16px;
  padding: 25px 30px;
}
</style>
