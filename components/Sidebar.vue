<template>
  <!-- background-color="#ffffff" text-color="#2c3e50" active-text-color="#d35400" -->
  <div class="sidebar-wrapper">
    <div class="sidebar__header">
      <div v-show="!isCollasped" class="sidebar__logo"></div>
      <div class="sidebar__toggle" @click="toggleCollasped">
        <!-- <i v-if="!isCollasped" class="el-icon-s-fold"></i>
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
        class="sidebar"
        :collapse="isCollasped"
      >
        <el-menu-item index="/">
          <i class="el-icon-menu"></i>
          <strong v-show="!isCollasped">Home</strong>
        </el-menu-item>
        <!-- <el-submenu index="/portfolio">
          <template slot="title">Portfolio</template>
          <el-menu-item index="/portfolio/aave">Aave</el-menu-item>
        </el-submenu> -->
        <el-menu-item index="/portfolio">
          <i class="el-icon-data-analysis"></i>
          <strong v-show="!isCollasped">Portfolio</strong>
        </el-menu-item>
        <el-menu-item index="/deposit">
          <i class="el-icon-money"></i>
          <strong v-show="!isCollasped">Deposit</strong>
        </el-menu-item>
        <el-menu-item index="/borrow">
          <i class="el-icon-wallet"></i>
          <strong v-show="!isCollasped">Borrow</strong>
        </el-menu-item>
        <el-menu-item index="/swap">
          <i class="el-icon-set-up"></i>
          <strong v-show="!isCollasped">Collateral Swap</strong>
        </el-menu-item>

        <el-menu-item index="/swap">
          <i class="el-icon-set-up"></i>
          <strong v-show="!isCollasped">Debt Swap</strong>
        </el-menu-item>
        <el-menu-item index="/swap">
          <i class="el-icon-set-up"></i>
          <strong v-show="!isCollasped">Refinance</strong>
        </el-menu-item>
        <el-menu-item index="/swap">
          <i class="el-icon-set-up"></i>
          <strong v-show="!isCollasped">Settings</strong>
        </el-menu-item>
      </el-menu>

      <div class="social-icons">
        <div class="social-icon"></div>
        <div class="social-icon"></div>
      </div>
    </div>
    <div class="sidebar__footer">
      <div class="simulation-togger">
        <span>Simulation</span>  <el-switch v-model="isSimulation"></el-switch>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "Sidebar",
  props: {
    isCollasped: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isSimulation: false,
    }
  },
  computed: {
    defaultActive() {
      const fullPath = this.$route.fullPath
      if (/\/portfolio\/\w+/.test(fullPath)) {
        return '/portfolio'
      } else {
        return fullPath
      }
    }
  },
  methods: {
    toggleCollasped() {
      this.$emit('update:isCollasped', !this.isCollasped)
    }
  },
}
</script>

<style lang="scss" scoped>
.sidebar-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.sidebar__header {
  width: 100%;
  position: relative;
  color: #ffffff;
  padding: 20px;
  height: 104px;
}
.sidebar__logo {
  width: 133px;
  height: 64px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  background-image: url('~/assets/icons/logo-white.png');
}
.sidebar__toggle {
  position: absolute;
  top: 20px;
  right: 20px;
  font-size: 18px;
  width: 24px;
  height: 24px;
  text-align: center;
  cursor: pointer;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  background-image: url('~/assets/icons/icon-collaspe.png');
}
.sidebar__body {
  padding: 20px;
  position: relative;
  flex: 1;
}
.sidebar {
  border-right: none;
}
.el-menu-item i {
  font-size: 22px;
}
.el-menu-item.is-active i {
  color: #355DFF;
}
.social-icons {
  width: 100%;
  margin-top: 40px;
  padding: 40px 20px 20px;
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
  // border: 1px solid;
  // border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  &:nth-child(1) { background-image: url('~/assets/icons/icon-telegram.png'); }
  &:nth-child(2) { background-image: url('~/assets/icons/icon-twitter.png'); }
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
  position: absolute;
  left: 20px;
  bottom: 40px;
  right: 20px;
  height: 46px;
  background: rgba(228, 228, 228, 0.1);
  color: #808191;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 15px;
}
/deep/ {
  .el-menu-item.is-active {
    background: rgba(228, 228, 228, 0.1) !important;
    border-radius: 8px;
  }
  .el-switch__core {
    background-color: #23262F;
    border: 1px solid #353945;
    width: 54px !important;
    height: 28px;
    border-radius: 14px;
  }
  .el-switch__core:after {
    width: 26px;
    height: 26px;
  }
  .el-switch.is-checked .el-switch__core::after {
    margin-left: -26px;
  }
}
</style>
