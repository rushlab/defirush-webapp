<template>
  <div class="page--borrow">
    <el-form inline>
      <el-form-item>
        <el-input :value="underlyingToken ? underlyingToken.symbol : ''" readonly>
          <el-button slot="append" @click="tokenSelectDialogVisible = !tokenSelectDialogVisible">选择Token</el-button>
        </el-input>
      </el-form-item>
    </el-form>
    <div class="bank-list">
      <el-table :data="[]" style="width: 100%">
        <el-table-column label="Bank" width="180"></el-table-column>
        <el-table-column label="Total Deposits"></el-table-column>
        <el-table-column label="Total Borrows"></el-table-column>
        <el-table-column label="Available Borrows"></el-table-column>
        <el-table-column label="Gas Fee" width="180"></el-table-column>
        <el-table-column label="Action" width="180"></el-table-column>
        <span slot="empty"></span>
      </el-table>
      <borrow-bank-item
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
import BorrowBankItem from '@/components/banks/BorrowBankItem'
import { AaveApp } from '@/utils/banks/aave-app'
import { CompoundApp } from '@/utils/banks/compound-app'
import { CreamApp } from '@/utils/banks/cream-app'

export default {
  components: {
    BorrowBankItem,
    TokenSelectDialog
  },
  data() {
    return {
      banksList: [],
      tokenSelectDialogVisible: false,
      underlyingToken: null,
    }
  },
  computed: {
    //
  },
  mounted() {
    this.banksList = [{
      icon: 'https://aave.com/favicon64.png', title: 'Aave',
      app: new AaveApp(this.$wallet)
    }, {
      icon: 'https://compound.finance/compound-components/assets/compound-mark.svg', title: 'Compound',
      app: new CompoundApp(this.$wallet)
    }, {
      icon: 'https://app.cream.finance/static/media/cream.29138554.svg', title: 'Cream',
      app: new CreamApp(this.$wallet)
    }]
  },
  methods: {
    onSelectToken(token) {
      this.underlyingToken = token
    }
  },
}
</script>

<style lang="scss" scoped>
@import '@/assets/stylesheets/variables.scss';
/deep/ {
  .el-table__empty-block {
    display: none;
  }
}
.bank-list {
  border: 1px solid $color-border;
}
</style>
