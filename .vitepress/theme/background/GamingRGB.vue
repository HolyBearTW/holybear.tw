<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useData } from 'vitepress'
import { animate as animeAnimate, stagger } from 'animejs'

// Canvas 引用
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null

// 深色模式檢測
const { isDark } = useData()

// RGB 粒子定義（LED 燈珠效果）
interface RGBParticle {
  x: number
  y: number
  size: number
  hue: number // 色相值 (0-360)
  hueSpeed: number // 色相變化速度
  opacity: number
  pulsePhase: number // 呼吸相位
}

// 流光軌跡定義
interface FlowingLight {
  points: { x: number; y: number }[]
  hueOffset: number
  speed: number
  width: number
  originalPoints: { x: number; y: number }[] // 保存原始點位
  reverseThickness?: boolean // 是否反向粗細（從右下粗到左上細）
  customThickness?: { max: number; min: number } // 自訂粗細範圍
  animatedOpacity?: number // anime.js 控制的透明度
  animatedScale?: number // anime.js 控制的縮放
}

const particles: RGBParticle[] = []
const flowingLights: FlowingLight[] = []

// anime.js 動畫實例
let lightAnimations: any[] = []

// 滑鼠位置
const mouseX = ref(0)
const mouseY = ref(0)
const mouseInfluenceRadius = 150 // 滑鼠影響範圍

// 檢測是否為手機版面
const isMobile = ref(false)

// 更新響應式狀態
const updateResponsive = () => {
  isMobile.value = window.innerWidth < 1024
}

// 初始化 RGB 粒子（已移除邊緣 LED 燈珠效果）
const initParticles = (width: number, height: number) => {
  particles.length = 0
  // 不再創建邊緣粒子
}

// 初始化流光軌跡
const initFlowingLights = (width: number, height: number) => {
  flowingLights.length = 0
  
  // 根據螢幕尺寸決定軌跡數量和分段密度
  const lightCount = isMobile.value ? 2 : 5 // 手機：2條，桌面：5條
  const segments = isMobile.value ? 50 : 100 // 手機：50分段，桌面：100分段
  
  // 創建流光軌跡
  for (let i = 0; i < lightCount; i++) {
    const points: { x: number; y: number }[] = []
    
    if (isMobile.value) {
      // 手機版：2條斜向軌跡
      for (let j = 0; j <= segments; j++) {
        const t = j / segments
        
        // 左上到右下的斜線
        const baseX = width * t
        const baseY = height * t
        
        // 添加波浪效果
        const wave = Math.sin(t * Math.PI * 3) * 40
        
        // 分散設計：每條軌跡偏移更大
        const offsetY = (i - 0.5) * height * 0.4
        
        points.push({ 
          x: baseX + wave, 
          y: baseY + offsetY 
        })
      }
    } else {
      // 桌面版：5條斜向軌跡，其中一條反向製造交叉效果
      for (let j = 0; j <= segments; j++) {
        const t = j / segments
        
        // 中間的軌跡（第3條，i=2）從左下到右上
        if (i === 2) {
          // 反向斜線：左下到右上
          const baseX = width * t
          const baseY = height * (1 - t)
          
          // 添加波浪效果
          const wave = Math.sin(t * Math.PI * 3) * 250
          
          points.push({ 
            x: baseX + wave, 
            y: baseY 
          })
        } else {
          // 其他軌跡：左上到右下
          const baseX = width * t
          const baseY = height * t
          
          // 添加波浪效果
          const wave = Math.sin(t * Math.PI * 3 + i * Math.PI * 0.5) * 50
          
          // 分散設計：均勻分布在整個畫面高度
          const offsetY = (i - 2) * height * 0.3
          
          points.push({ 
            x: baseX + wave, 
            y: baseY + offsetY 
          })
        }
      }
    }
    
    flowingLights.push({
      points: [...points],
      originalPoints: [...points], // 保存原始位置
      hueOffset: i * (360 / lightCount), // 均分色相
      speed: 0.3 + i * 0.1,
      width: 4,
      reverseThickness: i % 2 === 1, // 奇數軌跡反向粗細（從右下粗）
      customThickness: i === 2 ? { max: 50, min: 2 } : undefined, // 第3條軌跡特殊粗細
      animatedOpacity: 0, // 初始透明度為 0，用於進場動畫
      animatedScale: 0.5 // 初始縮放為 0.5，用於進場動畫
    })
  }
  
  // 使用 anime.js 創建交錯進場動畫
  lightAnimations.forEach(anim => anim.pause && anim.pause())
  lightAnimations = []
  
  flowingLights.forEach((light, index) => {
    const animation = animeAnimate(light, {
      animatedOpacity: 1,
      animatedScale: 1,
      duration: 1500,
      delay: index * 200, // 交錯延遲
      ease: 'out(3)', // 彈性緩動
      autoplay: true
    })
    lightAnimations.push(animation)
  })
}

// 繪製背景（根據深色模式調整）
const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  
  if (isDark.value) {
    // 深色模式：深色漸層背景
    gradient.addColorStop(0, '#1a1820')    // 深紫灰
    gradient.addColorStop(0.5, '#1e1e1e')  // 深灰
    gradient.addColorStop(1, '#1a1420')    // 深粉灰
  } else {
    // 淺色模式：粉白漸層背景
    gradient.addColorStop(0, '#fff5f7')    // 淺粉白
    gradient.addColorStop(0.5, '#ffffff')  // 純白
    gradient.addColorStop(1, '#f8f0f2')    // 淺粉灰
  }
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  // 添加柔和的徑向光暈
  const glowGradient = ctx.createRadialGradient(
    width * 0.5, height * 0.5, 0,
    width * 0.5, height * 0.5, width * 0.6
  )
  
  if (isDark.value) {
    glowGradient.addColorStop(0, 'rgba(180, 100, 120, 0.08)') // 深色模式暗粉紅光暈
    glowGradient.addColorStop(1, 'rgba(180, 100, 120, 0)')
  } else {
    glowGradient.addColorStop(0, 'rgba(255, 182, 193, 0.1)') // 淺色模式淺粉紅光暈
    glowGradient.addColorStop(1, 'rgba(255, 182, 193, 0)')
  }
  
  ctx.fillStyle = glowGradient
  ctx.fillRect(0, 0, width, height)
}

// 繪製 RGB 粒子（LED 燈珠效果，根據深色模式調整）
const drawParticles = (ctx: CanvasRenderingContext2D, time: number) => {
  particles.forEach(particle => {
    // 更新色相（流水 RGB 效果）
    particle.hue = (particle.hue + particle.hueSpeed) % 360
    
    // 呼吸效果
    const pulse = Math.sin(time * 0.002 + particle.pulsePhase) * 0.3 + 0.7
    const currentOpacity = particle.opacity * pulse
    
    // 繪製光暈
    const glowSize = particle.size * 6
    const glowGradient = ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, glowSize
    )
    
    if (isDark.value) {
      // 深色模式：提高亮度和飽和度以增強可見度
      glowGradient.addColorStop(0, `hsla(${particle.hue}, 100%, 75%, ${currentOpacity * 0.9})`)
      glowGradient.addColorStop(0.5, `hsla(${particle.hue}, 100%, 65%, ${currentOpacity * 0.5})`)
      glowGradient.addColorStop(1, `hsla(${particle.hue}, 100%, 55%, 0)`)
    } else {
      // 淺色模式：原有亮度
      glowGradient.addColorStop(0, `hsla(${particle.hue}, 100%, 70%, ${currentOpacity * 0.8})`)
      glowGradient.addColorStop(0.5, `hsla(${particle.hue}, 100%, 60%, ${currentOpacity * 0.4})`)
      glowGradient.addColorStop(1, `hsla(${particle.hue}, 100%, 50%, 0)`)
    }
    
    ctx.fillStyle = glowGradient
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2)
    ctx.fill()
    
    // 繪製核心燈珠
    const lightness = isDark.value ? 85 : 80
    ctx.fillStyle = `hsla(${particle.hue}, 100%, ${lightness}%, ${currentOpacity})`
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
    ctx.fill()
  })
}

// 更新流光軌跡位置（根據滑鼠影響 - 平滑圓形偏移，避免點纏繞）
const updateFlowingLights = () => {
  flowingLights.forEach(light => {
    // 第一步：計算每個點的偏移
    const offsets = light.originalPoints.map((originalPoint) => {
      const dx = mouseX.value - originalPoint.x
      const dy = mouseY.value - originalPoint.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < mouseInfluenceRadius && distance > 0) {
        // 使用餘弦函數創建平滑的圓形衰減
        const normalizedDistance = distance / mouseInfluenceRadius
        const influence = Math.cos(normalizedDistance * Math.PI * 0.5)
        
        // 降低位移量，避免過度偏移
        const displacement = influence * 20
        
        // 徑向偏移方向
        const angle = Math.atan2(dy, dx)
        return {
          x: Math.cos(angle) * displacement,
          y: Math.sin(angle) * displacement
        }
      }
      
      return { x: 0, y: 0 }
    })
    
    // 第二步：平滑處理 - 對偏移量進行移動平均，避免點聚集
    const smoothedOffsets = offsets.map((offset, i) => {
      const windowSize = 3 // 平滑窗口大小
      let sumX = 0, sumY = 0, count = 0
      
      for (let j = Math.max(0, i - windowSize); j <= Math.min(offsets.length - 1, i + windowSize); j++) {
        sumX += offsets[j].x
        sumY += offsets[j].y
        count++
      }
      
      return {
        x: sumX / count,
        y: sumY / count
      }
    })
    
    // 第三步：應用平滑後的偏移
    light.points = light.originalPoints.map((originalPoint, i) => ({
      x: originalPoint.x + smoothedOffsets[i].x,
      y: originalPoint.y + smoothedOffsets[i].y
    }))
  })
}

// 繪製流光軌跡（部分從左上粗，部分從右下粗）
const drawFlowingLights = (ctx: CanvasRenderingContext2D, time: number) => {
  flowingLights.forEach((light, index) => {
    // 應用 anime.js 動畫屬性
    const animOpacity = light.animatedOpacity ?? 1
    const animScale = light.animatedScale ?? 1
    
    // 如果透明度為 0，跳過繪製
    if (animOpacity <= 0) return
    
    const offset = (time * light.speed) % 1000
    
    // 使用 Path2D 繪製完整軌跡，避免分節點圓形
    const path = new Path2D()
    
    // 先繪製完整路徑
    if (light.points.length > 0) {
      path.moveTo(light.points[0].x, light.points[0].y)
      for (let i = 1; i < light.points.length; i++) {
        path.lineTo(light.points[i].x, light.points[i].y)
      }
    }
    
    // 先繪製主體路徑（無陰影，避免端點可見）
    ctx.shadowBlur = 0
    
    for (let i = 0; i < light.points.length - 1; i++) {
      const progress = (i / light.points.length + offset / 1000) % 1
      const point = light.points[i]
      const nextPoint = light.points[i + 1]
      
      // 計算線條粗細
      const thicknessProgress = i / light.points.length // 0 到 1
      
      // 使用自訂粗細或預設粗細
      const maxWidth = light.customThickness?.max || 10 // 最粗
      const minWidth = light.customThickness?.min || 1.5 // 最細
      
      // 根據 reverseThickness 決定粗細方向
      let currentWidth
      if (light.reverseThickness) {
        // 反向：從右下(終點)粗到左上(起點)細
        currentWidth = minWidth + (maxWidth - minWidth) * thicknessProgress
      } else {
        // 正向：從左上(起點)粗到右下(終點)細
        currentWidth = maxWidth - (maxWidth - minWidth) * thicknessProgress
      }
      
      // 計算當前顏色（應用動畫透明度）
      const hue = (light.hueOffset + progress * 360) % 360
      const alpha = Math.sin(progress * Math.PI) * 0.6 * animOpacity // 結合動畫透明度
      
      // 計算當前線條寬度（應用動畫縮放）
      const scaledWidth = currentWidth * animScale
      
      // 繪製漸變線段（使用 round 讓線段平滑連接）
      const gradient = ctx.createLinearGradient(
        point.x, point.y,
        nextPoint.x, nextPoint.y
      )
      gradient.addColorStop(0, `hsla(${hue}, 100%, 65%, ${alpha})`)
      gradient.addColorStop(1, `hsla(${(hue + 30) % 360}, 100%, 65%, ${alpha})`)
      
      ctx.strokeStyle = gradient
      ctx.lineWidth = scaledWidth
      ctx.lineCap = 'round' // 使用圓頭讓線段自然連接
      ctx.lineJoin = 'round' // 保持轉角平滑
      ctx.beginPath()
      ctx.moveTo(point.x, point.y)
      ctx.lineTo(nextPoint.x, nextPoint.y)
      ctx.stroke()
    }
    
    // 第二層：只繪製光暈效果（透明度更低，不顯示端點）
    for (let i = 0; i < light.points.length - 1; i++) {
      const progress = (i / light.points.length + offset / 1000) % 1
      const point = light.points[i]
      const nextPoint = light.points[i + 1]
      
      const thicknessProgress = i / light.points.length
      const maxWidth = light.customThickness?.max || 10
      const minWidth = light.customThickness?.min || 1.5
      
      let currentWidth
      if (light.reverseThickness) {
        currentWidth = minWidth + (maxWidth - minWidth) * thicknessProgress
      } else {
        currentWidth = maxWidth - (maxWidth - minWidth) * thicknessProgress
      }
      
      const hue = (light.hueOffset + progress * 360) % 360
      const alpha = Math.sin(progress * Math.PI) * 0.3 * animOpacity // 光暈透明度也應用動畫
      
      // 只在線段中間添加光暈
      const midX = (point.x + nextPoint.x) / 2
      const midY = (point.y + nextPoint.y) / 2
      
      ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${alpha})`
      ctx.shadowBlur = currentWidth * animScale * 3 // 光暈也應用縮放
      ctx.strokeStyle = `hsla(${hue}, 100%, 65%, 0)` // 完全透明的線條只為了光暈
      ctx.lineWidth = currentWidth * animScale * 0.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(midX, midY)
      ctx.lineTo(midX, midY) // 單點光暈
      ctx.stroke()
    }
    
    ctx.shadowBlur = 0
  })
}

// 繪製角落光效已移除（根據用戶要求）

// 主動畫循環
const animate = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const width = canvas.width
  const height = canvas.height
  const time = Date.now()
  
  // 清空畫布
  ctx.clearRect(0, 0, width, height)
  
  // 繪製背景
  drawBackground(ctx, width, height)
  
  // 更新流光軌跡（滑鼠互動）
  updateFlowingLights()
  
  // 繪製流光軌跡
  drawFlowingLights(ctx, time)
  
  // 繪製滑鼠影響圓圈（可視化調試，可選）
  if (mouseX.value > 0 && mouseY.value > 0) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(mouseX.value, mouseY.value, mouseInfluenceRadius, 0, Math.PI * 2)
    ctx.stroke()
  }
  
  // 繪製 RGB 粒子（已移除）
  // drawParticles(ctx, time)
  
  animationId = requestAnimationFrame(animate)
}

// 調整 Canvas 大小
let resizeTimeout: number | null = null
let lastWidth = 0

const resizeCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const width = window.innerWidth
  const height = window.innerHeight
  
  // 忽略只有高度變化的 resize (移動端工具列顯示/隱藏)
  if (lastWidth !== 0 && Math.abs(width - lastWidth) < 10) {
    return
  }
  
  lastWidth = width
  canvas.width = width
  canvas.height = height
  
  // 更新響應式狀態
  updateResponsive()
  
  // 重新初始化
  initParticles(width, height)
  initFlowingLights(width, height)
}

// Debounced resize handler
const debouncedResize = () => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
  resizeTimeout = window.setTimeout(() => {
    resizeCanvas()
  }, 150)
}

// 處理滑鼠移動
const handleMouseMove = (e: MouseEvent) => {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
}

// 初始化
onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  
  // 初始化響應式狀態
  updateResponsive()
  
  resizeCanvas()
  lastWidth = window.innerWidth
  
  window.addEventListener('resize', debouncedResize)
  window.addEventListener('mousemove', handleMouseMove)
  
  // 開始動畫
  animate()
})

// 清理
onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
  // 停止所有 anime.js 動畫
  lightAnimations.forEach(anim => anim.pause && anim.pause())
  lightAnimations = []
  
  window.removeEventListener('resize', debouncedResize)
  window.removeEventListener('mousemove', handleMouseMove)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="gaming-rgb-theme"
  />
</template>

<style scoped>
.gaming-rgb-theme {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  min-height: 100dvh; /* 動態視窗高度,支援移動端工具列變化 */
  z-index: -1;
  pointer-events: none;
}
</style>