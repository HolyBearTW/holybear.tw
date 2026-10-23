export function createHorizontalRepeater() {
  let patterns = new WeakMap<HTMLImageElement, CanvasPattern>()

  return {
    draw(context: CanvasRenderingContext2D, image: HTMLImageElement, y: number, imageHeight: number, time: number, visibleLeft: number, visibleRight: number, offset = 0) {
      let pattern = patterns.get(image)
      if (!pattern) {
        pattern = context.createPattern(image, 'repeat-x') ?? undefined
        if (!pattern) return
        patterns.set(image, pattern)
      }
      const imageScale = imageHeight / image.naturalHeight
      const tileWidth = image.naturalWidth * imageScale
      const phase = -(time * 75.777 + offset) % tileWidth
      const transform = context.getTransform()
      const drawX = (Math.round(phase * transform.a + transform.e) - transform.e) / transform.a
      const drawY = (Math.round(y * transform.d + transform.f) - transform.f) / transform.d
      pattern.setTransform(new DOMMatrix().translate(drawX, drawY).scale(imageScale))
      context.save()
      context.fillStyle = pattern
      // A single fill samples across tile boundaries without separate alpha edges.
      const overscan = 1 / transform.a
      context.fillRect(visibleLeft - overscan, drawY, visibleRight - visibleLeft + overscan * 2, imageHeight)
      context.restore()
    },
    reset() {
      patterns = new WeakMap()
    }
  }
}

export function cubicBezier(progress: number, x1: number, y1: number, x2: number, y2: number) {
  if (progress <= 0) return 0
  if (progress >= 1) return 1
  const coordinate = (t: number, first: number, second: number) => 3 * (1 - t) ** 2 * t * first + 3 * (1 - t) * t ** 2 * second + t ** 3
  let low = 0
  let high = 1
  for (let iteration = 0; iteration < 14; iteration++) {
    const middle = (low + high) / 2
    if (coordinate(middle, x1, x2) < progress) low = middle
    else high = middle
  }
  return coordinate((low + high) / 2, y1, y2)
}

type Keyframes = readonly (readonly [number, number])[]
export const easeInOut = (progress: number) => cubicBezier(progress, .42, 0, .58, 1)
export const easeOut = (progress: number) => cubicBezier(progress, 0, 0, .58, 1)

export function sampleKeyframes(progress: number, keyframes: Keyframes, easing = easeInOut) {
  if (progress <= keyframes[0][0]) return keyframes[0][1]
  for (let index = 1; index < keyframes.length; index++) {
    const [end, to] = keyframes[index]
    if (progress > end) continue
    const [start, from] = keyframes[index - 1]
    return from + (to - from) * easing((progress - start) / (end - start))
  }
  return keyframes[keyframes.length - 1][1]
}

export function progressAt(time: number, duration: number, delay = 0) {
  return Math.max(0, Math.min(1, (time - delay) / duration))
}

export function cycleAt(time: number, duration: number, delay = 0, alternate = false) {
  const cycles = Math.max(0, (time - delay) / duration)
  const progress = cycles % 1
  return alternate && Math.floor(cycles) % 2 ? 1 - progress : progress
}

export function getCloudRush(time: number, sky: boolean) {
  return (sky ? 6287.36 : 4840.96) * easeInOut(progressAt(time, sky ? 2520 : 1680, 200))
}

export function getShipEntrance(elapsed: number, reducedMotion: boolean) {
  const progress = reducedMotion ? 1 : Math.max(0, Math.min(1, (elapsed - 200) / 1800))
  const xProgress = cubicBezier(progress, .18, 1.12, .32, 1)
  const yProgress = cubicBezier(progress, .55, 0, .25, 1)
  const scaleProgress = cubicBezier(progress, .22, 1, .36, 1)
  const tilt = progress < .7
    ? -9 + 11 * cubicBezier(progress / .7, 0, 0, .58, 1)
    : 2 - 2 * cubicBezier((progress - .7) / .3, 0, 0, .58, 1)
  return { x: -2944 * (1 - xProgress), y: 29.44 * (1 - yProgress), scale: 7.8 - 6.8 * scaleProgress, rotation: tilt * Math.PI / 180 }
}

export function getSmokeProgress(elapsed: number, delay: number) {
  if (elapsed < delay || elapsed >= delay + 1400) return null
  const progress = (elapsed - delay) / 1400
  const easing = (value: number) => cubicBezier(value, .2, .7, .3, 1)
  const expansion = Math.max(0, (progress - .1) / .9)
  return {
    opacity: sampleKeyframes(progress, [[0, 0], [.1, 1], [1, 0]], easing),
    scale: sampleKeyframes(progress, [[0, .7], [.1, 1], [1, 1.45]], easing),
    travel: easing(expansion)
  }
}

export function getShipMotion(time: number, reducedMotion: boolean) {
  const entrance = getShipEntrance(time, reducedMotion)
  const bob = sampleKeyframes(cycleAt(time, 7000, 2000), [[0, 0], [.5, 1], [1, 0]])
  const rock = sampleKeyframes(cycleAt(time, 9000, 2000), [[0, 0], [.25, .6], [.75, -.6], [1, 0]])
  const breathe = sampleKeyframes(cycleAt(time, 8000, 2000), [[0, 1], [.5, 1.15], [1, 1]])
  return {
    x: 915.2 + entrance.x - 3.84 * bob,
    y: 495.68 - 16.64 * bob,
    scale: time >= 2000 ? breathe : entrance.scale,
    rotation: time >= 2000 ? rock * Math.PI / 180 : entrance.rotation,
    transformY: entrance.y
  }
}

export function getRimOpacity(time: number, duration: number, delay = 0) {
  if (time < 5600 + delay) return sampleKeyframes(progressAt(time, 2600, 3000), [[0, 0], [.15, 1], [1, 1]], easeOut)
  return 1 - easeInOut(cycleAt(time, duration, 5600 + delay, true))
}

export function getIntroGlint(time: number, delay = 3000) {
  return sampleKeyframes(progressAt(time, 2600, delay), [[0, 0], [.15, 1], [.6, 1], [1, 0]], easeOut)
}

export function getCloudFlash(time: number, back = false) {
  const delay = back ? 7200 : 6800
  if (time < delay) return getIntroGlint(time, back ? 3100 : 3000)
  return sampleKeyframes(cycleAt(time, back ? 4200 : 3000, delay), back
    ? [[0, 0], [.057142857143, 1], [.2, 0], [1, 0]]
    : [[0, 0], [.08, 1], [.28, 0], [1, 0]])
}

export function getCloudGlow(time: number) {
  if (time < 5600) return sampleKeyframes(progressAt(time, 2600, 3000), [[0, 0], [.15, 1], [.6, 1], [1, .45]], easeOut)
  return .45 + .4 * easeInOut(cycleAt(time, 3400, 5600, true))
}

export function getBirdFrame(time: number, bird: number) {
  const progress = cycleAt(time, [2200, 2600, 2000][bird], [0, -900, -1500][bird])
  if (progress < .52) return Math.floor((progress % .26) / .02)
  if (progress < .58) return 0
  if (progress < .64) return 13
  if (progress < .70) return 14
  if (progress < .76) return 13
  if (progress < .84) return 0
  if (progress < .92) return 15
  return 0
}
