<template>
  <div class="network-switch" :class="{ 'signer-alive': isSignerAlive }">
    <el-dropdown @command="handleChainCommand" placement="bottom-start">
      <div class="el-dropdown-link">
        <!-- <el-image v-if="selectedChainIcon" :src="selectedChainIcon" fit="contain"></el-image>
        <i v-else class="el-icon-warning-outline"></i> -->
        <span>{{ selectedChainName }}</span>
        <i class="el-icon-arrow-down el-icon--right"></i>
      </div>
      <el-dropdown-menu slot="dropdown">
        <el-dropdown-item
          v-for="item in chainOptions" :key="item.chainId"
          :disabled="item.disabled" :command="`chain--${item.chainId}`"
          style="display: flex; align-items: center; justify-content: flex-start; padding: 5px 20px;"
        >
          <el-image
            v-if="item.icon" :src="item.icon" fit="contain"
            style="width: 25px; height: 25px; margin-right: 10px;"
          ></el-image>
          <i v-else class="el-icon-warning-outline"></i>
          <span>{{ item.chainName }}</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </el-dropdown>
  </div>
</template>

<script>
import _ from 'lodash'
import { ethers } from 'ethers'
import { mapState } from 'vuex'
import { chains } from '@/utils/chains'

export default {
  name: 'NetworkSwitch',
  data() {
    return {
      // [ { chainId, chainName }, ... ]
      chains,
      chainOptions: chains,
      // chainOptions: _.filter(chains, (chain) => !chain.forking),
      connectDialogVisible: false,
    }
  },
  computed: {
    ...mapState('auth', ['chainId', 'isSignerAlive']),
    selectedChainName() {
      const chain = _.find(this.chains, { chainId: this.chainId })
      return chain ? chain.chainName : `Unknown Network (${this.chainId})`
    },
    selectedChainIcon() {
      const chain = _.find(this.chains, { chainId: this.chainId })
      return chain ? chain.icon : null
    }
  },
  mounted() {},
  methods: {
    async handleChainCommand(command) {
      const chainId = +(command.split('--')[1])
      if (chainId !== this.chainId) {
        this.$store.dispatch('auth/switchChain', { chainId })
        // global.location.reload()
        this.$store.dispatch('_refreshApp')
      }
    }
  },
}
</script>

<style lang="scss" scoped>
@import "@/assets/stylesheets/variables.scss";
.network-switch {
  position: relative;
  padding-left: 20px;
  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0px;
    margin-top: -4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: $--color-danger;
  }
  &.signer-alive::before {
    background-color: $--color-success;
  }
  /deep/ .el-dropdown-link {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    .el-image {
      width: 20px;
      height: 20px;
      margin-right: 10px;
    }
  }
}
</style>
