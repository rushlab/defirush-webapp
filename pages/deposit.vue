<template>
  <div class="page--home">
    <el-form inline>
      <el-form-item>
        <el-input :value="underlyingToken ? underlyingToken.symbol : ''" readonly>
          <el-button slot="append" @click="tokenSelectDialogVisible = !tokenSelectDialogVisible">选择Token</el-button>
        </el-input>
      </el-form-item>
    </el-form>
    <div class="bank-list" v-if="$signer && aaveApp">
      <el-table :data="[]" style="width: 100%">
        <el-table-column label="Bank" width="180"></el-table-column>
        <el-table-column label="Total Deposit"></el-table-column>
        <el-table-column label="Deposit APY"></el-table-column>
        <el-table-column label="Total Borrow"></el-table-column>
        <el-table-column label="Borrow APY"></el-table-column>
        <el-table-column label="Gas Fee" width="180"></el-table-column>
        <el-table-column label="Action" width="180"></el-table-column>
        <span slot="empty"></span>
      </el-table>
      <deposit-bank-item
        v-for="bank in banksList" :key="bank.title"
        :underlying-token-data="underlyingToken"
        :bank-data="bank"
        :bank-app="bank.app"/>
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
import { AaveApp } from '@/utils/banks/aave-app'
import { CompoundApp } from '@/utils/banks/compound-app'
import { CreamApp } from '@/utils/banks/cream-app'

export default {
  components: {
    DepositBankItem,
    TokenSelectDialog
  },
  data() {
    return {
      aaveApp: null,
      compoundApp: null,
      creamApp: null,
      tokenSelectDialogVisible: false,
      underlyingToken: null,
    }
  },
  computed: {
    banksList() {
      return [
        { icon: "https://aave.com/favicon64.png", title: 'Aave', app: this.aaveApp },
        { icon: "https://compound.finance/compound-components/assets/compound-mark.svg", title: 'Compound', app: this.compoundApp },
        { icon: "https://app.cream.finance/static/media/cream.29138554.svg", title: 'Cream', app: this.creamApp }
      ]
    }
  },
  mounted() {
    this.aaveApp = new AaveApp(this.$signer)
    this.compoundApp = new CompoundApp(this.$signer)
    this.creamApp = new CreamApp(this.$signer)
  },
  methods: {
    onSelectToken(token) {
      this.underlyingToken = token
    }
  },
}
</script>

<style lang="scss" scoped>
/deep/ {
  .el-table__empty-block {
    display: none;
  }
}
</style>
