<template>
  <div>
    <h1>{{ bankName }}</h1>
  </div>
</template>

<script>
export default {
  asyncData({ store, params }) {
    return {
      bankName: params.bankName
    }
  },
  data() {
    return {
      //
    }
  }
}
</script>

<style lang="scss" scoped>
/deep/ {
  .el-table__empty-block {
    display: none;
  }
}
</style>
