<template>
  <div>
    <div>address: {{ $wallet.getAddress() }}</div>
    <div>
      <el-button @click="refresh" type="text">refresh</el-button>
      <div v-for="item, index in balances" :key="index" class="balance">
        <span>{{ item.symbol }}: {{ item.balance }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import TokenSelectDialog from '@/components/dialogs/TokenSelectDialog'

export default {
  data() {
    return {
      balances: [{
        symbol: 'ETH', balance: '0'
      }, {
        symbol: 'USDC', balance: '0'
      }, {
        symbol: 'DAI', balance: '0'
      }]
    }
  },
  methods: {
    async refresh(token) {
      for (const item of this.balances) {
        const token = _.find(this.$store.state.tokens.data, { symbol: item.symbol })
        if (token) {
          item.balance = await this.$wallet.getBalance(token.address)
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.balance {
  line-height: 2;
}
</style>
