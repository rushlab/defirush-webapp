<template>
  <el-menu
    :router="true"
    :default-active="$route.fullPath"
    background-color="#ffffff"
    text-color="#2c3e50"
    active-text-color="#d35400"
    class="sidebar"
  >
    <el-menu-item index="/">HOME</el-menu-item>
    <el-menu-item index="/deposit">Deposit</el-menu-item>
    <el-menu-item index="/borrow">Borrow</el-menu-item>
    <el-menu-item index="/swap">Swap</el-menu-item>
  </el-menu>
</template>

<style lang="scss" scoped>
.sidebar {
  border-right: none;
}
</style>
