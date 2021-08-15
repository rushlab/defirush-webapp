<!-- dialog 返回的是整个对象, select 组件返回 id -->
<template>
  <el-dialog
    class="dialog--connect" :title="dialogTitle" width="540px" top="10vh"
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
import { chains } from '@/utils/chains'

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
      chains,
      isVisible: this.visible,
      protocol: '',
      connection: {},
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
      this.connection = {}
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
      this.protocol = 'MetaMask'
      this.connection = {}
      this.pending = true
      try {
        await this.switchToCurrentChain()
        await global.ethereum.request({ method: 'eth_requestAccounts' })
      } catch(error) {
        console.log(error)
        this.$message.error(error.message || error.toString())
        this.isVisible = false
        this.pending = false
        return
      }
      const provider = new ethers.providers.Web3Provider(global.ethereum)
      this.signer = provider.getSigner()
      this.address = await this.signer.getAddress()
      this.pending = false
    },
    async connectWalletConnect() {
      this.protocol = 'WalletConnect'
      this.connection = {}
      this.pending = true
      const chainId = this.$wallet.getChainId()
      const { rpcUrl } = _.find(this.chains, { chainId })  // 一定存在
      //  Create WalletConnect Provider
      const wcProvider = new WalletConnectProvider({
        rpc: { [chainId]: rpcUrl },
      })
      try {
        await wcProvider.enable()
      } catch(error) {
        console.log(error)
        this.$message.error(error.message || error.toString())
        this.isVisible = false
        this.pending = false
        return
      }
      const provider = new ethers.providers.Web3Provider(wcProvider)
      this.signer = provider.getSigner()
      this.address = await this.signer.getAddress()
      this.pending = false
    },
    async verifyUserWallet() {
      const { signer, address } = this
      const tip = 'Please sign to let us verify that you are the owner of this address'
      const timestamp = (new Date()).valueOf()
      const message = `${tip}\n${address}\n${timestamp}`
      let signature, chainId
      this.pending = true
      try {
        chainId = (await signer.provider.getNetwork()).chainId
        signature = await signer.signMessage(message)
      } catch(error) {
        console.log(error)
        this.$message.error(error.message || error.toString())
        this.isVisible = false
        this.pending = false
        return
      }
      const signerAddress = ethers.utils.verifyMessage(message, signature)
      if (signerAddress.toLowerCase() === address.toLowerCase()) {
        this.$message.success('Connected')
        await this.$store.dispatch('auth/login', {
          chainId, address, message, signature,
          protocol: this.protocol, connection: this.connection,
        })
        this.verified = true
        this.isVisible = false
        this.pending = false
        // global.location.reload()
        this.$store.dispatch('_refreshApp')
      } else {
        this.$message.error('Wrong signature ...... ')
      }
    },
    async switchToCurrentChain() {
      const chainId = this.$store.state.auth.chainId
      const chainIdHex = '0x' + chainId.toString(16)
      const { chainName, nativeCurrency, rpcUrl } = _.find(this.chains, { chainId })  // 一定存在
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
