<template>
  <div class="bank-item"></div>
</template>

<script>
import _ from 'lodash'
import { mapState, mapGetters } from 'vuex'
import { ethers } from 'ethers'
import { getTxAmount, handleApprove, getTokenBalance, getTokenBalanceFormatted } from '@/utils/transaction-helper'


export default {
  name: 'AaveBankItem',
  props: {
    bank: {
      type: Object,
      default: () => ({})
    },
    underlyingAssetToken: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
    }
  },
  async mounted() {
    if (this.bank) {
      console.log(await this.bank.getUserAccountDataFormatted())
    }
  },
}
</script>
