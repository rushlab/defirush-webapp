<template>
  <span v-if="invalid">-</span>
  <span v-else class="g"><span v-if="negative">-</span><span class="s">{{ currencySymbol }}</span><span class="v">{{ formattedValue }}</span></span>
</template>

<script>
import { ethers } from 'ethers'
import { formatCurrency } from '@/utils/formatter'
export default {
  props: {
    value: {
      type: [Number, String],
      required: false,
      default: '0.00',
    },
    precise: {
      type: Boolean,
      default: true,
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
      let value = Math.abs(+this.value)
      let suffix = ''
      if (!this.precise) {
        // if (value > 1e9) {
        //   value = (value / 1e9).toFixed(2)
        //   suffix = 'B'
        // } else
        if (value > 1e6) {
          value = (value / 1e6).toFixed(2)
          suffix = 'M'
        } else if (value > 1e3) {
          value = (value / 1e3).toFixed(2)
          suffix = 'K'
        } else {
          value = (value / 1).toFixed(2)
          suffix = ''
        }
      }
      // 价格无论如何都只保留两位小数
      value = (+value).toFixed(2)
      try {
        value = ethers.utils.commify(value)
        // value 超级大比如 1e100, 这样 toFixed(2) 了以后还是 1e100, 但 commify 只接受纯数字
      } catch(err) {}
      return value + suffix
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
.g {
  letter-spacing: 0.5px;
}
// .s {
//   font-size: 0.8em;
//   line-height: 1;
// }
</style>
