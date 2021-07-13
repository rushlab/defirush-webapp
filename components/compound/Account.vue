<template>
  <div class="launcher">
    <div class="metamask">
      <metamask-logo class="mm-logo"/>
      <el-button
        v-if="!signer"
        class="mm-btn" type="text" size="small"
        :loading="!!connecting"
        @click="initProviderWithMetaMask">{{ !!connecting ? '正在连接...' : '点击连接'}}</el-button>
    </div>
    <div v-if="!!signer" class="avtive-waller"><span>已连接钱包: MetaMask</span></div>
    <div v-if="signer" v-loading="!!pending">
      <el-form ref="launcher" label-position="top">
        <el-form-item label="钱包地址">
          <el-input :value="address" readonly></el-input>
        </el-form-item>
        <el-form-item label="钱包余额">
          <el-input :value="walletBalance" readonly>
            <div class="token-symbol" slot="prepend">ETH</div>
          </el-input>
        </el-form-item>
      </el-form>
      <el-form label-position="left" label-width="100px">
        <el-form-item label="健康因子">
          <el-input :value="healthFactor" readonly>
            <div class="token-symbol" slot="append">%</div>
          </el-input>
        </el-form-item>
        <el-form-item label="总借贷额度">
          <el-input :value="formatBalance(availableCredit)" readonly>
            <div class="token-symbol" slot="append">USD</div>
          </el-input>
        </el-form-item>
        <el-form-item label="可借贷余额">
          <el-input :value="formatBalance(liquidity)" readonly>
            <div class="token-symbol" slot="append">USD</div>
          </el-input>
        </el-form-item>
        <el-form-item label="已借贷金额">
          <el-input :value="formatBalance(totalBorrows)" readonly>
            <div class="token-symbol" slot="append">USD</div>
          </el-input>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from "ethers"
import MetamaskLogo from '@/components/MetamaskLogo'

import metamaskAccount from '@/mixins/metamaskAccount.js'
import compoundAccoundData from '@/mixins/compoundAccoundData'

import {
  Address_cEther, Address_cToken, Address_comptroller,
  ABI_cToken, ABI_cEther, ABI_comptroller,
} from '@/constants/contracts/compound'

export default {
  name: "Launcher",
  props: {
    provider: {
      type: [Object, null],
      default: null
    },
  },
  components: {
    MetamaskLogo,
  },
  mixins: [
    metamaskAccount(),
    compoundAccoundData()
  ],
  data() {
    return {
      connecting: false,
      pending: false,
      signer: null,
      address: '',
      walletBalance: 0,
    }
  },
  methods: {
    onProviderUpdated() {
      this.updateAccount()
    },
    async updateAccount() {
      this.handleGetBalance()
      this.getAccoundData && this.getAccoundData()
    },
    async handleGetBalance() {
      await this.getEtherBalance()
    },
    async getEtherBalance() {
      const balance = await this.signer.getBalance()
      this.walletBalance = ethers.utils.formatUnits(balance)
    },
  },
}
</script>

<style lang="scss" scoped>
.metamask {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.mm-logo {
  width: 60px;
  height: 60px;
}
.mm-btn {
  margin-left: 15px;
}
.avtive-waller {
  text-align: center;
  margin: 10px auto;
  position: relative;
  > span {
    font-size: 12px;
    line-height: 12px;
    font-weight: 500;
    color: #2ecc71;
    display: inline-block;
    vertical-align: middle;
  }
  &::before {
    content: "";
    display: inline-block;
    vertical-align: middle;
    margin-right: 5px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    box-shadow: inset 0 0 8px #2ecc71,
                0 0 2px 0px #a0c4af;
  }
}
.token-symbol {
  width: 40px;
  text-align: center;
}

.token__actions {
  margin-top: 5px;
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.action-btn + .action-btn {
  margin-left: 10px;
}
/deep/ {
  .el-input,
  .el-select {
    width: 100%;
  }
}
</style>
