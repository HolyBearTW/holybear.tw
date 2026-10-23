import { cloudSparkles, introStreaks, shipFrameEnds, stars } from './sunsetSceneData'
import type { SunsetGpuContext } from './sunsetGpu'
import { createHorizontalRepeater, cubicBezier, cycleAt, easeInOut, easeOut, getBirdFrame, getCloudFlash, getCloudGlow, getCloudRush, getRimOpacity, getShipMotion, getSmokeProgress, progressAt, sampleKeyframes } from './sunsetDrawing'

export const sceneFiles = {
  sky: 'sky-clouds.webp',
  clouds: 'cloud-band.webp',
  cloudRim: 'cloud-band-glow.webp',
  front: 'foreground-clouds.webp',
  glow: 'foreground-clouds-glow.webp',
  islands: 'floating-islands.webp',
  islandRim: 'floating-islands-rim.webp',
  birds: 'birds-flap.webp',
  birdRim: 'birds-rim.webp',
  ship: 'ship-frames.webp',
  shipRim: 'ship-rim.webp',
  smoke1: 'smoke-puff-1.webp',
  smoke2: 'smoke-puff-2.webp',
  smoke3: 'smoke-puff-3.webp',
  introSea: 'intro-clouds.webp',
  introBand: 'intro-cloud-band.webp',
  introWall: 'intro-cloud-wall.webp'
} as const

export type SceneAsset = keyof typeof sceneFiles
export type SceneImages = Record<SceneAsset, HTMLImageElement>

const islands = [
  { x: .048037492677, y: -.12315270936, w: .044522554189, h: .344827586207, sx: .068669527897, sy: 0, period: 6500, lift: 20.48, sway: 8.96, tilt: 3, rock: 5200, enter: 2150.4, duration: 2200, delay: 450, glintDelay: 400 },
  { x: .888107791447, y: .07881773399, w: .111892208553, h: .862068965517, sx: 1, sy: .571428571429, period: 8000, lift: 15.36, sway: 6.4, tilt: 1.5, rock: 7000, enter: 819.2, duration: 1700, delay: 300, glintDelay: 1300 },
  { x: .608084358524, y: .192118226601, w: .018160515524, h: .128078817734, sx: .643198090692, sy: .367231638418, period: 4800, lift: 28.16, sway: 11.52, tilt: 5, rock: 3600, enter: 1228.8, duration: 1900, delay: 550, glintDelay: 100 },
  { x: 0, y: .463054187192, w: .052138254247, h: .428571428571, sx: 0, sy: .810344827586, period: 7200, lift: 23.04, sway: 7.68, tilt: 2.5, rock: 6000, enter: 2304, duration: 2300, delay: 350, glintDelay: 1900 },
  { x: .825424721734, y: .645320197044, w: .026947861746, h: .177339901478, sx: .866345574955, sy: 1, period: 5600, lift: 25.6, sway: 10.24, tilt: 4, rock: 4400, enter: 921.6, duration: 1800, delay: 600, glintDelay: 900 }
]
const flocks = [
  { y: 192, scale: 1, period: 34000, delay: -5000 },
  { y: 352, scale: .8, period: 55000, delay: -30000 },
  { y: 112, scale: .9, period: 33330, delay: -15430 },
  { y: 448, scale: .7, period: 68570, delay: -45000 },
  { y: 261.12, scale: .75, period: 53330, delay: -17330 }
]
const smokePuffs = [
  { asset: 'smoke2', x: -332.8, y: 236.8, w: 768, h: 652.8, dx: -153.6, dy: -281.6, rotation: -8, delay: 270 },
  { asset: 'smoke1', x: 0, y: 506.88, w: 614.4, h: 522.24, dx: -102.4, dy: 256, rotation: 6, delay: 330 },
  { asset: 'smoke3', x: -409.6, y: 565.76, w: 716.8, h: 609.28, dx: -179.2, dy: 256, rotation: -5, delay: 250 },
  { asset: 'smoke3', x: 102.4, y: 166.4, w: 512, h: 435.2, dx: -76.8, dy: -281.6, rotation: 8, delay: 340 },
  { asset: 'smoke1', x: -179.2, y: 408.32, w: 665.6, h: 565.76, dx: -153.6, dy: 179.2, rotation: -3, delay: 290 }
] as const

// The cloud wall reveals the sunset while the acceleration scene leaves.
export const sunlightX = 2250
export const accelerationReveal = 1950
export const accelerationDuration = 2700

export function createSunsetScene(images: SceneImages) {
  let lightX = sunlightX
  const islandOffsets = islands.map(() => 0)
  let islandOffsetY = 0
  const repeater = createHorizontalRepeater()
  const textures = new Map<string, HTMLCanvasElement>()
  let viewportKey = ''
  let front: HTMLCanvasElement | undefined
  let frontGlow: HTMLCanvasElement | undefined
  let frontFlash: HTMLCanvasElement | undefined
  let bandMask: HTMLCanvasElement | undefined
  let bandFrame: HTMLCanvasElement | undefined
  let bandContext: CanvasRenderingContext2D | null = null
  const blendBuffers = new Map<string, { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D }>()

  // Keep blend operations inside the affected rectangle instead of the whole viewport.
  function blendRegion(name: string, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, paint: (layer: CanvasRenderingContext2D) => void) {
    if ((ctx as SunsetGpuContext).isSunsetGpu) {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      paint(ctx)
      ctx.restore()
      return
    }
    const matrix = ctx.getTransform()
    const corners = [[x, y], [x + width, y], [x, y + height], [x + width, y + height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix))
    const left = Math.max(0, Math.floor(Math.min(...corners.map(point => point.x))))
    const top = Math.max(0, Math.floor(Math.min(...corners.map(point => point.y))))
    const right = Math.min(ctx.canvas.width, Math.ceil(Math.max(...corners.map(point => point.x))))
    const bottom = Math.min(ctx.canvas.height, Math.ceil(Math.max(...corners.map(point => point.y))))
    const w = right - left
    const h = bottom - top
    if (w <= 0 || h <= 0) return
    let buffer = blendBuffers.get(name)
    if (!buffer) {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { alpha: false })
      if (!context) return
      buffer = { canvas, context }
      blendBuffers.set(name, buffer)
    }
    if (buffer.canvas.width < w) buffer.canvas.width = w
    if (buffer.canvas.height < h) buffer.canvas.height = h
    const layer = buffer.context
    layer.resetTransform()
    layer.globalAlpha = 1
    layer.globalCompositeOperation = 'source-over'
    layer.drawImage(ctx.canvas, left, top, w, h, 0, 0, w, h)
    layer.save()
    layer.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e - left, matrix.f - top)
    layer.globalCompositeOperation = 'screen'
    paint(layer)
    layer.restore()
    ctx.save()
    ctx.resetTransform()
    ctx.globalAlpha = 1
    ctx.drawImage(buffer.canvas, 0, 0, w, h, left, top, w, h)
    ctx.restore()
  }

  function bitmap(name: string, width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
    const cached = textures.get(name)
    if (cached) return cached
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width))
    canvas.height = Math.max(1, Math.round(height))
    const ctx = canvas.getContext('2d')
    if (ctx) paint(ctx)
    textures.set(name, canvas)
    return canvas
  }

  function viewportLayers(width: number, height: number, ratio: number, scale: number, left: number) {
    const key = `${width}:${height}:${ratio}`
    if (key === viewportKey) return
    for (const [name, texture] of textures) {
      if (!name.startsWith('viewport-')) continue
      texture.width = texture.height = 1
      textures.delete(name)
    }
    const paintWorld = (ctx: CanvasRenderingContext2D) => {
      ctx.setTransform(ratio * scale, 0, 0, ratio * scale, left * ratio, 0)
    }
    front = bitmap('viewport-front', width * ratio, height * ratio, ctx => {
      paintWorld(ctx)
      ctx.drawImage(images.front, 0, 384, 2560, 1696)
    })
    const glowLayer = (name: string, flash: boolean) => bitmap(name, width * ratio, Math.min(800 * scale, Math.max(1, height - 384 * scale)) * ratio, ctx => {
      paintWorld(ctx)
      ctx.translate(0, -384)
      ctx.drawImage(images.glow, 0, 384, 2560, 800)
      ctx.globalCompositeOperation = 'destination-in'
      const radius = Math.hypot(1733.12, 1526.4)
      const mask = ctx.createRadialGradient(lightX + 1.12, 553.6, 0, lightX + 1.12, 553.6, radius)
      if (flash) {
        mask.addColorStop(.25, '#000')
        mask.addColorStop(.6, 'rgba(0,0,0,.75)')
        mask.addColorStop(1, 'rgba(0,0,0,.5)')
      } else {
        mask.addColorStop(0, '#000')
        mask.addColorStop(.22, 'rgba(0,0,0,.4)')
        mask.addColorStop(.45, 'transparent')
      }
      ctx.fillStyle = mask
      ctx.fillRect(0, 384, 2560, 1696)
    })
    frontGlow = glowLayer('viewport-front-glow', false)
    frontFlash = glowLayer('viewport-front-flash', true)
    const bandHeight = Math.ceil(399.36 * scale * ratio)
    bandMask = bitmap('viewport-band-mask', width * ratio, bandHeight, ctx => {
      ctx.setTransform(ratio * scale, 0, 0, ratio * scale, left * ratio, 0)
      ctx.translate(lightX + 1.12, 24.32)
      ctx.scale(1792, 665.6)
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      gradient.addColorStop(.25, '#000')
      gradient.addColorStop(1, 'rgba(0,0,0,.5)')
      ctx.fillStyle = gradient
      ctx.fillRect(-4, -4, 8, 8)
    })
    bandFrame = bitmap('viewport-band-frame', width * ratio, bandHeight, () => {})
    bandContext = bandFrame.getContext('2d')
    viewportKey = key
  }

  function pointTexture(cross: boolean, cloud = false) {
    const texture = bitmap(`point-${cross}-${cloud}`, 256, 256, ctx => {
      ctx.translate(128, 128)
      const radius = Math.SQRT2 * 32
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
      gradient.addColorStop(0, '#fff')
      gradient.addColorStop(cloud ? .09 : .16, '#fff')
      gradient.addColorStop(cloud ? .18 : .3, cloud ? 'rgba(255,240,190,.85)' : 'rgba(214,206,255,.85)')
      if (!cloud) gradient.addColorStop(.52, 'rgba(146,132,253,.32)')
      gradient.addColorStop(cloud ? .45 : .7, cloud ? 'rgba(255,220,150,0)' : 'rgba(146,132,253,0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(0, 0, 32, 0, Math.PI * 2)
      ctx.fill()
      if (!cross) return
      for (let axis = 0; axis < 2; axis++) {
        const half = cloud ? 32 : 115.2
        const line = ctx.createLinearGradient(-half, 0, half, 0)
        const edge = cloud ? 'rgba(255,252,239,0)' : 'rgba(236,232,255,0)'
        line.addColorStop(0, edge)
        line.addColorStop(cloud ? .35 : .5, cloud ? '#fffcef' : 'rgba(236,232,255,.95)')
        if (cloud) line.addColorStop(.65, '#fffcef')
        line.addColorStop(1, edge)
        ctx.fillStyle = line
        ctx.fillRect(-half, cloud ? -1.6 : -2.56, half * 2, cloud ? 3.2 : 5.12)
        ctx.rotate(Math.PI / 2)
      }
    })
    return cloud ? bitmap('point-cloud-glow', 256, 256, ctx => {
      ctx.filter = 'drop-shadow(0px 0px 10px rgba(255,236,180,.95))'
      ctx.drawImage(texture, 0, 0)
    }) : texture
  }

  function sunTexture(kind: 'rays' | 'glow' | 'glint') {
    const texture = bitmap(`sun-${kind}`, 512, 512, ctx => {
      ctx.translate(256, 256)
      if (kind === 'rays') {
        const gradient = ctx.createConicGradient(-Math.PI / 2, 0, 0)
        const thin = [[26.6, 27, 27.4, 1], [69.4, 70, 70.6, .9], [117.7, 118, 118.3, 1], [130.5, 131, 131.5, .85], [173.6, 174, 174.4, 1], [221.4, 222, 222.6, .95], [267.65, 268, 268.35, 1], [311.5, 312, 312.5, .9], [349.7, 350, 350.3, .95]]
        gradient.addColorStop(0, 'rgba(255,252,240,0)')
        for (const [start, peak, end, alpha] of thin) {
          gradient.addColorStop(start / 360, 'rgba(255,252,240,0)')
          gradient.addColorStop(peak / 360, `rgba(255,252,240,${alpha})`)
          gradient.addColorStop(end / 360, 'rgba(255,252,240,0)')
        }
        gradient.addColorStop(1, 'rgba(255,252,240,0)')
        ctx.fillStyle = gradient
        ctx.fillRect(-256, -256, 512, 512)
        const broad = ctx.createConicGradient(-Math.PI / 2, 0, 0)
        broad.addColorStop(0, 'rgba(255,240,205,0)')
        for (const [angle, spread, alpha] of [[8, 2, .6], [52, 1.5, .55], [97, 2.5, .7], [148, 1.75, .5], [201, 2.25, .65], [246, 1.5, .55], [292, 2.5, .7], [333, 1.75, .55]]) {
          broad.addColorStop((angle - spread) / 360, 'rgba(255,240,205,0)')
          broad.addColorStop(angle / 360, `rgba(255,240,205,${alpha})`)
          broad.addColorStop((angle + spread) / 360, 'rgba(255,240,205,0)')
        }
        broad.addColorStop(1, 'rgba(255,240,205,0)')
        ctx.fillStyle = broad
        ctx.fillRect(-256, -256, 512, 512)
        ctx.globalCompositeOperation = 'destination-in'
        const mask = ctx.createRadialGradient(0, 0, 0, 0, 0, 256)
        mask.addColorStop(0, '#000')
        mask.addColorStop(.35, 'rgba(0,0,0,.62)')
        mask.addColorStop(1, 'transparent')
        ctx.fillStyle = mask
        ctx.fillRect(-256, -256, 512, 512)
      } else if (kind === 'glow') {
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 256)
        for (const [stop, color] of [[0, '#fffffa'], [.09, '#fff6d6e6'], [.3, '#ffd69673'], [.6, '#ffbe7826'], [1, '#ffb46e00']] as const) gradient.addColorStop(stop, color)
        ctx.fillStyle = gradient
        ctx.fillRect(-256, -256, 512, 512)
      } else {
        ctx.shadowColor = 'rgba(255,240,200,.9)'
        ctx.shadowBlur = 22
        for (let axis = 0; axis < 2; axis++) {
          const gradient = ctx.createLinearGradient(-220, 0, 220, 0)
          gradient.addColorStop(0, 'rgba(255,255,255,0)')
          gradient.addColorStop(.5, 'rgba(255,255,255,.95)')
          gradient.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.fillStyle = gradient
          ctx.fillRect(-220, -11, 440, 22)
          ctx.rotate(Math.PI / 2)
        }
      }
    })
    return kind === 'rays' ? bitmap('sun-rays-soft', 512, 512, ctx => {
      ctx.filter = 'blur(1.70667px)'
      ctx.drawImage(texture, 0, 0)
    }) : texture
  }

  function shipFrame(ctx: CanvasRenderingContext2D, time: number, x: number, y: number, width: number, height: number) {
    const phase = time % 1970
    const frame = Math.max(0, shipFrameEnds.findIndex(end => end > phase))
    const cellWidth = images.ship.naturalWidth / 8
    const cellHeight = cellWidth * 243 / 256
    ctx.drawImage(images.ship, frame % 8 * cellWidth, Math.floor(frame / 8) * cellHeight, cellWidth, cellHeight, x, y, width, height)
  }

  function drawStars(ctx: CanvasRenderingContext2D, time: number) {
    for (const star of stars) {
      const progress = cycleAt(time, star.period, star.delay)
      const alpha = sampleKeyframes(progress, [[0, .25], [.12, 1], [.24, .45], [.38, .85], [.6, .3], [1, .25]]) * star.peak
      const size = star.size * sampleKeyframes(progress, [[0, .6], [.12, 1], [.24, .75], [.38, .9], [.6, .65], [1, .6]])
      ctx.globalAlpha = alpha
      ctx.drawImage(pointTexture(star.cross), star.x - size * 2, star.y - size * 2, size * 4, size * 4)
    }
    ctx.globalAlpha = 1
  }

  function drawSun(ctx: CanvasRenderingContext2D, time: number) {
    const progress = progressAt(time, 1200, 2100)
    if (!progress) return
    const enter = cubicBezier(progress, .3, .55, .35, 1)
    const alpha = sampleKeyframes(progress, [[0, 0], [.35, 1], [1, 1]], value => cubicBezier(value, .3, .55, .35, 1))
    blendRegion('sun', ctx, lightX - 450, 553 + 358.4 * (1 - enter) - 450, 900, 900, ctx => {
    ctx.save()
    ctx.translate(lightX, 553 + 358.4 * (1 - enter))
    ctx.save()
    ctx.rotate(cycleAt(time, 70000) * Math.PI * 2)
    ctx.globalAlpha = alpha * sampleKeyframes(cycleAt(time, 6900), [[0, .7], [.16, .7], [.22, 1], [.3, .75], [.62, .7], [.68, 1], [.76, .75], [1, .7]])
    ctx.drawImage(sunTexture('rays'), -384, -384, 768, 768)
    ctx.restore()
    const pulse = cycleAt(time, 3400)
    const size = 460.8 * sampleKeyframes(pulse, [[0, 1], [.18, 1.06], [.35, .96], [.52, 1.09], [.7, .95], [1, 1]])
    ctx.globalAlpha = alpha * sampleKeyframes(pulse, [[0, .9], [.18, 1], [.35, .82], [.52, 1], [.7, .78], [1, .9]])
    ctx.drawImage(sunTexture('glow'), -size / 2, -size / 2, size, size)
    const glint = cycleAt(time, 2700)
    ctx.rotate(sampleKeyframes(glint, [[0, 0], [.3, 20], [.6, 35], [1, 0]]) * Math.PI / 180)
    const glintSize = 230.4 * sampleKeyframes(glint, [[0, .45], [.3, 1.15], [.45, .7], [.6, 1], [1, .45]])
    ctx.globalAlpha = alpha * sampleKeyframes(glint, [[0, .3], [.3, 1], [.45, .6], [.6, .95], [1, .3]])
    ctx.drawImage(sunTexture('glint'), -glintSize / 2, -glintSize / 2, glintSize, glintSize)
    ctx.restore()
    })
  }

  function drawBirds(ctx: CanvasRenderingContext2D, time: number) {
    const rimEnter = easeOut(progressAt(time, 800, 3000))
    for (const flock of flocks) {
      const flyX = 2764.8 - cycleAt(time, flock.period, flock.delay) * 3788.8
      for (let bird = 0; bird < 3; bird++) {
        const scale = flock.scale * (bird === 2 ? .72 : 1)
        const w = 57.80645161216 * scale
        const h = w * 60 / 140
        const frame = getBirdFrame(time, bird)
        const bob = sampleKeyframes(cycleAt(time, [2400, 2900, 2200][bird], [0, 500, 900][bird]), [[0, 0], [.5, -14.4], [1, 0]])
        const originX = bird === 2 ? 57.80645161216 * .14 : 0
        const originY = bird === 2 ? 24.77419354807 * .14 : 0
        const x = flyX + ([0, 83.2, 156.8][bird] - 3.30322580736 + originX) * flock.scale
        const y = flock.y + ([0, 35.2, -22.4][bird] + bob + 3.30322580736 + originY) * flock.scale
        ctx.drawImage(images.birds, frame * 140, 0, 140, 60, x, y, w, h)
        if (!rimEnter) continue
        const distance = Math.hypot(x + w / 2 - lightX, y + h / 2 - 553)
        const light = sampleKeyframes(distance, [[0, 1], [150, 1], [650, .75], [1250, .35], [2000, 0]], value => value)
        const right = Math.max(0, Math.min(1, (lightX + 30 - x - w / 2) / 60))
        ctx.globalAlpha = rimEnter * light * right
        ctx.drawImage(images.birdRim, frame * 140, 0, 140, 60, x, y, w, h)
        ctx.globalAlpha = rimEnter * light * (1 - right)
        ctx.drawImage(images.birdRim, frame * 140, 60, 140, 60, x, y, w, h)
        ctx.globalAlpha = 1
      }
    }
  }

  function drawIsland(ctx: CanvasRenderingContext2D, index: number, time: number) {
    const island = islands[index]
    const enterProgress = progressAt(time, island.duration, island.delay)
    if (!enterProgress) return
    const easing = (value: number) => cubicBezier(value, .16, 1, .3, 1)
    const enter = easing(enterProgress)
    const alpha = sampleKeyframes(enterProgress, [[0, 0], [.3, 1], [1, 1]], easing)
    const drift = cycleAt(time, island.period)
    const dx = sampleKeyframes(drift, [[0, 0], [.25, island.sway], [.5, 0], [.75, -island.sway], [1, 0]])
    const dy = sampleKeyframes(drift, [[0, 0], [.25, -island.lift], [.5, -.35 * island.lift], [.75, -.8 * island.lift], [1, 0]])
    const w = 1707 * island.w
    const h = 203 * island.h
    const sw = images.islands.naturalWidth * island.w
    const sh = images.islands.naturalHeight * island.h
    const sx = (images.islands.naturalWidth - sw) * island.sx
    const sy = (images.islands.naturalHeight - sh) * island.sy
    ctx.save()
    ctx.translate(418 + 1707 * island.x + w / 2 + islandOffsets[index] + island.enter * (1 - enter), 596 + 203 * island.y + h / 2 + islandOffsetY)
    ctx.rotate((-island.tilt + 2 * island.tilt * easeInOut(cycleAt(time, island.rock, 0, true))) * Math.PI / 180)
    ctx.translate(dx, dy)
    ctx.globalAlpha = alpha
    ctx.drawImage(images.islands, sx, sy, sw, sh, -w / 2, -h / 2, w, h)
    const rimAlpha = alpha * getRimOpacity(time, 1440, island.glintDelay)
    if (rimAlpha > 0) blendRegion('island-' + index, ctx, -w / 2, -h / 2, w, h, layer => {
      layer.globalAlpha = rimAlpha
      layer.drawImage(images.islandRim, sx, sy, sw, sh, -w / 2, -h / 2, w, h)
    })
    ctx.restore()
  }

  function drawBandGlint(ctx: CanvasRenderingContext2D, time: number, ratio: number, scale: number, left: number, visibleLeft: number, visibleRight: number) {
    const alpha = getCloudFlash(time, true)
    if ((ctx as SunsetGpuContext).isSunsetGpu) {
      if (!alpha) return
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.globalCompositeOperation = 'screen'
      ;(ctx as SunsetGpuContext).setRadialMask({ x: lightX + 1.12, y: 552.96, rx: 1792, ry: 665.6, stops: [[.25, 1], [1, .5]] })
      repeater.draw(ctx, images.cloudRim, 528.64, 399.36, time / 1000, visibleLeft, visibleRight, getCloudRush(time, false))
      ctx.restore()
      return
    }
    if (!alpha || !bandFrame || !bandContext || !bandMask) return
    bandContext.resetTransform()
    bandContext.clearRect(0, 0, bandFrame.width, bandFrame.height)
    bandContext.setTransform(ratio * scale, 0, 0, ratio * scale, left * ratio, 0)
    repeater.draw(bandContext, images.cloudRim, 0, 399.36, time / 1000, visibleLeft, visibleRight, getCloudRush(time, false))
    bandContext.resetTransform()
    bandContext.globalCompositeOperation = 'destination-in'
    bandContext.drawImage(bandMask, 0, 0)
    bandContext.globalCompositeOperation = 'source-over'
    ctx.save()
    ctx.resetTransform()
    const y = Math.round(528.64 * scale * ratio)
    blendRegion('band-light', ctx, 0, y, bandFrame.width, bandFrame.height, layer => {
      layer.globalAlpha = alpha
      layer.drawImage(bandFrame!, 0, y)
    })
    ctx.restore()
  }

  function drawCloudLight(ctx: CanvasRenderingContext2D, time: number, glowTop: number) {
    if ((ctx as SunsetGpuContext).isSunsetGpu) {
      const radius = Math.hypot(1733.12, 1526.4)
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = getCloudFlash(time)
      if (ctx.globalAlpha > 0) {
        ;(ctx as SunsetGpuContext).setRadialMask({ x: lightX + 1.12, y: 553.6, rx: radius, ry: radius, stops: [[.25, 1], [.6, .75], [1, .5]] })
        ctx.drawImage(images.glow, 0, 384, 2560, 800)
      }
      ctx.globalAlpha = getCloudGlow(time)
      if (ctx.globalAlpha > 0) {
        ;(ctx as SunsetGpuContext).setRadialMask({ x: lightX + 1.12, y: 553.6, rx: radius, ry: radius, stops: [[0, 1], [.22, .4], [.45, 0]] })
        ctx.drawImage(images.glow, 0, 384, 2560, 800)
      }
      ctx.restore()
    } else {
    ctx.save()
    ctx.resetTransform()
    const flashAlpha = getCloudFlash(time)
    const glowAlpha = getCloudGlow(time)
    if (frontGlow && (flashAlpha > 0 || glowAlpha > 0)) blendRegion('front-light', ctx, 0, glowTop, frontGlow.width, frontGlow.height, layer => {
      if (flashAlpha > 0 && frontFlash) { layer.globalAlpha = flashAlpha; layer.drawImage(frontFlash, 0, glowTop) }
      if (glowAlpha > 0 && frontGlow) { layer.globalAlpha = glowAlpha; layer.drawImage(frontGlow, 0, glowTop) }
    })
    ctx.restore()
    }
    for (const sparkle of cloudSparkles) {
      if (time < sparkle.delay) continue
      const progress = cycleAt(time, sparkle.period, sparkle.delay)
      const opacity = sampleKeyframes(progress, [[0, 0], [.08, sparkle.peak], [.18, 0], [1, 0]])
      if (!opacity) continue
      const size = sparkle.size * sampleKeyframes(progress, [[0, .2], [.08, 1], [.18, .35], [1, .2]])
      ctx.save()
      ctx.translate(sparkle.x, sparkle.y)
      ctx.rotate(sampleKeyframes(progress, [[0, 0], [.08, 25], [.18, 45], [1, 0]]) * Math.PI / 180)
      ctx.globalAlpha = opacity
      ctx.drawImage(pointTexture(true, true), -size * 2, -size * 2, size * 4, size * 4)
      ctx.restore()
    }
  }

  function shockTexture() {
    return bitmap('ship-shock', 512, 512, ctx => {
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256 * Math.SQRT2)
      gradient.addColorStop(.43, 'rgba(255,244,222,0)')
      gradient.addColorStop(.485, 'rgba(255,244,222,.95)')
      gradient.addColorStop(.505, 'rgba(255,186,140,.65)')
      gradient.addColorStop(.57, 'rgba(255,186,140,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 512, 512)
      ctx.globalCompositeOperation = 'destination-in'
      const mask = ctx.createConicGradient(-Math.PI / 2, 256, 256)
      for (const [angle, color] of [[0, 'transparent'], [18, 'transparent'], [55, '#000'], [125, '#000'], [162, 'transparent'], [360, 'transparent']] as const) mask.addColorStop(angle / 360, color)
      ctx.fillStyle = mask
      ctx.fillRect(0, 0, 512, 512)
    })
  }

  function drawShip(ctx: CanvasRenderingContext2D, time: number, reducedMotion: boolean) {
    const motion = getShipMotion(time, reducedMotion)
    ctx.save()
    ctx.translate(motion.x, motion.y)
    ctx.rotate(motion.rotation)
    ctx.scale(motion.scale, motion.scale)
    ctx.translate(0, motion.transformY)
    shipFrame(ctx, time, -198.4, -188.48, 396.8, 376.96)
    const rimAlpha = getRimOpacity(time, 1800)
    if (rimAlpha > 0) blendRegion('ship-rim', ctx, -198.4, -188.48, 396.8, 376.96, layer => {
      layer.globalAlpha = rimAlpha
      layer.drawImage(images.shipRim, -198.4, -188.48, 396.8, 376.96)
    })
    if (!reducedMotion && time >= 770 && time < 2770) {
      const alpha = sampleKeyframes(progressAt(time, 2000, 770), [[0, 0], [.15, 1], [.7, .85], [1, 0]], easeOut)
      const jitter = sampleKeyframes(cycleAt(time, 130), [[0, 0], [.2, -.0117], [.4, .0093], [.6, -.0073], [.8, .01], [1, 0]], value => value) * 376.1664
      ctx.globalAlpha = alpha
      ctx.drawImage(shockTexture(), -90.23232 + jitter, -168.237248, 376.1664, 376.168384)
    }
    ctx.restore()
    if (reducedMotion) return
    for (const puff of smokePuffs) {
      const image = images[puff.asset]
      const phase = getSmokeProgress(time, puff.delay)
      if (!image || !phase) continue
      const fit = Math.min(puff.w / image.naturalWidth, puff.h / image.naturalHeight)
      const w = image.naturalWidth * fit
      const h = image.naturalHeight * fit
      ctx.save()
      ctx.globalAlpha = phase.opacity
      ctx.translate(puff.x + puff.w / 2 + puff.dx * phase.travel, puff.y + puff.h / 2 + puff.dy * phase.travel)
      ctx.rotate(puff.rotation * phase.travel * Math.PI / 180)
      ctx.scale(phase.scale, phase.scale)
      ctx.drawImage(image, -w / 2, -h / 2, w, h)
      ctx.restore()
    }
  }

  function drawAcceleration(ctx: CanvasRenderingContext2D, time: number, worldHeight: number, visibleLeft: number, visibleRight: number) {
    if (time >= accelerationDuration) return
    if (time < accelerationReveal) {
      const gradient = ctx.createLinearGradient(0, 0, 0, worldHeight)
      for (const [stop, color] of [[0, '#565284'], [.16, '#7a6a99'], [.32, '#b88594'], [.46, '#e09a8b'], [.6, '#f9bb80'], [.8, '#fdd98e']] as const) gradient.addColorStop(stop, color)
      ctx.fillStyle = gradient
      ctx.fillRect(visibleLeft, 0, visibleRight - visibleLeft, worldHeight)
      ctx.save()
      const shake = progressAt(time, 2100)
      const shakeX = sampleKeyframes(shake, [[0, 0], [.16, 0], [.19, .35], [.22, -.3], [.25, .2], [.27, -.15], [.3, 0], [.62, 0], [.66, .4], [.7, -.4], [.74, .35], [.78, -.3], [.82, .15], [.86, 0], [1, 0]], value => value) * 25.6
      const shakeY = sampleKeyframes(shake, [[0, 0], [.16, 0], [.19, -.3], [.22, .35], [.25, .15], [.27, -.2], [.3, 0], [.62, 0], [.66, .3], [.7, -.35], [.74, -.3], [.78, .3], [.82, -.1], [.86, 0], [1, 0]], value => value) * 25.6
      ctx.translate(shakeX, shakeY)
      ctx.globalAlpha = .75
      repeater.draw(ctx, images.introBand, worldHeight * .42, worldHeight * .22, 0, visibleLeft - 20, visibleRight + 20, time / 4608 * worldHeight * .22 * 6.06)
      ctx.globalAlpha = 1
      repeater.draw(ctx, images.introSea, worldHeight * .44, worldHeight * .64, 0, visibleLeft - 20, visibleRight + 20, time / 1728 * worldHeight * .64 * 4)
      for (const streak of introStreaks) {
        const width = streak.width * 2560
        const x = 2560 - cycleAt(time, streak.period, streak.delay) * (2560 + width)
        const line = ctx.createLinearGradient(x, 0, x + width, 0)
        line.addColorStop(0, 'rgba(255,246,232,.95)')
        line.addColorStop(1, 'transparent')
        ctx.fillStyle = line
        ctx.globalAlpha = streak.opacity
        ctx.fillRect(x, streak.y * worldHeight, width, Math.max(1, streak.height * 2560))
      }
      ctx.globalAlpha = 1
      const shipWidth = Math.min(1075.2, worldHeight * .76)
      if (time >= 1302) {
        const progress = progressAt(time, 650, 1302)
        const opacity = sampleKeyframes(progress, [[0, 0], [.1, 1], [.4, 1], [1, 0]], easeOut)
        const sx = sampleKeyframes(progress, [[0, .15], [1, 1.5]], easeOut)
        const sy = sampleKeyframes(progress, [[0, .45], [1, 2.1]], easeOut)
        ctx.save()
        ctx.translate(691.2 + shipWidth * .2, worldHeight / 2)
        ctx.scale(sx, sy)
        ctx.globalAlpha = opacity
        ctx.globalCompositeOperation = 'screen'
        const ring = bitmap('intro-boom', 512, 512, painter => {
          const radial = painter.createRadialGradient(256, 256, 0, 256, 256, 256)
          for (const [stop, color] of [[.605, 'rgba(255,255,255,0)'], [.635, 'rgba(255,255,255,.5)'], [.67, '#fff'], [.7, 'rgba(255,246,230,.8)'], [.735, 'rgba(255,210,165,.3)'], [.78, 'rgba(255,210,165,0)']] as const) radial.addColorStop(stop, color)
          painter.fillStyle = radial
          painter.fillRect(0, 0, 512, 512)
        })
        ctx.drawImage(ring, -shipWidth * .35, -shipWidth * .35, shipWidth * .7, shipWidth * .7)
        ctx.restore()
      }
      ctx.restore()
      const progress = progressAt(time, 2100)
      const flyEase = (value: number) => {
        if (progress < .4) return cubicBezier(value, .12, .75, .3, 1)
        if (progress < .62) return cubicBezier(value, .45, 0, .55, 1)
        return cubicBezier(value, .6, 0, .95, .45)
      }
      const x = sampleKeyframes(progress, [[0, -.6 * shipWidth], [.4, 563.2], [.62, 652.8], [1, 2304]], flyEase)
      const y = sampleKeyframes(progress, [[0, worldHeight * .09], [.4, 0], [.62, -worldHeight * .01], [1, -worldHeight * .06]], flyEase)
      const scale = sampleKeyframes(progress, [[0, 1.1], [.4, 1], [.62, 1], [1, 1.3]], flyEase)
      const pitch = sampleKeyframes(progress, [[0, -10], [.4, -1], [.56, 1.5], [.68, 2.5], [1, -7]])
      const shudder = sampleKeyframes(cycleAt(time, 160, 0, true), [[0, -worldHeight * .0025], [1, worldHeight * .0025]])
      ctx.save()
      ctx.translate(x + shipWidth / 2, worldHeight / 2 + y)
      ctx.rotate(pitch * Math.PI / 180)
      ctx.scale(scale, scale)
      ctx.translate(0, shudder)
      const trailOpacity = sampleKeyframes(progress, [[0, .9], [.44, .35], [.62, .35], [.8, 1], [.94, 0], [1, 0]], value => cubicBezier(value, .25, .1, .25, 1))
      const trailScaleX = sampleKeyframes(progress, [[0, 1.2], [.44, .6], [.62, .6], [.8, 1.5], [1, 1.2]], value => cubicBezier(value, .25, .1, .25, 1))
      const trailScaleY = sampleKeyframes(progress, [[0, 1], [.44, 1], [.62, 1], [.8, 1.4], [1, 1.4]], value => cubicBezier(value, .25, .1, .25, 1))
      for (const [top, thickness] of [[.47, 5.12], [.63, 3.328]]) {
        ctx.save()
        ctx.translate(-shipWidth * .38, shipWidth * .95 * (top - .5))
        ctx.scale(trailScaleX, trailScaleY)
        ctx.globalAlpha = trailOpacity
        const trail = ctx.createLinearGradient(-shipWidth * 1.5, 0, 0, 0)
        trail.addColorStop(0, 'transparent')
        trail.addColorStop(1, 'rgba(255,244,228,.85)')
        ctx.fillStyle = trail
        ctx.fillRect(-shipWidth * 1.5, -thickness / 2, shipWidth * 1.5, thickness)
        ctx.restore()
      }
      const ghost = sampleKeyframes(progress, [[0, 1], [.3, 1], [.44, .15], [.62, .15], [.76, 1.4], [1, 1.4]], value => cubicBezier(value, .25, .1, .25, 1))
      for (const [offset, opacity] of [[-.14, .25], [-.06, .5]]) {
        ctx.globalAlpha = ghost * opacity
        shipFrame(ctx, time, -shipWidth / 2 + offset * shipWidth, -shipWidth * .475, shipWidth, shipWidth * .95)
      }
      ctx.globalAlpha = 1
      shipFrame(ctx, time, -shipWidth / 2, -shipWidth * .475, shipWidth, shipWidth * .95)
      ctx.restore()
      repeater.draw(ctx, images.introBand, worldHeight * .74, worldHeight * .46, 0, visibleLeft, visibleRight, time / 960 * worldHeight * .46 * 6.06)
    }
    const wall = time < accelerationReveal
      ? 2560 - 4096 * cubicBezier(progressAt(time, 600, 1350), .5, 0, .85, .6)
      : -1536 - 4147.2 * cubicBezier(progressAt(time, 750, accelerationReveal), .25, .5, .4, 1)
    ctx.drawImage(images.introWall, wall, -worldHeight * .02, 5632, worldHeight * 1.04)
  }

  return {
    draw(ctx: CanvasRenderingContext2D, width: number, height: number, ratio: number, elapsed: number, reducedMotion: boolean, heroBottom = 0) {
      const sceneWidth = Math.max(width, height * 16 / 9)
      const scale = sceneWidth / 2560
      const left = width / 2 - sceneWidth * (width <= height ? .36 : .5)
      const visibleLeft = -left / scale
      const visibleRight = (width - left) / scale
      const mobilePortrait = width <= height && width <= 720
      lightX = sunlightX
      islandOffsets.fill(0)
      islandOffsetY = 0
      let shipScale = 1
      let shipCenterX = 915.2
      if (mobilePortrait) {
        const tree = islands[1]
        const treeHalfWidth = (1707 * tree.w / 2 + 203 * tree.h * Math.sin(tree.tilt * Math.PI / 180) / 2 + tree.sway) * scale
        const sunScreenX = width * .95
        const treeScreenX = Math.min(width * .76, sunScreenX - 12 - treeHalfWidth)
        // Compose all five islands inside the portrait crop, keeping their original heights.
        const islandScreenX = [width * .07, treeScreenX, width * .56, width * .22, width * .46]
        islands.forEach((island, index) => {
          const tilt = Math.sin(island.tilt * Math.PI / 180)
          const margin = ((1707 * island.w + 203 * island.h * tilt) / 2 + island.sway + island.lift * tilt) * scale + 4
          const center = Math.max(margin, Math.min(width - margin, islandScreenX[index]))
          islandOffsets[index] = visibleLeft + center / scale - (418 + 1707 * island.x + 1707 * island.w / 2)
        })
        lightX = visibleLeft + sunScreenX / scale
        // Fit the ship to the space beside the tree, including its largest idle sway.
        const shipWidth = Math.min(width * .52, treeScreenX - treeHalfWidth - 28)
        shipScale = Math.min(1, Math.max(1, shipWidth) / (402 * 1.15 * scale))
        const shipScreenX = Math.min(width * .28, treeScreenX - treeHalfWidth - 20 - shipWidth / 2)
        shipCenterX = visibleLeft + shipScreenX / scale
        if (heroBottom > 0) {
          const highestShipPoint = 495.68 - shipScale * (16.64 + 192 * 1.15)
          islandOffsetY = Math.max(0, (heroBottom + 24) / scale - highestShipPoint)
        }
      } else if (width <= height) {
        const tree = islands[1]
        const sunScreenX = width * .86
        const treeScreenX = Math.min(width * .62, sunScreenX - 24 - 1707 * tree.w * scale / 2)
        lightX = visibleLeft + sunScreenX / scale
        islandOffsets[1] = visibleLeft + treeScreenX / scale - (418 + 1707 * tree.x + 1707 * tree.w / 2)
      }
      const time = reducedMotion ? 10000 + elapsed * .15 : Math.max(0, elapsed - accelerationReveal)
      const gpu = (ctx as SunsetGpuContext).isSunsetGpu
      if (!gpu) viewportLayers(width, height, ratio, scale, left)
      ctx.setTransform(ratio * scale, 0, 0, ratio * scale, left * ratio, 0)
      ctx.fillStyle = '#8c6e9e'
      ctx.fillRect(visibleLeft, 0, visibleRight - visibleLeft, height / scale)
      repeater.draw(ctx, images.sky, -1 / scale, 896, time / 1000, visibleLeft, visibleRight, getCloudRush(time, true))
      drawStars(ctx, time)
      drawSun(ctx, time)
      drawBirds(ctx, time)
      if (!mobilePortrait) for (const index of [2, 4]) drawIsland(ctx, index, time)
      repeater.draw(ctx, images.clouds, 528.64, 399.36, time / 1000, visibleLeft, visibleRight, getCloudRush(time, false))
      drawBandGlint(ctx, time, ratio, scale, left, visibleLeft, visibleRight)
      if (!mobilePortrait) for (const index of [0, 1, 3]) drawIsland(ctx, index, time)
      if (gpu) ctx.drawImage(images.front, 0, 384, 2560, 1696)
      else {
        ctx.save()
        ctx.resetTransform()
        if (front) ctx.drawImage(front, 0, 0)
        ctx.restore()
      }
      drawCloudLight(ctx, time, Math.round(384 * scale * ratio))
      if (mobilePortrait) for (const index of [2, 4, 0, 1, 3]) drawIsland(ctx, index, time)
      ctx.save()
      ctx.translate(shipCenterX, 495.68 + islandOffsetY)
      ctx.scale(shipScale, shipScale)
      ctx.translate(-915.2, -495.68)
      drawShip(ctx, time, reducedMotion)
      ctx.restore()
      if (!reducedMotion) drawAcceleration(ctx, elapsed, height / scale, visibleLeft, visibleRight)
    },
    reset() {
      repeater.reset()
      for (const texture of textures.values()) texture.width = texture.height = 1
      for (const buffer of blendBuffers.values()) buffer.canvas.width = buffer.canvas.height = 1
      blendBuffers.clear()
      textures.clear()
      viewportKey = ''
      front = frontGlow = frontFlash = bandMask = bandFrame = undefined
      bandContext = null
    }
  }
}
