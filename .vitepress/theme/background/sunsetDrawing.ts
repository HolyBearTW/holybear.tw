export function createHorizontalRepeater() {
  let patterns = new WeakMap<HTMLImageElement, CanvasPattern>()

  return {
    draw(context: CanvasRenderingContext2D, image: HTMLImageElement, y: number, imageHeight: number, time: number, visibleLeft: number, visibleRight: number) {
      let pattern = patterns.get(image)
      if (!pattern) {
        pattern = context.createPattern(image, 'repeat-x') ?? undefined
        if (!pattern) return
        patterns.set(image, pattern)
      }
      const imageScale = imageHeight / image.naturalHeight
      const tileWidth = image.naturalWidth * imageScale
      const phase = -(time * 75.777) % tileWidth
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

function cubicBezier(progress: number, x1: number, y1: number, x2: number, y2: number) {
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
  const progress = cubicBezier((elapsed - delay) / 1400, .2, .7, .3, 1)
  const expansion = Math.max(0, (progress - .1) / .9)
  return {
    opacity: progress < .1 ? progress / .1 : 1 - expansion,
    scale: progress < .1 ? .7 + 3 * progress : 1 + .45 * expansion,
    travel: expansion
  }
}
