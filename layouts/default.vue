<template>
  <el-container>
    <el-aside width="200px">
      <el-menu
        :router="true"
        :default-active="$route.fullPath"
        background-color="#ffffff"
        text-color="#2c3e50"
        active-text-color="#d35400">
        <el-menu-item index="/">HOME</el-menu-item>
        <el-menu-item index="/deposit">Deposit</el-menu-item>
        <el-menu-item index="/borrow">Borrow</el-menu-item>
        <el-menu-item index="/swap">1INCH 兑换</el-menu-item>
        <el-menu-item index="/banks/aave">Aave</el-menu-item>
        <el-menu-item index="/banks/compound">Compound</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container style="height: 100vh; overflow: auto;">
      <el-header>
        <client-only>
          <site-header />
        </client-only>
      </el-header>
      <el-main>
        <client-only>
          <nuxt />
        </client-only>
      </el-main>
      <!-- <el-footer>Footer</el-footer> -->
    </el-container>
  </el-container>
</template>


<script>
import SiteHeader from '@/components/SiteHeader'

export default {
  components: {
    SiteHeader
  }
}
</script>

<style lang="scss" scoped>
html {
  font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  word-spacing: 1px;
  -ms-text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}

*,
*:before,
*:after {
  box-sizing: border-box;
  margin: 0;
}


/deep/ {
  .el-aside {
    height: 100vh;
    box-shadow: 0 0 5px 1px rgba(0, 0, 0, 0.1);
  }
  .el-menu {
    min-height: 100%;
  }
  .el-menu-item {
    font-weight: 500;
  }
  .el-header {
    padding-left: 0;
    padding-right: 0;
  }
}
</style>
