<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import spineWebglUrl from '@esotericsoftware/spine-webgl/dist/iife/spine-webgl.min.js?url'

type SpineWebglRuntime = typeof import('@esotericsoftware/spine-webgl')

const loadSpineWebglRuntime = () => {
  const browserWindow = window as typeof window & {
    spine?: SpineWebglRuntime
    __coreTowerSpineWebgl?: Promise<SpineWebglRuntime>
  }
  if (browserWindow.spine) return Promise.resolve(browserWindow.spine)
  if (browserWindow.__coreTowerSpineWebgl) return browserWindow.__coreTowerSpineWebgl

  browserWindow.__coreTowerSpineWebgl = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = spineWebglUrl
    script.async = true
    script.dataset.coreTowerSpineWebgl = ''
    script.onload = () => browserWindow.spine
      ? resolve(browserWindow.spine)
      : reject(new Error('Spine WebGL runtime did not expose window.spine'))
    script.onerror = () => reject(new Error('Unable to load Spine WebGL runtime'))
    document.head.append(script)
  })
  return browserWindow.__coreTowerSpineWebgl
}
const sharedCanvas = ref<HTMLCanvasElement | null>(null)
const spineReady = ref(false)
const sharedCanvasEnabled = ref(false)

let sharedRendererCleanup: (() => void) | null = null
let componentDisposed = false

onMounted(async () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const layerAssets = [
    ['/themes/core-tower/spine/back/BGA_03Building.skel', '/themes/core-tower/spine/back/core-tower.atlas', 'back03'],
    ['/themes/core-tower/spine/back/BGA_02Building.skel', '/themes/core-tower/spine/back/core-tower.atlas', 'back02'],
    ['/themes/core-tower/spine/back/BGA_01Building.skel', '/themes/core-tower/spine/back/core-tower.atlas', 'back01'],
    ['/themes/core-tower/spine/front/GA_01EV.skel', '/themes/core-tower/spine/front/core-tower-front.atlas', 'foreground']
  ] as const
  const floorBones = [
    'EV/MG_Ground', 'Ani_EVPanelLB', 'Ani_EVPanelRB', 'EV/MG_BL', 'EV/MG_BD2',
    'EV/MG_BL2', 'EV/MG_ArB', 'EV/MG_ArBG', 'EV_PanelLA', 'EV_PanelRA',
    'EV/MG_LGA', 'EV/MG_LGB', 'EV/MG_LGA2', 'EV/MG_LGB2', 'EV/MG_LA',
    'EV/MG_LB', 'EVPanel/Ani_PanelN1', 'EVPanel/Ani_PanelNB1', 'EV/MG_ArB2',
    'EV/MG_ArBG2'
  ]
  const purpleFrameBones = ['EV/WNA', 'EV/WNB']
  const isPhonePortrait = window.matchMedia('(max-width: 599px) and (orientation: portrait)').matches
  const isTouchPhoneOrTablet = navigator.maxTouchPoints > 0
    && Math.min(window.screen.width, window.screen.height) <= 1024
  // Draw all four skeletons through one WebGL context on every device to avoid
  // the renderer and GPU-memory spikes caused by multiple full-screen canvases.
  sharedCanvasEnabled.value = true

  const applyForegroundOffsets = (skeleton: any, isPortrait: boolean) => {
    const floorOffset = isPortrait ? -70 : 30
    for (const name of floorBones) {
      const bone = skeleton.findBone(name)
      if (bone) bone.y = bone.data.y + floorOffset
    }

    const windowFrame = skeleton.findBone('EV/Window')
    if (windowFrame) windowFrame.y = windowFrame.data.y + (isPortrait ? -70 : 0)

    const purpleFrameOffset = isPortrait ? -72 : 33
    for (const name of purpleFrameBones) {
      const bone = skeleton.findBone(name)
      if (bone) bone.y = bone.data.y + purpleFrameOffset
    }
  }

  if (sharedCanvasEnabled.value && sharedCanvas.value) {
    const {
      AnimationState,
      AnimationStateData,
      AssetManager,
      AtlasAttachmentLoader,
      ManagedWebGLRenderingContext,
      SceneRenderer,
      Skeleton,
      SkeletonBinary
    } = await loadSpineWebglRuntime()

    if (componentDisposed || !sharedCanvas.value) return

    const canvas = sharedCanvas.value
    const context = new ManagedWebGLRenderingContext(canvas, {
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false
    })
    const renderer = new SceneRenderer(canvas, context, true)
    const assetManager = new AssetManager(context)
    let animationFrame = 0
    let stopped = false

    sharedRendererCleanup = () => {
      if (stopped) return
      stopped = true
      cancelAnimationFrame(animationFrame)
      assetManager.dispose()
      renderer.dispose()
      context.gl.getExtension('WEBGL_lose_context')?.loseContext()
    }

    for (const [binaryUrl] of layerAssets) assetManager.loadBinary(binaryUrl)
    for (const atlasUrl of new Set(layerAssets.map(([, atlasUrl]) => atlasUrl))) {
      assetManager.loadTextureAtlas(atlasUrl)
    }

    try {
      await assetManager.loadAll()
      if (componentDisposed || stopped) return

      const sharedLayers = layerAssets.map(([binaryUrl, atlasUrl, layer]) => {
        const atlas = assetManager.require(atlasUrl)
        const binary = new SkeletonBinary(new AtlasAttachmentLoader(atlas))
        const skeletonData = binary.readSkeletonData(assetManager.require(binaryUrl))
        const skeleton = new Skeleton(skeletonData)

        if (skeletonData.skins.length) {
          skeleton.setSkinByName(skeletonData.skins[0].name)
          skeleton.setSlotsToSetupPose()
        }

        const stateData = new AnimationStateData(skeletonData)
        stateData.defaultMix = 0.25
        const state = new AnimationState(stateData)
        state.setAnimation(0, 'animation', true)

        return { layer, skeleton, state }
      })

      let previousTime = performance.now()
      const render = (time: number) => {
        if (stopped) return
        animationFrame = requestAnimationFrame(render)

        const delta = Math.min((time - previousTime) / 1000, 0.1)
        previousTime = time
        const pixelRatio = isPhonePortrait
          ? Math.min(window.devicePixelRatio || 1, 1.25)
          : 1
        const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio))
        const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio))

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width
          canvas.height = height
        }

        const gl = context.gl
        gl.disable(gl.SCISSOR_TEST)
        gl.viewport(0, 0, width, height)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        const cssWidth = canvas.clientWidth
        const cssHeight = canvas.clientHeight
        const isTabletLandscape = isTouchPhoneOrTablet
          && cssWidth >= 600
          && cssWidth > cssHeight
        const isTabletPortrait = isTouchPhoneOrTablet
          && cssWidth >= 600
          && cssHeight > cssWidth
        const mapWidth = 1080
        const mapHeight = 785
        const mapAspect = mapWidth / mapHeight
        const stageHeight = isPhonePortrait
          ? cssHeight * 1.14
          : Math.max(cssHeight, cssWidth / mapAspect)
        const stageWidth = stageHeight * mapAspect
        const stageOffsetY = cssWidth >= 600
          ? Math.min(cssHeight * 0.04, Math.max(0, (cssWidth / mapAspect - cssHeight) / 2))
          : 0

        for (const { layer, skeleton, state } of sharedLayers) {
          state.update(delta)
          state.apply(skeleton)
          if (layer === 'foreground') applyForegroundOffsets(skeleton, cssHeight > cssWidth)
          skeleton.updateWorldTransform()

          const isForeground = layer === 'foreground'
          const layerScale = isForeground || !isTouchPhoneOrTablet || isTabletLandscape ? 1 : 0.7
          const layerWidth = stageWidth * layerScale
          const layerHeight = stageHeight * layerScale
          const layerLeft = (cssWidth - layerWidth) / 2
          const foregroundOffsetY = isForeground
            ? !isTouchPhoneOrTablet
              ? cssWidth >= 600 ? 72 : 0
              : isTabletLandscape ? 72 : isTabletPortrait ? -65 : 0
            : 0
          const layerTop = (cssHeight - layerHeight) / 2 + stageOffsetY + foregroundOffsetY
          const visibleLeft = Math.max(0, layerLeft)
          const visibleTop = Math.max(0, layerTop)
          const visibleRight = Math.min(cssWidth, layerLeft + layerWidth)
          const visibleBottom = Math.min(cssHeight, layerTop + layerHeight)
          const visibleCssWidth = Math.max(1, visibleRight - visibleLeft)
          const visibleCssHeight = Math.max(1, visibleBottom - visibleTop)
          const regionX = Math.round(visibleLeft * pixelRatio)
          const regionY = Math.round((cssHeight - visibleBottom) * pixelRatio)
          const regionWidth = Math.round(visibleCssWidth * pixelRatio)
          const regionHeight = Math.round(visibleCssHeight * pixelRatio)
          const layerCenterX = (visibleLeft + visibleRight) / 2 - layerLeft
          const layerCenterY = (visibleTop + visibleBottom) / 2 - layerTop
          const worldCenterX = -540 + (layerCenterX / layerWidth) * mapWidth
          const worldCenterY = 390 - (layerCenterY / layerHeight) * mapHeight
          const visibleWorldWidth = mapWidth * (visibleCssWidth / layerWidth)
          const visibleWorldHeight = mapHeight * (visibleCssHeight / layerHeight)
          const viewportX = worldCenterX - visibleWorldWidth / 2
          const viewportY = worldCenterY - visibleWorldHeight / 2

          gl.viewport(regionX, regionY, regionWidth, regionHeight)
          gl.enable(gl.SCISSOR_TEST)
          gl.scissor(regionX, regionY, regionWidth, regionHeight)
          renderer.camera.setViewport(regionWidth, regionHeight)
          renderer.camera.zoom = regionHeight / regionWidth > visibleWorldHeight / visibleWorldWidth
            ? visibleWorldWidth / regionWidth
            : visibleWorldHeight / regionHeight
          renderer.camera.position.x = viewportX + visibleWorldWidth / 2
          renderer.camera.position.y = viewportY + visibleWorldHeight / 2
          renderer.camera.update()
          renderer.begin()
          renderer.drawSkeleton(skeleton, true)
          renderer.end()
        }

        gl.disable(gl.SCISSOR_TEST)
      }

      spineReady.value = true
      animationFrame = requestAnimationFrame(render)
    } catch (error) {
      console.warn('[Core Tower] Shared-canvas fallback:', error)
      sharedRendererCleanup()
      sharedRendererCleanup = null
    }
    return
  }

})

onBeforeUnmount(() => {
  componentDisposed = true
  sharedRendererCleanup?.()
  sharedRendererCleanup = null
})
</script>

<template>
  <div
    class="core-tower-background"
    :class="{
      'uses-shared-canvas': sharedCanvasEnabled,
      'is-spine-ready': spineReady
    }"
    aria-hidden="true"
  >
    <img
      class="core-tower-ambient"
      src="/themes/core-tower/core-tower-visible.png"
      alt=""
      decoding="async"
    >
    <canvas ref="sharedCanvas" class="core-tower-shared-canvas"></canvas>
    <div class="core-tower-stage" :class="{ 'is-spine-ready': spineReady }">
      <img
        class="core-tower-scene"
        src="/themes/core-tower/core-tower-visible.png"
        alt=""
        decoding="async"
        fetchpriority="high"
      >
    </div>

    <div class="core-tower-reading-mask"></div>
    <div class="core-tower-scanlines"></div>
    <div class="core-tower-vignette"></div>
  </div>
</template>

<style>
body.theme-coretower {
  --vp-c-brand-1: #42dff2;
  --vp-c-brand-2: #47a9ff;
  --vp-c-brand-3: #b04cff;
  --vp-c-bg: #040812;
  --vp-c-bg-soft: #091321;
  --vp-c-bg-alt: #07101b;
  background-color: #02040a !important;
}

body.theme-coretower .VPNav,
body.theme-coretower .VPNavBar {
  background: linear-gradient(180deg, rgba(2, 7, 17, 0.88), rgba(4, 10, 22, 0.62)) !important;
  border-bottom-color: rgba(74, 218, 255, 0.24) !important;
  backdrop-filter: blur(14px) saturate(1.18);
  -webkit-backdrop-filter: blur(14px) saturate(1.18);
}

body.theme-coretower .VPDoc .content:not(.VPDocAsideOutline):not(.VPDocAsideOutline *),
body.theme-coretower .VPFeature,
body.theme-coretower .post-item {
  border-color: rgba(73, 216, 255, 0.2) !important;
  box-shadow: inset 0 1px 0 rgba(109, 232, 255, 0.08), 0 18px 50px rgba(0, 0, 0, 0.2);
}

html:not(.dark) body.theme-coretower .hero-home-text,
html:not(.dark) body.theme-coretower .story-heading h2 {
  color: #f4fbff !important;
  text-shadow: 0 2px 4px rgba(0, 8, 18, 0.9), 0 0 16px rgba(0, 12, 24, 0.62);
}

html:not(.dark) body.theme-coretower .hero-intro,
html:not(.dark) body.theme-coretower .story-item p {
  color: rgba(238, 249, 253, 0.94) !important;
  text-shadow: 0 2px 4px rgba(0, 7, 16, 0.88), 0 0 12px rgba(0, 10, 22, 0.58);
}

html:not(.dark) body.theme-coretower .eyebrow {
  color: #59e8ff !important;
  text-shadow: 0 2px 4px rgba(0, 8, 18, 0.88), 0 0 12px rgba(0, 13, 27, 0.56);
}

.core-tower-background {
  /* WZ map VR: left -540, right 540, top -590, bottom 195. */
  --core-map-width: 1080;
  --core-map-height: 785;
  position: fixed;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  min-height: 100svh;
  overflow: hidden;
  pointer-events: none;
  background: #02040a;
  isolation: isolate;
}

.core-tower-ambient {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  user-select: none;
}

.core-tower-ambient {
  object-fit: cover;
  transform: scale(1.08);
  filter: blur(clamp(18px, 2.3vw, 42px)) saturate(1.2) brightness(0.48);
  opacity: 0.72;
}

.core-tower-stage {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 50%;
  width: max(100vw, calc(100vh * 1080 / 785));
  height: max(100vh, calc(100vw * 785 / 1080));
  width: max(100vw, calc(100dvh * 1080 / 785));
  height: max(100dvh, calc(100vw * 785 / 1080));
  aspect-ratio: 1080 / 785;
  transform: translate3d(-50%, -50%, 0);
  overflow: hidden;
}

.core-tower-background.uses-shared-canvas {
  background:
    #02040a
    url('/themes/core-tower/core-tower-visible.png')
    center / cover
    no-repeat;
}

.core-tower-background.uses-shared-canvas.is-spine-ready {
  background-image: none;
}

.core-tower-background.uses-shared-canvas .core-tower-ambient,
.core-tower-background.uses-shared-canvas .core-tower-scene {
  display: none;
}

.core-tower-background.uses-shared-canvas .core-tower-shared-canvas {
  display: block;
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  visibility: hidden;
  pointer-events: none;
}

.core-tower-background.uses-shared-canvas.is-spine-ready .core-tower-shared-canvas {
  visibility: visible;
}

@media (max-width: 599px) and (orientation: portrait) {
  .core-tower-background.uses-shared-canvas {
    background-size: auto 114%;
  }

  .core-tower-stage {
    top: 50%;
    width: calc(114vh * 1080 / 785);
    height: 114vh;
    width: calc(114dvh * 1080 / 785);
    height: 114dvh;
  }

}

/* Desktop only: lower the complete WZ stage slightly without changing mobile. */
@media (min-width: 600px) {
  .core-tower-stage {
    top: calc(50% + min(4vh, max(0px, (100vw * 785 / 1080 - 100vh) / 2)));
    top: calc(50% + min(4dvh, max(0px, (100vw * 785 / 1080 - 100dvh) / 2)));
  }
}

.core-tower-scene {
  display: block;
  width: 100%;
  height: 100%;
  z-index: 1;
  object-fit: cover;
  object-position: 50% 50%;
  filter: saturate(1.04) contrast(1.025);
  user-select: none;
  transition: opacity 0.7s ease;
}

.core-tower-stage.is-spine-ready .core-tower-scene {
  opacity: 0;
}

.core-tower-shared-canvas {
  display: none;
}

.core-tower-reading-mask,
.core-tower-scanlines,
.core-tower-vignette {
  position: absolute;
  inset: 0;
  z-index: 3;
}

.core-tower-reading-mask {
  z-index: 2;
  background:
    linear-gradient(90deg, rgba(1, 7, 16, 0.38), rgba(3, 11, 22, 0.2) 48%, rgba(2, 7, 16, 0.34)),
    rgba(3, 10, 20, 0.12);
  transition: background 0.35s ease, opacity 0.35s ease;
}

html:not(.dark) .core-tower-reading-mask {
  background:
    linear-gradient(90deg, rgba(230, 244, 248, 0.14), rgba(226, 241, 246, 0.05) 48%, rgba(231, 244, 248, 0.12)),
    rgba(220, 238, 243, 0.03);
  -webkit-backdrop-filter: saturate(0.94);
  backdrop-filter: saturate(0.94);
}

html.dark .core-tower-reading-mask {
  background:
    linear-gradient(90deg, rgba(0, 4, 12, 0.52), rgba(1, 7, 17, 0.3) 48%, rgba(0, 4, 12, 0.48)),
    rgba(0, 5, 13, 0.2);
}

.core-tower-scanlines {
  z-index: 3;
  opacity: 0.08;
  background: repeating-linear-gradient(
    180deg,
    transparent 0,
    transparent 3px,
    rgba(84, 226, 255, 0.35) 4px
  );
  animation: coreTowerScan 14s linear infinite;
}

.core-tower-vignette {
  z-index: 4;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.14), transparent 20%, transparent 74%, rgba(0, 0, 0, 0.28)),
    radial-gradient(ellipse at center, transparent 46%, rgba(0, 0, 0, 0.28) 100%);
}

/* The shared renderer already carries the animated scene. Merge the three
   full-screen overlays into one static layer on every viewport to avoid extra
   compositor work without changing the stage sizing or desktop composition. */
.core-tower-background.uses-shared-canvas .core-tower-scanlines,
.core-tower-background.uses-shared-canvas .core-tower-vignette {
  display: none;
}

.core-tower-background.uses-shared-canvas .core-tower-reading-mask {
  z-index: 3;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  transition: none;
  background:
    repeating-linear-gradient(180deg, transparent 0, transparent 3px, rgba(84, 226, 255, 0.028) 4px),
    linear-gradient(180deg, rgba(0, 0, 0, 0.14), transparent 20%, transparent 74%, rgba(0, 0, 0, 0.28)),
    radial-gradient(ellipse at center, transparent 46%, rgba(0, 0, 0, 0.28) 100%),
    linear-gradient(90deg, rgba(1, 7, 16, 0.38), rgba(3, 11, 22, 0.2) 48%, rgba(2, 7, 16, 0.34)),
    rgba(3, 10, 20, 0.12);
}

html:not(.dark) .core-tower-background.uses-shared-canvas .core-tower-reading-mask {
  background:
    repeating-linear-gradient(180deg, transparent 0, transparent 3px, rgba(84, 226, 255, 0.022) 4px),
    linear-gradient(180deg, rgba(0, 0, 0, 0.1), transparent 20%, transparent 74%, rgba(0, 0, 0, 0.2)),
    radial-gradient(ellipse at center, transparent 46%, rgba(0, 0, 0, 0.22) 100%),
    linear-gradient(90deg, rgba(230, 244, 248, 0.14), rgba(226, 241, 246, 0.05) 48%, rgba(231, 244, 248, 0.12)),
    rgba(220, 238, 243, 0.03);
}

@keyframes coreTowerScan {
  from { transform: translateY(-8px); }
  to { transform: translateY(8px); }
}

/* 直向裝置仍使用同一個 1080 x 785 舞台，只會自然裁掉左右兩側。 */
@media (orientation: portrait) and (min-width: 600px) {
  .core-tower-ambient {
    opacity: 0.42;
  }
}

@media (max-width: 599px) and (orientation: portrait) {
  .core-tower-ambient {
    opacity: 0.32;
    filter: blur(24px) saturate(1.15) brightness(0.44);
  }
}

@media (prefers-reduced-motion: reduce) {
  .core-tower-scanlines {
    animation: none !important;
  }
}
</style>
