<template>
  <div v-if="loading" class="loading-page">
    <div class="loading-icon"></div>
  </div>
</template>

<script>
  export default {
    data: () => ({
      loading: false
    }),
    methods: {
      start() {
        this.loading = true
      },
      finish() {
        this.loading = false
      }
    }
  }
</script>

<style lang="scss" scoped>
@import '@/assets/stylesheets/variables.scss';
.loading-page {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(255, 255, 255, 0.5);
  text-align: center;
  font-family: sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;
}
@keyframes rotateLoading {
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
}
.loading-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid $--color-text-primary;
  border-top-color: transparent;
  transform-origin: center center;
  animation: rotateLoading infinite 2s ease;
}
</style>