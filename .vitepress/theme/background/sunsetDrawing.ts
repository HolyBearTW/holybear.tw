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
