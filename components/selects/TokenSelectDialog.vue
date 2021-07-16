<!-- dialog 返回的是整个对象, select 组件返回 id -->
<template>
  <el-dialog class="dialog--tokens" title="Select Token"
    width="600px" top="5vh" :fullscreen="false" :append-to-body="true" :modal-append-to-body="true"
    :visible.sync="isVisible" @open="onDialogOpen" @close="onDialogClose">
    <div class="filters">
      <div class="filter-item">
        <el-input placeholder="Search by Symbol or Address" clearable
          v-model="q"></el-input>
      </div>
    </div>
    <el-table :data="listedTokens" v-loading="pending">
      <el-table-column width="60" class-name="col-image">
        <template slot-scope="{ row }">
          <el-image
            style="width: 40px; height: 40px; display: block;"
            :src="row.logoURI" fit="contain"
          ></el-image>
        </template>
      </el-table-column>
      <el-table-column prop="symbol" label="Symbol" width="80" align="center"></el-table-column>
      <el-table-column prop="name" label="Name"></el-table-column>
      <el-table-column prop="actions" label="操作" width="60">
        <template slot-scope="{ row }">
          <el-button
            type="primary" size="mini" @click="handleSelectOne(row)">选择</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="text-center hint" v-show="filteredResults.length > 10">Type in exact Symbol or Address to get more results...</div>
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
    ...mapState('tokens', ['data', 'pending']),
    filteredResults() {
      let res = []
      if (!this.q) {
        res = this.data
      } else if (/^(0x)?\w{40}$/.test(this.q)) {
        // match token address
        let _q = this.q
        if (!_.startsWith(_q, '0x')) {
          _q = '0x' + _q
        }
        res = _.filter(this.data, { address: _q })
      } else {
        res = _.filter(this.data, token => {
          return _.startsWith(token.symbol, this.q.toUpperCase())
        })
      }
      return res
    },
    listedTokens() {
      return _.take(this.filteredResults, 10)
    }
  },
  mounted() {

  },
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
      if (_.isEmpty(this.data)) {
        this.$store.dispatch('tokens/getTokens')
      }
    },
    onDialogClose() {
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
@import "@/assets/stylesheets/variables.scss";

.filters {
  padding: 5px 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  // TODO 换成 element-ui 的变量
  border-bottom: 1px solid #f0f0f0;
  .filter-item {
    margin: 5px 10px;
    width: 100%;
  }
}
.hint {
  color: $color-text-light;
  padding: 10px 0;
}
.dialog--tokens {
  /deep/ .el-dialog__body {
    padding-top: 0;
    padding-bottom: 20px;
  }
  /deep/ .el-dialog {}
}
</style>
