<template>
  <div class="page">
    <el-card shadow="never" :body-style="{'padding':0}" v-loading="pending" element-loading-spinner="el-icon-loading">
      <el-descriptions class="telegram-info" title="Telegram" :column="1">
        <template slot="extra">
          <el-button type="text" @click="fetchProfile" style="padding:2px;">Refresh</el-button>
        </template>
        <el-descriptions-item label="Telegram Key">{{ profile.telegramKey }}</el-descriptions-item>
        <el-descriptions-item label="Telegram Chat ID">
          <el-button
            v-if="!profile.telegramChatId"
            type="text" style="padding:2px;"
            @click="bindTelegram"
          >Bind Telegram</el-button>
          <div v-else>{{ profile.telegramChatId }}</div>
        </el-descriptions-item>
        <el-descriptions-item
          v-if="profile.telegramChatId"
          label="Telegram Username">{{ profile.telegramUsername }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script>
import _ from 'lodash'
import TokenSelectDialog from '@/components/selects/TokenSelectDialog'

export default {
  data() {
    return {
      profile: {},
      pending: false,
    }
  },
  mounted() {
    this.fetchProfile()
  },
  methods: {
    async fetchProfile() {
      this.pending = true
      try {
        const res = await this.$axios.get('/api/account/profile/')
        this.profile = res.data
      } catch(err) {
        console.log(err)
      }
      this.pending = false
    },
    bindTelegram() {
      this.$confirm('跳转到Telegram后，需要在聊天界面，点击「start」按钮。Start完成后返回本页，请点击「Refresh」按钮', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then((res) => {
        window.open(`https://t.me/defirush_bot?start=${this.profile.telegramKey}`)
      }).catch(() => {})
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@/assets/stylesheets/variables.scss";
.page {
  //
}
.telegram-info {
  padding: 20px;
}
</style>
