<template>
  <div class="page">
    <el-form label-width="150px">
      <el-form-item label="Contract Address">
        <el-input v-model="contractAddress"></el-input>
      </el-form-item>
      <el-form-item label="tokenID">
        <el-input v-model="tokenID"></el-input>
      </el-form-item>
      <el-form-item label="">
        <el-button
          type="dark" @click="handleRender"
          :disabled="pending" :loading="pending"
        >Render</el-button>
        <el-button
          type="danger" @click="handleMint"
          :disabled="pending" :loading="pending"
        >Mint</el-button>
        <el-button
          type="danger" @click="handleTransfer"
          :disabled="pending" :loading="pending"
        >Transfer</el-button>
      </el-form-item>
    </el-form>
    <!-- <img :src="imageSrc"></img> -->
    <div v-if="svg" v-html="svg" class="svg-wrapper"></div>
    <h2>Transfer Count <small>{{ transferCount }}</small></h2>
    <h2>Name <small>{{ tokenData.name }}</small></h2>
    <h2>Description <small>{{ tokenData.description }}</small></h2>
    <h2>Image <small>data:image/svg+xml;base64</small></h2>
    <pre>{{ tokenData.image }}</pre>
    <h2>tokenURI <small>data:application/json;base64</small></h2>
    <pre>{{ tokenURI }}</pre>
  </div>
</template>

<script>
import { ethers } from 'ethers'

export default {
  data() {
    return {
      contractAddress: this.$route.query.contract || '0xC92B72ecf468D2642992b195bea99F9B9BB4A838',
      pending: false,
      tokenID: '',
      tokenURI: '',
      tokenData: {},
      svg: '',
      transferCount: 0,
    }
  },
  mounted() {
    //
  },
  computed: {},
  methods: {
    async handleMint() {
      this.pending = true
      try {
        await this.mintGhost(this.tokenID)
      } catch(err) {
        console.log(err)
      }
      this.pending = false
    },
    async handleRender() {
      this.pending = true
      try {
        await this.fetchTokenURI(this.tokenID)
        await this.fetchTransferCount(this.tokenID)
      } catch(err) {
        console.log(err)
      }
      this.pending = false
    },
    async mintGhost(tokenID) {
      const signer = this.$wallet.getSigner()
      const avatar = new ethers.Contract(this.contractAddress, [
        'function mintGhost(uint256 tokenId) payable'
      ], signer)
      await avatar.mintGhost(tokenID).then(this.$wallet.waitForTx)
    },
    async fetchTokenURI(tokenID) {
      const provider = this.$wallet.getProvider()
      const avatar = new ethers.Contract(this.contractAddress, [
        'function tokenURI(uint256 tokenId) view returns (string)'
      ], provider)
      this.tokenURI = await avatar.tokenURI(tokenID)
      this.tokenData = this.parseToken(this.tokenURI)
      this.svg = this.parseSVG(this.tokenData.image)
    },
    async fetchTransferCount(tokenID) {
      const provider = this.$wallet.getProvider()
      const avatar = new ethers.Contract(this.contractAddress, [
        'function transfer_count(uint256 tokenID) view returns (uint256)'
      ], provider)
      this.transferCount = +(await avatar.transfer_count(tokenID))
    },
    parseToken(tokenURI) {
      if (!/^data:application\/json;base64,/.test(tokenURI)) {
        return ''
      }
      const raw = tokenURI.substr(29)
      return JSON.parse(atob(raw))
    },
    parseSVG(imageSrc) {
      if (!/^data:image\/svg\+xml;base64,/.test(imageSrc)) {
        return ''
      }
      const raw = imageSrc.substr(26)
      const svg = atob(raw)
      return svg
    },
    async handleTransfer() {
      let toAddress = ''
      try {
        const res = await this.$prompt('请输入目标地址', '提示', {})
        toAddress = res.value
      } catch(error) {
        return
      }
      const signer = this.$wallet.getSigner()
      const avatar = new ethers.Contract(this.contractAddress, [
        'function transferFrom(address from, address to, uint256 tokenId)'
      ], signer)
      await avatar.transferFrom(this.$wallet.getAddress(), toAddress, this.tokenID).then(this.$wallet.waitForTx)
    }
  }
}
</script>

<style lang="scss" scoped>
.page {
  //
}
.svg-wrapper {
  width: 400px;
  height: 400px;
  margin: 50px 0;
  /deep/ svg {
    display: block;
    width: 100%;
  }
}
pre {
  word-break: break-all;
  white-space: normal;
  overflow: scroll;
  width: 600px;
  max-height: 400px;
  padding: 5px;
  margin: 10px 0;
  border: 1px solid #000;
}
</style>
