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
      //
    }
  },
  mounted() {
    this.fetchProfile()
  },
  methods: {
    async fetchProfile() {
      try {
        const res = await this.$axios.get('/api/account/profile/')
        console.log('fetchProfile', res.data)
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
