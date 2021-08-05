<template>
  <svg
    class="circle-progress"
    :height="radius * 2"
    :width="radius * 2"
  >
    <circle
      :stroke="(progress % 100) ? colorStorke : 'transparent'"
      :fill="colorFill"
      :stroke-dasharray="circumference + ' ' + circumference"
      :style="{ strokeDashoffset }"
      :stroke-width="stroke"
      :r="normalizedRadius"
      :cx="radius"
      :cy="radius"
    />
  </svg>
</template>

<script>
export default {
  name: 'CircleProgress',
  props: {
    radius: Number,
    progress: Number,
    stroke: Number,
    colorStorke: {
      type: String,
      default: 'white'
    },
    colorFill: {
      type: String,
      default: 'transparent'
    },
  },
  data() {
    const normalizedRadius = this.radius - this.stroke * 2
    const circumference = normalizedRadius * 2 * Math.PI

    return {
      normalizedRadius,
      circumference
    };
  },
  computed: {
    strokeDashoffset() {
      return this.circumference - this.progress / 100 * this.circumference
    }
  }
}
</script>


<style lang="scss" scoped>
svg.circle-progress > circle {
  transition: stroke-dashoffset .2s linear;
  transform: rotate(-90deg);
  transform-origin: 50% 50%,
}

</style>
