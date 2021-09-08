<template>
  <div class="page">
    <el-form label-width="80px">
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
      </el-form-item>
    </el-form>
    <!-- <img :src="imageSrc"></img> -->
    <div v-if="svg" v-html="svg" class="svg-wrapper"></div>
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

const ContractAddress = '0xC92B72ecf468D2642992b195bea99F9B9BB4A838'

export default {
  data() {
    return {
      pending: false,
      tokenID: '',
      tokenURI: '',
      tokenData: {},
      svg: '',
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
        await this.mintCaptain(this.tokenID)
      } catch(err) {
        console.log(err)
      }
      this.pending = false
    },
    async handleRender() {
      this.pending = true
      try {
        await this.fetchTokenURI(this.tokenID)
      } catch(err) {
        console.log(err)
      }
      this.pending = false
    },
    async mintCaptain(tokenID) {
      const signer = this.$wallet.getSigner()
      const avatar = new ethers.Contract(ContractAddress, [
        'function mintCaptain(uint256 tokenId) payable'
      ], signer)
      await avatar.mintCaptain(tokenID).then(tx => tx.wait())
    },
    async fetchTokenURI(tokenID) {
      const provider = this.$wallet.getProvider()
      const avatar = new ethers.Contract(ContractAddress, [
        'function tokenURI(uint256 tokenId) view returns (string)'
      ], provider)
      this.tokenURI = await avatar.tokenURI(tokenID)
      this.tokenData = this.parseToken(this.tokenURI)
      this.svg = this.parseSVG(this.tokenData.image)
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
