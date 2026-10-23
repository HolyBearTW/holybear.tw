<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import { accelerationReveal, createSunsetScene, sceneFiles, type SceneAsset, type SceneImages } from './sunsetScene'
import { createSunsetGpu } from './sunsetGpu'

const props = defineProps<{ reducedMotion: boolean; limited: boolean; touchViewport: boolean }>()
const emit = defineEmits<{ 'ready-change': [ready: boolean]; failed: [] }>()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const route = useRoute()
const ready = ref(false)
const assetRoot = '/themes/sunset-sky-city/'
const images = {} as SceneImages
let scene: ReturnType<typeof createSunsetScene> | undefined
let context: CanvasRenderingContext2D | null = null
let gpu: ReturnType<typeof createSunsetGpu>
let resizeObserver: ResizeObserver | undefined
let animationFrame = 0
let disposed = false
let assetsReady = false
let contextLost = false
let entranceStarted = false
let width = 1
let height = 1
let pixelRatio = 1
let heroBottom = 0
let observedHero: Element | null = null
let elapsed = 0
let previousTick = 0
let previousDraw = 0
let shipFile = ''
let shipLoading: Promise<void> | undefined
let desktopShipAvailable = true

function setReady(value: boolean) {
  if (ready.value === value) return
  ready.value = value
  emit('ready-change', value)
}

function loadImage(file: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      if (disposed) { image.src = ''; reject(new Error('Scene unmounted')); return }
      resolve(image)
    }
    image.onerror = () => reject(new Error('Unable to load sunset asset: ' + file))
    image.src = assetRoot + file
  })
}

function draw() {
  if (!context || !assetsReady || contextLost || disposed || !scene) return
  scene.draw(context, width, height, pixelRatio, elapsed, props.reducedMotion, heroBottom)
  setReady(true)
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas || disposed) return
  const bounds = canvas.getBoundingClientRect()
  width = Math.max(1, bounds.width)
  height = Math.max(1, bounds.height)
  const hero = width <= 720 && width <= height ? document.querySelector('.hb-home-lobby .hero-logo-card') : null
  if (observedHero !== hero) {
    if (observedHero) resizeObserver?.unobserve(observedHero)
    observedHero = hero
    if (hero) resizeObserver?.observe(hero)
  }
  heroBottom = hero ? hero.getBoundingClientRect().bottom + window.scrollY : 0
  const maxRatio = !gpu || props.limited || props.reducedMotion ? 1 : props.touchViewport ? 1.25 : 2
  pixelRatio = Math.min(window.devicePixelRatio || 1, maxRatio)
  const backingWidth = Math.round(width * pixelRatio)
  const backingHeight = Math.round(height * pixelRatio)
  if (canvas.width !== backingWidth) canvas.width = backingWidth
  if (canvas.height !== backingHeight) canvas.height = backingHeight
  draw()
}

function preferredShipFile() {
  return desktopShipAvailable && !props.touchViewport && !props.limited && !props.reducedMotion
    ? 'ship-frames-desktop.webp' : sceneFiles.ship
}

function ensureShip() {
  if (shipLoading) return shipLoading
  shipLoading = (async () => {
    while (!disposed && shipFile !== preferredShipFile()) {
      const file = preferredShipFile()
      let image: HTMLImageElement
      try { image = await loadImage(file) }
      catch (error) {
        if (file === sceneFiles.ship || disposed) throw error
        desktopShipAvailable = false
        continue
      }
      if (disposed || file !== preferredShipFile()) { image.src = ''; continue }
      const previousImage = images.ship
      images.ship = image
      shipFile = file
      if (previousImage) { gpu?.release(previousImage); previousImage.src = '' }
    }
  })().finally(() => { shipLoading = undefined })
  return shipLoading
}

function render(time: number) {
  animationFrame = 0
  if (disposed || contextLost || document.hidden || !assetsReady) return
  if (previousTick && entranceStarted) elapsed += Math.min(time - previousTick, 100)
  previousTick = time
  const interval = 1000 / (props.reducedMotion ? 15 : !gpu || props.touchViewport || props.limited ? 30 : 60)
  if (!previousDraw || time - previousDraw >= interval - 1) {
    draw()
    previousDraw = time
  }
  animationFrame = requestAnimationFrame(render)
}

function resume() {
  previousTick = 0
  if (!animationFrame && assetsReady && !contextLost && !document.hidden && !disposed) animationFrame = requestAnimationFrame(render)
}

function handleVisibilityChange() {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = 0
  resume()
}

function startEntrance() {
  if (entranceStarted) return
  entranceStarted = true
  previousTick = 0
}

function handleContextLost(event: Event) {
  event.preventDefault()
  contextLost = true
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = 0
  setReady(false)
}

function handleContextRestored() {
  contextLost = false
  gpu?.dispose()
  gpu = createSunsetGpu(canvasRef.value!)
  context = gpu?.context ?? canvasRef.value!.getContext('2d', { alpha: false })
  scene?.reset()
  resize()
  resume()
}

watch(() => [props.limited, props.reducedMotion, props.touchViewport], () => {
  if (props.reducedMotion) elapsed = Math.max(elapsed, accelerationReveal + 10000)
  resize()
  if (assetsReady) void ensureShip().catch(error => {
    if (!disposed) console.warn('[Sunset Sky City] Unable to change ship quality:', error)
  })
})

watch(() => route.path, async () => {
  await nextTick()
  resize()
}, { flush: 'post' })

onMounted(async () => {
  const canvas = canvasRef.value
  if (!canvas) return
  try { gpu = createSunsetGpu(canvas) } catch (error) { console.warn('[Sunset Sky City] Unable to start GPU renderer:', error) }
  context = gpu?.context ?? canvas.getContext('2d', { alpha: false })
  if (!context) { emit('failed'); return }
  if (gpu && gpu.maxTextureSize < 4096) desktopShipAvailable = false
  canvas.dataset.api = gpu ? 'webgl' : '2d'
  canvas.addEventListener('contextlost', handleContextLost)
  canvas.addEventListener('contextrestored', handleContextRestored)
  canvas.addEventListener('webglcontextlost', handleContextLost)
  canvas.addEventListener('webglcontextrestored', handleContextRestored)
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('holybear-loading-overlay-hidden', startEntrance)
  if (!document.body.classList.contains('holy-bear-loading-active') && !document.documentElement.classList.contains('holy-bear-booting')) startEntrance()
  try {
    await Promise.all((Object.keys(sceneFiles) as SceneAsset[]).map(async key => {
      if (key === 'ship') await ensureShip()
      else if (key.startsWith('smoke')) {
        try { images[key] = await loadImage(sceneFiles[key]) } catch { /* Keep the scene usable if one smoke texture fails. */ }
      } else images[key] = await loadImage(sceneFiles[key])
    }))
    if (disposed) return
    scene = createSunsetScene(images)
    assetsReady = true
    resize()
    resume()
  } catch (error) {
    if (!disposed) { console.warn('[Sunset Sky City] Unable to start canvas:', error); emit('failed') }
  }
})

onBeforeUnmount(() => {
  disposed = true
  if (animationFrame) cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('holybear-loading-overlay-hidden', startEntrance)
  canvasRef.value?.removeEventListener('contextlost', handleContextLost)
  canvasRef.value?.removeEventListener('contextrestored', handleContextRestored)
  canvasRef.value?.removeEventListener('webglcontextlost', handleContextLost)
  canvasRef.value?.removeEventListener('webglcontextrestored', handleContextRestored)
  for (const key of Object.keys(images) as SceneAsset[]) images[key].src = ''
  scene?.reset()
  scene = undefined
  gpu?.dispose()
  gpu = undefined
  context = null
})
</script>

<template>
  <canvas ref="canvasRef" class="sunset-sky-city-canvas" :class="{ 'is-ready': ready }" />
</template>

<style scoped>
.sunset-sky-city-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
}

.sunset-sky-city-canvas.is-ready {
  opacity: 1;
}
</style>
