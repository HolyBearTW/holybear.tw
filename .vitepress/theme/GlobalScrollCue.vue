<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'
import { ArrowDown } from 'lucide-vue-next'

defineProps<{ visible: boolean }>()

const { lang } = useData()
const route = useRoute()
const isHome = computed(() => route.path === '/' || route.path === '/en/')
const label = computed(() => {
  return lang.value.startsWith('en')
    ? isHome.value ? 'Go to site sections' : 'Scroll to footer'
    : isHome.value ? '前往站內入口' : '捲動至頁尾'
})

function scrollDown() {
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  const target = (isHome.value ? document.getElementById('hero-story') : null) || document.querySelector('.BlogVPFooter')
  if (target) target.scrollIntoView({ behavior })
  else window.scrollTo({ top: document.documentElement.scrollHeight, behavior })
}
</script>

<template>
  <Transition name="sidebar-fade">
    <button v-show="visible" class="global-scroll-cue" type="button" :aria-label="label" :title="label" @click="scrollDown">
      <ArrowDown aria-hidden="true" />
    </button>
  </Transition>
</template>

<style scoped>
.global-scroll-cue {
  bottom: calc(var(--hb-floating-music-bottom) + var(--hb-floating-music-height) + 12px);
  z-index: 30;
  box-sizing: border-box;
  height: 48px;
  padding: 0;
}

.global-scroll-cue svg {
  width: 18px;
  height: 18px;
}

.global-scroll-cue:focus-visible {
  outline: 2px solid var(--vp-c-brand-dark);
  outline-offset: 3px;
}

:global(body.holy-bear-loading-active .global-scroll-cue) {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>
