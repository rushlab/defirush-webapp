<template>
  <div class="site-header">
    <!--  -->
  </div>
</template>

<script>
import _ from 'lodash'
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'SiteHeader',
  data() {
    return {
      //
    }
  },
  computed: {
    ...mapState('user', ['walletAddress', 'isAuthenticated']),
  },
  methods: {
    //
  },
}
</script>

<style lang="scss" scoped>
.site-header {
  width: 100%;
  height: 60px;
  padding: 10px 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  background-color: #ffffff;
  z-index: 100;
}
</style>
