<template>
  <div class="site-header">
    <div class="network-status" :class="{ 'signer-alive': isSignerAlive }">
      <el-dropdown @command="handleChainCommand" placement="bottom-start">
        <span class="el-dropdown-link">
          <span>{{ selectedChainName }}</span>
          <i class="el-icon-arrow-down el-icon--right"></i>
        </span>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item
            v-for="item in chainOptions" :key="item.chainId"
            :disabled="item.disabled" :command="`chain--${item.chainId}`"
          >{{ item.chainName }}</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
    </div>
    <div style="margin-left: auto;"></div>
    <gas-fee-gauge></gas-fee-gauge>
    <template v-if="isAuthenticated">
      <div class="wallet-status">
        <el-dropdown @command="handleAccountCommand">
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
import { chains } from '@/utils/chains'

export default {
  name: 'SiteHeader',
  components: {
    ConnectWalletDialog,
    GasFeeGauge,
  },
  data() {
    return {
      // [ { chainId, chainName }, ... ]
      chains,
      chainOptions: chains,
      // chainOptions: _.filter(chains, (chain) => !chain.forking),
      connectDialogVisible: false,
    }
  },
  computed: {
    ...mapState('auth', ['chainId', 'walletAddress', 'isAuthenticated', 'isSignerAlive']),
    selectedChainName() {
      const chain = _.find(this.chains, (chain) => +chain.chainId === +this.chainId)
      return chain ? chain.chainName : `Unknown Network (${this.chainId})`
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
    async handleChainCommand(command) {
      const chainId = +(command.split('--')[1])
      if (chainId !== this.chainId) {
        this.$store.commit('auth/setChainId', chainId)
        global.location.reload()
      }
    },
    async handleAccountCommand(command) {
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
  z-index: 100;
}
.network-status {
  position: relative;
  padding-left: 20px;
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
  /deep/ .el-dropdown-link {
    cursor: pointer;
  }
}
.wallet-address-btn {
  position: relative;
  height: 40px;
  line-height: 22px;
  padding: 9px 20px 9px 40px;
  border-radius: 20px;
  color: $--color-text-primary;
  border: 1px solid $--border-color-base;
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
</style>
