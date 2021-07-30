<template>
  <div class="site-header">
    <div>ETH/BTC/...</div>
    <div style="margin-left: auto;"></div>
    <template v-if="isAuthenticated">
      <div class="wallet-address">{{ walletAddress }}</div>
      <div class="wallet-status">
        <el-tag
          v-if="isSignerAlive" size="small" type="success" plain
        >Connected</el-tag>
        <el-button
          v-else @click="connectCurrentWallet"
          size="mini" type="danger" plain round
        >Disconnected</el-button>
      </div>
      <el-button class="logout-button" type="text" @click="handleLogout">Logout</el-button>
    </template>
    <template v-else>
      <el-button
        type="primary" round plain
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

export default {
  name: 'SiteHeader',
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
    ...mapState('auth', ['walletAddress', 'isAuthenticated', 'isSignerAlive']),
  },
  methods: {
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
  height: 60px;
  padding: 10px 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  background-color: $color-bg-header;
  z-index: 100;
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
</style>
