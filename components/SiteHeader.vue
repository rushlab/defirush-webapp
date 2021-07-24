<template>
  <div class="site-header">
    <div class="header__left">
      <span>HELLO, WORLD</span>
    </div>
    <div class="header__account">
      <div class="authorise-block" v-if="walletAddress">
        <div class="wallet-address">
          <div>{{ maskedWalletAddress || 'unanthenticaed' }}</div>
        </div>
        <div class="active-wallet" :class="{'is-authenticated': isAuthenticated}"></div>
      </div>
      <div class="unauthorise-block">
        <el-button size="small" type="text" @click="initProviderWithMetaMask" v-if="!walletAddress">连接 MetaMask</el-button>
        <el-button size="small" type="text" @click="handleVerify" v-if="!isAuthenticated">验证</el-button>
        <el-button size="small" type="text" @click="handleDisconnect" v-else>断开连接</el-button>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'SiteHeader',
  data() {
    return {
      connecting: false,
      pending: false,
    }
  },
  computed: {
    ...mapState('user', ['walletAddress', 'isAuthenticated']),
    maskedWalletAddress() {
      const walletAddress = this.walletAddress
      const l = walletAddress.length
      return walletAddress ? (walletAddress.substring(0, 6) + '...' + walletAddress.substring(l - 4)) : ''
    }
  },
  methods: {
    initProviderWithMetaMask() {
      this.$initWeb3Provider && this.$initWeb3Provider()
    },
    handleVerify() {
      this.$verifyWallet && this.$verifyWallet()
    },
    handleDisconnect() {
      this.$store.dispatch('user/resetAccount')
    },
  },
}
</script>

<style lang="scss" scoped>
.site-header {
  width: 100%;
  height: 60px;
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #ffffff;
  z-index: 100;
}
.header__account {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}
.authorise-block {
  max-width: 100%;
  overflow: hidden;
  height: 32px;
  padding: 8px 28px;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  font-size: 14px;
  line-height: 16px;
  border: 1px solid #e1e5f2;
  box-sizing: border-box;
  font-weight: 700;
  color: #fe815f;
  border-radius: 16px;
}
.active-wallet {
  text-align: center;
  margin: 10px auto;
  position: relative;
  margin-left: 5px;
  line-height: 16px;
  padding-right: 10px;
  // > span {
  //   font-size: 12px;
  //   line-height: 12px;
  //   font-weight: 500;
  //   color: #f39c12;
  //   display: inline-block;
  //   vertical-align: middle;
  // }
  &::before {
    content: "";
    position: absolute;
    top: 50%;
    right: 0;
    display: block;
    width: 10px;
    height: 10px;
    margin-top: -5px;
    border-radius: 50%;
    box-shadow: inset 0 0 8px #f39c12,
                0 0 2px 0px #f0c786;
  }
  &.is-authenticated > span {
    color: #2ecc71;
  }
  &.is-authenticated::before {
    box-shadow: inset 0 0 8px #2ecc71,
                0 0 2px 0px #a0c4af;
  }
}
.unauthorise-block {
  .el-button {
    margin-left: 10px;
  }
}
</style>
