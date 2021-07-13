<template>
  <div class="bank-aave">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card>
          <div slot="header"><span class="card-header__title">AAVE 银行</span></div>
          <account
            ref="account"
            :provider.sync="provider"
            :addressesProvider.sync="addressesProvider"
            :lendingPool.sync="lendingPool"
            :priceOracleAddress.sync="priceOracleAddress"/>
        </el-card>
      </el-col>
      <el-col :span="18">
        <el-card v-if="provider && lendingPool && priceOracleAddress">
          <bank-counter
            :provider="provider"
            :addressesProvider="addressesProvider"
            :lendingPool="lendingPool"
            :priceOracleAddress="priceOracleAddress"
            @success="onSuccess"/>
        </el-card>

        <el-card v-if="provider && lendingPool">
          <div slot="header"><span class="card-header__title">模拟用户授权后借贷存取</span></div>
          <bank-counter3rd-party
            :provider="provider"
            :lendingPool="lendingPool"
          />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from "ethers"
import Launcher from '@/components/Launcher'
import Account from '@/components/aave/Account.vue'
import Deposit from '@/components/aave/Deposit.vue'
import BankCounter from '@/components/aave/BankCounter.vue'
import BankCounter3rdParty from '@/components/aave/-BankCounter3rdParty.vue'

export default {
  components: {
    Account,
    Deposit,
    BankCounter,
    BankCounter3rdParty
  },
  data() {
    return {
      provider: null,
      addressesProvider: null,
      priceOracleAddress: '',
      lendingPool: null,
    }
  },
  methods: {
    onSuccess() {
      this.$refs.account.updateAccount()
    }
  },
}
</script>

<style lang="scss" scoped>
.container {
  width: 100%;
  display: block;
}

/deep/ {
  .el-card + .el-card {
    margin-top: 20px;
  }
}
.card__head {
  width: 100%;
  position: relative;
}
.card-header__title {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.6;
}
</style>
