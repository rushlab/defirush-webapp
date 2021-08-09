<template>
  <span v-if="invalid">-</span>
  <span v-else><span v-if="negative">-</span><span class="s">{{ currencySymbol }}</span><span class="v">{{ formattedValue }}</span></span>
</template>

<script>
import { formatCurrency } from '@/utils/formatter'
export default {
  props: {
    value: {
      type: [Number, String],
      required: false,
      default: '0.00',
    },
    currencySymbol: {
      type: String,
      default: '$',
    }
  },
  data() {
    return {
      //
    }
  },
  computed: {
    invalid() {
      return !+this.value && +this.value !== 0
    },
    formattedValue() {
      return (Math.abs(+this.value)).toFixed(2)
    },
    negative() {
      return +this.value < 0
    }
  },
  methods: {
    formatCurrency
  }
}
</script>

<style lang="scss" scoped>
.s {
  font-size: 0.8em;
  line-height: 1;
}
</style>
