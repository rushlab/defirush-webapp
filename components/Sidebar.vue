<template>
  <!-- background-color="#ffffff" text-color="#2c3e50" active-text-color="#d35400" -->
  <el-menu
    :router="true"
    :default-active="defaultActive"
    class="sidebar"
  >
    <el-menu-item index="/">HOME</el-menu-item>
    <!-- <el-submenu index="/portfolio">
      <template slot="title">Portfolio</template>
      <el-menu-item index="/portfolio/aave">Aave</el-menu-item>
    </el-submenu> -->
    <el-menu-item index="/portfolio">Portfolio</el-menu-item>
    <el-menu-item index="/deposit">Deposit</el-menu-item>
    <el-menu-item index="/borrow">Borrow</el-menu-item>
    <el-menu-item index="/swap">Swap</el-menu-item>
  </el-menu>
</template>

<script>
export default {
  data() {
    return {
      //
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
  }
}
</script>

<style lang="scss" scoped>
.sidebar {
  border-right: none;
}
</style>
