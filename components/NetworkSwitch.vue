<template>
  <div class="network-status" :class="{ 'signer-alive': isSignerAlive }">
    <el-dropdown @command="handleChainCommand" placement="bottom-start">
      <span class="el-dropdown-link">
        <span>{{ selectedChainName }}</span>
        <i class="el-icon-arrow-down el-icon--right"></i>
      </span>
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
      const chain = _.find(this.chains, (chain) => +chain.chainId === +this.chainId)
      return chain ? chain.chainName : `Unknown Network (${this.chainId})`
    }
  },
  mounted() {},
  methods: {
    async handleChainCommand(command) {
      const chainId = +(command.split('--')[1])
      if (chainId !== this.chainId) {
        this.$store.commit('auth/setChainId', chainId)
        global.location.reload()
      }
    }
  },
}
</script>

<style lang="scss" scoped>
@import "@/assets/stylesheets/variables.scss";
.network-status {
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
  }
}
</style>
