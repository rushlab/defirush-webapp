<template>
  <div>Portfolio</div>
</template>

<script>
export default {
  // 直接 redirect 会导致路由重复
  // async asyncData({ redirect }) {
  //   return redirect(302, '/portfolio/aave')
  // },
  mounted() {
    this.$router.replace('/portfolio/all')
  }
}
</script>
