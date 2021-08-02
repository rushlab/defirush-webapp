<!-- dialog 返回的是整个对象, select 组件返回 id -->
<template>
  <el-dialog class="dialog--dark dialog--tokens" title="Select Token"
    width="500px" top="5vh" :fullscreen="false" :append-to-body="true" :modal-append-to-body="true"
    :visible.sync="isVisible" @open="onDialogOpen" @close="onDialogClose">
    <div class="dialog__inner">
      <div class="upper-part">
        <div class="filters">
          <div class="filter-item">
            <el-input
              placeholder="Search by Symbol or Address"
              clearable
              autofocus
              v-model="q"></el-input>
          </div>
        </div>
        <div class="common-bases">
          <div class="common-bases__title">Common tokens</div>
          <div class="common-bases__inner">
            <div
              class="common-item"
              v-for="item in commonTokens" :key="item.address"
              @click="handleSelectOne(item)"
            >
              <el-image
                style="width: 18px; height: 18px; display: block;"
                :src="item.logoURI" fit="contain"
              ></el-image>
              <div class="common-item__symbol">{{ item.symbol }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="token-list">
        <div v-for="item in listedTokens" :key="item.address" class="token-item" @click="handleSelectOne(item)">
          <el-image
            style="width: 30px; height: 30px; display: block;"
            :src="item.logoURI" fit="contain"
          ></el-image>
          <div class="token__caption">
            <div class="token__title">{{ item.symbol }}</div>
            <div class="token__name">{{ item.name }}</div>
          </div>
        </div>
      </div>
    </div>
    <!-- <div class="text-center hint" v-show="filteredResults.length > 10">Type in exact Symbol or Address to get more results...</div> -->
  </el-dialog>
</template>

<script>
import _ from 'lodash'
import { mapState, mapGetters, mapActions } from 'vuex'


export default {
  name: 'TokenSelectDialog',
  components: {},
  props: {
    visible: {
      type: Boolean,
      required: true
    },
    multiple: {
      type: Boolean,
      required: false,
      default: false
    },
  },
  data() {
    return {
      isVisible: this.visible,
      q: '', // token symbol or full address
    }
  },
  computed: {
    ...mapState('tokens', {
      tokenList: state => state.data,
      pending: state => state.pending,
    }),
    commonTokens() {
      return this.tokenList.slice(0, 5)
    },
    filteredResults() {
      let res = []
      if (!this.q) {
        res = this.tokenList
      } else if (/^(0x)?\w{40}$/.test(this.q)) {
        // match token address
        let _q = this.q
        if (!_.startsWith(_q, '0x')) {
          _q = '0x' + _q
        }
        res = _.filter(this.tokenList, (token) => token.address.toLowerCase() === _q.toLowerCase())
      } else {
        res = _.filter(this.tokenList, token => {
          return token.symbol.toLowerCase().indexOf(this.q.toLowerCase()) >= 0
        })
      }
      return res
    },
    listedTokens() {
      return _.take(this.filteredResults, 10)
    }
  },
  mounted() {},
  watch: {
    visible(newVal, oldValue) {
      this.isVisible = newVal
    }
  },
  methods: {
    onDialogOpen() {
      this.$emit('open')
      this.$emit('update:visible', true)
      // 打开 dialog 的时候再 fetch
      if (!this.tokenList || _.isEmpty(this.tokenList)) {
        this.$store.dispatch('tokens/getTokens')
      }
    },
    onDialogClose() {
      this.q = ''
      this.$emit('close')
      this.$emit('update:visible', false)
    },
    handleSelectOne(token) {
      this.$emit('select', token)
      this.isVisible = false
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@/assets/stylesheets/components/dialog.scss";

.dialog__inner {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.upper-part {
  padding: 20px 30px 10px;
}
.filters {
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  // TODO 换成 element-ui 的变量
  border-bottom: 1px solid #f0f0f0;
  .filter-item {
    margin: 0 auto;
    width: 100%;
  }
}
.hint {
  color: $color-text-light;
  padding: 10px 0;
}
/deep/ {
  .el-input__inner {
    height: 48px;
    line-height: 48px;
    color: $color-text;
    background-color: $color-input-bg;
    font-size: 16px;
    color: $color-text;
    &::placeholder {
      color: $color-text-light;
    }
  }
}
.common-bases {
  margin-top: 15px;
}
.common-bases__title {
  font-size: 14px;
  color: $color-text-light;
  margin-bottom: 8px;
}
.common-bases__inner {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: flex-start;
}
.common-item {
  height: 36px;
  background: transparent;
  border: 1px solid #979AAA;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  padding: 0 17px;
  margin-right: 10px;
  margin-bottom: 10px;
  &:hover {
    background-color: $color-input-bg;
  }
  .common-item__symbol {
    margin-left: 10px;
    font-size: 15px;
    color: $color-text;
  }
}
.token-list {
  width: 100%;
  flex: 1;
  overflow: auto;
  padding: 15px 0;
  border-top: 1px solid $color-border;
  margin-top: 10px;
  overflow: auto;
  // &::-webkit-scrollbar {
  //   height: 30px;
  // }
}
.token-item {
  width: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  cursor: pointer;
  padding: 15px 30px;
  &:hover {
    background-color: $color-input-bg;
  }
}
.token__caption {
  margin-left: 15px;
}
.token__title {
  font-size: 20px;
  color: $color-text;
}
.token__name {
  font-size: 12px;
  color: $color-text-light;
}
</style>
