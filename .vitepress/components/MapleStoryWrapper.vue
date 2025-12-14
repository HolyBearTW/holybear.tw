<template>
  <div id="maplestory-root"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './maplestory/App'
import './maplestory/index.css'

let root = null

onMounted(() => {
  const container = document.getElementById('maplestory-root')
  if (container) {
    root = ReactDOM.createRoot(container)
    root.render(React.createElement(App))
  }

  // Ensure Christmas theme is applied if it's the current theme
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('vitepress-background-theme') || 'christmas'
    if (savedTheme === 'christmas') {
      document.body.classList.add('theme-christmas')
    }
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
