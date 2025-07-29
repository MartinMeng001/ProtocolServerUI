<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useDeviceStore } from '@/stores/device'

const deviceStore = useDeviceStore()

onMounted(() => {
  // 初始化WebSocket连接
  deviceStore.initWebSocket()
})
</script>

<style>
#app {
  height: 100vh;
  overflow: hidden;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}
</style>