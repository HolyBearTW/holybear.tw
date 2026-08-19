<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import '@esotericsoftware/spine-player/dist/spine-player.css'

const back03 = ref<HTMLElement | null>(null)
const back02 = ref<HTMLElement | null>(null)
const back01 = ref<HTMLElement | null>(null)
const foreground = ref<HTMLElement | null>(null)
const mobileCanvas = ref<HTMLCanvasElement | null>(null)
const spineReady = ref(false)

let players: Array<{ dispose: () => void }> = []
let mobileRendererCleanup: (() => void) | null = null
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

  if (isPhonePortrait && mobileCanvas.value) {
    const {
      AnimationState,
      AnimationStateData,
      AssetManager,
      AtlasAttachmentLoader,
      ManagedWebGLRenderingContext,
      SceneRenderer,
      Skeleton,
      SkeletonBinary
    } = await import('@esotericsoftware/spine-webgl')

    if (componentDisposed || !mobileCanvas.value) return

    const canvas = mobileCanvas.value
    const context = new ManagedWebGLRenderingContext(canvas, {
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false
    })
    const renderer = new SceneRenderer(canvas, context, true)
    const assetManager = new AssetManager(context)
    let animationFrame = 0
    let stopped = false

    mobileRendererCleanup = () => {
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

      const mobileLayers = layerAssets.map(([binaryUrl, atlasUrl, layer]) => {
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
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25)
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

        for (const { layer, skeleton, state } of mobileLayers) {
          state.update(delta)
          state.apply(skeleton)
          if (layer === 'foreground') applyForegroundOffsets(skeleton, true)
          skeleton.updateWorldTransform()

          const isForeground = layer === 'foreground'
          const regionHeight = isForeground ? height : Math.round(height * 0.7 * 1.14)
          const regionY = isForeground ? 0 : Math.round((height - regionHeight) / 2)
          const screenRatio = width / height
          const visibleHeight = isForeground ? 785 / 1.14 : 785
          const visibleWidth = isForeground
            ? visibleHeight * screenRatio
            : (785 * screenRatio) / (0.7 * 1.14)
          const viewportX = -visibleWidth / 2
          const viewportY = -395 + (785 - visibleHeight) / 2

          gl.viewport(0, regionY, width, regionHeight)
          gl.enable(gl.SCISSOR_TEST)
          gl.scissor(0, regionY, width, regionHeight)
          renderer.camera.setViewport(width, regionHeight)
          renderer.camera.zoom = regionHeight / width > visibleHeight / visibleWidth
            ? visibleWidth / width
            : visibleHeight / regionHeight
          renderer.camera.position.x = viewportX + visibleWidth / 2
          renderer.camera.position.y = viewportY + visibleHeight / 2
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
      console.warn('[Core Tower] Mobile single-canvas fallback:', error)
      mobileRendererCleanup()
      mobileRendererCleanup = null
    }
    return
  }

  const { SpinePlayer } = await import('@esotericsoftware/spine-player')
  const desktopLayers = [
    [back03.value, ...layerAssets[0]],
    [back02.value, ...layerAssets[1]],
    [back01.value, ...layerAssets[2]],
    [foreground.value, ...layerAssets[3]]
  ] as const
  let loadedLayers = 0

  for (const [element, binaryUrl, atlasUrl, layer] of desktopLayers) {
    if (!element) continue

    const player = new SpinePlayer(element, {
      binaryUrl,
      atlasUrl,
      animation: 'animation',
      alpha: true,
      backgroundColor: '#00000000',
      showControls: false,
      showLoading: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      viewport: {
        // Map layer origin is (0, -200). Convert the WZ y-down VR to Spine y-up.
        x: -540,
        y: -395,
        width: 1080,
        height: 785,
        padLeft: 0,
        padRight: 0,
        padTop: 0,
        padBottom: 0
      },
      update(instance) {
        if (!instance.skeleton) return

        const isPortrait = window.innerHeight > window.innerWidth
        if (layer === 'foreground') {
          applyForegroundOffsets(instance.skeleton, isPortrait)
        }

        instance.skeleton.updateWorldTransform()
      },
      success(instance) {
        instance.speed = 1
        loadedLayers += 1
        if (loadedLayers === desktopLayers.length) spineReady.value = true
      },
      error(_instance, message) {
        console.warn(`[Core Tower] Spine layer fallback: ${message}`)
      }
    })

    players.push(player)
  }
})

onBeforeUnmount(() => {
  componentDisposed = true
  mobileRendererCleanup?.()
  mobileRendererCleanup = null
  for (const player of players) player.dispose()
  players = []
})
</script>

<template>
  <div class="core-tower-background" aria-hidden="true">
    <img
      class="core-tower-ambient"
      src="/themes/core-tower/core-tower-visible.png"
      alt=""
      decoding="async"
    >
    <div class="core-tower-stage" :class="{ 'is-spine-ready': spineReady }">
      <img
        class="core-tower-scene"
        src="/themes/core-tower/core-tower-visible.png"
        alt=""
        decoding="async"
        fetchpriority="high"
      >
      <canvas ref="mobileCanvas" class="core-tower-mobile-canvas"></canvas>
      <div ref="back03" class="core-tower-spine-layer core-tower-spine-back-03"></div>
      <div ref="back02" class="core-tower-spine-layer core-tower-spine-back-02"></div>
      <div ref="back01" class="core-tower-spine-layer core-tower-spine-back-01"></div>
      <!-- WZ particle positions converted from the map's 1080 x 785 VR coordinates. -->
      <img class="core-tower-wz-particle core-tower-wz-electric" src="/themes/core-tower/core-electric.png" alt="">
      <img class="core-tower-wz-particle core-tower-wz-glow" src="/themes/core-tower/core-glow.png" alt="">
      <img class="core-tower-wz-particle core-tower-wz-flare" src="/themes/core-tower/core-flare.png" alt="">
      <div ref="foreground" class="core-tower-spine-layer core-tower-spine-foreground"></div>
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

/* Desktop only: lower the complete WZ stage slightly without changing mobile. */
@media (min-width: 600px) {
  .core-tower-stage {
    top: calc(50% + min(4vh, max(0px, (100vw * 785 / 1080 - 100vh) / 2)));
    top: calc(50% + min(4dvh, max(0px, (100vw * 785 / 1080 - 100dvh) / 2)));
  }

  body.theme-coretower .core-tower-stage .core-tower-spine-foreground {
    transform: translate3d(0, 72px, 0) !important;
  }
}

/* Phone portrait: a centered 114% crop places the WZ roof at the top while
   pushing the floor lower, without changing any layer's relative position. */
@media (max-width: 599px) and (orientation: portrait) {
  .core-tower-background {
    background:
      #02040a
      url('/themes/core-tower/core-tower-visible.png')
      center / auto 114%
      no-repeat;
  }

  .core-tower-ambient,
  .core-tower-scene {
    display: none;
  }

  .core-tower-stage {
    top: 50%;
    width: calc(114vh * 1080 / 785);
    height: 114vh;
    width: calc(114dvh * 1080 / 785);
    height: 114dvh;
  }

  .core-tower-stage .core-tower-spine-back-03,
  .core-tower-stage .core-tower-spine-back-02,
  .core-tower-stage .core-tower-spine-back-01 {
    inset: 15%;
    width: 70%;
    height: 70%;
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0,
      rgb(0 0 0 / 0.55) 5%,
      #000 11%,
      #000 89%,
      rgb(0 0 0 / 0.55) 95%,
      transparent 100%
    );
    mask-image: linear-gradient(
      to bottom,
      transparent 0,
      rgb(0 0 0 / 0.55) 5%,
      #000 11%,
      #000 89%,
      rgb(0 0 0 / 0.55) 95%,
      transparent 100%
    );
  }

  .core-tower-stage .core-tower-mobile-canvas {
    display: block;
    position: absolute;
    inset: auto;
    top: calc(50% - 50vh);
    top: calc(50% - 50dvh);
    left: calc(50% - 50vw);
    z-index: 4;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    pointer-events: none;
  }

  .core-tower-spine-layer {
    display: none;
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

.core-tower-spine-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.core-tower-mobile-canvas {
  display: none;
}

.core-tower-spine-layer > div,
.core-tower-spine-layer .spine-player,
.core-tower-spine-layer canvas {
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
}

.core-tower-spine-layer .spine-player-controls,
.core-tower-spine-layer .spine-player-error {
  display: none !important;
}

.core-tower-spine-back-03 { z-index: 1; }
.core-tower-spine-back-02 { z-index: 2; }
.core-tower-spine-back-01 { z-index: 3; }
.core-tower-spine-foreground { z-index: 6; }

.core-tower-stage:not(.is-spine-ready) .core-tower-spine-layer {
  opacity: 0;
}

.core-tower-wz-particle {
  position: absolute;
  z-index: 5;
  pointer-events: none;
  mix-blend-mode: screen;
  transform: translate3d(-50%, -50%, 0);
  animation: coreTowerParticlePulse 7s ease-in-out infinite alternate;
}

.core-tower-wz-electric {
  /* Particle chrono_E_03_BackEffect/0: (0, -250). */
  left: 50%;
  top: 43.312%;
  width: 47.407%;
  opacity: 0.055;
  filter: hue-rotate(145deg) saturate(2.2) drop-shadow(0 0 14px #743dff);
}

.core-tower-wz-glow {
  /* Particle chrono_E_02_MidEffect/2: (0, -100). */
  left: 50%;
  top: 62.42%;
  width: 16.944%;
  opacity: 0.08;
  animation-delay: -2.5s;
}

.core-tower-wz-flare {
  /* Particle chrono_E_02_MidEffect/4: (0, -500). */
  left: 50%;
  top: 11.465%;
  width: 47.407%;
  opacity: 0.045;
  animation-delay: -4.5s;
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

@keyframes coreTowerParticlePulse {
  from { transform: translate3d(-50%, -50%, 0) scale(0.94); }
  to { transform: translate3d(-50%, -50%, 0) scale(1.06); }
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

/* 手機：畫面聚焦中央核心塔，不引入遊戲原本看不到的上下素材。 */
@media (max-width: 599px) and (orientation: portrait) {
  .core-tower-ambient {
    opacity: 0.32;
    filter: blur(24px) saturate(1.15) brightness(0.44);
  }

}

@media (prefers-reduced-motion: reduce) {
  .core-tower-wz-particle,
  .core-tower-scanlines {
    animation: none !important;
  }
}
</style>
