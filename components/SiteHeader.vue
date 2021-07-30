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
      :append-to-body="true" :modal-append-to-body="true"
      :visible.sync="connectDialog.visible"
    >
      <div v-if="!connectDialog.address" class="step-connect">
        <el-button type="primary" plain @click="connectBrowserWallet">Connect</el-button>
      </div>
      <div v-if="connectDialog.address && !connectDialog.verified" class="step-verify">
        <p>Please sign to let us verify that you are the owner of this address</p>
        <p>{{ connectDialog.address }}</p>
        <el-button type="success" plain @click="verifyUserWallet">Verify</el-button>
      </div>
      <div v-if="connectDialog.verified" class="step-verified">
        <p>成功</p>
        <el-button type="default" plain @click="connectDialog.visible=false">Close</el-button>
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
      },
    }
  },
  computed: {
    ...mapState('auth', ['walletChainId', 'walletAddress', 'isAuthenticated', 'isSignerAlive']),
    networkName() {
      if (this.walletChainId == 1) {
        return 'Etherum Mainnet Network'
      } else {
        'Unknown Network'
      }
    },
    maskedWalletAddress() {
      const walletAddress = this.walletAddress || ''
      if (!walletAddress) return ''
      return walletAddress.substring(0, 4) + '...' + walletAddress.substring(walletAddress.length - 4)
    }
  },
  methods: {
    copyToClipboard,
    async connectBrowserWallet() {
      if (typeof global.ethereum !== 'undefined' && global.ethereum.isMetaMask) {
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
      const message = `${tip}\n${address}`
      let signature, signerAddress, chainId
      try {
        chainId = (await signer.provider.getNetwork()).chainId
        signature = await signer.signMessage(message)
        signerAddress = await ethers.utils.verifyMessage(message, signature)
      } catch(error) {
        this.$message.error(error.message || error.toString())
        return
      }
      if (signerAddress.toLowerCase() === address.toLowerCase()) {
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
@import "@/assets/stylesheets/variables.scss";

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
</style>
