<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

interface Point {
  x: number
  y: number
}

interface AssetSize {
  width: number
  height: number
}

interface SunFrontLayer {
  index: number
  no: number
  x: number
  y: number
  rx: number
  ry: number
  cx: number
  cy: number
  type: number
  front: number
  flip: boolean
  a: number
  frameAlpha: number
  asset: string
  size: AssetSize
  origin: Point
}

interface BackLayer {
  index: number
  x: number
  y: number
  rx: number
  ry: number
  cx: number
  cy: number
  type: number
  front: number
  f: number
  flip: boolean
  a: number
  alpha: number
  ani: number
  asset: string
  size: AssetSize
  origin: Point
}

interface ObjectFrame {
  asset: string
  width: number
  height: number
  origin: Point
  delay: number
}

interface MapObject {
  index: number
  x: number
  y: number
  z: number
  zM: number
  f: number
  flip: boolean
  asset: string
  origin: Point
  frames?: ObjectFrame[]
}

interface Camera {
  scale: number
  left: number
  top: number
  right: number
}

interface FaithfulBackCamera {
  centerX: number
  centerY: number
  left: number
  top: number
  right: number
  bottom: number
}

interface ObjectLayer {
  layer: number
  objects: MapObject[]
}

interface MapManifest {
  vr: {
    left: number
    right: number
    top: number
    bottom: number
    width: number
    height: number
  }
  back: BackLayer[]
  objects: {
    layers: ObjectLayer[]
  }
  shipObj: {
    x: number
    y: number
    f: number
    flip: boolean
    asset: string
    size: AssetSize
    origin: Point
  }
}

interface NightSkyLayer {
  x: number
  y: number
  rx: number
  ry: number
  cx: number
  cy: number
  type: number
  alpha: number
  flip: boolean
  origin: Point
  size: AssetSize
  asset: string
}

interface NightSkyAnimationFrame {
  asset: string
  width: number
  height: number
  origin: Point
  delay: number
}


const canvasRef = ref<HTMLCanvasElement | null>(null)
const hostRef = ref<HTMLElement | null>(null)
const { isDark } = useData()

const MANIFEST_URL = '/themes/upon-the-sky/map-200090010.json'
// MapRender-faithful Front layers from map 260000200's desert sun group.
// These are the original Back nodes 13..19 (desert/back/22..28), exported
// without changing their PNG pixels. The website keeps one presentation
// anchor for layer 13, then applies each layer's original WZ world position
// relative to that anchor. No t interpolation, per-layer offset, scale or
// alpha is introduced here.
const SUN_FRONT_LAYERS: SunFrontLayer[] = [
  {
    index: 13, no: 22, x: -207, y: -292, rx: -5, ry: -5, cx: 0, cy: 0,
    type: 0, front: 1, flip: false, a: 255, frameAlpha: 255,
    asset: '/themes/upon-the-sky/sun/desert-sun-22.png',
    size: { width: 622, height: 622 }, origin: { x: 311, y: 311 },
  },
  {
    index: 14, no: 23, x: -81, y: -154, rx: -10, ry: -8, cx: 0, cy: 0,
    type: 0, front: 1, flip: false, a: 255, frameAlpha: 255,
    asset: '/themes/upon-the-sky/sun/desert-sun-23.png',
    size: { width: 137, height: 137 }, origin: { x: 68, y: 68 },
  },
  {
    index: 15, no: 24, x: 22, y: -110, rx: -15, ry: -11, cx: 0, cy: 0,
    type: 0, front: 1, flip: true, a: 255, frameAlpha: 255,
    asset: '/themes/upon-the-sky/sun/desert-sun-24.png',
    size: { width: 260, height: 200 }, origin: { x: 130, y: 100 },
  },
  {
    index: 16, no: 25, x: 87, y: -30, rx: -20, ry: -14, cx: 0, cy: 0,
    type: 0, front: 1, flip: false, a: 255, frameAlpha: 255,
    asset: '/themes/upon-the-sky/sun/desert-sun-25.png',
    size: { width: 221, height: 222 }, origin: { x: 110, y: 111 },
  },
  {
    index: 17, no: 26, x: 201, y: 28, rx: -25, ry: -17, cx: 0, cy: 0,
    type: 0, front: 1, flip: false, a: 255, frameAlpha: 255,
    asset: '/themes/upon-the-sky/sun/desert-sun-26.png',
    size: { width: 97, height: 97 }, origin: { x: 48, y: 48 },
  },
  {
    index: 18, no: 27, x: 301, y: 87, rx: -30, ry: -20, cx: 0, cy: 0,
    type: 0, front: 1, flip: false, a: 255, frameAlpha: 255,
    asset: '/themes/upon-the-sky/sun/desert-sun-27.png',
    size: { width: 312, height: 312 }, origin: { x: 156, y: 109 },
  },
  {
    index: 19, no: 28, x: 336, y: 63, rx: -35, ry: -23, cx: 0, cy: 0,
    type: 0, front: 1, flip: true, a: 255, frameAlpha: 255,
    asset: '/themes/upon-the-sky/sun/desert-sun-28.png',
    size: { width: 661, height: 426 }, origin: { x: 330, y: 213 },
  },
]
const ORDERED_SUN_FRONT_LAYERS = SUN_FRONT_LAYERS
  .filter((layer) => layer.front === 1)
  .slice()
  .sort((a, b) => a.index - b.index)
const FALLBACK_COLOR = '#3366CC'
const DESKTOP_MAX_DPR = 2
const MOBILE_MAX_DPR = 1.25
const MOBILE_FRAME_INTERVAL_MS = 1000 / 30
const REDUCED_MOTION_FRAME_INTERVAL_MS = 1000 / 15
const BACKGROUND_PRELOAD_DELAY_MS = 12000
const GRASSY_SOIL_CLOUD_ASSET = '/themes/upon-the-sky/back/grassySoil-1.png'
const GRASSY_SOIL_NIGHT_ASSET = '/themes/upon-the-sky/back/grassySoil-1-night.png'

// Dark-mode PoC assets from Map 326090010 (nightDesert). These are kept
// separate from the daytime manifest so light mode continues to execute the
// existing 200090010 renderer unchanged. Positions, origins and tile rules
// mirror the audited WZ Back 0/4/5 nodes.
const NIGHT_SKY_VR = {
  left: -1126,
  right: 970,
  top: -974,
  bottom: 562,
  width: 2096,
  height: 1536,
}
const NIGHT_SKY_BASE: NightSkyLayer = {
  x: 0, y: 0, rx: -2, ry: 0, cx: 0, cy: 0, type: 3,
  alpha: 255, flip: false, origin: { x: 25, y: 25 },
  size: { width: 50, height: 50 },
  asset: '/themes/upon-the-sky/night/back-0.png',
}
const NIGHT_SKY_GRADIENT_1: NightSkyLayer = {
  x: 187, y: -301, rx: -10, ry: -10, cx: 0, cy: 0, type: 1,
  alpha: 255, flip: false, origin: { x: 25, y: 220 },
  size: { width: 50, height: 440 },
  asset: '/themes/upon-the-sky/night/back-1.png',
}
const NIGHT_SKY_GRADIENT_2: NightSkyLayer = {
  x: -87, y: -228, rx: -10, ry: -10, cx: 0, cy: 0, type: 1,
  alpha: 255, flip: false, origin: { x: 25, y: 220 },
  size: { width: 50, height: 440 },
  asset: '/themes/upon-the-sky/night/back-1.png',
}
const NIGHT_SKY_DARK_BAND: NightSkyLayer = {
  x: 469, y: -473, rx: -10, ry: -10, cx: 0, cy: 0, type: 1,
  alpha: 255, flip: false, origin: { x: 25, y: 25 },
  size: { width: 50, height: 50 },
  asset: '/themes/upon-the-sky/night/back-2.png',
}
const NIGHT_SKY_BACK_LAYERS = [
  NIGHT_SKY_BASE,
  NIGHT_SKY_GRADIENT_1,
  NIGHT_SKY_GRADIENT_2,
  NIGHT_SKY_DARK_BAND,
]
const NIGHT_SKY_STARS: NightSkyLayer = {
  x: -105, y: -191, rx: 0, ry: -10, cx: 0, cy: 0, type: 1,
  alpha: 255, flip: false, origin: { x: 183, y: 160 },
  size: { width: 384, height: 312 },
  asset: '/themes/upon-the-sky/night/stars-0.png',
}
const NIGHT_SKY_MOON: NightSkyLayer = {
  x: 345, y: -380, rx: -5, ry: -20, cx: 0, cy: 0, type: 0,
  alpha: 255, flip: false, origin: { x: 156, y: 156 },
  size: { width: 312, height: 312 },
  asset: '/themes/upon-the-sky/night/moon.png',
}
const NIGHT_STAR_FRAMES: NightSkyAnimationFrame[] = [
  { asset: '/themes/upon-the-sky/night/stars-0.png', width: 381, height: 312, origin: { x: 183, y: 160 }, delay: 200 },
  { asset: '/themes/upon-the-sky/night/stars-1.png', width: 384, height: 312, origin: { x: 183, y: 160 }, delay: 200 },
  { asset: '/themes/upon-the-sky/night/stars-2.png', width: 384, height: 312, origin: { x: 183, y: 160 }, delay: 200 },
  { asset: '/themes/upon-the-sky/night/stars-3.png', width: 384, height: 287, origin: { x: 183, y: 160 }, delay: 200 },
  { asset: '/themes/upon-the-sky/night/stars-4.png', width: 365, height: 310, origin: { x: 164, y: 158 }, delay: 200 },
  { asset: '/themes/upon-the-sky/night/stars-5.png', width: 383, height: 296, origin: { x: 182, y: 144 }, delay: 200 },
  { asset: '/themes/upon-the-sky/night/stars-6.png', width: 384, height: 310, origin: { x: 183, y: 158 }, delay: 200 },
  { asset: '/themes/upon-the-sky/night/stars-7.png', width: 386, height: 311, origin: { x: 185, y: 159 }, delay: 200 },
]
const NIGHT_STAR_BANDS: Point[] = [
  { x: -143, y: -250 },
  { x: 0, y: 0 },
  { x: 173, y: 250 },
]
const NIGHT_SKY_ASSETS = [
  ...NIGHT_SKY_BACK_LAYERS.map((layer) => layer.asset),
  NIGHT_SKY_MOON.asset,
  ...NIGHT_STAR_FRAMES.map((frame) => frame.asset),
]
const DAY_SKY_BASE_LAYER_INDICES = new Set([0])


// Website composition only: these Back layers form the continuous cloud-sea
// band in the audited MapRender scene. Their WZ coordinates, tiling and
// parallax remain untouched; the shared offset is applied after world-to-
// screen conversion so the group keeps its original internal geometry.
const CLOUD_SEA_LAYER_INDICES = new Set([1, 2, 3, 4, 5, 6])
const CLOUD_SEA_TRANSLATION_RATIO = 0.24
// A small, responsive website-only nudge keeps the complete scene aligned to
// the bottom edge in browsers whose visual viewport is a few pixels taller
// than the layout viewport. It applies uniformly to every theme object and
// does not alter any WZ/world coordinate.
const GLOBAL_THEME_TRANSLATION_RATIO = 0.03

// MapRender's BackItem renderer uses `rx * 5 * time / 1000` for a
// horizontally scrolling layer. This is the original WZ rule; there is no
// website multiplier in the faithful renderer below.
const MAPRENDER_SCROLL_UNITS_PER_SECOND = 5
const SHIP_BOB_PERIOD_MS = 11000
const SHIP_BOB_AMPLITUDE_PX = 4
const SHIP_SWAY_AMPLITUDE_PX = 1.5
// Website-only rigid transform for the WZ flare constellation. The group is
// aimed at a point between the Sun and Ossyria group centre (never at the
// ship itself), preserving the source spacing while keeping the giant rings
// visible without letting them dominate the page.
const SUN_FLARE_GROUP_SCALE = 0.88
// Mobile preview scale is applied once to the complete sun/flare group around
// the existing Sun anchor. Desktop remains on SUN_FLARE_GROUP_SCALE.
const MOBILE_SUN_FLARE_GROUP_SCALE = 0.90
const SUN_FLARE_VISUAL_TARGET_RATIO = 0.68
const SUN_FLARE_LONGITUDINAL_COVERAGE = 0.88

let manifest: MapManifest | null = null
let context: CanvasRenderingContext2D | null = null
let resizeObserver: ResizeObserver | null = null
let animationFrame = 0
let startedAt = 0
let disposed = false
let isPaused = false
let viewportWidth = 0
let viewportHeight = 0
let pixelRatio = 1
let prefersReducedMotion = false
let renderDarkMode = false
type SkyMode = 'light' | 'dark'
let requestedSkyMode: SkyMode = 'light'
let motionMediaQuery: MediaQueryList | null = null
let handleMotionPreference: ((event: MediaQueryListEvent) => void) | null = null
let hasLoggedNightCoverage = false
const images = new Map<string, HTMLImageElement>()
const imagePromises = new Map<string, Promise<HTMLImageElement>>()
const nightPatterns = new Map<string, CanvasPattern>()
const staticSceneAssets = new Set<string>(NIGHT_SKY_BACK_LAYERS.map((layer) => layer.asset))
const nightStaticSceneAssets = new Set<string>(NIGHT_SKY_BACK_LAYERS.map((layer) => layer.asset))
const nightDynamicAssets = new Set<string>([
  NIGHT_SKY_MOON.asset,
  ...NIGHT_STAR_FRAMES.map((frame) => frame.asset),
])
const modeAssetPromises = new Map<SkyMode, Promise<void>>()
let staticSceneCanvas: HTMLCanvasElement | null = null
let staticSceneContext: CanvasRenderingContext2D | null = null
let staticSceneMode: SkyMode | null = null
let staticSceneWidth = 0
let staticSceneHeight = 0
let staticScenePixelRatio = 0
let staticSceneDirty = true
let nightDynamicCanvas: HTMLCanvasElement | null = null
let nightDynamicContext: CanvasRenderingContext2D | null = null
let nightDynamicMode: SkyMode | null = null
let nightDynamicFrameIndex = -1
let nightDynamicWidth = 0
let nightDynamicHeight = 0
let nightDynamicPixelRatio = 0
let nightDynamicDirty = true
let backgroundPreloadHandle: number | undefined
let lastRenderedAt = 0
let renderStarted = false
let orderedBackLayers: { back: BackLayer[]; front: BackLayer[] } = { back: [], front: [] }
let orderedObjects: MapObject[] = []

const isMobileOrTabletViewport = () => window.matchMedia(
  '(max-width: 1024px), (hover: none) and (pointer: coarse)'
).matches

const getImage = (url: string) => images.get(url) ?? null

const getWebsiteSunAnchor = (): Point => {
  const baseLayer = SUN_FRONT_LAYERS[0]
  const mobileViewport = viewportWidth <= 767
  const rightMargin = Math.max(18, viewportWidth * 0.035)
  return {
    x: mobileViewport
      ? viewportWidth * 0.94
      : viewportWidth - rightMargin - baseLayer.size.width / 2,
    y: mobileViewport
      ? viewportHeight * 0.16
      : Math.max(baseLayer.size.height * 0.52, viewportHeight * 0.18),
  }
}

const loadImage = (url: string): Promise<HTMLImageElement> => {
  const cached = images.get(url)
  if (cached) return Promise.resolve(cached)

  const pending = imagePromises.get(url)
  if (pending) return pending

  const promise = (async () => {
    const image = new Image()
    image.decoding = 'async'
    image.src = url

    try {
      if (typeof image.decode === 'function') {
        await image.decode()
      } else {
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve()
          image.onerror = () => reject(new Error(`Unable to load ${url}`))
        })
      }
    } catch (error) {
      // Some browsers reject decode() after a successful load; the image is
      // still usable in that case, so only fail when it has no dimensions.
      if (!image.complete || image.naturalWidth === 0) throw error
    }

    images.set(url, image)
    // Only invalidate the cache that is currently visible. Deferred assets
    // from the opposite mode may finish decoding during a toggle; allowing
    // those completions to dirty the active scene would force needless full
    // viewport rebuilds and recreate the dark -> light hitch.
    if (staticSceneAssets.has(url)
      && ((renderDarkMode && nightStaticSceneAssets.has(url))
        || (!renderDarkMode && !nightStaticSceneAssets.has(url)))) {
      staticSceneDirty = true
    }
    if (renderDarkMode && nightDynamicAssets.has(url)) nightDynamicDirty = true
    if (renderStarted) requestRender()
    return image
  })()

  imagePromises.set(url, promise)
  void promise.then(
    () => {
      if (imagePromises.get(url) === promise) imagePromises.delete(url)
    },
    () => {
      if (imagePromises.get(url) === promise) imagePromises.delete(url)
    },
  )
  return promise
}

const getModeAssetUrls = (mode: SkyMode) => {
  const urls = new Set(mode === 'dark'
    ? [...NIGHT_SKY_ASSETS, GRASSY_SOIL_NIGHT_ASSET]
    : SUN_FRONT_LAYERS.map(({ asset }) => asset))

  // The daytime base is omitted from the dark critical path, but is fetched
  // on demand if the visitor later returns to light mode.
  if (mode === 'light' && manifest) {
    for (const layer of manifest.back) {
      if (DAY_SKY_BASE_LAYER_INDICES.has(layer.index)) urls.add(layer.asset)
    }
  }
  return [...urls]
}

const collectCriticalAssetUrls = (data: MapManifest, mode: SkyMode) => {
  const urls = new Set<string>()
  for (const layer of data.back) {
    if (mode === 'dark' && DAY_SKY_BASE_LAYER_INDICES.has(layer.index)) continue
    urls.add(layer.asset)
  }
  for (const layer of data.objects.layers) {
    for (const object of layer.objects) {
      urls.add(object.asset)
      for (const frame of object.frames ?? []) urls.add(frame.asset)
    }
  }
  for (const url of getModeAssetUrls(mode)) urls.add(url)
  return [...urls]
}

/**
 * First-paint asset tier. It contains only the layer(s) needed to establish a
 * recognizable scene; the remaining objects, flare frames and alternate
 * star frames are scheduled after the first Canvas frame is visible.
 */
const collectInitialAssetUrls = (data: MapManifest, mode: SkyMode) => {
  const urls = new Set<string>()
  if (mode === 'dark') {
    for (const layer of NIGHT_SKY_BACK_LAYERS) urls.add(layer.asset)
    const firstStarFrame = NIGHT_STAR_FRAMES[0]
    if (firstStarFrame) urls.add(firstStarFrame.asset)
    // The moon is part of the minimum dark-mode identity; loading it with the
    // first star frame avoids a visibly incomplete night scene on cold load.
    urls.add(NIGHT_SKY_MOON.asset)
    urls.add(GRASSY_SOIL_NIGHT_ASSET)
  } else {
    for (const layer of data.back) {
      if (layer.index === 0 || layer.index === 1) urls.add(layer.asset)
    }
    const firstSunLayer = SUN_FRONT_LAYERS[0]
    if (firstSunLayer) urls.add(firstSunLayer.asset)
  }
  return [...urls]
}

const preloadImageSet = async (urls: string[], label: string, concurrency = 2) => {
  const uniqueUrls = [...new Set(urls)]
  if (!uniqueUrls.length) return

  let nextIndex = 0
  let failed = 0
  const worker = async () => {
    while (nextIndex < uniqueUrls.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      const url = uniqueUrls[currentIndex]
      try {
        await loadImage(url)
      } catch {
        failed += 1
      }
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), uniqueUrls.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  if (failed) {
    console.warn(`[Upon the Sky] ${label} assets unavailable: ${failed}`)
  }
}

const scheduleProgressivePreload = (urls: string[], label: string) => {
  const uniqueUrls = [...new Set(urls)]
  if (!uniqueUrls.length) return

  // Keep each idle turn small. A single long Promise chain would still decode
  // every deferred bitmap back-to-back and can recreate the same thermal spike
  // that the first-paint split is intended to avoid on phones.
  let nextIndex = 0
  const scheduleNextBatch = () => {
    if (disposed || nextIndex >= uniqueUrls.length) return

    const run = () => {
      if (disposed) return
      const batch = uniqueUrls.slice(nextIndex, nextIndex + 2)
      nextIndex += batch.length
      void preloadImageSet(batch, label, 2).then(scheduleNextBatch)
    }

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 1200 })
    } else {
      window.setTimeout(run, 120)
    }
  }

  scheduleNextBatch()
}

const requestRender = () => {
  if (!disposed && !isPaused && !animationFrame) {
    animationFrame = window.requestAnimationFrame(render)
  }
}

const releaseNightRenderCaches = () => {
  // The night bitmap is a viewport-sized surface. Drop it when leaving dark
  // mode so a dark -> light toggle does not keep an extra GPU texture alive
  // while the daytime scene is being composited. It is recreated lazily if
  // the visitor returns to dark mode; no source image or WZ data is changed.
  nightDynamicCanvas = null
  nightDynamicContext = null
  nightDynamicMode = null
  nightDynamicFrameIndex = -1
  nightDynamicWidth = 0
  nightDynamicHeight = 0
  nightDynamicPixelRatio = 0
  nightDynamicDirty = true
  nightPatterns.clear()
}

const applyRequestedSkyMode = (mode: SkyMode) => {
  if (disposed || requestedSkyMode !== mode) return
  if (renderDarkMode && mode === 'light') releaseNightRenderCaches()
  renderDarkMode = mode === 'dark'
  requestRender()
}

const preloadModeAssets = (mode: SkyMode) => {
  let promise = modeAssetPromises.get(mode)
  if (!promise) {
    const initialUrls = manifest
      ? collectInitialAssetUrls(manifest, mode)
      : getModeAssetUrls(mode)
    const deferredUrls = getModeAssetUrls(mode)
      .filter((url) => !initialUrls.includes(url))
    promise = preloadImageSet(initialUrls, `${mode} transition`, 2)
      .then(() => {
        // Switch as soon as the mode's visual foundation is ready. Remaining
        // flare/star frames are deliberately scheduled in small idle batches,
        // so a theme toggle never waits for every bitmap or starts a decode
        // burst on the same turn as the mode change.
        applyRequestedSkyMode(mode)
        scheduleProgressivePreload(deferredUrls, `${mode} deferred mode`)
      })
    modeAssetPromises.set(mode, promise)
  }

  // Loading and activating are separate operations. A mode can already be in
  // the asset cache after the initial render or background preload, but every
  // appearance change still needs to update the Canvas renderer.
  return promise.then(() => applyRequestedSkyMode(mode))
}

const scheduleBackgroundPreload = (mode: SkyMode) => {
  // On phones, keep the opposite appearance on-demand. Decoding all of its
  // bitmaps in the background can still contend with Canvas and add heat or
  // long tasks after the first paint; a later mode switch loads it gracefully.
  if (isMobileOrTabletViewport()) return

  if (backgroundPreloadHandle !== undefined) {
    window.clearTimeout(backgroundPreloadHandle)
    backgroundPreloadHandle = undefined
  }

  // Give the active scene and first interaction a quiet window. The opposite
  // mode remains on-demand during that window, then loads in the background
  // without competing with the initial Canvas decode or first paint.
  backgroundPreloadHandle = window.setTimeout(() => {
    backgroundPreloadHandle = undefined
    void preloadModeAssets(mode)
  }, BACKGROUND_PRELOAD_DELAY_MS)
}

const resizeCanvas = () => {
  const canvas = canvasRef.value
  const host = hostRef.value
  if (!canvas || !host) return

  const rect = host.getBoundingClientRect()
  const previousViewportWidth = viewportWidth
  const previousViewportHeight = viewportHeight
  const previousPixelRatio = pixelRatio
  viewportWidth = Math.max(1, rect.width)
  viewportHeight = Math.max(1, rect.height)
  const maxDpr = isMobileOrTabletViewport() ? MOBILE_MAX_DPR : DESKTOP_MAX_DPR
  pixelRatio = Math.min(window.devicePixelRatio || 1, maxDpr)

  const width = Math.max(1, Math.round(viewportWidth * pixelRatio))
  const height = Math.max(1, Math.round(viewportHeight * pixelRatio))
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  if (previousViewportWidth !== viewportWidth
    || previousViewportHeight !== viewportHeight
    || previousPixelRatio !== pixelRatio
    || staticSceneWidth !== viewportWidth
    || staticSceneHeight !== viewportHeight
    || staticScenePixelRatio !== pixelRatio) {
    staticSceneDirty = true
    nightDynamicDirty = true
    nightPatterns.clear()
  }
}

const drawImageAtWorld = (
  image: HTMLImageElement,
  worldX: number,
  worldY: number,
  origin: Point,
  scale: number,
  cameraLeft: number,
  cameraTop: number,
  flip: boolean,
  alpha: number,
  screenOffsetY = 0,
  screenOffsetX = 0
) => {
  if (!context) return

  const screenX = (worldX - cameraLeft) * scale + screenOffsetX
  const screenY = (worldY - cameraTop) * scale + screenOffsetY
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  const drawX = screenX - origin.x * scale
  const drawY = screenY - origin.y * scale

  // Skip copies that cannot touch the viewport. This keeps horizontal repeat
  // cheap on wide displays while retaining the original PNG dimensions.
  if (drawX > viewportWidth || drawX + drawWidth < 0 || drawY > viewportHeight || drawY + drawHeight < 0) return

  context.save()
  context.globalAlpha = alpha
  if (flip) {
    context.translate(screenX, 0)
    context.scale(-1, 1)
    context.drawImage(image, -(image.naturalWidth - origin.x) * scale, drawY, drawWidth, drawHeight)
  } else {
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
  }
  context.restore()
}

const getFaithfulBackCamera = (): FaithfulBackCamera => {
  if (!manifest) {
    return {
      centerX: 0,
      centerY: 0,
      left: 0,
      top: 0,
      right: viewportWidth,
      bottom: viewportHeight,
    }
  }

  // MapRender starts a scene at camera center (0, 0), then clamps that center
  // to VR when the viewport is smaller than the world. It does not zoom the
  // Back sprites; the SpriteBatch camera is a translation-only transform.
  const { left: worldLeft, right: worldRight, top: worldTop, bottom: worldBottom } = manifest.vr
  const centerX = viewportWidth > manifest.vr.width
    ? (worldLeft + worldRight) / 2
    : Math.min(worldRight - viewportWidth / 2, Math.max(worldLeft + viewportWidth / 2, 0))
  const centerY = viewportHeight > manifest.vr.height
    ? (worldTop + worldBottom) / 2
    : Math.min(worldBottom - viewportHeight / 2, Math.max(worldTop + viewportHeight / 2, 0))

  return {
    centerX,
    centerY,
    left: centerX - viewportWidth / 2,
    top: centerY - viewportHeight / 2,
    right: centerX + viewportWidth / 2,
    bottom: centerY + viewportHeight / 2,
  }
}

const isHorizontalTile = (type: number) => [1, 3, 4, 6, 7].includes(type)
const isVerticalTile = (type: number) => [2, 3, 5, 6, 7].includes(type)
const isHorizontalScroll = (type: number) => [4, 6].includes(type)
const isVerticalScroll = (type: number) => [5, 7].includes(type)

const getCloudSeaTranslationY = () => Math.round(viewportHeight * CLOUD_SEA_TRANSLATION_RATIO)
const getGlobalThemeTranslationY = () => Math.round(viewportHeight * GLOBAL_THEME_TRANSLATION_RATIO)

const getNightSkyCamera = (): FaithfulBackCamera => {
  const centerX = viewportWidth > NIGHT_SKY_VR.width
    ? (NIGHT_SKY_VR.left + NIGHT_SKY_VR.right) / 2
    : Math.min(
      NIGHT_SKY_VR.right - viewportWidth / 2,
      Math.max(NIGHT_SKY_VR.left + viewportWidth / 2, 0)
    )
  const centerY = viewportHeight > NIGHT_SKY_VR.height
    ? (NIGHT_SKY_VR.top + NIGHT_SKY_VR.bottom) / 2
    : Math.min(
      NIGHT_SKY_VR.bottom - viewportHeight / 2,
      Math.max(NIGHT_SKY_VR.top + viewportHeight / 2, 0)
    )

  return {
    centerX,
    centerY,
    left: centerX - viewportWidth / 2,
    top: centerY - viewportHeight / 2,
    right: centerX + viewportWidth / 2,
    bottom: centerY + viewportHeight / 2,
  }
}

/**
 * Back 1 is a 50x440 horizontal-only gradient. On viewports taller than the
 * source map's usual camera window, the VR-clamped camera can place its first
 * visible row below screen y=0, leaving Back 0's lighter base exposed as a
 * perfectly straight strip. Keep every WZ coordinate/parallax value intact
 * and shift only the background camera window enough for Back 1 to meet y=0.
 * Back 4/5 retain their already accepted camera and responsive anchor.
 */
const getNightSkyBackCamera = (): FaithfulBackCamera => {
  const camera = getNightSkyCamera()
  const layer = NIGHT_SKY_GRADIENT_1
  const parallaxY = (100 + layer.ry) / 100
  const currentWorldY = Math.floor(layer.y + camera.centerY * parallaxY)
  const currentTop = currentWorldY - camera.top - layer.origin.y
  if (currentTop <= 0) return camera

  const cameraInfluence = 1 - parallaxY
  if (cameraInfluence <= 0) return camera
  const centerY = (viewportHeight / 2 + layer.y - layer.origin.y) / cameraInfluence
  return {
    centerX: camera.centerX,
    centerY,
    left: camera.left,
    top: centerY - viewportHeight / 2,
    right: camera.right,
    bottom: centerY + viewportHeight / 2,
  }
}

const logNightCoverageDiagnostics = (camera: FaithfulBackCamera) => {
  if (hasLoggedNightCoverage) return
  const canvas = canvasRef.value
  const parent = hostRef.value
  if (!canvas || !parent) return

  const layer = NIGHT_SKY_BASE
  const tileHeight = layer.cy > 0 ? layer.cy : layer.size.height
  const worldY = Math.floor(layer.y + camera.centerY * (100 + layer.ry) / 100)
  const tileStartY = Math.floor((camera.top - worldY) / tileHeight) - 1
  const tileEndY = Math.ceil((camera.bottom - worldY) / tileHeight) + 1
  const firstTileY = worldY + tileStartY * tileHeight - camera.top - layer.origin.y
  const lastTileY = worldY + (tileEndY - 1) * tileHeight - camera.top - layer.origin.y
  const canvasRect = canvas.getBoundingClientRect()
  const parentRect = parent.getBoundingClientRect()
  const canvasStyle = getComputedStyle(canvas)
  const parentStyle = getComputedStyle(parent)

  const diagnostics = [
    `viewport = ${window.innerWidth}x${window.innerHeight} (renderer ${viewportWidth}x${viewportHeight})`,
    `canvas rect = left:${canvasRect.left}, top:${canvasRect.top}, width:${canvasRect.width}, height:${canvasRect.height}`,
    `canvas backing size = ${canvas.width}x${canvas.height}`,
    `DPR = ${window.devicePixelRatio} (renderer cap/result ${pixelRatio})`,
    `parent rect = left:${parentRect.left}, top:${parentRect.top}, width:${parentRect.width}, height:${parentRect.height}`,
    `position = parent:${parentStyle.position}, canvas:${canvasStyle.position}; overflow:${parentStyle.overflow}; canvas z-index:${canvasStyle.zIndex}`,
    `camera origin = left:${camera.left}, top:${camera.top}, center:${camera.centerX},${camera.centerY}`,
    `Back0 first tile Y = ${firstTileY}`,
    `Back0 last tile Y = ${lastTileY} (bottom ${lastTileY + layer.size.height})`,
    `clearRect / clip region = 0,0,${canvas.width},${canvas.height}`,
  ]
  console.info(`[Upon the Sky][night coverage]\n${diagnostics.join('\n')}`)
  hasLoggedNightCoverage = true
}

/**
 * Keep the night map's WZ geometry intact while giving the moon a responsive
 * website anchor. The same translation is applied to Back 0, Back 4 and Back
 * 5, so their relative composition remains unchanged.
 */
const getNightSkyGroupTranslation = (camera: FaithfulBackCamera): Point => {
  const moonScreen = {
    x: NIGHT_SKY_MOON.x - camera.left,
    y: NIGHT_SKY_MOON.y - camera.top,
  }
  const mobile = isMobileOrTabletViewport()
  const target = {
    x: viewportWidth * (mobile ? 0.91 : 0.84),
    y: viewportHeight * (mobile ? 0.17 : 0.18),
  }
  return { x: target.x - moonScreen.x, y: target.y - moonScreen.y }
}

const getNightMoonTranslation = (camera: FaithfulBackCamera): Point => {
  const moonWorld = {
    x: Math.floor(NIGHT_SKY_MOON.x + camera.centerX * (100 + NIGHT_SKY_MOON.rx) / 100),
    y: Math.floor(NIGHT_SKY_MOON.y + camera.centerY * (100 + NIGHT_SKY_MOON.ry) / 100),
  }
  const moonScreen = {
    x: moonWorld.x - camera.left,
    y: moonWorld.y - camera.top,
  }
  const sunAnchor = getWebsiteSunAnchor()
  return { x: sunAnchor.x - moonScreen.x, y: sunAnchor.y - moonScreen.y }
}

const getNightPattern = (
  layer: NightSkyLayer,
  image: HTMLImageElement,
  repetition: 'repeat' | 'repeat-x',
) => {
  if (!context) return null
  const key = `${layer.asset}:${repetition}`
  const cached = nightPatterns.get(key)
  if (cached) return cached
  const pattern = context.createPattern(image, repetition)
  if (pattern) nightPatterns.set(key, pattern)
  return pattern
}

/**
 * Back 0..3 are narrow, opaque WZ strips. Drawing them as many independent
 * images lets bilinear sampling touch each PNG boundary when their shared
 * screen position lands on a half CSS pixel, which produced the observed
 * 50px horizontal grid. A native CanvasPattern keeps the same PNG, repeat
 * rule and 1:1 scale while sampling one continuous repeated surface.
 */
const drawNightPatternLayer = (
  layer: NightSkyLayer,
  image: HTMLImageElement,
  camera: FaithfulBackCamera,
) => {
  if (!context || image.naturalWidth <= 0 || image.naturalHeight <= 0) return
  const repetition = layer.type === 3 ? 'repeat' : 'repeat-x'
  const pattern = getNightPattern(layer, image, repetition)
  if (!pattern) return

  const worldX = Math.floor(layer.x + camera.centerX * (100 + layer.rx) / 100)
  const worldY = Math.floor(layer.y + camera.centerY * (100 + layer.ry) / 100)
  const devicePixel = 1 / Math.max(pixelRatio, 1)
  const drawX = Math.round((worldX - camera.left - layer.origin.x) / devicePixel) * devicePixel
  const drawY = Math.round((worldY - camera.top - layer.origin.y) / devicePixel) * devicePixel

  pattern.setTransform(new DOMMatrix().translate(drawX, drawY))
  context.save()
  context.globalAlpha = layer.alpha / 255
  context.fillStyle = pattern
  if (repetition === 'repeat') {
    context.fillRect(0, 0, viewportWidth, viewportHeight)
  } else {
    context.fillRect(0, drawY, viewportWidth, image.naturalHeight)
  }
  context.restore()
}

const drawNightLayer = (
  layer: NightSkyLayer,
  image: HTMLImageElement,
  camera: FaithfulBackCamera,
  groupTranslation: Point,
  origin = layer.origin,
  tileWidth = layer.cx > 0 ? layer.cx : layer.size.width,
  tileHeight = layer.cy > 0 ? layer.cy : layer.size.height,
) => {
  if (!context || image.naturalWidth <= 0 || image.naturalHeight <= 0) return
  if (tileWidth <= 0 || tileHeight <= 0) return

  let worldX = layer.x
  let worldY = layer.y
  if (isHorizontalScroll(layer.type)) {
    worldX += layer.rx * MAPRENDER_SCROLL_UNITS_PER_SECOND * (performance.now() - startedAt) / 1000 % tileWidth
  } else {
    worldX += camera.centerX * (100 + layer.rx) / 100
  }
  if (isVerticalScroll(layer.type)) {
    worldY += layer.ry * MAPRENDER_SCROLL_UNITS_PER_SECOND * (performance.now() - startedAt) / 1000 % tileHeight
  } else {
    worldY += camera.centerY * (100 + layer.ry) / 100
  }
  worldX = Math.floor(worldX)
  worldY = Math.floor(worldY)

  const translatedCameraLeft = camera.left - groupTranslation.x
  const translatedCameraRight = camera.right - groupTranslation.x
  const translatedCameraTop = camera.top - groupTranslation.y
  const translatedCameraBottom = camera.bottom - groupTranslation.y
  const tileStartX = isHorizontalTile(layer.type)
    ? Math.floor((translatedCameraLeft - worldX) / tileWidth) - 1
    : 0
  const tileEndX = isHorizontalTile(layer.type)
    ? Math.ceil((translatedCameraRight - worldX) / tileWidth) + 1
    : 1
  const tileStartY = isVerticalTile(layer.type)
    ? Math.floor((translatedCameraTop - worldY) / tileHeight) - 1
    : 0
  const tileEndY = isVerticalTile(layer.type)
    ? Math.ceil((translatedCameraBottom - worldY) / tileHeight) + 1
    : 1

  for (let tileY = tileStartY; tileY < tileEndY; tileY += 1) {
    for (let tileX = tileStartX; tileX < tileEndX; tileX += 1) {
      drawImageAtWorld(
        image,
        worldX + tileX * tileWidth,
        worldY + tileY * tileHeight,
        origin,
        1,
        camera.left,
        camera.top,
        layer.flip,
        layer.alpha / 255,
        groupTranslation.y,
        groupTranslation.x,
      )
    }
  }
}

/**
 * Static dark-mode boundary. Night Back 0..3 are opaque, non-animated WZ
 * patterns; they only change when the viewport/camera changes, so they can be
 * rendered once into the static scene cache.
 */
const drawNightStaticSkyLayers = () => {
  if (!context) return
  const backCamera = getNightSkyBackCamera()

  // Back 0..3 use their WZ camera positions directly. Applying the moon's
  // responsive translation here shifts the finite tile range and leaves an
  // uncovered strip; fractional translation can also expose bilinear seams
  // between the 50px tiles. MapRender never applies that website transform to
  // these background layers.
  for (const layer of NIGHT_SKY_BACK_LAYERS) {
    const image = getImage(layer.asset)
    if (image) drawNightPatternLayer(layer, image, backCamera)
  }
  logNightCoverageDiagnostics(backCamera)
}

/**
 * Dynamic dark-mode boundary. The star frame changes every 200ms, not every
 * Canvas frame, so keep the star/moon ordering in a second bitmap and rebuild
 * it only when the frame or a required asset changes. The live renderer then
 * performs one device-pixel blit per frame instead of three repeated star
 * bands plus a moon draw on every refresh.
 */
const drawNightSkyLayers = (elapsedMs: number) => {
  if (!context) return
  const cache = ensureNightDynamicCanvas()
  if (!cache) return

  const frameIndex = NIGHT_STAR_FRAMES.length
    ? Math.floor(elapsedMs / NIGHT_STAR_FRAMES[0].delay) % NIGHT_STAR_FRAMES.length
    : 0
  if (nightDynamicDirty || nightDynamicMode !== 'dark' || nightDynamicFrameIndex !== frameIndex) {
    const mainContext = context
    const cachedContext = cache.context
    const camera = getNightSkyCamera()
    const starGroupTranslation = getNightSkyGroupTranslation(camera)
    const moonTranslation = getNightMoonTranslation(camera)
    const starFrame = NIGHT_STAR_FRAMES[frameIndex]
    const starImage = starFrame ? getImage(starFrame.asset) : null

    cachedContext.setTransform(1, 0, 0, 1, 0, 0)
    cachedContext.clearRect(0, 0, cache.canvas.width, cache.canvas.height)
    cachedContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    cachedContext.imageSmoothingEnabled = true
    cachedContext.imageSmoothingQuality = isMobileOrTabletViewport() ? 'low' : 'high'

    context = cachedContext
    try {
      if (starFrame && starImage) {
        // Back 4's zero cx/cy resolves to the animation bound (~384x312), not
        // the current frame's natural width. The website repeats the same WZ
        // animation in three deterministic, horizontally phase-shifted bands
        // so the visible night sky keeps its established coverage.
        for (const band of NIGHT_STAR_BANDS) {
          drawNightLayer(
            NIGHT_SKY_STARS,
            starImage,
            camera,
            {
              x: starGroupTranslation.x + band.x,
              y: starGroupTranslation.y + band.y,
            },
            starFrame.origin,
            384,
            312,
          )
        }
      }

      const moonImage = getImage(NIGHT_SKY_MOON.asset)
      if (moonImage) drawNightLayer(NIGHT_SKY_MOON, moonImage, camera, moonTranslation)
    } finally {
      context = mainContext
    }

    nightDynamicMode = 'dark'
    nightDynamicFrameIndex = frameIndex
    nightDynamicDirty = false
  }

  // Both canvases use the same capped-DPR backing dimensions. Copy in device
  // pixels so the cached artwork is not resampled a second time on every RAF.
  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.drawImage(cache.canvas, 0, 0)
  context.restore()
}

/**
 * MapRender's world position for a BackItem.  The sun layers are all type 0,
 * but keeping the scroll branch here makes the implementation follow the
 * same rule as the original renderer if a source layer is ever changed.
 */
const getSunLayerWorldPosition = (
  layer: SunFrontLayer,
  elapsedMs: number,
  cameraCenter: Point
): Point => {
  let x = layer.x
  let y = layer.y
  const repeatWidth = layer.cx > 0 ? layer.cx : layer.size.width
  const repeatHeight = layer.cy > 0 ? layer.cy : layer.size.height

  if (isHorizontalScroll(layer.type)) {
    x += layer.rx * MAPRENDER_SCROLL_UNITS_PER_SECOND * elapsedMs / 1000 % repeatWidth
  } else {
    x += cameraCenter.x * (100 + layer.rx) / 100
  }
  if (isVerticalScroll(layer.type)) {
    y += layer.ry * MAPRENDER_SCROLL_UNITS_PER_SECOND * elapsedMs / 1000 % repeatHeight
  } else {
    y += cameraCenter.y * (100 + layer.ry) / 100
  }

  return { x: Math.floor(x), y: Math.floor(y) }
}

const getShipGroupVisualCenter = (
  elapsedMs: number,
  scale: number,
  cameraLeft: number,
  cameraTop: number,
  groupOffset: Point,
  screenOffsetY: number
): Point | null => {
  if (!manifest) return null

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let hasBounds = false

  for (const object of orderedObjects) {
    const frame = getFrame(object, elapsedMs)
    const image = getImage(frame.asset)
    const width = image?.naturalWidth || 0
    const height = image?.naturalHeight || 0
    if (width <= 0 || height <= 0) continue

    const anchorX = (object.x + groupOffset.x - cameraLeft) * scale
    const anchorY = (object.y + groupOffset.y - cameraTop) * scale + screenOffsetY
    const left = anchorX - frame.origin.x * scale
    const top = anchorY - frame.origin.y * scale
    const right = left + width * scale
    const bottom = top + height * scale
    minX = Math.min(minX, left)
    minY = Math.min(minY, top)
    maxX = Math.max(maxX, right)
    maxY = Math.max(maxY, bottom)
    hasBounds = true
  }

  if (!hasBounds) return null
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
}

/**
 * Draw the WZ flare constellation as a hybrid website composition. The
 * source vectors from Front 13..19 are kept intact, then one rigid website
 * transform points the constellation toward a VisualTarget between the Sun
 * and the ship group. Sprite size ratios, origins, alpha, flip and draw order
 * remain untouched.
 */
const drawFaithfulSunFront = (
  elapsedMs: number,
  compositionCamera: Camera,
  shipGroupOffset: Point,
  screenOffsetY: number
) => {
  if (!context || !SUN_FRONT_LAYERS.length) return

  const cameraCenter = {
    x: compositionCamera.left + viewportWidth / (2 * Math.max(compositionCamera.scale, Number.EPSILON)),
    y: compositionCamera.top + viewportHeight / (2 * Math.max(compositionCamera.scale, Number.EPSILON)),
  }
  const orderedLayers = ORDERED_SUN_FRONT_LAYERS
  const baseLayer = orderedLayers[0]
  const mobileViewport = viewportWidth <= 767
  const visualGroupScale = mobileViewport ? MOBILE_SUN_FLARE_GROUP_SCALE : 1
  const baseWorld = getSunLayerWorldPosition(baseLayer, elapsedMs, cameraCenter)
  const worldPositions = orderedLayers.map((layer) => ({
    layer,
    world: getSunLayerWorldPosition(layer, elapsedMs, cameraCenter),
  }))

  // Keep the already-established website sun anchor. This is one transform
  // for the complete seven-layer group, not a replacement for WZ positions.
  const sunAnchor = getWebsiteSunAnchor()
  const sunCenterX = sunAnchor.x
  const sunCenterY = sunAnchor.y
  const shipCenter = getShipGroupVisualCenter(
    elapsedMs,
    compositionCamera.scale,
    compositionCamera.left,
    compositionCamera.top,
    shipGroupOffset,
    screenOffsetY
  ) ?? { x: sunCenterX, y: sunCenterY }
  const visualTarget = {
    x: sunCenterX + (shipCenter.x - sunCenterX) * SUN_FLARE_VISUAL_TARGET_RATIO,
    y: sunCenterY + (shipCenter.y - sunCenterY) * SUN_FLARE_VISUAL_TARGET_RATIO,
  }
  const sourceAxis = worldPositions
    .slice(1)
    .map(({ world }) => ({ x: world.x - baseWorld.x, y: world.y - baseWorld.y }))
    .sort((a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y))[0] ?? { x: 1, y: 0 }
  const sourceAngle = Math.atan2(sourceAxis.y, sourceAxis.x)
  const targetAngle = Math.atan2(visualTarget.y - sunCenterY, visualTarget.x - sunCenterX)
  const rotation = targetAngle - sourceAngle
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)

  // Expand only the longitudinal component of the already-transformed WZ
  // constellation. The perpendicular component is preserved exactly, so the
  // individual flare spacing rhythm remains recognizable instead of becoming
  // a hand-placed line of bubbles.
  const visualAxisLength = Math.hypot(visualTarget.x - sunCenterX, visualTarget.y - sunCenterY)
  const axis = visualAxisLength > 0
    ? { x: (visualTarget.x - sunCenterX) / visualAxisLength, y: (visualTarget.y - sunCenterY) / visualAxisLength }
    : { x: 1, y: 0 }
  const perpendicularAxis = { x: -axis.y, y: axis.x }
  const transformedVectors = worldPositions.map(({ layer, world }) => {
    const relativeX = world.x - baseWorld.x
    const relativeY = world.y - baseWorld.y
    return {
      layer,
      x: (relativeX * cos - relativeY * sin) * SUN_FLARE_GROUP_SCALE,
      y: (relativeX * sin + relativeY * cos) * SUN_FLARE_GROUP_SCALE,
    }
  })
  const maxParallel = transformedVectors
    .slice(1)
    .reduce((maximum, vector) => Math.max(maximum, vector.x * axis.x + vector.y * axis.y), 0)
  const desiredParallel = visualAxisLength * SUN_FLARE_LONGITUDINAL_COVERAGE
  const longitudinalScale = maxParallel > 0 ? desiredParallel / maxParallel : 1

  context.save()
  // MapRender uses its normal non-premultiplied alpha sprite state here.
  context.globalCompositeOperation = 'source-over'
  context.globalAlpha = 1
  for (const { layer, x: transformedX, y: transformedY } of transformedVectors) {
    const image = getImage(layer.asset)
    if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) continue
    const parallel = transformedX * axis.x + transformedY * axis.y
    const perpendicular = transformedX * perpendicularAxis.x + transformedY * perpendicularAxis.y
    const unscaledScreenX = sunCenterX
      + axis.x * parallel * longitudinalScale
      + perpendicularAxis.x * perpendicular
    const unscaledScreenY = sunCenterY
      + axis.y * parallel * longitudinalScale
      + perpendicularAxis.y * perpendicular
    const screenX = sunCenterX + (unscaledScreenX - sunCenterX) * visualGroupScale
    const screenY = sunCenterY + (unscaledScreenY - sunCenterY) * visualGroupScale
    const drawScale = (layer.index === baseLayer.index ? 1 : SUN_FLARE_GROUP_SCALE) * visualGroupScale
    const drawWidth = image.naturalWidth * drawScale
    const drawHeight = image.naturalHeight * drawScale
    const drawX = screenX - layer.origin.x * drawScale
    const drawY = screenY - layer.origin.y * drawScale
    if (drawX > viewportWidth || drawX + drawWidth < 0 || drawY > viewportHeight || drawY + drawHeight < 0) continue

    context.save()
    context.globalAlpha = Math.max(0, Math.min(1, (layer.a * layer.frameAlpha) / (255 * 255)))
    if (layer.flip) {
      context.translate(screenX, 0)
      context.scale(-1, 1)
      context.drawImage(
        image,
        -(image.naturalWidth - layer.origin.x) * drawScale,
        drawY,
        drawWidth,
        drawHeight
      )
    } else {
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
    }
    context.restore()
  }
  context.restore()

}


/**
 * Reproduce MapRender's BackItem renderer at world scale 1:1.
 *
 * The loop intentionally draws each original frame independently. This keeps
 * cx/cy as the tile interval and never creates a CanvasPattern, mirrored tile,
 * source crop, or website-specific placement track.
 */
const drawFaithfulBackLayers = (
  front: boolean,
  camera: FaithfulBackCamera,
  elapsedMs: number,
  cloudSeaTranslationY = 0,
  globalThemeTranslationY = 0,
  excludedIndices?: Set<number>,
  includedIndices?: Set<number>,
) => {
  if (!manifest) return

  const orderedLayers = front ? orderedBackLayers.front : orderedBackLayers.back

  for (const layer of orderedLayers) {
    if (excludedIndices?.has(layer.index)) continue
    if (includedIndices && !includedIndices.has(layer.index)) continue
    const sourceImage = getImage(layer.asset)
    if (!sourceImage || sourceImage.naturalWidth <= 0 || sourceImage.naturalHeight <= 0) continue
    // The offline-balanced derivative has the exact same dimensions and alpha
    // bytes as the source PNG. Dark mode only swaps the decoded bitmap; every
    // WZ coordinate, interval, origin and animation rule below stays shared.
    const image = renderDarkMode && layer.asset === GRASSY_SOIL_CLOUD_ASSET
      ? getImage(GRASSY_SOIL_NIGHT_ASSET) ?? sourceImage
      : sourceImage

    // MapRender fills zero cx/cy from the resolved frame bound. The extracted
    // PNG is the resolved frame for this map, so its decoded dimensions are the
    // same values used here.
    const tileWidth = layer.cx > 0 ? layer.cx : sourceImage.naturalWidth
    const tileHeight = layer.cy > 0 ? layer.cy : sourceImage.naturalHeight
    if (tileWidth <= 0 || tileHeight <= 0) continue

    let worldX = layer.x
    let worldY = layer.y
    if (isHorizontalScroll(layer.type)) {
      worldX += layer.rx * MAPRENDER_SCROLL_UNITS_PER_SECOND * elapsedMs / 1000 % tileWidth
    } else {
      worldX += camera.centerX * (100 + layer.rx) / 100
    }
    if (isVerticalScroll(layer.type)) {
      worldY += layer.ry * MAPRENDER_SCROLL_UNITS_PER_SECOND * elapsedMs / 1000 % tileHeight
    } else {
      worldY += camera.centerY * (100 + layer.ry) / 100
    }
    worldX = Math.floor(worldX)
    worldY = Math.floor(worldY)

    const tileStartX = isHorizontalTile(layer.type)
      ? Math.floor((camera.left - worldX) / tileWidth) - 1
      : 0
    const tileEndX = isHorizontalTile(layer.type)
      ? Math.ceil((camera.right - worldX) / tileWidth) + 1
      : 1
    const tileStartY = isVerticalTile(layer.type)
      ? Math.floor((camera.top - worldY) / tileHeight) - 1
      : 0
    const tileEndY = isVerticalTile(layer.type)
      ? Math.ceil((camera.bottom - worldY) / tileHeight) + 1
      : 1
    const alpha = Math.max(0, Math.min(1, (layer.alpha ?? layer.a ?? 255) / 255))
    const layerScreenOffsetY = globalThemeTranslationY + (
      !front && CLOUD_SEA_LAYER_INDICES.has(layer.index)
        ? cloudSeaTranslationY
        : 0
    )

    for (let tileY = tileStartY; tileY < tileEndY; tileY += 1) {
      for (let tileX = tileStartX; tileX < tileEndX; tileX += 1) {
        drawImageAtWorld(
          image,
          worldX + tileX * tileWidth,
          worldY + tileY * tileHeight,
          layer.origin,
          1,
          camera.left,
          camera.top,
          Boolean(layer.flip || layer.f),
          alpha,
          layerScreenOffsetY
        )
      }
    }

    // Bottom-only website coverage guard. The faithful WZ rule above remains
    // horizontal-only for type 4; this continuation is considered only when
    // a taller viewport would otherwise expose the fallback blue beneath the
    // already translated cloud-sea group. It reuses the same resolved frame
    // at 1:1 and never changes the group's origin, scale, speed, or placement.
    if (!front && layer.index === 1 && isHorizontalTile(layer.type)) {
      const firstContinuationWorldY = worldY + tileHeight
      const firstContinuationScreenTop =
        (firstContinuationWorldY - camera.top) + layerScreenOffsetY - layer.origin.y
      if (firstContinuationScreenTop < viewportHeight) {
        for (let continuationWorldY = firstContinuationWorldY;
          (continuationWorldY - camera.top) + layerScreenOffsetY - layer.origin.y < viewportHeight;
          continuationWorldY += tileHeight) {
          for (let tileX = tileStartX; tileX < tileEndX; tileX += 1) {
            drawImageAtWorld(
              image,
              worldX + tileX * tileWidth,
              continuationWorldY,
              layer.origin,
              1,
              camera.left,
              camera.top,
              Boolean(layer.flip || layer.f),
              alpha,
              layerScreenOffsetY
            )
          }
        }
      }
    }
  }
}

const ensureStaticSceneCanvas = () => {
  const mainCanvas = canvasRef.value
  if (!mainCanvas) return null

  if (!staticSceneCanvas) {
    staticSceneCanvas = document.createElement('canvas')
    staticSceneContext = staticSceneCanvas.getContext('2d', { alpha: true })
  }
  if (!staticSceneCanvas || !staticSceneContext) return null

  const dimensionsChanged = staticSceneCanvas.width !== mainCanvas.width
    || staticSceneCanvas.height !== mainCanvas.height
    || staticSceneWidth !== viewportWidth
    || staticSceneHeight !== viewportHeight
    || staticScenePixelRatio !== pixelRatio
  if (dimensionsChanged) {
    staticSceneCanvas.width = mainCanvas.width
    staticSceneCanvas.height = mainCanvas.height
    staticSceneWidth = viewportWidth
    staticSceneHeight = viewportHeight
    staticScenePixelRatio = pixelRatio
    staticSceneDirty = true
    nightDynamicDirty = true
    nightPatterns.clear()
  }

  return { canvas: staticSceneCanvas, context: staticSceneContext }
}

const ensureNightDynamicCanvas = () => {
  const mainCanvas = canvasRef.value
  if (!mainCanvas) return null

  if (!nightDynamicCanvas) {
    nightDynamicCanvas = document.createElement('canvas')
    nightDynamicContext = nightDynamicCanvas.getContext('2d', { alpha: true })
  }
  if (!nightDynamicCanvas || !nightDynamicContext) return null

  const dimensionsChanged = nightDynamicCanvas.width !== mainCanvas.width
    || nightDynamicCanvas.height !== mainCanvas.height
    || nightDynamicWidth !== viewportWidth
    || nightDynamicHeight !== viewportHeight
    || nightDynamicPixelRatio !== pixelRatio
  if (dimensionsChanged) {
    nightDynamicCanvas.width = mainCanvas.width
    nightDynamicCanvas.height = mainCanvas.height
    nightDynamicWidth = viewportWidth
    nightDynamicHeight = viewportHeight
    nightDynamicPixelRatio = pixelRatio
    nightDynamicFrameIndex = -1
    nightDynamicMode = null
    nightDynamicDirty = true
  }

  return { canvas: nightDynamicCanvas, context: nightDynamicContext }
}

/**
 * Draw only the immutable portion of the current scene into an offscreen
 * canvas, then composite that bitmap in one operation per frame.
 *
 * Cache boundary:
 * - light mode: map Back 0 (opaque grassy base)
 * - dark mode: night Back 0..3 patterns
 *
 * Cloud scrolling, star frames, moon ordering, ship frames, flare geometry
 * and front layers stay on the live renderer because they depend on elapsed
 * time or must retain their existing draw order.
 */
const drawStaticScene = () => {
  if (!context || !manifest) return
  const cache = ensureStaticSceneCanvas()
  if (!cache) return

  const mode: SkyMode = renderDarkMode ? 'dark' : 'light'
  if (staticSceneDirty || staticSceneMode !== mode) {
    const mainContext = context
    const cachedContext = cache.context
    cachedContext.setTransform(1, 0, 0, 1, 0, 0)
    cachedContext.clearRect(0, 0, cache.canvas.width, cache.canvas.height)
    cachedContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    cachedContext.imageSmoothingEnabled = true
    cachedContext.imageSmoothingQuality = isMobileOrTabletViewport() ? 'low' : 'high'

    context = cachedContext
    try {
      if (mode === 'dark') {
        drawNightStaticSkyLayers()
      } else {
        drawFaithfulBackLayers(
          false,
          getFaithfulBackCamera(),
          0,
          getCloudSeaTranslationY(),
          getGlobalThemeTranslationY(),
          undefined,
          DAY_SKY_BASE_LAYER_INDICES,
        )
      }
    } finally {
      context = mainContext
    }

    staticSceneMode = mode
    staticSceneDirty = false
  }

  // The static surface has the same backing dimensions as the main Canvas; a
  // device-pixel copy avoids an extra full-screen interpolation pass.
  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.drawImage(cache.canvas, 0, 0)
  context.restore()
}

const getFrame = (object: MapObject, elapsedMs: number) => {
  const frames = object.frames
  if (!frames?.length) {
    return { asset: object.asset, origin: object.origin }
  }

  const totalDuration = frames.reduce((total, frame) => total + Math.max(1, frame.delay), 0)
  let time = totalDuration ? elapsedMs % totalDuration : 0
  for (const frame of frames) {
    const duration = Math.max(1, frame.delay)
    if (time < duration) return { asset: frame.asset, origin: frame.origin }
    time -= duration
  }
  const last = frames[frames.length - 1]
  return { asset: last.asset, origin: last.origin }
}

const prepareManifestDrawOrder = (data: MapManifest) => {
  staticSceneAssets.clear()
  for (const layer of NIGHT_SKY_BACK_LAYERS) staticSceneAssets.add(layer.asset)
  const staticDayLayer = data.back.find((layer) => DAY_SKY_BASE_LAYER_INDICES.has(layer.index))
  if (staticDayLayer) staticSceneAssets.add(staticDayLayer.asset)

  orderedBackLayers = {
    back: data.back
      .filter((layer) => !layer.front)
      .slice()
      .sort((a, b) => a.index - b.index),
    front: data.back
      .filter((layer) => Boolean(layer.front))
      .slice()
      .sort((a, b) => a.index - b.index),
  }
  orderedObjects = data.objects.layers
    .slice()
    .sort((a, b) => a.layer - b.layer)
    .flatMap((layer) => layer.objects
      .slice()
      .sort((a, b) => a.z - b.z || a.index - b.index))
}

const drawObjects = (
  elapsedMs: number,
  scale: number,
  cameraLeft: number,
  cameraTop: number,
  groupOffset: Point,
  screenOffsetY = 0
) => {
  if (!manifest) return

  // MapRender traverses layer containers in scene order, then sorts the
  // objects inside each container by z and map-node index. zM remains in the
  // manifest for source fidelity, but it is not an object-level draw offset or
  // a replacement for the layer container order.
  for (const object of orderedObjects) {
    const frame = getFrame(object, elapsedMs)
    const image = getImage(frame.asset)
    if (!image) continue
    drawImageAtWorld(
      image,
      object.x + groupOffset.x,
      object.y + groupOffset.y,
      frame.origin,
      scale,
      cameraLeft,
      cameraTop,
      Boolean(object.flip || object.f),
      1,
      screenOffsetY
    )
  }
}

const getCoverCamera = (): Camera => {
  if (!manifest) return { scale: 1, left: 0, top: 0, right: viewportWidth }

  const scale = Math.max(viewportWidth / manifest.vr.width, viewportHeight / manifest.vr.height)
  const visibleWorldWidth = viewportWidth / scale
  const visibleWorldHeight = viewportHeight / scale
  const left = manifest.vr.left + (manifest.vr.width - visibleWorldWidth) / 2
  const top = manifest.vr.top + (manifest.vr.height - visibleWorldHeight) / 2
  return { scale, left, top, right: left + visibleWorldWidth }
}

/**
 * Website presentation camera for the Ossyria object group.
 *
 * This is intentionally separate from the WZ cover camera above: the map
 * background still follows VR coverage, while the ship is composed at a
 * calmer normalized scale and centered around the site's content-safe area.
 */
const getWebsiteCompositionCamera = (backgroundCamera: Camera): Camera => {
  if (!manifest) return backgroundCamera

  const aspect = viewportWidth / Math.max(1, viewportHeight)
  const aspectT = Math.max(0, Math.min(1, (aspect - 0.75) / 1.05))
  // Keep the ship legible without turning it into a foreground hero image.
  // The factor is normalized by aspect so portrait layouts get a little more
  // breathing room while wide layouts can place the ship beside site copy.
  const compositionFactor = 0.34 + aspectT * 0.10
  const scale = backgroundCamera.scale * compositionFactor
  const visibleWorldWidth = viewportWidth / scale
  const visibleWorldHeight = viewportHeight / scale
  const compositionCenterX = manifest.vr.left + manifest.vr.width * (0.67 + aspectT * 0.18)
  const compositionCenterY = manifest.vr.top + manifest.vr.height * 0.54
  const left = compositionCenterX - visibleWorldWidth / 2
  const top = compositionCenterY - visibleWorldHeight / 2
  return { scale, left, top, right: left + visibleWorldWidth }
}

const getShipGroupOffset = (elapsedMs: number, scale: number): Point => {
  if (prefersReducedMotion) return { x: 0, y: 0 }

  const phase = (elapsedMs / SHIP_BOB_PERIOD_MS) * Math.PI * 2
  return {
    x: (Math.sin(phase * 0.73) * SHIP_SWAY_AMPLITUDE_PX) / scale,
    y: (Math.sin(phase) * SHIP_BOB_AMPLITUDE_PX) / scale,
  }
}

/**
 * Keep the ship's existing object geometry and scale, applying one
 * deterministic world-space translation on narrow viewports so the complete
 * visual bounds are centred at viewportWidth * .5. Desktop remains unchanged.
 */
const getResponsiveShipGroupOffset = (
  elapsedMs: number,
  compositionCamera: Camera,
  screenOffsetY: number
): Point => {
  const baseOffset = getShipGroupOffset(elapsedMs, compositionCamera.scale)
  if (viewportWidth > 767 || !manifest) return baseOffset

  const currentCenter = getShipGroupVisualCenter(
    elapsedMs,
    compositionCamera.scale,
    compositionCamera.left,
    compositionCamera.top,
    baseOffset,
    screenOffsetY
  )
  if (!currentCenter) return baseOffset

  const desiredCenterX = viewportWidth * 0.5
  const worldShiftX = (desiredCenterX - currentCenter.x) /
    Math.max(compositionCamera.scale, Number.EPSILON)
  return { x: baseOffset.x + worldShiftX, y: baseOffset.y }
}

const drawScene = (time: number) => {
  const canvas = canvasRef.value
  if (!canvas || !context || !manifest || !viewportWidth || !viewportHeight) return

  const elapsedMs = Math.max(0, time - startedAt)
  const darkMode = renderDarkMode
  resizeCanvas()

  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = darkMode ? '#061018' : FALLBACK_COLOR
  context.fillRect(0, 0, canvas.width, canvas.height)

  const backgroundCamera = getCoverCamera()
  const faithfulBackCamera = getFaithfulBackCamera()
  const compositionCamera = getWebsiteCompositionCamera(backgroundCamera)
  const cloudSeaTranslationY = getCloudSeaTranslationY()
  const globalThemeTranslationY = getGlobalThemeTranslationY()
  const shipGroupOffset = getResponsiveShipGroupOffset(
    elapsedMs,
    compositionCamera,
    globalThemeTranslationY
  )

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = isMobileOrTabletViewport() ? 'low' : 'high'

  // Reuse the immutable scene base. The live renderer below retains every
  // elapsed-time, scroll, frame-animation and front-layer operation.
  drawStaticScene()

  // Dark mode adds only the audited nightDesert animated star/moon group. The
  // static night Back 0..3 patterns were composited above, while the existing
  // daytime cloud and ship renderer continues unchanged for this PoC.
  if (darkMode) drawNightSkyLayers(elapsedMs)

  // Match MapRender's scene order: Back 0-6, then the Ossyria Obj group.
  drawFaithfulBackLayers(
    false,
    faithfulBackCamera,
    elapsedMs,
    cloudSeaTranslationY,
    globalThemeTranslationY,
    DAY_SKY_BASE_LAYER_INDICES,
  )

  // Draw the original Ossyria object parts as one composition group. The
  // separate shipObj 97 (Balrog/skeleton ship) is intentionally omitted.
  drawObjects(
    elapsedMs,
    compositionCamera.scale,
    compositionCamera.left,
    compositionCamera.top,
    shipGroupOffset,
    globalThemeTranslationY
  )

  // MapRender keeps front Back entries in a separate container after Obj/Fly.
  drawFaithfulBackLayers(true, faithfulBackCamera, elapsedMs, 0, globalThemeTranslationY)

  // The desert sun is a light-mode scene element. Dark mode uses the audited
  // nightDesert moon instead, so the existing sun/flare group is not layered
  // on top of the night-sky PoC.
  if (!darkMode) {
    drawFaithfulSunFront(
      elapsedMs,
      compositionCamera,
      shipGroupOffset,
      globalThemeTranslationY
    )
  }
}

const getFrameIntervalMs = () => {
  if (prefersReducedMotion) return REDUCED_MOTION_FRAME_INTERVAL_MS
  return isMobileOrTabletViewport() ? MOBILE_FRAME_INTERVAL_MS : 0
}

function render(time: number) {
  if (disposed) return
  if (isPaused) {
    animationFrame = 0
    return
  }

  // Keep elapsed time tied to the real RAF timestamp. On mobile and reduced
  // motion we skip complete scene redraws until the cap is reached, rather
  // than slowing any WZ scroll, frame animation or ship phase.
  const frameIntervalMs = getFrameIntervalMs()
  if (frameIntervalMs > 0 && lastRenderedAt > 0 && time - lastRenderedAt < frameIntervalMs) {
    animationFrame = window.requestAnimationFrame(render)
    return
  }

  lastRenderedAt = time
  drawScene(time)
  animationFrame = window.requestAnimationFrame(render)
}

const handleVisibilityChange = () => {
  isPaused = document.hidden
  if (!isPaused && !animationFrame) {
    animationFrame = window.requestAnimationFrame(render)
  }
}

const start = async () => {
  try {
    const response = await fetch(MANIFEST_URL)
    if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`)
    manifest = await response.json() as MapManifest
    prepareManifestDrawOrder(manifest)
    // Only the first-paint tier blocks the first frame. The rest of the active
    // scene is scheduled in idle batches after the Canvas is visible.
    let activeMode = requestedSkyMode
    let initialAssets = collectInitialAssetUrls(manifest, activeMode)
    await preloadImageSet(initialAssets, `${activeMode} initial scene`, 2)
    if (activeMode !== requestedSkyMode) {
      activeMode = requestedSkyMode
      initialAssets = collectInitialAssetUrls(manifest, activeMode)
      await preloadImageSet(initialAssets, `${activeMode} initial scene`, 2)
    }
    if (disposed) return
    renderDarkMode = activeMode === 'dark'
    resizeCanvas()
    startedAt = performance.now()
    renderStarted = true
    requestRender()
    const deferredAssets = collectCriticalAssetUrls(manifest, activeMode)
      .filter((url) => !initialAssets.includes(url))
    scheduleProgressivePreload(deferredAssets, `${activeMode} deferred scene`)
    scheduleBackgroundPreload(activeMode === 'dark' ? 'light' : 'dark')
  } catch (error) {
    console.warn('[Upon the Sky] Unable to load WZ scene:', error)
  }
}

onMounted(() => {
  const canvas = canvasRef.value
  const host = hostRef.value
  if (!canvas || !host) return

  context = canvas.getContext('2d', { alpha: true })
  if (!context) return

  motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  prefersReducedMotion = motionMediaQuery.matches
  handleMotionPreference = (event: MediaQueryListEvent) => {
    prefersReducedMotion = event.matches
  }
  if (motionMediaQuery.addEventListener) {
    motionMediaQuery.addEventListener('change', handleMotionPreference)
  } else {
    // Safari versions without addEventListener still expose addListener.
    motionMediaQuery.addListener?.(handleMotionPreference)
  }

  resizeObserver = new ResizeObserver(resizeCanvas)
  resizeObserver.observe(host)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  requestedSkyMode = isDark.value ? 'dark' : 'light'
  start()
})

watch(isDark, (dark) => {
  requestedSkyMode = dark ? 'dark' : 'light'
  void preloadModeAssets(requestedSkyMode)
})

onBeforeUnmount(() => {
  disposed = true
  if (animationFrame) window.cancelAnimationFrame(animationFrame)
  animationFrame = 0
  if (backgroundPreloadHandle !== undefined) {
    window.clearTimeout(backgroundPreloadHandle)
    backgroundPreloadHandle = undefined
  }
  resizeObserver?.disconnect()
  resizeObserver = null
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (motionMediaQuery && handleMotionPreference) {
    if (motionMediaQuery.removeEventListener) {
      motionMediaQuery.removeEventListener('change', handleMotionPreference)
    } else {
      motionMediaQuery.removeListener?.(handleMotionPreference)
    }
  }
  motionMediaQuery = null
  handleMotionPreference = null
  renderStarted = false
  context = null
  images.clear()
  imagePromises.clear()
  nightPatterns.clear()
  staticSceneCanvas = null
  staticSceneContext = null
  staticSceneMode = null
  staticSceneWidth = 0
  staticSceneHeight = 0
  staticScenePixelRatio = 0
  staticSceneDirty = true
  nightDynamicCanvas = null
  nightDynamicContext = null
  nightDynamicMode = null
  nightDynamicFrameIndex = -1
  nightDynamicWidth = 0
  nightDynamicHeight = 0
  nightDynamicPixelRatio = 0
  nightDynamicDirty = true
})
</script>

<template>
  <div ref="hostRef" class="upon-the-sky-background" aria-hidden="true">
    <canvas ref="canvasRef" class="upon-the-sky-canvas"></canvas>
    <div class="upon-the-sky-reading-mask"></div>
  </div>
</template>

<style scoped>
.upon-the-sky-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  min-height: 100svh;
  overflow: hidden;
  pointer-events: none;
  isolation: isolate;
  background: #3366cc;
}

.upon-the-sky-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.upon-the-sky-reading-mask {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: none;
}

:global(html.dark) .upon-the-sky-reading-mask {
  background:
    radial-gradient(ellipse 28% 31% at 27% 56%, rgba(0, 12, 31, 0.38) 0%, rgba(0, 12, 31, 0.28) 44%, rgba(0, 12, 31, 0.10) 72%, transparent 100%),
    radial-gradient(ellipse 57% 20% at 50% 96%, rgba(0, 12, 31, 0.28) 0%, rgba(0, 12, 31, 0.16) 52%, transparent 100%);
}

/* Keep the WZ artwork visible in both appearances. Contrast is applied only to
   the actual reading surfaces below, rather than tinting the whole viewport. */
:global(html body.theme-uponthesky .hb-home-lobby) {
  --lobby-text: #173b53;
  --lobby-text-strong: #092f49;
  --lobby-text-muted: rgba(12, 50, 73, 0.90);
  --lobby-text-soft: rgba(12, 50, 73, 0.82);
  --lobby-border: rgba(10, 88, 132, 0.24);
  --lobby-border-strong: rgba(10, 88, 132, 0.34);
  --lobby-surface: rgba(247, 252, 255, 0.88);
  --lobby-surface-soft: rgba(244, 250, 255, 0.84);
  --lobby-panel: rgba(247, 252, 255, 0.92);
  --lobby-chip: rgba(244, 250, 255, 0.86);
  --lobby-primary-bg: rgba(255, 255, 255, 0.94);
  --lobby-primary-text: #082b48;
  --lobby-ghost-bg: rgba(244, 250, 255, 0.88);
  --lobby-ghost-text: #0b3550;
  --lobby-shadow: rgba(18, 64, 91, 0.20);
  --lobby-panel-shadow: rgba(18, 64, 91, 0.22);
  --lobby-chip-shadow: rgba(18, 64, 91, 0.18);
  --lobby-story-divider: rgba(10, 88, 132, 0.20);
  --lobby-story-border: rgba(10, 88, 132, 0.26);
  --lobby-story-shadow: 0 14px 34px rgba(18, 64, 91, 0.18);
  --lobby-inset: rgba(255, 255, 255, 0.72);
  --lobby-node-active-base: #eefaff;
  --lobby-node-border-blend: #087f94;
  --lobby-active-border: rgba(8, 127, 148, 0.72);
  --lobby-label-shadow: rgba(1, 12, 28, 0.96);
  --lobby-accent-text: var(--active-accent);
  --lobby-node-accent: var(--node-accent);
}

/* Dark appearance uses the same night-blue glass language across every
   homepage surface, including the story cards and interactive entry points. */
:global(html.dark body.theme-uponthesky .hb-home-lobby) {
  --lobby-text: #edf8ff;
  --lobby-text-strong: #ffffff;
  --lobby-text-muted: rgba(232, 245, 255, 0.86);
  --lobby-text-soft: rgba(218, 238, 250, 0.78);
  --lobby-border: rgba(174, 225, 255, 0.24);
  --lobby-border-strong: rgba(223, 247, 255, 0.32);
  --lobby-grid-border: rgba(174, 225, 255, 0.16);
  --lobby-ring-border: rgba(174, 225, 255, 0.22);
  --lobby-grid-line: rgba(174, 225, 255, 0.18);
  --lobby-surface: rgba(6, 18, 38, 0.78);
  --lobby-surface-soft: rgba(5, 17, 38, 0.68);
  --lobby-panel: rgba(5, 16, 35, 0.82);
  --lobby-chip: rgba(6, 18, 38, 0.70);
  --lobby-primary-bg: rgba(8, 27, 53, 0.84);
  --lobby-primary-text: #f3fcff;
  --lobby-ghost-bg: rgba(6, 18, 38, 0.68);
  --lobby-ghost-text: #ebf8ff;
  --lobby-shadow: rgba(0, 10, 35, 0.48);
  --lobby-avatar-shadow: rgba(0, 7, 28, 0.58);
  --lobby-panel-shadow: rgba(0, 8, 30, 0.48);
  --lobby-chip-shadow: rgba(0, 8, 30, 0.38);
  --lobby-story-divider: rgba(174, 225, 255, 0.16);
  --lobby-story-border: rgba(174, 225, 255, 0.22);
  --lobby-story-shadow: 0 14px 34px rgba(0, 8, 30, 0.30);
  --lobby-inset: rgba(224, 248, 255, 0.12);
  --lobby-node-active-base: #071831;
  --lobby-node-border-blend: #d8f7ff;
  --lobby-active-border: #d8f7ff;
  --lobby-avatar-border: rgba(223, 247, 255, 0.82);
  --lobby-avatar-base: rgba(6, 15, 34, 0.92);
  --lobby-avatar-sheen: rgba(218, 247, 255, 0.14);
  --lobby-label-shadow: rgba(0, 10, 35, 0.82);
  --lobby-cue-bg: rgba(5, 15, 31, 0.84);
  --lobby-cue-border: rgba(185, 239, 255, 0.34);
  --lobby-accent-text: color-mix(in srgb, var(--active-accent), #e8f8ff 22%);
  --lobby-node-accent: color-mix(in srgb, var(--node-accent), #e8f8ff 18%);
}

:global(html body.theme-uponthesky .hb-home-lobby .hero-copy) {
  position: relative;
  isolation: isolate;
}

:global(html body.theme-uponthesky .hb-home-lobby .hero-copy::after) {
  content: none;
}

:global(html body.theme-uponthesky .hb-home-lobby .hero-home-text),
:global(html body.theme-uponthesky .hb-home-lobby .hero-intro),
:global(html body.theme-uponthesky .hb-home-lobby .story-heading h2),
:global(html body.theme-uponthesky .hb-home-lobby .node-label) {
  color: #f7fbff !important;
  text-shadow: 0 2px 3px rgba(0, 20, 50, 0.92), 0 4px 14px rgba(0, 24, 58, 0.70) !important;
}

:global(html body.theme-uponthesky .hb-home-lobby .eyebrow),
:global(html body.theme-uponthesky .hb-home-lobby .story-item > span) {
  text-shadow: 0 1px 1px rgba(0, 28, 58, 0.58), 0 0 5px rgba(255, 255, 255, 0.42);
}

:global(html body.theme-uponthesky .hb-home-lobby .panel-kicker),
:global(html body.theme-uponthesky .hb-home-lobby .floating-chip svg) {
  filter: drop-shadow(0 1px 1px rgba(0, 28, 58, 0.46));
}

:global(html body.theme-uponthesky .hb-home-lobby .hero-copy h1) {
  filter: drop-shadow(0 2px 2px rgba(0, 20, 50, 0.82)) drop-shadow(0 4px 10px rgba(0, 24, 58, 0.46));
}

:global(html body.theme-uponthesky .hb-home-lobby .hero-action),
:global(html body.theme-uponthesky .hb-home-lobby .scene-node),
:global(html body.theme-uponthesky .hb-home-lobby .active-panel),
:global(html body.theme-uponthesky .hb-home-lobby .floating-chip),
:global(html body.theme-uponthesky .hb-home-lobby .story-item) {
  -webkit-backdrop-filter: blur(4px) saturate(112%);
  backdrop-filter: blur(4px) saturate(112%);
}

:global(html body.theme-uponthesky .hb-home-lobby .active-panel strong),
:global(html body.theme-uponthesky .hb-home-lobby .active-panel a),
:global(html body.theme-uponthesky .hb-home-lobby .story-item h3) {
  color: #092f49 !important;
}

:global(html body.theme-uponthesky .hb-home-lobby .active-panel p),
:global(body.theme-uponthesky .hb-home-lobby .floating-chip),
:global(html body.theme-uponthesky .hb-home-lobby .story-item p) {
  color: rgba(12, 50, 73, 0.88) !important;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.72);
}

:global(html.dark body.theme-uponthesky .hb-home-lobby .active-panel strong),
:global(html.dark body.theme-uponthesky .hb-home-lobby .active-panel a),
:global(html.dark body.theme-uponthesky .hb-home-lobby .story-item h3) {
  color: #f2fbff !important;
  text-shadow: 0 1px 3px rgba(0, 10, 35, 0.72) !important;
}

:global(html.dark body.theme-uponthesky .hb-home-lobby .active-panel p),
:global(html.dark body.theme-uponthesky .hb-home-lobby .floating-chip),
:global(html.dark body.theme-uponthesky .hb-home-lobby .story-item p) {
  color: rgba(218, 238, 250, 0.82) !important;
  text-shadow: 0 1px 3px rgba(0, 10, 35, 0.64) !important;
}

:global(html.dark body.theme-uponthesky .hb-home-lobby .hero-action),
:global(html.dark body.theme-uponthesky .hb-home-lobby .scene-node),
:global(html.dark body.theme-uponthesky .hb-home-lobby .active-panel),
:global(html.dark body.theme-uponthesky .hb-home-lobby .floating-chip),
:global(html.dark body.theme-uponthesky .hb-home-lobby .story-item),
:global(html.dark body.theme-uponthesky .hb-home-lobby .scroll-cue) {
  -webkit-backdrop-filter: blur(12px) saturate(118%);
  backdrop-filter: blur(12px) saturate(118%);
}

:global(html.dark body.theme-uponthesky .hb-home-lobby .scroll-cue::before) {
  background: linear-gradient(135deg, rgba(5, 25, 50, 0.96) 0%, rgba(8, 74, 108, 0.90) 100%);
  box-shadow:
    0 6px 20px rgba(0, 126, 176, 0.28),
    0 0 0 1px rgba(224, 248, 255, 0.12) inset;
}

:global(html.dark body.theme-uponthesky .hb-home-lobby .scroll-cue:hover::before),
:global(html.dark body.theme-uponthesky .hb-home-lobby .scroll-cue:focus-visible::before) {
  background: linear-gradient(135deg, rgba(7, 43, 78, 0.98) 0%, rgba(11, 116, 150, 0.94) 100%);
}

:global(html body.theme-uponthesky .VPNavBar.top) {
  background: linear-gradient(180deg, rgba(3, 38, 84, 0.38) 0%, rgba(3, 38, 84, 0.18) 68%, transparent 100%) !important;
  -webkit-backdrop-filter: blur(4px) saturate(110%) !important;
  backdrop-filter: blur(4px) saturate(110%) !important;
}

:global(html body.theme-uponthesky #app .VPNav) {
  --hb-nav-hover-color: #42dff2;
  --hb-mobile-nav-control-hover: #42dff2;
}

:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarTitle .title),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarTitle .title *),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarMenuLink),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarMenuGroup > .button),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarMenuGroup > .button .text),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarMenuGroup > .button .text *),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarTranslations > .button),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarTranslations > .button .text),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarTranslations > .button .text *),
:global(html body.theme-uponthesky .VPNavBar.top .VPSocialLink),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarSearchButton),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarSearchButton *) {
  color: rgba(248, 252, 255, 0.98) !important;
  text-shadow: 0 2px 7px rgba(1, 12, 28, 0.76) !important;
}

:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarTitle .title:is(:hover, :focus-visible)),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarTitle .title:is(:hover, :focus-visible) *),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarSearchButton:is(:hover, :focus-visible)),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarSearchButton:is(:hover, :focus-visible) *) {
  color: var(--hb-mobile-nav-control-hover, #42dff2) !important;
  text-shadow: none !important;
}

:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarSearchButton) {
  border-color: rgba(232, 248, 255, 0.34) !important;
  background: rgba(4, 29, 66, 0.66) !important;
}

/* Keep the mobile hamburger in the same light-on-blue navigation palette. */
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarHamburger .top),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarHamburger .middle),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarHamburger .bottom) {
  background-color: rgba(248, 252, 255, 0.98) !important;
}

:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarHamburger:is(:hover, :focus-visible) .top),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarHamburger:is(:hover, :focus-visible) .middle),
:global(html body.theme-uponthesky .VPNavBar.top .VPNavBarHamburger:is(:hover, :focus-visible) .bottom) {
  background-color: var(--hb-mobile-nav-control-hover, #42dff2) !important;
}

/* In dark mode match the hamburger bars to VitePress' softer search-icon
   control color instead of the brighter default text color. */
:global(html.dark body.theme-uponthesky .VPNavBar.top .VPNavBarHamburger .top),
:global(html.dark body.theme-uponthesky .VPNavBar.top .VPNavBarHamburger .middle),
:global(html.dark body.theme-uponthesky .VPNavBar.top .VPNavBarHamburger .bottom) {
  background-color: var(--vp-c-text-2) !important;
}

:global(html body.theme-uponthesky .BlogVPFooter .container) {
  padding: 0;
  color: #123f6a !important;
  background: transparent !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}

:global(html body.theme-uponthesky .BlogVPFooter .footer-line) {
  color: #123f6a !important;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.92), 0 0 8px rgba(255, 255, 255, 0.60) !important;
}

:global(html body.theme-uponthesky .BlogVPFooter a) {
  color: #075a9c !important;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.92), 0 0 8px rgba(255, 255, 255, 0.60);
}

/* Night-sky footer: use a cool light foreground with a deep outline so the
   copy stays readable when the artwork transitions into bright clouds. */
:global(html.dark body.theme-uponthesky .BlogVPFooter),
:global(html.dark body.theme-uponthesky .BlogVPFooter .footer-line) {
  color: rgba(239, 250, 255, 0.96) !important;
  text-shadow: 0 1px 2px rgba(0, 18, 48, 0.98), 0 0 8px rgba(0, 20, 56, 0.68) !important;
}

:global(html.dark body.theme-uponthesky .BlogVPFooter a) {
  color: #b9f1ff !important;
  text-shadow: 0 1px 2px rgba(0, 18, 48, 0.98), 0 0 8px rgba(0, 20, 56, 0.72) !important;
}

:global(html.dark body.theme-uponthesky .BlogVPFooter a:hover),
:global(html.dark body.theme-uponthesky .BlogVPFooter a:focus-visible) {
  color: #ffffff !important;
}

:global(html.dark body.theme-uponthesky .BlogVPFooter .footer-location) {
  color: rgba(220, 243, 251, 0.88) !important;
}

:global(html.dark body.theme-uponthesky .BlogVPFooter .footer-commit) {
  color: rgba(205, 233, 243, 0.78) !important;
}

/* The MapleStory landing copy sits directly on Upon the Sky's blue canvas. */
:global(html body.theme-uponthesky #maplestory-root .maple-hero-title),
:global(html body.theme-uponthesky #maplestory-root .maple-empty-state h2) {
  color: #f8fcff !important;
  text-shadow: 0 2px 3px rgba(0, 24, 58, 0.88), 0 4px 12px rgba(0, 31, 70, 0.54) !important;
}

:global(html body.theme-uponthesky #maplestory-root .maple-hero-subtitle),
:global(html body.theme-uponthesky #maplestory-root .maple-empty-state p),
:global(html body.theme-uponthesky #maplestory-root .maple-settings-button) {
  color: rgba(247, 252, 255, 0.94) !important;
  text-shadow: 0 2px 3px rgba(0, 24, 58, 0.82), 0 3px 10px rgba(0, 31, 70, 0.48) !important;
}

/* Shared light-mode readability contract for every Upon the Sky page. The
   artwork stays bright, so normal document surfaces use one consistent dark
   palette and future pages inherit the same tokens automatically. */
:global(html:not(.dark) body.theme-uponthesky) {
  --vp-c-text-1: #173747 !important;
  --vp-c-text-2: #365967 !important;
  --vp-c-text-3: #5b7480 !important;
  --vp-c-brand-1: #087f94 !important;
  --vp-c-brand-2: #0e7490 !important;
  --hb-upon-light-text: #173747;
  --hb-upon-light-text-strong: #0d3042;
  --hb-upon-light-text-muted: #365967;
  --hb-upon-light-border: rgba(36, 94, 112, 0.24);
  color: var(--hb-upon-light-text);
}

:global(html:not(.dark) body.theme-uponthesky .VPDoc .vp-doc) {
  color: var(--hb-upon-light-text);
}

/* This card sits near the blue canvas rather than inside a normal Markdown
   reading surface. Give it its own light glass layer so its dark text always
   has a stable contrast background. */
:global(html:not(.dark) body.theme-uponthesky #maplestory-root .maple-survey-card) {
  color: var(--hb-upon-light-text) !important;
  background: linear-gradient(135deg, rgba(248, 252, 255, 0.96), rgba(232, 246, 250, 0.94)) !important;
  border-color: var(--hb-upon-light-border) !important;
  box-shadow: 0 16px 36px rgba(18, 64, 91, 0.18) !important;
}

:global(html:not(.dark) body.theme-uponthesky #maplestory-root .maple-survey-card h2) {
  color: var(--hb-upon-light-text-strong) !important;
  text-shadow: none !important;
}

:global(html:not(.dark) body.theme-uponthesky #maplestory-root .maple-survey-description) {
  color: var(--hb-upon-light-text-muted) !important;
  font-weight: 500;
  text-shadow: none !important;
}

:global(html:not(.dark) body.theme-uponthesky #maplestory-root .maple-survey-eyebrow) {
  color: var(--vp-c-brand-2) !important;
}

:global(html:not(.dark) body.theme-uponthesky #maplestory-root .maple-survey-toggle) {
  color: #075a70 !important;
  background: rgba(8, 127, 148, 0.1) !important;
  border-color: rgba(8, 127, 148, 0.36) !important;
}
</style>
