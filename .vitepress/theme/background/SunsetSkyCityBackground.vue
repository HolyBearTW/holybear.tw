<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import SunsetSkyCityCanvas from './SunsetSkyCityCanvas.vue'

const initialized = ref(false)
const prefersReducedMotion = ref(false)
const isLimited = ref(false)
const isTouchViewport = ref(false)
const canvasReady = ref(false)
const sceneFailed = ref(false)
const hasRendered = ref(false)
const updateReady = (ready: boolean) => { canvasReady.value = ready; if (ready) hasRendered.value = true }
let motionPreference: MediaQueryList | undefined
let viewportPreference: MediaQueryList | undefined
let deviceObserver: MutationObserver | undefined

const updateRenderProfile = () => {
  prefersReducedMotion.value = Boolean(motionPreference?.matches)
  isTouchViewport.value = Boolean(viewportPreference?.matches) || navigator.maxTouchPoints > 0
  // Device hints select a smaller drawing surface instead of disabling motion.
  isLimited.value = document.documentElement.classList.contains('holy-bear-constrained-device')
}

onMounted(() => {
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  viewportPreference = window.matchMedia('(max-width: 1024px), (hover: none) and (pointer: coarse)')
  updateRenderProfile()
  initialized.value = true
  motionPreference.addEventListener('change', updateRenderProfile)
  viewportPreference.addEventListener('change', updateRenderProfile)
  deviceObserver = new MutationObserver(updateRenderProfile)
  deviceObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onBeforeUnmount(() => {
  motionPreference?.removeEventListener('change', updateRenderProfile)
  viewportPreference?.removeEventListener('change', updateRenderProfile)
  deviceObserver?.disconnect()
})
</script>

<template>
  <div class="sunset-sky-city-background" :class="{ 'is-fallback': sceneFailed || (hasRendered && !canvasReady) }" :data-renderer="initialized ? 'canvas' : 'loading'" aria-hidden="true">
    <div v-if="!canvasReady" class="sunset-sky-city-still">
      <div class="sunset-sky-city-still-ship"></div>
    </div>
    <SunsetSkyCityCanvas v-if="initialized" :reduced-motion="prefersReducedMotion" :limited="isLimited" :touch-viewport="isTouchViewport" @ready-change="updateReady" @failed="sceneFailed = true" />
    <div class="sunset-sky-city-reading-mask"></div>
  </div>
</template>
