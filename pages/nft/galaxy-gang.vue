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
      </el-form-item>
    </el-form>
    <!-- <img :src="imageSrc"></img> -->
    <div v-if="svg" v-html="svg" class="svg-wrapper"></div>
    <h2>Image <small>data:image/svg+xml;base64</small></h2>
    <pre>{{ imageSrc }}</pre>
    <h2>tokenURI <small>data:application/json;base64</small></h2>
    <pre>{{ tokenURI }}</pre>
  </div>
</template>

<script>
import { ethers } from 'ethers'

export default {
  data() {
    return {
      pending: false,
      tokenID: '',
      tokenURI: '',
      imageSrc: '',
      svg: '',
    }
  },
  mounted() {
    //
  },
  computed: {},
  methods: {
    async handleRender() {
      this.pending = true
      try {
        await this.fetchTokenURI(this.tokenID)
      } catch(err) {
        console.log(err)
      }
      this.pending = false
    },
    async fetchTokenURI(tokenID) {
      const provider = this.$wallet.getProvider()
      const address = '0x347a7991A3E6D1a6a066c1ABf676882a8CA3BF3F'
      const abi = [
        'function tokenURI(uint256 tokenId) view returns (string)'
      ]
      const avatar = new ethers.Contract(address, abi, provider)
      this.tokenURI = await avatar.tokenURI(tokenID)
      this.imageSrc = this.parseImage(this.tokenURI)
      this.svg = this.parseSVG(this.imageSrc)
    },
    parseImage(tokenURI) {
      if (!/^data:application\/json;base64,/.test(tokenURI)) {
        return ''
      }
      const raw = tokenURI.substr(29)
      const data = JSON.parse(atob(raw))
      const imageSrc = data.image
      return imageSrc
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
