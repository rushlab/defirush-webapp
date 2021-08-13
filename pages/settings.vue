<template>
  <div class="page">
    <el-card shadow="never" :body-style="{'padding':0}" v-loading="pending" element-loading-spinner="el-icon-loading">
      <div class="card__row">
        <div class="card__left">
          <el-descriptions class="telegram-info" title="Telegram" :column="1">
            <template slot="extra">
              <el-button class="extra-btn" type="primary" plain size="small" @click="fetchProfile">Refresh</el-button>
            </template>
            <el-descriptions-item label="Telegram Key">{{ profile.telegramKey }}</el-descriptions-item>
            <el-descriptions-item label="Telegram Chat ID">
              <el-button
                v-if="!profile.telegramChatId"
                type="primary"
                plain
                class="extra-btn"
                size="small"
                @click="bindTelegram"
              >Bind Telegram</el-button>
              <div v-else>{{ profile.telegramChatId }} <el-tag type="success" size="mini">Success</el-tag></div>
            </el-descriptions-item>
            <el-descriptions-item
              v-if="profile.telegramChatId"
              label="Telegram Username">{{ profile.telegramUsername }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="card__right">
          <div style="height: 200px;">
            <el-steps direction="vertical" :active="activeStep">
              <el-step title="Step1" description='Click "Bind Telegram" button, it will automatically pop up Telegram app'></el-step>
              <el-step title="Step2" description='Click the "Start" button in Telegram app chat view.'></el-step>
              <el-step title="Step3" description='Click the "Refresh" button, if the page shows your telegram ID, means you already subscribe successfully'></el-step>
            </el-steps>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import _ from 'lodash'
import TokenSelectDialog from '@/components/dialogs/TokenSelectDialog'

export default {
  data() {
    return {
      profile: {},
      pending: false,
      activeStep: 1,
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
        if (this.profile.telegramChatId) {
          this.activeStep = 3
        }
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
        this.activeStep = 2
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
.card__row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.card__left {
  flex: 1;
}
.card__right {
  border-left: 1px solid $--border-color-base;
  flex: 1;
  padding: 30px;
  padding-left: 30px;
  padding-right: 30px;
}
.extra-btn {
  // background-color: transparent;
}
</style>
