<template>
  <div class="contract-interaction">
    <div class="contract-info">
      <el-form label-position="left" label-width="160px">
        <el-form-item label="Contract Address">
          <el-input v-model="contractAddress" auto-complete="off"></el-input>
        </el-form-item>
        <el-form-item label="Contract ABI">
          <el-input v-model="contractABI" type="textarea" :rows="6"></el-input>
        </el-form-item>
      </el-form>
    </div>

    <el-card
      v-for="(functionItem, key) in contractFunctions" :key="key"
      v-if="contractInstance && functionItem && proxyAddress"
      class="function-item-wrapper"
      shadow="naver">
      <interaction-function-item
        :contract="contractInstance"
        :function-item="functionItem"
        :name="functionItem.name"
        :proxy-address="proxyAddress"
      />
    </el-card>
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from 'ethers'
import InteractionFunctionItem from '@/components/rush-wallet-proxy/InteractionFunctionItem'

export default {
  layout: 'rushwallet',
  components: {
    InteractionFunctionItem
  },
  data() {
    return {
      contractAddress: '',
      contractABI: '',
    }
  },
  computed: {
    proxyAddress() {
      return this.$route.params.proxyAddress
    },
    contractInstance() {
      if (!this.contractAddress) return null
      let instance = null
      try {
        const abi = JSON.parse(this.contractABI.replace(/[\n|\s+]/g, ' '))
        console.log(abi)
        instance = new ethers.Contract(this.contractAddress, abi, this.$wallet.getSigner())
      } catch (error) {
        console.log(error)
      }
      return instance
    },
    contractInterface() {
      return this.contractInstance ? this.contractInstance.interface : null
    },
    contractFunctions() {
      const res = this.contractInterface ? this.contractInterface.functions : []
      return res
    }
  },
}
</script>

<style lang="scss" scoped>
.function-item-wrapper {
  margin-bottom: 10px;
  padding: 10px;
}
</style>
