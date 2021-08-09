<template>
  <div class="gas-fees">
    <el-popover placement="bottom" width="260" trigger="hover">
      <div class="gas-fees__inner" v-loading="gasPricePending" element-loading-spinner="el-icon-loading">
        <div class="inner__title">Ethereum Gas Price Forecast</div>
        <div class="inner__body">
          <div class="item" v-for="(item, key) in gasPriceTable" :key="key">
            <span class="item__speed">{{ key }}</span>
            <span class="item__value">{{ item.price_gwei }}</span>
            <span class="item__duration">{{ item.waiting_seconds }} sec</span>
          </div>
        </div>
      </div>
      <div class="gas-fee-btn" slot="reference">
        <div class="gas-fee-icon">
          <i class="rush-icon-gas"></i>
        </div>
        <div class="gas-fee-value">{{ gasPriceTable.normal.price_gwei || '-' }}</div>
        <svg
          class="gas-fee__progress"
          :height="radius * 2"
          :width="radius * 2"
        >
          <circle
            :stroke="(progress % 100) ? '#000000' : 'transparent'"
            fill="transparent"
            :stroke-dasharray="circumference + ' ' + circumference"
            :style="{ strokeDashoffset }"
            :stroke-width="stroke"
            :r="normalizedRadius"
            :cx="radius"
            :cy="radius"
          />
        </svg>
      </div>
    </el-popover>
  </div>
</template>

<script>
import _ from 'lodash'
export default {
  data() {
    const radius = 20
    const stroke = 2
    const normalizedRadius = radius - stroke
    const circumference = normalizedRadius * 2 * Math.PI
    return {
      progress: 0,
      radius,
      stroke,
      normalizedRadius,
      circumference,
      gasPriceTable: {
        fase: {},
        normal: {},
        slow: {}
      },
      gasPricePending: false,
    }
  },
  computed: {
    strokeDashoffset() {
      return this.circumference - this.progress / 100 * this.circumference
    }
  },
  mounted() {
    this.getGasPrice()
  },
  methods: {
    async getGasPrice() {
      this.gasPricePending = true
      try {
        const res = await this.$axios.get('/api/gas_price_table/')
        const { fast, normal, slow } = res.data
        this.gasPriceTable = {
          fast: { ...fast, price_gwei: parseInt(fast.price_gwei) },
          normal: { ...normal, price_gwei: parseInt(normal.price_gwei) },
          slow: { ...slow, price_gwei: parseInt(slow.price_gwei) }
        }
      } catch (error) {}
      this.gasPricePending = false
    }
  },
  watch: {
    progress: {
      handler() {
        setTimeout(() => {
          this.progress = (this.progress + 1) % 100
          if (this.progress === 0) {
            this.getGasPrice()
          }
        }, 200)
      },
      immediate: true
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@/assets/stylesheets/variables.scss";
.gas-fee-btn {
  width: 40px;
  height: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #E6E8EC;
  border-radius: 50%;
  margin-right: 12px;
  cursor: pointer;
  color: $--color-text-primary;
  position: relative;
  // transition: all .25s ease-in-out;
}
.gas-fee-icon {
  font-size: 11px;
}
.gas-fee-value {
  font-size: 11px;
  line-height: 1;
}
.gas-fee-btn:hover {
  background-color: $--color-text-primary;
  .gas-fee-icon,
  .gas-fee-value {
    color: #ffffff;
  }
}
.gas-fee__progress {
  position: absolute;
  top: 0;
  left: 0;
  > circle {
    transition: stroke-dashoffset .2s linear;
    transform: rotate(-90deg);
    transform-origin: 50% 50%,
  }
}
.gas-fees {
  margin-right: 5px;
}
.gas-fees__inner {
  padding: 3px 10px;
  text-align: center;
  color: $--color-text-primary;
  position: relative;
}
.inner__title {
  font-weight: normal;
  font-size: 14px;
  line-height: 28px;
  margin-bottom: 15px;
}
.inner__body {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  .item {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
  }
  .item__speen {
    font-size: 12px;
    line-height: 14px;
    margin-bottom: 4px;
  }
  .item__value {
    font-weight: 500;
    font-size: 20px;
    line-height: 20px;
    margin-bottom: 4px;
  }
  .item__duration {
    font-size: 10px;
    line-height: 10px;
    color: #777E91;
  }
}
</style>
