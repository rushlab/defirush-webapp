<template>
  <div class="site-header">
    <div class="network-status" :class="{ 'signer-alive': isSignerAlive }">
      <span>{{ networkName }}</span>
    </div>
    <div style="margin-left: auto;"></div>
    <gas-fee-gauge></gas-fee-gauge>
    <template v-if="isAuthenticated">
      <div class="wallet-status">
        <el-dropdown @command="handleDropdownCommand">
          <div class="el-dropdown-link wallet-address-btn">
            <img class="icon-metamask" src="~/assets/icons/metamask-fox.svg" alt="">
            <span class="wallet-address">{{ maskedWalletAddress }}</span> <i class="el-icon-arrow-down el-icon--right"></i>
          </div>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="copyWalletAddress">
              <span>{{ maskedWalletAddress }} </span>
              <el-tooltip class="item" effect="dark" content="Click to copy" placement="top">
                <i class="el-icon-copy-document"></i>
              </el-tooltip>
            </el-dropdown-item>
            <el-dropdown-item command="logout">Logout</el-dropdown-item>
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
import ConnectWalletDialog from '@/components/ConnectWalletDialog'
import GasFeeGauge from '@/components/GasFeeGauge'
import { copyToClipboard } from '@/utils/copy'

export default {
  name: 'SiteHeader',
  components: {
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
      if (!walletAddress) {
        return ''
      }
      return walletAddress.substr(0, 6) + '...' + walletAddress.substr(walletAddress.length - 4)
    },
  },
  mounted() {},
  methods: {
    async handleDropdownCommand(command) {
      if (command === 'copyWalletAddress') {
        await this.copyWalletAddress()
      } else if (command === 'logout') {
        await this.handleLogout()
      }
    },
    async copyWalletAddress() {
      try {
        await copyToClipboard(this.walletAddress)
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
  background-color: $--background-color-gray;
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
.wallet-status {
  /deep/ .el-button,
  /deep/ .el-tag {
    margin-left: 1em;
  }
}
.logout-button {
  margin-left: 1em;
}
.btn--connect {
  height: 40px;
  line-height: 22px;
  padding-top: 9px;
  padding-bottom: 9px;
  background-color: $--color-text-primary;
  border: 0;
  color: #ffffff;
  &:hover,
  &:active {
    opacity: 0.9;
  }
}
.gas-fee-btn {
  width: 40px;
  height: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #E6E8EC;
  border-radius: 50%;
  margin-right: 12px;
  cursor: pointer;
  color: $--color-text-primary;
  position: relative;
  // transition: all .25s ease-in-out;
}
.gas-fee-icon {
  font-size: 11px;
}
.gas-fee-value {
  font-size: 11px;
  line-height: 1;
}
.gas-fee-btn:hover {
  background-color: $--color-text-primary;
  .gas-fee-icon,
  .gas-fee-value {
    color: #ffffff;
  }
}
.gas-fee__progress {
  position: absolute;
  top: -4px;
  left: -4px;
}

.gas-fees__inner {
  padding: 3px 10px;
  text-align: center;
  color: $--color-text-primary;
  position: relative;
}
.inner__loading {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.05);
  z-index: -10;
  opacity: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  color: $--color-text-primary;
}
.gas-fees__inner.is-loading .inner__loading {
  z-index: 1;
  opacity: 1;
}
.inner__title {
  font-weight: normal;
  font-size: 14px;
  line-height: 28px;
  margin-bottom: 15px;
}
.inner__body {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  .item {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
  }
  .item__speen {
    font-size: 12px;
    line-height: 14px;
    margin-bottom: 4px;
  }
  .item__value {
    font-weight: 500;
    font-size: 20px;
    line-height: 20px;
    margin-bottom: 4px;
  }
  .item__duration {
    font-size: 10px;
    line-height: 10px;
    color: #777E91;
  }
}
</style>
