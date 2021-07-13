<template>
  <div class="provider">
    <el-form label-position="top" ref="form">
      <el-form-item label="Provider">
        <el-select v-model="localType">
          <el-option label="RPC" value="rpc"></el-option>
          <el-option label="MetaMask" value="metamask"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="RPC URL" v-if="localType === 'rpc'" required>
        <el-input v-model="rpcUrl" placeholder="请输入有效的 RPC 地址"></el-input>
      </el-form-item>
      <el-form-item label="ChainID" v-if="localType === 'rpc'">
        <el-input v-model="chainId" placeholder="请输入ChindId"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onChangeProvider" :disabled="providerType === localType">切换Provider</el-button>
        <el-button v-if="providerType !== localType" @click="onCancel">取消切换</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
export default {
  name: "Provider",
  props: {
    providerType: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      localType: this.providerType || '',
      rpcUrl: '',
      chainId: null
    }
  },
  watch: {
    privateKey(newVal) {
      this.localType = newVal
    }
  },
  methods: {
    onChangeProvider() {
      this.$emit('change', this.localType, { rpcUrl: this.rpcUrl, chainId: this.chainId } )
      // this.$emit('update:providerType', this.localType)
    },
    onCancel() {
      this.localType = this.providerType
    }
  },
}
</script>

<style lang="scss" scoped>

</style>
