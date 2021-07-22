<template>
  <div class="page--home">
    <el-form>
      <el-form-item>
        <el-input :value="underlyingToken ? underlyingToken.symbol : ''" readonly>
          <el-button slot="append" @click="tokenSelectDialogVisible = !tokenSelectDialogVisible">选择Token</el-button>
        </el-input>
      </el-form-item>
    </el-form>
    <div class="bank-list" v-if="$signer && aaveApp">
      <deposit-bank-item
        v-for="bank in banksList" :key="bank.title"
        :underlying-token-data="underlyingToken"
        :bank-data="bank"
        :bank-app="aaveApp"/>
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
import DepositBankItem from '@/components/banks/DepositBankItem'
import AaveApp from '@/utils/banks/aave-app'

export default {
  components: {
    DepositBankItem,
    TokenSelectDialog
  },
  data() {
    return {
      aaveApp: null,
      tokenSelectDialogVisible: false,
      underlyingToken: null,
      banksList: [
        { icon: "https://aave.com/favicon64.png", title: 'AAVE' }
      ]
    }
  },
  mounted() {
    this.aaveApp = new AaveApp(this.$signer)
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
