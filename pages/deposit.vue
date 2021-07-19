<template>
  <div class="page--home">
    <el-button @click="tokenSelectDialogVisible = !tokenSelectDialogVisible">选择Token</el-button>
    <div class="bank-list" v-if="$userWallet && bank">
      <aave-bank-item :underlying-asset-token="underlyingToken" :bank="bank"/>
    </div>
    <token-select-dialog
      v-if="tokenSelectDialogVisible"
      :visible.sync="tokenSelectDialogVisible"
      @select="onSelectToken"
    />
  </div>
</template>

<script>
import TokenSelectDialog from '@/components/selects/TokenSelectDialog'
import AaveBankItem from '@/components/aave/AaveBankItem'
import Aave from '@/utils/banks/aave'

export default {
  components: {
    AaveBankItem,
    TokenSelectDialog
  },
  data() {
    return {
      bank: null,
      tokenSelectDialogVisible: false,
      underlyingToken: null,
    }
  },
  mounted() {
    this.bank = new Aave(this.$userWallet)
  },
  methods: {
    onSelectToken(token) {
      console.log(12345, token)
      this.underlyingToken = token
    }
  },
}
</script>

<style lang="scss" scoped>

</style>
