type GradientStop = { offset: number; color: number[] }
type RadialMask = { x: number; y: number; rx: number; ry: number; stops: readonly (readonly [number, number])[] }
class SpriteGradient {
  readonly stops: GradientStop[] = []
  constructor(readonly x0: number, readonly y0: number, readonly x1: number, readonly y1: number) {}
  addColorStop(offset: number, color: string) { this.stops.push({ offset, color: colorValues(color) }); this.stops.sort((a, b) => a.offset - b.offset) }
}
class SpritePattern {
  matrix = new DOMMatrix()
  constructor(readonly image: HTMLImageElement) {}
  setTransform(matrix?: DOMMatrix2DInit) { this.matrix = new DOMMatrix(matrix ? [matrix.a ?? 1, matrix.b ?? 0, matrix.c ?? 0, matrix.d ?? 1, matrix.e ?? 0, matrix.f ?? 0] : undefined) }
}

const colors = new Map<string, number[]>()
function colorValues(color: string): number[] {
  const cached = colors.get(color)
  if (cached) return cached
  let value: number[]
  if (color === 'transparent') value = [0, 0, 0, 0]
  else if (color.startsWith('#')) {
    let hex = color.slice(1)
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map(part => part + part).join('')
    value = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    value.push(hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1)
  } else {
    const parts = color.match(/[\d.]+/g)?.map(Number) ?? []
    value = [(parts[0] ?? 255) / 255, (parts[1] ?? 255) / 255, (parts[2] ?? 255) / 255, parts[3] ?? 1]
  }
  colors.set(color, value)
  return value
}

const vertexShader = `
attribute vec2 a_corner;
uniform vec4 u_rect;
uniform mat3 u_transform;
uniform vec2 u_resolution;
varying vec2 v_local;
varying vec2 v_uv;
void main() {
  v_local = u_rect.xy + a_corner * u_rect.zw;
  v_uv = a_corner;
  vec2 pixel = (u_transform * vec3(v_local, 1.0)).xy;
  gl_Position = vec4(pixel / u_resolution * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
}`
const fragmentShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D u_texture;
uniform vec4 u_source;
uniform float u_alpha;
uniform int u_mode;
uniform vec4 u_color;
uniform mat3 u_pattern;
uniform vec2 u_textureSize;
uniform vec4 u_gradient;
uniform int u_stopCount;
uniform float u_stops[8];
uniform vec4 u_colors[8];
uniform int u_maskCount;
uniform vec4 u_maskEllipse;
uniform vec2 u_maskStops[4];
varying vec2 v_local;
varying vec2 v_uv;
void main() {
  vec4 color;
  if (u_mode == 0) color = texture2D(u_texture, u_source.xy + v_uv * u_source.zw);
  else if (u_mode == 1) color = vec4(u_color.rgb * u_color.a, u_color.a);
  else if (u_mode == 2) {
    vec2 line = u_gradient.zw - u_gradient.xy;
    float t = clamp(dot(v_local - u_gradient.xy, line) / max(dot(line, line), 0.00001), 0.0, 1.0);
    color = u_colors[0];
    for (int i = 1; i < 8; i++) {
      if (i < u_stopCount && t > u_stops[i - 1]) color = mix(u_colors[i - 1], u_colors[i], clamp((t - u_stops[i - 1]) / max(u_stops[i] - u_stops[i - 1], 0.00001), 0.0, 1.0));
    }
  } else {
    vec2 uv = (u_pattern * vec3(v_local, 1.0)).xy / u_textureSize;
    if (uv.y < 0.0 || uv.y > 1.0) discard;
    color = texture2D(u_texture, vec2(fract(uv.x), uv.y));
  }
  float mask = 1.0;
  if (u_maskCount > 0) {
    float distance = length((v_local - u_maskEllipse.xy) / u_maskEllipse.zw);
    mask = u_maskStops[0].y;
    for (int i = 1; i < 4; i++) {
      if (i < u_maskCount && distance > u_maskStops[i - 1].x) mask = mix(u_maskStops[i - 1].y, u_maskStops[i].y, clamp((distance - u_maskStops[i - 1].x) / max(u_maskStops[i].x - u_maskStops[i - 1].x, 0.00001), 0.0, 1.0));
    }
  }
  gl_FragColor = color * u_alpha * mask;
}`

type State = { matrix: DOMMatrix; alpha: number; composite: GlobalCompositeOperation; fill: string | SpriteGradient | SpritePattern; mask?: RadialMask }
export type SunsetGpuContext = CanvasRenderingContext2D & { readonly isSunsetGpu: true; setRadialMask(mask?: RadialMask): void }

export function createSunsetGpu(canvas: HTMLCanvasElement) {
  const candidate = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power' })
  if (!candidate) return undefined
  const gl = candidate
  const shaders: WebGLShader[] = []
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) throw new Error('Unable to allocate sunset shader')
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Unable to compile sunset shader')
    shaders.push(shader)
    return shader
  }
  const program = gl.createProgram()
  if (!program) throw new Error('Unable to allocate sunset program')
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader))
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader))
  gl.bindAttribLocation(program, 0, 'a_corner')
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Unable to link sunset program')
  for (const shader of shaders) gl.deleteShader(shader)
  gl.useProgram(program)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.enable(gl.BLEND)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  const whiteTexture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, whiteTexture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]))
  const uniform = Object.fromEntries(['rect', 'transform', 'resolution', 'source', 'alpha', 'mode', 'color', 'pattern', 'textureSize', 'gradient', 'stopCount', 'stops', 'colors', 'maskCount', 'maskEllipse', 'maskStops'].map(name => [name, gl.getUniformLocation(program, 'u_' + name)]))
  const textureCache = new Map<CanvasImageSource, { texture: WebGLTexture; width: number; height: number }>()
  const matrices = new Float32Array(9)
  const stopValues = new Float32Array(8)
  const stopColors = new Float32Array(32)
  const maskValues = new Float32Array(8)
  const stack: State[] = []
  let state: State = { matrix: new DOMMatrix(), alpha: 1, composite: 'source-over', fill: '#000' }
  let blendMode = ''
  let backingWidth = 0
  let backingHeight = 0
  let currentTexture: WebGLTexture | undefined
  const matrixUniform = (location: WebGLUniformLocation | null, matrix: DOMMatrix) => {
    matrices.set([matrix.a, matrix.b, 0, matrix.c, matrix.d, 0, matrix.e, matrix.f, 1])
    gl.uniformMatrix3fv(location, false, matrices)
  }
  function bindTexture(source: CanvasImageSource) {
    let cached = textureCache.get(source)
    if (!cached) {
      const texture = gl.createTexture()
      if (!texture) throw new Error('Unable to allocate sunset texture')
      const image = source as HTMLImageElement
      const width = image.naturalWidth || (source as HTMLCanvasElement).width
      const height = image.naturalHeight || (source as HTMLCanvasElement).height
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource)
      cached = { texture, width, height }
      textureCache.set(source, cached)
      currentTexture = texture
    } else if (currentTexture !== cached.texture) {
      gl.bindTexture(gl.TEXTURE_2D, cached.texture)
      currentTexture = cached.texture
    }
    return cached
  }
  function draw(x: number, y: number, width: number, height: number) {
    if (!state.alpha || !width || !height) return
    const matrix = state.matrix
    const right = x + width, bottom = y + height
    const xs = [matrix.a * x + matrix.c * y + matrix.e, matrix.a * right + matrix.c * y + matrix.e, matrix.a * x + matrix.c * bottom + matrix.e, matrix.a * right + matrix.c * bottom + matrix.e]
    const ys = [matrix.b * x + matrix.d * y + matrix.f, matrix.b * right + matrix.d * y + matrix.f, matrix.b * x + matrix.d * bottom + matrix.f, matrix.b * right + matrix.d * bottom + matrix.f]
    if (Math.max(...xs) < 0 || Math.min(...xs) > canvas.width || Math.max(...ys) < 0 || Math.min(...ys) > canvas.height) return
    if (backingWidth !== canvas.width || backingHeight !== canvas.height) {
      backingWidth = canvas.width; backingHeight = canvas.height
      gl.viewport(0, 0, backingWidth, backingHeight)
      gl.uniform2f(uniform.resolution, backingWidth, backingHeight)
    }
    const blend = state.composite === 'screen' ? 'screen' : 'normal'
    if (blendMode !== blend) {
      gl.blendFunc(gl.ONE, blend === 'screen' ? gl.ONE_MINUS_SRC_COLOR : gl.ONE_MINUS_SRC_ALPHA)
      blendMode = blend
    }
    gl.uniform4f(uniform.rect, x, y, width, height)
    matrixUniform(uniform.transform, matrix)
    gl.uniform1f(uniform.alpha, state.alpha)
    const mask = state.mask
    gl.uniform1i(uniform.maskCount, mask?.stops.length ?? 0)
    if (mask) {
      gl.uniform4f(uniform.maskEllipse, mask.x, mask.y, mask.rx, mask.ry)
      maskValues.fill(0)
      mask.stops.forEach(([offset, alpha], index) => { maskValues[index * 2] = offset; maskValues[index * 2 + 1] = alpha })
      gl.uniform2fv(uniform.maskStops, maskValues)
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }
  const context = {
    canvas, isSunsetGpu: true as const,
    get globalAlpha() { return state.alpha }, set globalAlpha(value: number) { state.alpha = value },
    get globalCompositeOperation() { return state.composite }, set globalCompositeOperation(value: GlobalCompositeOperation) { state.composite = value },
    get fillStyle() { return state.fill }, set fillStyle(value: State['fill']) { state.fill = value },
    save() { stack.push({ ...state, matrix: DOMMatrix.fromMatrix(state.matrix) }) },
    restore() { state = stack.pop() ?? state },
    setTransform(a: number, b: number, c: number, d: number, e: number, f: number) { state.matrix = new DOMMatrix([a, b, c, d, e, f]) },
    resetTransform() { state.matrix = new DOMMatrix() },
    getTransform() { return DOMMatrix.fromMatrix(state.matrix) },
    translate(x: number, y: number) { state.matrix.translateSelf(x, y) },
    scale(x: number, y: number) { state.matrix.scaleSelf(x, y) },
    rotate(angle: number) { state.matrix.rotateSelf(angle * 180 / Math.PI) },
    setRadialMask(mask?: RadialMask) { state.mask = mask },
    createLinearGradient(x0: number, y0: number, x1: number, y1: number) { return new SpriteGradient(x0, y0, x1, y1) },
    createPattern(image: HTMLImageElement) { return new SpritePattern(image) },
    drawImage(source: CanvasImageSource, ...args: number[]) {
      const texture = bindTexture(source)
      let x: number, y: number, width: number, height: number
      if (args.length === 8) {
        gl.uniform4f(uniform.source, args[0] / texture.width, args[1] / texture.height, args[2] / texture.width, args[3] / texture.height)
        ;[x, y, width, height] = args.slice(4)
      } else {
        gl.uniform4f(uniform.source, 0, 0, 1, 1)
        ;[x, y, width = texture.width, height = texture.height] = args
      }
      gl.uniform1i(uniform.mode, 0)
      draw(x, y, width, height)
    },
    fillRect(x: number, y: number, width: number, height: number) {
      const fill = state.fill
      if (typeof fill === 'string') {
        gl.uniform1i(uniform.mode, 1)
        gl.uniform4fv(uniform.color, colorValues(fill))
      } else if (fill instanceof SpriteGradient) {
        gl.uniform1i(uniform.mode, 2)
        gl.uniform4f(uniform.gradient, fill.x0, fill.y0, fill.x1, fill.y1)
        gl.uniform1i(uniform.stopCount, fill.stops.length)
        stopValues.fill(1); stopColors.fill(0)
        fill.stops.forEach((stop, index) => {
          stopValues[index] = stop.offset
          const [r, g, b, a] = stop.color
          stopColors.set([r * a, g * a, b * a, a], index * 4)
        })
        gl.uniform1fv(uniform.stops, stopValues)
        gl.uniform4fv(uniform.colors, stopColors)
      } else {
        const texture = bindTexture(fill.image)
        gl.uniform1i(uniform.mode, 3)
        gl.uniform2f(uniform.textureSize, texture.width, texture.height)
        matrixUniform(uniform.pattern, fill.matrix.inverse())
      }
      draw(x, y, width, height)
    }
  } as unknown as SunsetGpuContext
  return {
    context,
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
    release(source: CanvasImageSource) {
      const cached = textureCache.get(source)
      if (!cached) return
      gl.deleteTexture(cached.texture)
      textureCache.delete(source)
      if (currentTexture === cached.texture) currentTexture = undefined
    },
    dispose() {
      for (const { texture } of textureCache.values()) gl.deleteTexture(texture)
      textureCache.clear()
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteTexture(whiteTexture)
    }
  }
}
