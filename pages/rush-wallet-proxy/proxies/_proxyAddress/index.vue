<template>
  <div>proxyAddress: {{ proxyAddress }}</div>
</template>

<script>
export default {
  data() {
    return {

    }
  },
  computed: {
    proxyAddress() {
      return this.$route.params.proxyAddress
    }
  },
}
</script>
