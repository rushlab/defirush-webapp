<template>
  <div class="page--home">
    <!--
    <el-button @click="tokenSelectDialogVisible = !tokenSelectDialogVisible">选择Token</el-button>
    <token-select-dialog
      v-if="tokenSelectDialogVisible"
      :visible.sync="tokenSelectDialogVisible"
      @select="onSelectToken"
    ></token-select-dialog>
    -->
  </div>
</template>

<script>
import TokenSelectDialog from '@/components/dialogs/TokenSelectDialog'

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
    onSelectToken(token) {}
  },
  mounted() {
    this.$router.replace('/deposit')
  }
}
</script>

<style lang="scss" scoped>

</style>
