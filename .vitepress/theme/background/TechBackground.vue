<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useData } from 'vitepress'

const { isDark } = useData()
const canvas = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let ctx: CanvasRenderingContext2D | null = null
let nodes: Node[] = []
let dataFlows: DataFlow[] = []
let hexagons: Hexagon[] = []
let mouseX = 0
let mouseY = 0
let time = 0
let glitchTime = 0
let nextGlitchTime = Math.random() * 300 + 200 // 隨機 200-500 幀後觸發 glitch

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  connections: Node[]
}

interface DataFlow {
  path: { x: number; y: number }[]
  position: number
  speed: number
  color: string
  opacity: number
}

interface Hexagon {
  x: number
  y: number
  size: number
  opacity: number
  targetOpacity: number
  active: boolean
  activationTime: number
}

// 顏色配置
const colors = computed(() => ({
  node: isDark.value ? 'rgba(100, 200, 255, 0.9)' : 'rgba(80, 150, 220, 0.8)',
  line: isDark.value ? 'rgba(100, 200, 255, 0.5)' : 'rgba(80, 150, 220, 0.4)',
  dataFlow: isDark.value ? 'rgba(0, 255, 200, 1.0)' : 'rgba(0, 180, 150, 1.0)',
  grid: isDark.value ? 'rgba(100, 150, 255, 0.3)' : 'rgba(100, 150, 200, 0.25)',
  hexagon: isDark.value ? 'rgba(100, 200, 255, 0.15)' : 'rgba(80, 150, 220, 0.12)',
  hexagonActive: isDark.value ? 'rgba(100, 200, 255, 0.4)' : 'rgba(80, 150, 220, 0.35)',
  scanline: isDark.value ? 'rgba(0, 255, 200, 0.1)' : 'rgba(0, 180, 150, 0.08)'
}))

// 初始化 Plexus 節點
const initNodes = (width: number, height: number) => {
  const nodeCount = Math.floor((width * height) / 25000)
  nodes = []
  
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      radius: Math.random() * 2 + 1,
      connections: []
    })
  }
}

// 初始化數據流
const initDataFlows = (width: number, height: number) => {
  const flowCount = 5
  dataFlows = []
  
  for (let i = 0; i < flowCount; i++) {
    const path: { x: number; y: number }[] = []
    const segments = Math.floor(Math.random() * 5) + 8
    
    // 創建類似電路的路徑
    let x = Math.random() * width
    let y = Math.random() * height
    path.push({ x, y })
    
    for (let j = 0; j < segments; j++) {
      const direction = Math.random() > 0.5 ? 'horizontal' : 'vertical'
      const distance = Math.random() * 150 + 50
      
      if (direction === 'horizontal') {
        x += (Math.random() > 0.5 ? 1 : -1) * distance
      } else {
        y += (Math.random() > 0.5 ? 1 : -1) * distance
      }
      
      x = Math.max(0, Math.min(width, x))
      y = Math.max(0, Math.min(height, y))
      path.push({ x, y })
    }
    
    dataFlows.push({
      path,
      position: Math.random() * path.length,
      speed: Math.random() * 0.01 + 0.005,
      color: colors.value.dataFlow,
      opacity: Math.random() * 0.3 + 0.3
    })
  }
}

// 初始化六邊形網格
const initHexagons = (width: number, height: number) => {
  hexagons = []
  const size = 40
  const rows = Math.ceil(height / (size * 1.5)) + 2
  const cols = Math.ceil(width / (size * Math.sqrt(3))) + 2
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * size * Math.sqrt(3) + (row % 2) * size * Math.sqrt(3) / 2
      const y = row * size * 1.5
      
      hexagons.push({
        x,
        y,
        size,
        opacity: 0.08,
        targetOpacity: 0.08,
        active: false,
        activationTime: Math.random() * 1000
      })
    }
  }
}

// 繪製六邊形
const drawHexagon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opacity: number) => {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i
    const hx = x + size * Math.cos(angle)
    const hy = y + size * Math.sin(angle)
    if (i === 0) {
      ctx.moveTo(hx, hy)
    } else {
      ctx.lineTo(hx, hy)
    }
  }
  ctx.closePath()
  ctx.strokeStyle = isDark.value 
    ? `rgba(100, 200, 255, ${opacity})`
    : `rgba(80, 150, 220, ${opacity})`
  ctx.lineWidth = 0.5
  ctx.stroke()
}

// 繪製 3D 網格
const draw3DGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, offset: number) => {
  const gridSize = 80
  const perspective = 600
  const vanishingPointY = height * 0.4
  
  ctx.strokeStyle = colors.value.grid
  ctx.lineWidth = 0.8
  
  // 繪製縱向網格線（透視效果）
  for (let x = -5; x <= 20; x++) {
    const startX = width / 2 + (x * gridSize - width / 2) * 0.3
    const endX = width / 2 + (x * gridSize - width / 2) * 2
    
    ctx.beginPath()
    ctx.moveTo(startX, vanishingPointY - offset % (gridSize * 2))
    ctx.lineTo(endX, height)
    ctx.stroke()
  }
  
  // 繪製橫向網格線
  for (let y = 0; y < 15; y++) {
    const currentY = vanishingPointY + y * gridSize - offset % (gridSize * 2)
    if (currentY > height) continue
    
    const scale = (currentY - vanishingPointY + perspective) / perspective
    const leftX = width / 2 - (width / 2) * scale
    const rightX = width / 2 + (width / 2) * scale
    
    ctx.beginPath()
    ctx.moveTo(leftX, currentY)
    ctx.lineTo(rightX, currentY)
    ctx.stroke()
  }
}

// 繪製 Glitch 效果
const drawGlitch = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  if (glitchTime <= 0) return
  
  const intensity = glitchTime / 10
  
  // 隨機水平偏移
  for (let i = 0; i < 5; i++) {
    const y = Math.random() * height
    const h = Math.random() * 3 + 1
    const offset = (Math.random() - 0.5) * 10 * intensity
    
    const imageData = ctx.getImageData(0, y, width, h)
    ctx.putImageData(imageData, offset, y)
  }
  
  // RGB 分離效果
  if (Math.random() > 0.7) {
    ctx.fillStyle = `rgba(255, 0, 0, ${0.05 * intensity})`
    ctx.fillRect(0, 0, width, height)
  }
  
  glitchTime--
}

// 繪製掃描線
const drawScanlines = (ctx: CanvasRenderingContext2D, width: number, height: number, offset: number) => {
  ctx.strokeStyle = colors.value.scanline
  ctx.lineWidth = 1
  
  for (let y = offset % 4; y < height; y += 4) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

// 主動畫循環
const animate = () => {
  if (!canvas.value) return
  if (!ctx) {
    ctx = canvas.value.getContext('2d') as CanvasRenderingContext2D | null
  }
  if (!ctx) return
  const c = ctx as CanvasRenderingContext2D
  
  const width = canvas.value.width
  const height = canvas.value.height
  
  time += 0.3
  
  // 清除畫布
  c.fillStyle = isDark.value ? 'rgba(10, 15, 25, 0.95)' : 'rgba(250, 252, 255, 0.95)'
  c.fillRect(0, 0, width, height)
  
  // 1. 繪製 3D 網格 (最底層)
  draw3DGrid(c, width, height, time * 0.5)
  
  // 2. 繪製六邊形網格
  hexagons.forEach(hex => {
    // 隨機激活六邊形
    if (time % 300 === 0 && Math.random() > 0.98) {
      hex.active = true
      hex.targetOpacity = Math.random() * 0.2 + 0.15
      hex.activationTime = time
    }
    
    // 激活效果衰減
    if (hex.active && time - hex.activationTime > 120) {
      hex.active = false
      hex.targetOpacity = 0.08
    }
    
    // 平滑過渡
    hex.opacity += (hex.targetOpacity - hex.opacity) * 0.02
    
    drawHexagon(c, hex.x, hex.y, hex.size * 0.5, hex.opacity)
  })
  
  // 3. 繪製 Plexus 節點和連線
  nodes.forEach((node, i) => {
    // 滑鼠互動
    const dx = mouseX - node.x
    const dy = mouseY - node.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < 200) {
      const force = (200 - distance) / 200
      node.vx -= (dx / distance) * force * 0.05
      node.vy -= (dy / distance) * force * 0.05
    }
    
    // 更新位置
    node.x += node.vx
    node.y += node.vy
    
    // 阻力
    node.vx *= 0.98
    node.vy *= 0.98
    
    // 邊界反彈
    if (node.x < 0 || node.x > width) node.vx *= -1
    if (node.y < 0 || node.y > height) node.vy *= -1
    node.x = Math.max(0, Math.min(width, node.x))
    node.y = Math.max(0, Math.min(height, node.y))
    
    // 繪製節點
    c.beginPath()
    c.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
    c.fillStyle = colors.value.node
    c.fill()
    
    // 繪製連線
    nodes.slice(i + 1).forEach(other => {
      const dx = node.x - other.x
      const dy = node.y - other.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist < 150) {
        const opacity = (1 - dist / 150) * 0.3
        c.beginPath()
        c.moveTo(node.x, node.y)
        c.lineTo(other.x, other.y)
        c.strokeStyle = isDark.value 
          ? `rgba(100, 200, 255, ${opacity})`
          : `rgba(80, 150, 220, ${opacity * 0.6})`
        c.lineWidth = 0.5
        c.stroke()
      }
    })
  })
  
  // 4. 繪製數據流
  dataFlows.forEach(flow => {
    flow.position += flow.speed
    if (flow.position >= flow.path.length) {
      flow.position = 0
    }
    
    const currentIndex = Math.floor(flow.position)
    const nextIndex = (currentIndex + 1) % flow.path.length
    const progress = flow.position - currentIndex
    
    const current = flow.path[currentIndex]
    const next = flow.path[nextIndex]
    
    const x = current.x + (next.x - current.x) * progress
    const y = current.y + (next.y - current.y) * progress
    
    // 繪製數據流尾跡
    for (let i = 1; i <= 8; i++) {
      const trailIndex = Math.max(0, currentIndex - i)
      const trailPoint = flow.path[trailIndex]
      const trailOpacity = flow.opacity * (1 - i / 8)
      
      c.beginPath()
      c.arc(trailPoint.x, trailPoint.y, 2, 0, Math.PI * 2)
      c.fillStyle = isDark.value 
        ? `rgba(0, 255, 200, ${trailOpacity})`
        : `rgba(0, 180, 150, ${trailOpacity})`
      c.fill()
    }
    
    // 繪製當前位置（發光效果）
    const gradient = c.createRadialGradient(x, y, 0, x, y, 8)
    gradient.addColorStop(0, isDark.value ? 'rgba(0, 255, 200, 0.8)' : 'rgba(0, 220, 180, 0.6)')
    gradient.addColorStop(1, 'rgba(0, 255, 200, 0)')
    c.fillStyle = gradient
    c.beginPath()
    c.arc(x, y, 8, 0, Math.PI * 2)
    c.fill()
  })
  
  // 5. 繪製掃描線
  drawScanlines(c, width, height, time)
  
  // 6. Glitch 效果（偶發）
  if (time > nextGlitchTime) {
    glitchTime = Math.random() * 8 + 3
    nextGlitchTime = time + Math.random() * 300 + 200
  }
  drawGlitch(c, width, height)
  
  animationId = requestAnimationFrame(animate)
}

// 滑鼠移動處理
const handleMouseMove = (e: MouseEvent) => {
  mouseX = e.clientX
  mouseY = e.clientY
}

// 視窗調整處理
let resizeTimeout: number | null = null
let lastWidth = 0

const handleResize = () => {
  if (!canvas.value) return
  
  const width = window.innerWidth
  const height = window.innerHeight
  
  // 忽略只有高度變化的 resize (移動端工具列顯示/隱藏)
  if (lastWidth !== 0 && Math.abs(width - lastWidth) < 10) {
    return
  }
  
  lastWidth = width
  canvas.value.width = width
  canvas.value.height = height
  initNodes(width, height)
  initDataFlows(width, height)
  initHexagons(width, height)
}

// Debounced resize handler
const debouncedResize = () => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
  resizeTimeout = window.setTimeout(() => {
    handleResize()
  }, 150)
}

// 組件掛載
onMounted(() => {
  if (!canvas.value) return
  
  canvas.value.width = window.innerWidth
  canvas.value.height = window.innerHeight
  lastWidth = window.innerWidth
  
  initNodes(canvas.value.width, canvas.value.height)
  initDataFlows(canvas.value.width, canvas.value.height)
  initHexagons(canvas.value.width, canvas.value.height)
  // 取得 2D context，提示瀏覽器此畫布會頻繁讀取像素以提升效能
  ctx = canvas.value.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null
  animate()
  
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('resize', debouncedResize)
})

// 組件卸載
onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  ctx = null
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('resize', debouncedResize)
})
</script>

<template>
  <canvas
    ref="canvas"
    class="tech-background"
    :class="{ 'dark-mode': isDark }"
  />
</template>

<style scoped>
.tech-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  min-height: 100dvh; /* 動態視窗高度,支援移動端工具列變化 */
  z-index: -1;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.6s ease-in-out;
}

.tech-background.dark-mode {
  opacity: 1;
}

/* 確保背景不會影響其他元素 */
.tech-background::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  pointer-events: none;
}

/* 添加輕微的雜訊紋理 */
@keyframes noise {
  0%, 100% { opacity: 0.03; }
  50% { opacity: 0.05; }
}

.tech-background::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  animation: noise 8s infinite;
}
</style>