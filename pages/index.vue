<template>
  <div class="page--home">
    <el-button @click="tokenSelectDialogVisible = !tokenSelectDialogVisible">选择Token</el-button>
    <token-select-dialog
      v-if="tokenSelectDialogVisible"
      :visible.sync="tokenSelectDialogVisible"
      @select="onSelectToken"
    />
  </div>
</template>

<script>
import TokenSelectDialog from '@/components/selects/TokenSelectDialog'

export default {
  components: {
    TokenSelectDialog
  },
  data() {
    return {
      tokenSelectDialogVisible: false
    }
  },
  methods: {
    onSelectToken(token) {
      console.log(12345, token)
    }
  },
}
</script>

<style lang="scss" scoped>

</style>
