<template>
  <div class="page">
    <el-card>
      <!--  -->
    </el-card>
  </div>
</template>

<script>
import _ from 'lodash'
import TokenSelectDialog from '@/components/selects/TokenSelectDialog'

export default {
  data() {
    return {
      userProfile: {}
    }
  },
  mounted() {
    this.fetchProfile()
  },
  methods: {
    async fetchProfile() {
      try {
        const res = await this.$axios.get('/api/account/profile/')
        this.userProfile = res.data
      } catch(err) {
        console.log(err)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.page {
  //
}
</style>
