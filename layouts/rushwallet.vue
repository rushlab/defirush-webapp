<template>
  <el-container class="app" v-loading="$store.state._appRefreshTimestamp < 0">
    <el-aside class="app__aside" :width="!!isCollapsed ? '64px' : '240px'">
      <sidebar :isCollapsed.sync="isCollapsed"/>
    </el-aside>
    <el-container style="height: 100vh; overflow: auto;">
      <el-header class="app__header" height="75px">
        <site-header />
      </el-header>
      <el-main class="app__main" v-if="$store.state._appRefreshTimestamp >= 0">
        <nuxt />
        <el-backtop target=".el-main.app__main"></el-backtop>
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import Sidebar from '@/components/rush-wallet-proxy/Sidebar'
import SiteHeader from '@/components/SiteHeader'
export default {
  components: {
    Sidebar,
    SiteHeader,
  },
  data() {
    return {
      isCollapsed: false
    }
  },
}
</script>

<style lang="scss" scoped>
.app {
  min-height: 100vh;
  min-width: 1200px;
}
.app__header {
  box-shadow: 0 1px 0 0px #E6E6E6;
  z-index: 1;
}
.app__aside {
  box-shadow: 1px 0 0 0px #E6E6E6;
  background-color: #000000;
}
.app__main {
  position: relative;
}
</style>
