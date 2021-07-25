<template>
  <div>
    <h1>{{ bankName }}</h1>
  </div>
</template>

<script>
import { createBankApp } from '@/utils/banks/factory'

export default {
  // asyncData({ store, params }) {
  //   return {
  //     bankName: params.bankName,
  //   }
  // },
  data() {
    const bankName = this.$route.params.bankName
    const { app, title, logo } = createBankApp(bankName, this.$wallet)
    return {
      bankName,
      bankApp: app,
      bankTitle: title,
      bankLogo: logo,
    }
  },
  mounted() {
    this.getAccountData()
  },
  methods: {
    async getAccountData() {
      try {
        const [
          userDepositsUSD, userBorrowsUSD, availableBorrowsUSD
        ] = await this.bankApp.getAccountData()
      } catch(error) {
        //
      }
    },
    handleRefresh() {
      this.getAccountData()
    }
  }
}
</script>

<style lang="scss" scoped>
/deep/ {
  .el-table__empty-block {
    display: none;
  }
}
</style>
