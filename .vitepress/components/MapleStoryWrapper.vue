<template>
  <div id="maplestory-root"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './maplestory/App'

let root = null
let readyObserver = null

function announceReady(container) {
  if (!container.firstElementChild) return false

  window.dispatchEvent(new CustomEvent('holybear-route-loading-finish'))
  return true
}

onMounted(() => {
  const container = document.getElementById('maplestory-root')
  if (container) {
    root = ReactDOM.createRoot(container)
    root.render(React.createElement(App))

    readyObserver = new MutationObserver(() => {
      if (announceReady(container)) {
        readyObserver?.disconnect()
        readyObserver = null
      }
    })
    readyObserver.observe(container, { childList: true })

    requestAnimationFrame(() => {
      if (announceReady(container)) {
        readyObserver?.disconnect()
        readyObserver = null
      }
    })
  }
})

onBeforeUnmount(() => {
  readyObserver?.disconnect()
  readyObserver = null
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
