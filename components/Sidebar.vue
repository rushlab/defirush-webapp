<template>
  <!-- background-color="#ffffff" text-color="#2c3e50" active-text-color="#d35400" -->
  <div class="sidebar-wrapper" :class="{'collapsed': isCollapsed}">
    <div class="sidebar__header">
      <div class="sidebar__logo"></div>
      <div class="sidebar__toggle" @click="toggleCollapsed">
        <!-- <i v-if="!isCollapsed" class="el-icon-s-fold"></i>
        <i v-else class="el-icon-s-unfold"></i> -->
      </div>
    </div>
    <div class="sidebar__body">
      <el-menu
        :router="true"
        :default-active="defaultActive"
        background-color="#000000"
        text-color="#ffffff"
        active-text-color="#ffffff"
        :collapse="isCollapsed"
        :collapse-transition="false"
      >
        <el-menu-item @click="goToHome">
          <i class="rush-icon-home"></i>
          <strong slot="title">Home</strong>
        </el-menu-item>
        <el-menu-item index="/portfolio">
          <i class="rush-icon-portfolio"></i>
          <strong slot="title">Portfolio</strong>
        </el-menu-item>
        <el-menu-item index="/deposit">
          <i class="rush-icon-deposit"></i>
          <strong slot="title">Deposit</strong>
        </el-menu-item>
        <el-menu-item index="/borrow">
          <i class="rush-icon-borrow"></i>
          <strong slot="title">Borrow</strong>
        </el-menu-item>
        <el-menu-item index="/collateral-swap">
          <i class="rush-icon-collateral-swap"></i>
          <strong slot="title">Collateral Swap</strong>
        </el-menu-item>
        <el-menu-item index="/debt-swap">
          <i class="rush-icon-debt-swap"></i>
          <strong slot="title">Debt Swap</strong>
        </el-menu-item>
        <el-menu-item index="/refinance">
          <i class="rush-icon-refinance"></i>
          <strong slot="title">Refinance</strong>
        </el-menu-item>
        <el-menu-item index="/settings">
          <i class="rush-icon-settings"></i>
          <strong slot="title">Settings</strong>
        </el-menu-item>
      </el-menu>
      <div class="social-icons">
        <div class="social-icon">
          <i class="rush-icon-telegram"></i>
        </div>
        <div class="social-icon">
          <i class="rush-icon-twitter"></i>
        </div>
      </div>
    </div>
    <div class="sidebar__footer">
      <div class="simulation-togger">
        <span>Simulation</span>
        <el-switch :value="isSimulationMode" @change="toggleSimulationMode"></el-switch>
      </div>
    </div>
  </div>
</template>

<script>
import { ethers } from "ethers"
import { mapState } from 'vuex'
import { chains } from '@/utils/chains'

export default {
  name: 'Sidebar',
  props: {
    isCollapsed: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      chains,
    }
  },
  computed: {
    ...mapState('auth', ['chainId']),
    defaultActive() {
      const fullPath = this.$route.fullPath
      if (/\/portfolio\/\w+/.test(fullPath)) {
        return '/portfolio'
      } else {
        return fullPath
      }
    },
    isSimulationMode() {
      const chain = _.find(this.chains, (chain) => +chain.chainId === +this.chainId)
      return !!(chain && chain.forking)
    }
  },
  methods: {
    toggleCollapsed() {
      this.$emit('update:isCollapsed', !this.isCollapsed)
    },
    goToHome() {
      window.open('https://www.defirush.io')
    },
    toggleSimulationMode(val) {
      let chainId = this.chains[0].chainId
      if (val) {
        const chain = _.find(this.chains, { forking: true })
        chainId = chain.chainId
      }
      this.$store.dispatch('auth/switchChain', { chainId })
      // global.location.reload()
      this.$store.dispatch('_refreshApp')
    },
  },
}
</script>

<style lang="scss" scoped>
@import "@/assets/stylesheets/variables.scss";

.sidebar-wrapper {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 40px 0 0;
  overflow: auto;
  /deep/ {
    .el-menu {
      border-right: none;
    }
    .el-menu-item {
      height: 46px;
      line-height: 46px;
    }
    .el-menu-item.is-active {
      background: rgba(228, 228, 228, 0.1) !important;
      border-radius: 8px;
    }
    .el-menu-item i {
      font-size: 22px;
    }
    i + strong {
      margin-left: 12px;
    }
    .el-menu-item.is-active i {
      color: #355DFF;
    }
  }
}
.sidebar__header {
  width: 100%;
  position: relative;
  color: #ffffff;
  padding: 0 25px;
  height: 40px;
  margin-bottom: 16px;
}
.sidebar__logo {
  width: 105px;
  height: 40px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  background-image: url('~assets/icons/logo-white.png');
}
.sidebar__toggle {
  position: absolute;
  top: 4px;
  right: 20px;
  font-size: 18px;
  width: 24px;
  height: 24px;
  text-align: center;
  cursor: pointer;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  background-image: url('~assets/icons/icon-collapse.png');
}
.sidebar__body {
  padding: 20px;
  position: relative;
  flex: 1;
}
.social-icons {
  width: 100%;
  margin-top: 30px;
  padding: 30px 20px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0px;
    right: 0px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
}
.social-icon {
  color: #808191;
  width: 40px;
  height: 40px;
  text-align: center;
  line-height: 40px;
  cursor: pointer;
  font-size: 40px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  transition: color .2s ease-in-out;
  &:hover {
    color: #ffffff;
  }
  & + & {
    margin-left: 40px;
  }
}
.sidebar__footer {
  height: 100px;
  padding: 20px;
  position: relative;
}
.simulation-togger {
  // position: absolute;
  // left: 20px;
  // bottom: 40px;
  right: 20px;
  height: 46px;
  background: rgba(228, 228, 228, 0.1);
  color: #808191;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 15px;
  /deep/ .el-switch {
    transform: scale(1.3, 1.3);
  }
  /deep/ {
    .el-switch.is-checked .el-switch__core {
      background-color: $--color-primary;
      border-color: $--color-primary;
    }
  }
}
.collapsed {
  .sidebar__logo,
  .sidebar__footer,
  .social-icons {
    display: none;
  }
  .sidebar__toggle {
    transform: scale(-1, 1);
  }
  .sidebar__body {
    padding-left: 0;
    padding-right: 0;
  }
  /deep/ .el-menu-item.is-active {
    border-radius: 0;
  }
}
</style>
