<template>
  <div class="site-header">
    <div class="network-status" :class="{ 'signer-alive': isSignerAlive }">
      <span>{{ networkName }}</span>
    </div>
    <div style="margin-left: auto;"></div>
    <gas-fee-gauge></gas-fee-gauge>
    <template v-if="isAuthenticated">
      <div class="wallet-status">
        <el-dropdown>
          <div class="el-dropdown-link wallet-address-btn">
            <metamask-logo class="icon-metamask"/>
            <span class="wallet-address">{{ maskedWalletAddress }}</span> <i class="el-icon-arrow-down el-icon--right"></i>
          </div>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item>
              <el-button class="dropdown__btn" @click="copyWalletAddress" type="text">
                {{ maskedWalletAddress }} <el-tooltip class="item" effect="dark" content="Click to copy" placement="top"><i class="el-icon-copy-document"></i></el-tooltip>
              </el-button>
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
        type="dark" round size="medium"
        @click="connectDialogVisible=true"
      >Connect Wallet</el-button>
    </template>
    <!-- connect dialog -->
    <connect-wallet-dialog :visible.sync="connectDialogVisible" />
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from 'ethers'
import { mapState, mapGetters } from 'vuex'
import MetamaskLogo from '@/components/MetamaskLogo'
import ConnectWalletDialog from '@/components/ConnectWalletDialog'
import GasFeeGauge from '@/components/GasFeeGauge'
import { copyToClipboard } from '@/utils/copy'

export default {
  name: 'SiteHeader',
  components: {
    MetamaskLogo,
    ConnectWalletDialog,
    GasFeeGauge,
  },
  data() {
    return {
      connectDialogVisible: false
    }
  },
  computed: {
    ...mapState('auth', ['walletChainId', 'walletAddress', 'isAuthenticated', 'isSignerAlive']),
    networkName() {
      if (this.walletChainId == 1) {
        return 'Ethereum Mainnet'
      } else if (this.walletChainId === 31337 || this.walletChainId === 71337 ) {
        return 'Hardhat Forking'
      } else {
        return 'Unknown Network'
      }
    },
    maskedWalletAddress() {
      const walletAddress = this.walletAddress || ''
      if (!walletAddress) return ''
      return walletAddress.substring(0, 6) + '...' + walletAddress.substring(walletAddress.length - 4)
    },
  },
  mounted() {},
  methods: {
    copyToClipboard,
    async copyWalletAddress() {
      try {
        await this.copyToClipboard(this.walletAddress)
        this.$message({ type: 'success', message: 'Copied successfully!' })
      } catch (error) {}
    },
    async handleLogout() {
      await this.$store.dispatch('auth/logout')
      global.location.reload()
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
  background-color: $--background-color-base;
  z-index: 100;
}
.network-status {
  position: relative;
  padding-left: 20px;
  font-size: 16px;
  line-height: 1;
  color: $--color-text-regular;
  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0px;
    margin-top: -4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: $--color-danger;
  }
  &.signer-alive::before {
    background-color: $--color-success;
  }
}
.wallet-address-btn {
  position: relative;
  height: 40px;
  line-height: 22px;
  padding: 9px 20px 9px 40px;
  border-radius: 20px;
  color: $--color-text-primary;
  box-shadow: 0 0 1px 0 $--border-color-base;
  cursor: pointer;
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
  color: $--color-text-primary;
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
</style>
