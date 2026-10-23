<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import './sky-theme-appearance.css'
import './sunset-sky-city.css'

const assetRoot = '/themes/sunset-sky-city/'
const isStatic = ref(true)
const isPageVisible = ref(true)
let motionPreference: MediaQueryList | undefined

const sceneStyle = computed(() => ({
  '--sunset-ship-image': `url("${assetRoot}${isPageVisible.value ? 'ship-DnA5-vP6.webp' : 'ship-still-4vm4_cXx.webp'}")`
}))

const updateMotionPreference = () => {
  isStatic.value = Boolean(motionPreference?.matches)
    || document.documentElement.classList.contains('holy-bear-constrained-device')
}

const updateVisibility = () => {
  isPageVisible.value = document.visibilityState === 'visible'
}

onMounted(() => {
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotionPreference()
  updateVisibility()
  motionPreference.addEventListener('change', updateMotionPreference)
  document.addEventListener('visibilitychange', updateVisibility)
})

onBeforeUnmount(() => {
  motionPreference?.removeEventListener('change', updateMotionPreference)
  document.removeEventListener('visibilitychange', updateVisibility)
})
</script>

<template>
  <div class="sunset-sky-city-background" :class="{ 'is-paused': !isPageVisible }" aria-hidden="true">
    <div v-if="isStatic" class="sunset-sky-city-still">
      <div class="sunset-sky-city-still-ship"></div>
    </div>
    <div v-else class="sunset-sky-city-scene" :style="sceneStyle">
      <div class="sunset-cloud-back2"></div>
      <div class="sunset-stars">
        <span v-for="star in 32" :key="star" class="sunset-star"></span>
      </div>
      <div class="sunset-sun"><span class="sunset-sun-glint"></span></div>
      <div v-for="layer in ['base', 'rim-r', 'rim-l']" :key="layer" class="sunset-birds" :class="`sunset-birds--${layer}`">
        <div v-for="group in 5" :key="group" class="sunset-bird-group">
          <span v-for="bird in 3" :key="bird" class="sunset-bird"></span>
        </div>
      </div>
      <div class="sunset-islands">
        <span v-for="island in [3, 5]" :key="island" class="sunset-island" :class="`sunset-island--${island}`"></span>
      </div>
      <div class="sunset-cloud-back"></div>
      <div class="sunset-cloud-back-light"><div class="sunset-cloud-back-glint"></div></div>
      <div class="sunset-islands">
        <span v-for="island in [1, 2, 4]" :key="island" class="sunset-island" :class="`sunset-island--${island}`"></span>
      </div>
      <div class="sunset-cloud-main"></div>
      <div class="sunset-cloud-glint">
        <div class="sunset-cloud-sheen"></div>
        <span v-for="sparkle in 22" :key="sparkle" class="sunset-cloud-sparkle"></span>
      </div>
      <div class="sunset-ship"></div>
      <div class="sunset-smoke sunset-smoke--burst">
        <span v-for="puff in 5" :key="puff" class="sunset-puff"></span>
      </div>
    </div>
    <div class="sunset-sky-city-reading-mask"></div>
  </div>
</template>
