<template>
  <div class="site-header">
    <div class="network-status" :class="{ 'signer-alive': isSignerAlive }">
      <span>{{ networkName }}</span>
    </div>
    <div style="margin-left: auto;"></div>
    <template v-if="isAuthenticated">
      <div class="wallet-status">
        <el-dropdown>
          <div class="el-dropdown-link wallet-address-btn">
            <metamask-logo class="icon-metamask"/>
            <span class="wallet-address">{{ maskedWalletAddress }}</span> <i class="el-icon-arrow-down el-icon--right"></i>
          </div>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item>
              <el-button class="dropdown__btn" @click="copyWalletAddress" type="text">{{ maskedWalletAddress }} <i class="el-icon-copy-document"></i></el-button>
            </el-dropdown-item>
            <el-dropdown-item>
              <el-button class="dropdown__btn" @click="handleLogout" type="text">Logout</el-button>
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </template>
    <template v-else>
      <el-button
        type="primary" round
        class="btn--dark"
        @click="openConnectDialog"
      >Connect wallet</el-button>
    </template>
    <!-- connect dialog -->
    <el-dialog
      class="dialog--dark"
      :title="dialogTitle"
      width="540px" top="10vh"
      :append-to-body="true"
      :modal-append-to-body="true"
      :visible.sync="connectDialog.visible"
    >
      <div class="dialog__inner" element-loading-background="rgba(0, 0, 0, 0)">
        <template v-if="!connectDialog.address">
          <!-- 选择钱包，点击链接 -->
          <div class="input-hint">Please select a wallet to connect:</div>
          <div class="wallet-items">
            <button
              class="wallet-btn"
              :disabled="connectDialog.isConnecting"
              @click="connectBrowserWallet">
              <metamask-logo class="wallet-icon" /> <span>MetaMask</span>
            </button>
            <button
              class="wallet-btn"
              :disabled="connectDialog.isConnecting"
              @click="connectBrowserWallet">
              <metamask-logo class="wallet-icon" /> <span>WalletConnect</span>
            </button>
          </div>
          <a href="javascript(0);" class="help-hint">What is a wallet?</a>
        </template>

        <template v-if="connectDialog.address && !connectDialog.verified">
          <!-- 没有验证过，点击进行验证 -->
          <div class="input-hint">Please sign to let us verify that you are the owner of this address</div>
          <div class="dialog-verify__address">{{ connectDialog.address }}</div>

        </template>
      </div>
      <div
        v-if="connectDialog.address && !connectDialog.verified"
        slot="footer" class="dialog-footer">
        <button
          class="footer__btn"
          :disabled="connectDialog.isVerifying"
          @click="verifyUserWallet">{{ connectDialog.isVerifying ? 'Verifying' : 'Verify' }}</button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from 'ethers'
import { mapState, mapGetters } from 'vuex'
import MetamaskLogo from '@/components/MetamaskLogo'
import { copyToClipboard } from '@/utils/copy'

export default {
  name: 'SiteHeader',
  components: {
    MetamaskLogo
  },
  data() {
    return {
      connectDialog: {
        visible: false,
        address: '',
        signer: null,
        verified: false,
        isConnecting: false,
        isVerifying: false
      },
    }
  },
  computed: {
    ...mapState('auth', ['walletChainId', 'walletAddress', 'isAuthenticated', 'isSignerAlive']),
    networkName() {
      if (this.walletChainId == 1) {
        return 'Etherum Mainnet'
      } else {
        'Unknown Network'
      }
    },
    maskedWalletAddress() {
      const walletAddress = this.walletAddress || ''
      if (!walletAddress) return ''
      return walletAddress.substring(0, 6) + '...' + walletAddress.substring(walletAddress.length - 4)
    },
    dialogTitle() {
      if (!this.connectDialog.address) return 'Sellect a Wallet'
      if (this.connectDialog.address && !this.connectDialog.verified) return 'Verify'
      return ''
    }
  },
  methods: {
    copyToClipboard,
    async connectBrowserWallet() {
      if (typeof global.ethereum !== 'undefined' && global.ethereum.isMetaMask) {
        this.connectDialog.isConnecting = true
        try {
          await global.ethereum.request({ method: 'eth_requestAccounts' })
        } catch(error) {
          console.log(error)
          this.connectDialog.visible = false
        }
        const provider = new ethers.providers.Web3Provider(global.ethereum)
        const signer = provider.getSigner()
        const address = await signer.getAddress()
        this.connectDialog.signer = signer
        this.connectDialog.address = address
        this.connectDialog.isConnecting = false
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
      const { signer, address } = this.connectDialog
      const tip = 'Please sign to let us verify that you are the owner of this address'
      const timestamp = (new Date()).valueOf()
      const message = `${tip}\n${address}\n${timestamp}`
      let signature, signerAddress, chainId
      this.connectDialog.isVerifying = true
      try {
        chainId = (await signer.provider.getNetwork()).chainId
        signature = await signer.signMessage(message)
        signerAddress = await ethers.utils.verifyMessage(message, signature)
      } catch(error) {
        this.$message.error(error.message || error.toString())
        return
      }
      this.connectDialog.isVerifying = false
      if (signerAddress.toLowerCase() === address.toLowerCase()) {
        this.connectDialog.visible = false
        this.connectDialog.verified = true
        await this.$store.dispatch('auth/login', { chainId, address, message, signature })
      } else {
        this.$message.error('Wrong signature ...... ')
      }
    },
    async connectCurrentWallet() {
      if (typeof global.ethereum !== 'undefined' && global.ethereum.isMetaMask) {
        try {
          await global.ethereum.request({ method: 'eth_requestAccounts' })
        } catch(error) {}
      }
    },
    async copyWalletAddress() {
      try {
        await this.copyToClipboard(this.walletAddress)
        this.$message({ type: 'success', message: 'Copied successfully!' })
      } catch (error) {}
    },
    openConnectDialog() {
      this.connectDialog = {
        visible: true,
        address: '',
        signer: null,
        verified: false,
      }
    },
    async handleLogout() {
      await this.$store.dispatch('auth/logout')
    }
  },
}
</script>

<style lang="scss" scoped>
// @import "@/assets/stylesheets/variables.scss";
@import "@/assets/stylesheets/components/dialog.scss";

.site-header {
  width: 100%;
  height: 75px;
  padding: 17px 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  background-color: $color-bg-header;
  z-index: 100;
}
.network-status {
  position: relative;
  padding-left: 20px;
  font-size: 16px;
  line-height: 1;
  color: $color-text-light;
  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0px;
    margin-top: -5px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: $color-warning;
  }
  &.signer-alive::before {
    background-color: $color-success;
  }
}
.wallet-address-btn {
  position: relative;
  height: 40px;
  line-height: 22px;
  padding: 9px 20px 9px 40px;
  border-radius: 20px;
  color: $color-text;
  box-shadow: 0 0 1px 0 $color-border;
  .icon-metamask {
    position: absolute;
    width: 24px;
    height: 20px;
    top: 50%;
    left: 10px;
    margin-top: -10px;
  }
}
.dropdown__btn {
  color: $color-text;
}
.wallet-address {
  //
}
.wallet-status {
  /deep/ .el-button,
  /deep/ .el-tag {
    margin-left: 1em;
  }
}
.logout-button {
  margin-left: 1em;
}
.step-connect,
.step-verify,
.step-verified {
  text-align: center;
  /deep/ .el-button {
    margin: 10px auto;
  }
}
.btn--dark {
  height: 40px;
  line-height: 22px;
  padding-top: 9px;
  padding-bottom: 9px;
  background-color: $color-text;
  color: #ffffff;
  &:hover,
  &:active {
    opacity: 0.9;
  }
}

// dialog styles
.wallet-items {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 50px;
  margin-bottom: 50px;
}
.wallet-btn {
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
    height: 36px;
    width: 36px;
    margin-right: 15px;
  }
  > span {
    font-size: 18px;
    font-weight: 400;
    line-height: 28px;
  }
}
.help-hint {
  font-size: 16px;
  color: #033FFF;
  cursor: pointer;
}

.dialog-verify__address {
  margin-top: 50px;
  margin-bottom: 20px;
  color: $color-text;
  background-color: #E6E8EC;
  font-size: 16px;
  padding: 25px 35px;
}
.footer__btn[disabled] {
  opacity: 0.7;
}
/deep/ {
  .el-dialog__body {
    padding: 30px;
  }
}
</style>
