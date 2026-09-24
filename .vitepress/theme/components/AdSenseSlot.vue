<template>
  <div v-if="validSlotId" class="adsense-slot">
    <ins
      :key="validSlotId"
      ref="adElement"
      class="adsbygoogle"
      style="display:block"
      :data-ad-client="ADSENSE_CLIENT_ID"
      :data-ad-slot="validSlotId"
      :data-ad-format="format"
      data-full-width-responsive="true"
    ></ins>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ADSENSE_CLIENT_ID } from '../../adsense'

const props = defineProps<{ slotId: string; format?: 'auto' | 'horizontal' }>()
const validSlotId = computed(() => /^\d+$/.test(props.slotId) ? props.slotId : '')
const adElement = ref<HTMLElement | null>(null)
const initializedElements = new WeakSet<HTMLElement>()
let mounted = false
let connectionObserver: MutationObserver | null = null
let sizeObserver: ResizeObserver | null = null

function requestAd() {
  const element = adElement.value
  if (!element || initializedElements.has(element)) return
  if (element.hasAttribute('data-adsbygoogle-status')) return
  if (!element.isConnected) {
    connectionObserver ??= new MutationObserver(requestAd)
    connectionObserver.observe(document.documentElement, { childList: true, subtree: true })
    return
  }

  connectionObserver?.disconnect()
  connectionObserver = null

  if (element.getBoundingClientRect().width <= 0) {
    sizeObserver ??= new ResizeObserver(requestAd)
    sizeObserver.observe(element)
    return
  }

  sizeObserver?.disconnect()
  sizeObserver = null

  // A fresh DOM element is required for every request after SPA navigation.
  initializedElements.add(element)
  try {
    const adWindow = window as Window & { adsbygoogle?: Array<Record<string, never>> }
    ;(adWindow.adsbygoogle = adWindow.adsbygoogle || []).push({})
  } catch (error) {
    console.warn('AdSense ad request failed:', error)
  }
}

onMounted(async () => {
  mounted = true
  await nextTick()
  requestAd()
})

watch(validSlotId, async () => {
  if (!mounted) return
  await nextTick()
  requestAd()
})

onBeforeUnmount(() => {
  mounted = false
  connectionObserver?.disconnect()
  connectionObserver = null
  sizeObserver?.disconnect()
  sizeObserver = null
})
</script>

<style scoped>
.adsense-slot {
  width: 100%;
  min-width: 0;
  margin: 24px auto;
  text-align: center;
}
</style>
