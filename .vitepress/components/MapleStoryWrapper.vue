<template>
  <div id="maplestory-root"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './maplestory/App'

let root = null

onMounted(() => {
  const container = document.getElementById('maplestory-root')
  if (container) {
    root = ReactDOM.createRoot(container)
    root.render(React.createElement(App))
  }
})

onBeforeUnmount(() => {
  if (root) {
    root.unmount()
  }
})
</script>

<style scoped>
#maplestory-root {
  width: 100%;
  min-height: 500px;
}
</style>
