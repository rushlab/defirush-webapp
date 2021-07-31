<template>
  <div class="page">
    <el-card>
      <div>Telegram Key: {{ profile.telegramKey }}</div>
    </el-card>
  </div>
</template>

<script>
import _ from 'lodash'
import TokenSelectDialog from '@/components/selects/TokenSelectDialog'

export default {
  data() {
    return {
      profile: {}
    }
  },
  mounted() {
    this.fetchProfile()
  },
  methods: {
    async fetchProfile() {
      try {
        const res = await this.$axios.get('/api/account/profile/')
        this.profile = res.data
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
