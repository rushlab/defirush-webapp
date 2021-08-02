<template>
  <div class="site-header">
    <div class="network-status" :class="{ 'signer-alive': isSignerAlive }">
      <span>{{ networkName }}</span>
    </div>
    <div style="margin-left: auto;"></div>
    <div class="gas-fees">
      <el-popover
        placement="bottom"
        width="240"
        trigger="hover"
      >
        <div class="gas-fees__inner" :class="{'is-loading': !!gasPricePending}">
          <div class="inner__title">Ethereum Gas Price Forecast</div>
          <div class="inner__body">
            <div class="item" v-for="(item, key) in gasPriceTable" :key="key">
              <span class="item__speed">{{ key }}</span>
              <span class="item__value">{{ item.price_gwei }}</span>
              <span class="item__duration">{{ item.waiting_seconds }} sec</span>
            </div>
          </div>
        </div>
        <div class="gas-fee-btn" slot="reference">
          <div class="gas-fee-icon"></div>
          <div class="gas-fee-value">{{ gasPriceTable.normal.price_gwei || '-' }}</div>
        </div>
        <div class="inner__loading">
          <i class="el-icon-loading"></i>
        </div>
      </el-popover>
    </div>
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
        type="primary" round
        class="btn--dark"
        @click="openConnectDialog"
      >Connect Wallet</el-button>
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
        <el-button
          type="primary"
          class="footer__btn"
          :disabled="connectDialog.isVerifying"
          :loading="connectDialog.isVerifying"
          @click="verifyUserWallet">Verify</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from 'ethers'
import dayjs from 'dayjs'
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
        isVerifying: false,
      },
      gasPriceTable: {
        fase: {},
        normal: {},
        slow: {}
      },
      currentTime: 0,
      gasPricePending: false
    }
  },
  computed: {
    ...mapState('auth', ['walletChainId', 'walletAddress', 'isAuthenticated', 'isSignerAlive']),
    networkName() {
      if (this.walletChainId == 1) {
        return 'Etherum Mainnet'
      } else {
        return 'Unknown Network'
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
    },
    verifyBtnText() {
      return this.connectDialog.isVerifying ? 'Verifying' : 'Verify'
    }
  },
  mounted() {
    this.getGasPrice(true)
  },
  watch: {
    currentTime: {
      handler() {
        setTimeout(() => {
          this.getGasPrice()
        }, 15000)
      },
      immediate: true
    }
  },
  methods: {
    copyToClipboard,
    async getGasPrice(isInit = false) {
      this.gasPricePending = true
      try {
        const res = await this.$axios.get('/api/gas_price_table/')
        const { fast, normal, slow } = res.data
        this.gasPriceTable = {
          fast: { ...fast, price_gwei: parseInt(fast.price_gwei) },
          normal: { ...normal, price_gwei: parseInt(normal.price_gwei) },
          slow: { ...slow, price_gwei: parseInt(slow.price_gwei) }
        }
        if (!isInit) this.currentTime = dayjs()
      } catch (error) {}
      this.gasPricePending = false
    },
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
        isConnecting: false,
        isVerifying: false
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
  border: 0;
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
}
.gas-fee-icon {
  width: 11px;
  height: 11px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  background-image: url('~/assets/icons/icon-gas.png');
}
.gas-fee-value {
  color: $color-text;
  font-size: 11px;
  line-height: 1;
}

.gas-fees__inner {
  padding: 3px 13px;
  text-align: center;
  color: $color-text;
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
  color: $color-text;
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
/deep/ {
  .el-dialog__body {
    padding: 30px;
  }
}
</style>
