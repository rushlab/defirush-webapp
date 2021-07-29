<template>
  <el-container>
    <el-aside class="sidebar-wrapper" :width="!!isCollasped ? '64px' : '240px'">
      <sidebar :isCollasped.sync="isCollasped"/>
    </el-aside>
    <el-container style="height: 100vh; overflow: auto;">
      <el-header class="side-header-wrapper">
        <site-header />
      </el-header>
      <el-main>
        <nuxt />
      </el-main>
      <!-- <el-footer>Footer</el-footer> -->
    </el-container>
  </el-container>
</template>

<script>
import Sidebar from '@/components/Sidebar'
import SiteHeader from '@/components/SiteHeader'
export default {
  components: {
    Sidebar,
    SiteHeader,
  },
  data() {
    return {
      isCollasped: false
    }
  },
}
</script>

<style lang="scss" scoped>
.side-header-wrapper {
  box-shadow: 0 1px 0 0px #E6E6E6;
}
.sidebar-wrapper {
  box-shadow: 1px 0 0 0px #E6E6E6;
  background-color: #000000;
}
</style>
