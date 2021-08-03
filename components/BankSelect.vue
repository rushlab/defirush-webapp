<template>
  <div class="bank-select">
    <div class="btn-group">
      <div
        v-for="item in options" :key="item.value"
        :value="item.value"
        class="btn-item"
        :class="{ 'active': value === item.value }"
        @click="() => onClick(item.value)"
      >{{ item.title }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: "BankSelect",
  props: {
    value: {
      type: String,
      default: "aave"
    }
  },
  data() {
    return {
      options: [
        { title: "All", value: "all" },
        { title: "Aave", value: "aave" },
        { title: "Compound", value: "compound" },
        { title: "Cream", value: "cream" },
      ]
    }
  },
  methods: {
    onClick(val) {
      if (val === this.value) return
      this.$emit('change', val)
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
  min-width: 60px;
  text-align: center;
  line-height: 20px;
  padding: 6px 12px;
  text-align: center;
  background-color: transparent;
  color: $color-text;
  border-radius: 16px;
  margin-right: 15px;
  cursor: pointer;
  transition: all .25s ease-in-out;
  &:hover {
    background-color: $color-input-bg;
  }
  &.active {
    background-color: $btn-dark-bg;
    color: $btn-dark-text;
  }
}
</style>

