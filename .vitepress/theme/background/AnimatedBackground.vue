<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useData } from 'vitepress'

const { isDark } = useData()
const canvas = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let particles: Particle[] = []
let mouseX = 0
let mouseY = 0

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  color: string
}

// 初始化粒子系統
const initParticles = (width: number, height: number) => {
  const particleCount = Math.floor((width * height) / 15000) // 根據螢幕大小調整粒子數量
  particles = []
  
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3, // 非常慢的速度
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * 1.5 + 0.5, // 微小的粒子
      opacity: Math.random() * 0.15 + 0.05, // 非常低的透明度
      color: isDark.value 
        ? `rgba(100, 120, 180, ${Math.random() * 0.15 + 0.05})` // 暗色模式：淡藍色
        : `rgba(150, 160, 200, ${Math.random() * 0.1 + 0.03})` // 亮色模式：更淡的藍灰色
    })
  }
}

// 動畫循環
const animate = () => {
  if (!canvas.value) return
  
  const ctx = canvas.value.getContext('2d')
  if (!ctx) return
  
  const width = canvas.value.width
  const height = canvas.value.height
  
  // 清除畫布並添加微妙的漸變背景
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  
  if (isDark.value) {
    // 暗色模式：深色漸變
    gradient.addColorStop(0, 'rgba(15, 18, 25, 0.02)')
    gradient.addColorStop(0.5, 'rgba(20, 25, 35, 0.03)')
    gradient.addColorStop(1, 'rgba(25, 30, 40, 0.02)')
  } else {
    // 亮色模式：淺色漸變
    gradient.addColorStop(0, 'rgba(240, 242, 248, 0.02)')
    gradient.addColorStop(0.5, 'rgba(235, 238, 245, 0.03)')
    gradient.addColorStop(1, 'rgba(230, 235, 242, 0.02)')
  }
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  // 更新和繪製粒子
  particles.forEach((particle, index) => {
    // 滑鼠互動效果（非常微妙）
    const dx = mouseX - particle.x
    const dy = mouseY - particle.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < 150) {
      const force = (150 - distance) / 150
      particle.vx -= (dx / distance) * force * 0.02
      particle.vy -= (dy / distance) * force * 0.02
    }
    
    // 更新粒子位置
    particle.x += particle.vx
    particle.y += particle.vy
    
    // 添加輕微的阻力
    particle.vx *= 0.99
    particle.vy *= 0.99
    
    // 邊界檢測和反彈
    if (particle.x < 0 || particle.x > width) {
      particle.vx *= -1
      particle.x = Math.max(0, Math.min(width, particle.x))
    }
    if (particle.y < 0 || particle.y > height) {
      particle.vy *= -1
      particle.y = Math.max(0, Math.min(height, particle.y))
    }
    
    // 繪製粒子
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
    ctx.fillStyle = particle.color
    ctx.fill()
    
    // 繪製粒子之間的連線（非常微妙）
    particles.slice(index + 1).forEach(otherParticle => {
      const dx = particle.x - otherParticle.x
      const dy = particle.y - otherParticle.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < 120) {
        const opacity = (1 - distance / 120) * 0.08 // 極低的線條透明度
        ctx.beginPath()
        ctx.moveTo(particle.x, particle.y)
        ctx.lineTo(otherParticle.x, otherParticle.y)
        ctx.strokeStyle = isDark.value 
          ? `rgba(100, 120, 180, ${opacity})`
          : `rgba(150, 160, 200, ${opacity * 0.6})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    })
  })
  
  // 繪製緩慢移動的抽象波浪形狀
  drawAbstractWaves(ctx, width, height)
  
  animationId = requestAnimationFrame(animate)
}

// 繪製抽象波浪動畫
let waveOffset = 0
const drawAbstractWaves = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  waveOffset += 0.002 // 非常緩慢的移動
  
  // 繪製多層波浪
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    
    for (let x = 0; x <= width; x += 10) {
      const y = height / 2 + 
        Math.sin((x / 200 + waveOffset + i * 0.5)) * 30 +
        Math.sin((x / 150 + waveOffset * 1.5 + i * 0.7)) * 20
      ctx.lineTo(x, y)
    }
    
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    
    if (isDark.value) {
      ctx.fillStyle = `rgba(80, 100, 150, ${0.015 + i * 0.005})`
    } else {
      ctx.fillStyle = `rgba(180, 190, 220, ${0.01 + i * 0.003})`
    }
    ctx.fill()
  }
}

// 處理滑鼠移動
const handleMouseMove = (e: MouseEvent) => {
  mouseX = e.clientX
  mouseY = e.clientY
}

// 處理視窗大小調整
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
  initParticles(width, height)
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

// 組件掛載時初始化
onMounted(() => {
  if (!canvas.value) return
  
  canvas.value.width = window.innerWidth
  canvas.value.height = window.innerHeight
  lastWidth = window.innerWidth
  
  initParticles(canvas.value.width, canvas.value.height)
  animate()
  
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('resize', debouncedResize)
})

// 組件卸載時清理
onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
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
    class="animated-background"
    :class="{ 'dark-mode': isDark }"
  />
</template>

<style scoped>
.animated-background {
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

/* 暗色模式過渡 */
.animated-background.dark-mode {
  opacity: 1;
}

/* 確保背景不會影響其他元素 */
.animated-background::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  pointer-events: none;
}
</style>