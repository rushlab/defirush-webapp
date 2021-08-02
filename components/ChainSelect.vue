<template>
  <div class="chains-select">
    <div class="btn-group">
      <div
        v-for="item in chainsOptions" :key="item.value"
        :value="item.value"
        class="btn-item"
        :class="{ 'active': value === item.value, 'disabled': !!item.disabled }"
        @click="() => !item.disabled && onClick(item.value)"
      >{{ item.title }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChainSelect',
  props: {
    value: {
      type: String,
      default: 'Ethereum'
    }
  },
  data() {
    return {
      chainsOptions: [
        { title: 'Ethereum', value: 'Ethereum' },
        { title: 'Polygon', value: 'Polygon', disabled: true },
        { title: 'Arbitrum', value: 'Arbitrum', disabled: true },
        { title: 'BSC', value: 'BSC', disabled: true },
        { title: 'HECO', value: 'HECO', disabled: true },
      ]
    }
  },
  methods: {
    onClick(val) {
      if (val === this.value) return
      this.$emit('update:value', val)
    }
  },
}
</script>

<style lang="scss" scoped>
@import "@/assets/stylesheets/variables.scss";
.btn-group {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}
.btn-item {
  font-size: 14px;
  height: 32px;
  line-height: 20px;
  padding: 6px 20px;
  text-align: center;
  background-color: transparent;
  color: $color-text;
  border-radius: 16px;
  margin-right: 15px;
  cursor: pointer;
  transition: all .25s ease-in-out;
  &.active {
    background-color: $btn-dark-bg;
    color: $btn-dark-text;
  }
  &.disabled {
    opacity: 0.5;
  }
  &:hover {
    background-color: $color-input-bg;
  }
}
</style>
