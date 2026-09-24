<template>
  <div v-if="validSlotId" class="adsense-slot">
    <ins
      :key="validSlotId"
      ref="adElement"
      class="adsbygoogle"
      :style="adStyle"
      :data-ad-client="ADSENSE_CLIENT_ID"
      :data-ad-slot="validSlotId"
      :data-ad-format="adFormat"
      :data-full-width-responsive="fullWidthResponsiveAttribute"
      :data-adsense-load-status="adSenseLoadStatus"
    ></ins>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ADSENSE_CLIENT_ID, ensureMapleAdSenseScript, type AdSenseScriptStatus } from '../../adsense'

const props = withDefaults(defineProps<{
  slotId: string
  format?: 'auto' | 'horizontal' | 'fixed'
  fullWidthResponsive?: boolean
  fixedWidth?: 160 | 672 | 1200
  fixedHeight?: 90 | 600
}>(), {
  format: 'auto',
  fullWidthResponsive: true,
  fixedWidth: 672,
  fixedHeight: 90,
})
const validSlotId = computed(() => /^\d+$/.test(props.slotId) ? props.slotId : '')
const adStyle = computed(() => props.format === 'fixed'
  ? `display:inline-block;width:${props.fixedWidth}px;height:${props.fixedHeight}px`
  : 'display:block')
const adFormat = computed(() => props.format === 'fixed' ? undefined : props.format)
const fullWidthResponsiveAttribute = computed(() => props.format === 'fixed'
  ? undefined
  : String(props.fullWidthResponsive))
const adElement = ref<HTMLElement | null>(null)
const adSenseLoadStatus = ref<AdSenseScriptStatus>('loading')
const initializedElements = new WeakSet<HTMLElement>()
let mounted = false
let connectionObserver: MutationObserver | null = null
let sizeObserver: ResizeObserver | null = null

function requestAd() {
  const element = adElement.value
  if (!element || adSenseLoadStatus.value !== 'loaded' || initializedElements.has(element)) return
  if (element.dataset.adsenseLoadStatus === 'failed') return
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
    adSenseLoadStatus.value = 'failed'
    console.warn('AdSense ad request failed:', error)
  }
}

onMounted(async () => {
  mounted = true
  await nextTick()
  adSenseLoadStatus.value = await ensureMapleAdSenseScript()
  if (mounted && adSenseLoadStatus.value === 'loaded') requestAd()
})

watch(validSlotId, async () => {
  if (!mounted || adSenseLoadStatus.value !== 'loaded') return
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
