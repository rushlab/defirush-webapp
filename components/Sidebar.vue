<template>
  <!-- background-color="#ffffff" text-color="#2c3e50" active-text-color="#d35400" -->
  <div class="sidebar-wrapper">
    <div class="sidebar__header">
      <div v-show="!isCollasped" class="sidebar__logo"></div>
      <div class="sidebar__toggle" @click="toggleCollasped">
        <i v-if="!isCollasped" class="el-icon-s-fold"></i>
        <i v-else class="el-icon-s-unfold"></i>
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
          <strong v-show="!isCollasped">Swap</strong>
        </el-menu-item>
      </el-menu>
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
  text-align: center;
  cursor: pointer;
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
</style>
