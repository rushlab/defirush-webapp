<!-- dialog 返回的是整个对象, select 组件返回 id -->
<template>
  <el-dialog
    class="dialog--connect" :title="dialogTitle" width="540px" top="10vh"
    :append-to-body="true" :modal-append-to-body="true"
    :close-on-click-modal="false" :close-on-press-escape="false"
    :visible.sync="isVisible" @open="onDialogOpen" @close="onDialogClose"
  >
    <div v-loading="isConnecting">
      <template v-if="!address">
        <!-- 选择钱包，点击链接 -->
        <div class="dialog__notice">Please select a wallet to connect:</div>
        <div class="wallet-items">
          <button class="wallet-btn" @click="connectBrowserWallet">
            <img class="wallet-icon" src="~/assets/icons/metamask-fox.svg" alt="">
            <span> MetaMask</span>
          </button>
          <button class="wallet-btn" @click="connectBrowserWallet">
            <img class="wallet-icon" src="~/assets/icons/wallet-connect.png" alt="">
            <span> WalletConnect</span>
          </button>
        </div>
        <el-link href="/" target="_blank">What is a wallet?</el-link>
      </template>
      <template v-if="address && !verified">
        <!-- 没有验证过，点击进行验证 -->
        <div class="dialog__notice">Please sign to let us verify that you are the owner of this address</div>
        <div class="address-to-verify">{{ address }}</div>
      </template>
    </div>
    <div v-if="address && !verified" slot="footer" class="call-to-action">
      <el-button
        type="dark" @click="verifyUserWallet"
        :disabled="isVerifying" :loading="isVerifying"
      >Verify</el-button>
    </div>
  </el-dialog>
</template>

<script>
import _ from 'lodash'
import { ethers } from 'ethers'
import { mapState, mapGetters, mapActions } from 'vuex'
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
      address: '',
      signer: null,
      verified: false,
      isConnecting: false,
      isVerifying: false,
    }
  },
  computed: {
    dialogTitle() {
      if (!this.address) return 'Select a wallet'
      if (this.address && !this.verified) return 'Verify'
      return ''
    },
  },
  mounted() {},
  methods: {
    resetStatus() {
      this.address = ''
      this.signer = null
      this.verified = false
      this.isConnecting = false
      this.isVerifying = false
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
    async connectBrowserWallet() {
      if (typeof global.ethereum !== 'undefined' && global.ethereum.isMetaMask) {
        this.isConnecting = true
        try {
          await this.switchToCurrentChain()
          await global.ethereum.request({ method: 'eth_requestAccounts' })
        } catch(error) {
          console.log(error)
          this.isVisible = false
          this.isConnecting = false
          this.$message.error(JSON.stringify(error))
          return
        }
        const provider = new ethers.providers.Web3Provider(global.ethereum)
        const signer = provider.getSigner()
        const address = await signer.getAddress()
        this.signer = signer
        this.address = address
        this.isConnecting = false
      } else {
        this.$confirm('请先安装 MetaMask 扩展应用', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          window.open('https://metamask.io/download.html')
        }).catch(() => {})
      }
    },
    async verifyUserWallet() {
      const { signer, address } = this
      const tip = 'Please sign to let us verify that you are the owner of this address'
      const timestamp = (new Date()).valueOf()
      const message = `${tip}\n${address}\n${timestamp}`
      let signature, signerAddress, chainId
      this.isVerifying = true
      try {
        chainId = (await signer.provider.getNetwork()).chainId
        signature = await signer.signMessage(message)
        signerAddress = await ethers.utils.verifyMessage(message, signature)
        this.isVerifying = false
      } catch(error) {
        this.isVerifying = false
        this.$message.error(error.message || error.toString())
        return
      }
      if (signerAddress.toLowerCase() === address.toLowerCase()) {
        this.isVisible = false
        this.verified = true
        await this.$store.dispatch('auth/login', {
          chainId, address, message, signature,
          protocol: 'MetaMask', connection: {}
        })
        this.$message.success('Connected')
        global.location.reload()
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
