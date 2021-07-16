<template>
  <div id="layout--default">
    <site-header />
    <main>
      <nuxt />
    </main>
  </div>
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
#layout--default {
  position: relative;
  width: 100%;
  height: 100vh;
  padding-top: 60px;
}
</style>
