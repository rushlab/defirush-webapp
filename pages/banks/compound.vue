<template>
  <div class="bank-compound">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card>
          <div slot="header"><span class="card-header__title">Compound 银行</span></div>
          <account
            ref="account"
            :provider.sync="provider"/>
        </el-card>
      </el-col>
      <el-col :span="18" v-if="provider">
        <el-card>
          <bank-counter :provider="provider" @success="onSuccess"/>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from "ethers"
import Account from '@/components/compound/Account.vue'
import BankCounter from '@/components/compound/BankCounter.vue'

export default {
  components: {
    Account,
    BankCounter
  },
  data() {
    return {
      provider: null,
    }
  },
  methods: {
    onSuccess() {
      this.$refs.account.updateAccount()
    }
  },
}
</script>
