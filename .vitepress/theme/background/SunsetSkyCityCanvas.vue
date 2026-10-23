<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ reducedMotion: boolean; limited: boolean; touchViewport: boolean }>()
const emit = defineEmits<{ 'ready-change': [ready: boolean] }>()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
const assetRoot = '/themes/sunset-sky-city/'
const files = {
  sky: 'header-clouds-sky-pM0k5d8s.webp',
  clouds: 'header-clouds-band-B3wzHRjJ.webp',
  front: 'bg-cloud-front-big-CMhgIfjL.webp',
  glow: 'bg-cloud-front-glint-DJ3yEQl_.webp',
  islands: 'sky-islands-D4wZQwGL.webp',
  islandRim: 'sky-islands-rim-CGOhUdzF.webp',
  birds: 'bird-flap-lzCQ1_H5.webp',
  ship: 'ship-frames.webp'
} as const
type Asset = keyof typeof files
const images = {} as Record<Asset, HTMLImageElement>

// Percentages within the island sprite sheet and its scene bounds.
const islands = [
  { x: .048037492677, y: -.12315270936, w: .044522554189, h: .344827586207, sx: .068669527897, sy: 0, period: 6.5, lift: 20.48, tilt: 3 },
  { x: .888107791447, y: .07881773399, w: .111892208553, h: .862068965517, sx: 1, sy: .571428571429, period: 8, lift: 15.36, tilt: 1.5 },
  { x: .608084358524, y: .192118226601, w: .018160515524, h: .128078817734, sx: .643198090692, sy: .367231638418, period: 4.8, lift: 28.16, tilt: 5 },
  { x: 0, y: .463054187192, w: .052138254247, h: .428571428571, sx: 0, sy: .810344827586, period: 7.2, lift: 23.04, tilt: 2.5 },
  { x: .825424721734, y: .645320197044, w: .026947861746, h: .177339901478, sx: .866345574955, sy: 1, period: 5.6, lift: 25.6, tilt: 4 }
]
const flocks = [
  { y: 192, scale: 1, period: 34, offset: 5 },
  { y: 352, scale: .8, period: 55, offset: 30 },
  { y: 112, scale: .9, period: 33.33, offset: 15.43 },
  { y: 448, scale: .7, period: 68.57, offset: 45 },
  { y: 261.12, scale: .75, period: 53.33, offset: 17.33 }
]

let context: CanvasRenderingContext2D | null = null
let resizeObserver: ResizeObserver | undefined
let animationFrame = 0
let disposed = false
let assetsReady = false
let contextLost = false
let width = 1
let height = 1
let pixelRatio = 1
let elapsed = 0
let previousTick = 0
let previousDraw = 0
let frontLayer: HTMLCanvasElement | null = null
let sunlightLayer: HTMLCanvasElement | null = null
let layerKey = ''
let shipFile = ''
let shipCellWidth = 256
let shipCellHeight = 243
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
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Unable to load sunset asset: ${file}`))
    image.src = assetRoot + file
  })
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas || disposed) return
  const bounds = canvas.getBoundingClientRect()
  width = Math.max(1, bounds.width)
  height = Math.max(1, bounds.height)
  const maxRatio = props.limited || props.reducedMotion ? 1 : props.touchViewport ? 1.25 : 2
  pixelRatio = Math.min(window.devicePixelRatio || 1, maxRatio)
  const backingWidth = Math.round(width * pixelRatio)
  const backingHeight = Math.round(height * pixelRatio)
  if (canvas.width !== backingWidth) canvas.width = backingWidth
  if (canvas.height !== backingHeight) canvas.height = backingHeight
  if (assetsReady && !contextLost) {
    prepareLayers()
    draw()
  }
}

function preferredShipFile() {
  return desktopShipAvailable && !props.touchViewport && !props.limited && !props.reducedMotion
    ? 'ship-frames-desktop.webp' : files.ship
}

function ensureShip() {
  if (shipLoading) return shipLoading
  shipLoading = (async () => {
    while (!disposed && shipFile !== preferredShipFile()) {
      const file = preferredShipFile()
      let image: HTMLImageElement
      try { image = await loadImage(file) }
      catch (error) {
        if (file === files.ship) throw error
        desktopShipAvailable = false
        continue
      }
      if (disposed || file !== preferredShipFile()) { image.src = ''; continue }
      const previousImage = images.ship
      images.ship = image
      shipFile = file
      shipCellWidth = file === files.ship ? 256 : 512
      shipCellHeight = file === files.ship ? 243 : 486
      if (previousImage) previousImage.src = ''
    }
  })().finally(() => { shipLoading = undefined })
  return shipLoading
}

function prepareLayers() {
  const key = `${width}:${height}:${pixelRatio}`
  if (key === layerKey) return
  const sceneWidth = Math.max(width, height * 16 / 9)
  const scale = sceneWidth / 2560
  const left = width / 2 - sceneWidth * (width <= height ? .36 : .5)
  frontLayer ||= document.createElement('canvas')
  frontLayer.width = Math.round(width * pixelRatio)
  frontLayer.height = Math.round(height * pixelRatio)
  const front = frontLayer.getContext('2d')
  if (!front) return
  front.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  front.translate(left, 0)
  front.scale(scale, scale)
  front.drawImage(images.front, 0, 384, 2560, 1696)
  front.globalAlpha = .2
  front.globalCompositeOperation = 'screen'
  front.drawImage(images.glow, 0, 384, 2560, 1696)
  layerKey = key

  if (sunlightLayer) return
  sunlightLayer = document.createElement('canvas')
  sunlightLayer.width = sunlightLayer.height = 512
  const sun = sunlightLayer.getContext('2d')
  if (!sun) return
  sun.translate(256, 256)
  const glow = sun.createRadialGradient(0, 0, 0, 0, 0, 256)
  glow.addColorStop(0, 'rgba(255, 250, 214, .65)')
  glow.addColorStop(.25, 'rgba(255, 231, 179, .25)')
  glow.addColorStop(1, 'rgba(255, 231, 179, 0)')
  sun.fillStyle = glow
  sun.fillRect(-256, -256, 512, 512)
  for (const angle of [27, 70, 118, 131, 174, 222, 268, 312, 350]) {
    sun.save()
    sun.rotate(angle * Math.PI / 180)
    const ray = sun.createLinearGradient(0, 0, 0, -256)
    ray.addColorStop(0, 'rgba(255, 249, 221, .65)')
    ray.addColorStop(1, 'rgba(255, 249, 221, 0)')
    sun.fillStyle = ray
    sun.beginPath()
    sun.moveTo(0, 0)
    sun.lineTo(-1.5, -256)
    sun.lineTo(1.5, -256)
    sun.fill()
    sun.restore()
  }
}

function drawTiled(ctx: CanvasRenderingContext2D, image: HTMLImageElement, y: number, imageHeight: number, time: number, visibleLeft: number, visibleRight: number) {
  const tileWidth = image.naturalWidth * imageHeight / image.naturalHeight
  const phase = (time * 75.777) % tileWidth
  const firstTile = Math.floor((visibleLeft + phase) / tileWidth)
  for (let x = firstTile * tileWidth - phase; x < visibleRight; x += tileWidth) {
    ctx.drawImage(image, x, y, tileWidth, imageHeight)
  }
}

function drawIsland(ctx: CanvasRenderingContext2D, index: number, time: number, motion: number) {
  const island = islands[index]
  const image = images.islands
  const sourceWidth = image.naturalWidth * island.w
  const sourceHeight = image.naturalHeight * island.h
  const sourceX = (image.naturalWidth - sourceWidth) * island.sx
  const sourceY = (image.naturalHeight - sourceHeight) * island.sy
  const w = 1707 * island.w
  const h = 203 * island.h
  const phase = time / island.period * Math.PI * 2
  ctx.save()
  ctx.translate(418 + 1707 * island.x + w / 2, 596 + 203 * island.y + h / 2 - (1 - Math.cos(phase)) * island.lift * motion / 2)
  ctx.rotate(Math.sin(phase) * island.tilt * motion * Math.PI / 180)
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, -w / 2, -h / 2, w, h)
  ctx.globalAlpha = .25
  ctx.globalCompositeOperation = 'screen'
  ctx.drawImage(images.islandRim, sourceX, sourceY, sourceWidth, sourceHeight, -w / 2, -h / 2, w, h)
  ctx.restore()
}

function drawBirds(ctx: CanvasRenderingContext2D, time: number, motion: number) {
  for (const [groupIndex, flock] of flocks.entries()) {
    const x = 2764.8 - (((time + flock.offset) / flock.period) % 1) * 3788.8
    for (let bird = 0; bird < 3; bird++) {
      const frame = props.reducedMotion ? 0 : Math.floor(time * 8 + bird * 3 + groupIndex) % 16
      const scale = flock.scale * (bird === 2 ? .72 : 1)
      const bob = Math.sin(time * 2.4 + bird) * 7 * motion
      ctx.drawImage(images.birds, frame * 140, 0, 140, 60,
        x + [0, 83.2, 156.8][bird] * flock.scale,
        flock.y + [0, 35.2, -22.4][bird] * flock.scale + bob,
        57.806 * scale, 24.774 * scale)
    }
  }
}

function draw() {
  const ctx = context
  if (!ctx || !assetsReady || contextLost || disposed) return
  const sceneWidth = Math.max(width, height * 16 / 9)
  const scale = sceneWidth / 2560
  const left = width / 2 - sceneWidth * (width <= height ? .36 : .5)
  const visibleLeft = -left / scale
  const visibleRight = (width - left) / scale
  const motion = props.reducedMotion ? .15 : 1
  const time = elapsed / 1000 * motion

  // One opaque, bounded bitmap is composited beneath the page's glass surfaces.
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  ctx.fillStyle = '#8c6e9e'
  ctx.fillRect(0, 0, width, height)
  ctx.translate(left, 0)
  ctx.scale(scale, scale)
  drawTiled(ctx, images.sky, -1, 896, time, visibleLeft, visibleRight)

  ctx.fillStyle = 'rgba(246, 244, 255, .65)'
  for (let star = 0; star < 24; star++) {
    const x = (star * 397.31 + 83) % 2560
    const y = (star * 89.7 + 27) % 220
    ctx.fillRect(x, y, star % 4 ? 1.5 : 3, star % 4 ? 1.5 : 3)
  }
  if (sunlightLayer) {
    ctx.save()
    ctx.translate(1732, 553)
    ctx.rotate(time / 70 * Math.PI * 2)
    ctx.drawImage(sunlightLayer, -380, -380, 760, 760)
    ctx.restore()
  }
  drawBirds(ctx, time, motion)
  drawIsland(ctx, 2, time, motion)
  drawIsland(ctx, 4, time, motion)
  drawTiled(ctx, images.clouds, 528.64, 399.36, time, visibleLeft, visibleRight)
  for (const index of [0, 1, 3]) drawIsland(ctx, index, time, motion)
  if (frontLayer) {
    ctx.save()
    ctx.resetTransform()
    ctx.drawImage(frontLayer, 0, 0)
    ctx.restore()
  }

  const frame = props.reducedMotion ? 0 : Math.floor((elapsed % 1970) / 1970 * 58)
  ctx.save()
  ctx.translate(915.2 - Math.sin(time / 7 * Math.PI * 2) * 3 * motion, 495.68 - Math.sin(time / 7 * Math.PI * 2) * 8 * motion)
  ctx.rotate(Math.sin(time / 9 * Math.PI * 2) * .025 * motion)
  const breathe = 1 + (1 - Math.cos(time / 8 * Math.PI * 2)) * .025 * motion
  ctx.scale(breathe, breathe)
  ctx.drawImage(images.ship, (frame % 8) * shipCellWidth, Math.floor(frame / 8) * shipCellHeight, shipCellWidth, shipCellHeight, -198.4, -188.48, 396.8, 376.96)
  ctx.restore()
  setReady(true)
}

function render(time: number) {
  animationFrame = 0
  if (disposed || contextLost || document.hidden || !assetsReady) return
  if (previousTick) elapsed += Math.min(time - previousTick, 100)
  previousTick = time
  const interval = 1000 / (props.reducedMotion ? 15 : props.touchViewport || props.limited ? 30 : 60)
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

function handleContextLost(event: Event) {
  event.preventDefault()
  contextLost = true
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = 0
  setReady(false)
}

function handleContextRestored() {
  contextLost = false
  layerKey = ''
  resize()
  resume()
}

watch(() => [props.limited, props.reducedMotion, props.touchViewport], () => {
  resize()
  if (assetsReady) void ensureShip().catch(error => console.warn('[Sunset Sky City] Unable to change ship quality:', error))
})

onMounted(async () => {
  const canvas = canvasRef.value
  if (!canvas) return
  context = canvas.getContext('2d', { alpha: false })
  if (!context) return
  canvas.addEventListener('contextlost', handleContextLost)
  canvas.addEventListener('contextrestored', handleContextRestored)
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  try {
    await Promise.all((Object.keys(files) as Asset[]).map(async key => {
      if (key === 'ship') await ensureShip()
      else images[key] = await loadImage(files[key])
    }))
    if (disposed) return
    assetsReady = true
    resize()
    resume()
  } catch (error) {
    console.warn('[Sunset Sky City] Unable to start canvas:', error)
  }
})

onBeforeUnmount(() => {
  disposed = true
  if (animationFrame) cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  canvasRef.value?.removeEventListener('contextlost', handleContextLost)
  canvasRef.value?.removeEventListener('contextrestored', handleContextRestored)
  for (const key of Object.keys(images) as Asset[]) images[key].src = ''
  if (frontLayer) frontLayer.width = frontLayer.height = 1
  if (sunlightLayer) sunlightLayer.width = sunlightLayer.height = 1
  frontLayer = sunlightLayer = null
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
