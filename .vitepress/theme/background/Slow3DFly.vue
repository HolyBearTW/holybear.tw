<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useData } from 'vitepress'
import { animate as animeAnimate } from 'animejs'

// Canvas 引用
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null

// 深色模式檢測
const { isDark } = useData()

// SVG 圖片載入
let flowerImage: HTMLImageElement | null = null
const loadFlowerSVG = () => {
  flowerImage = new Image()
  flowerImage.src = '/image/theme/flower.svg'
}

// 1. 花瓣/雪花定義
interface Petal {
  x: number
  y: number
  size: number
  rotation: number
  opacity: number
  speed: number
  sway: number
  color: string
  shape: 'petal' | 'snowflake'
}

// 2. 深海氣泡定義
interface Bubble {
  x: number
  y: number
  size: number
  opacity: number
  speed: number
  sway: number
  wobble: number
}

// 3. 水墨暈染定義 - 參考 untitled-1.html 的多墨點設計
interface InkDot {
  offsetX: number
  offsetY: number
  size: number
  opacity: number
  scale: number
}

interface InkBlot {
  x: number
  y: number
  opacity: number
  color: string
  dots: InkDot[]
}

// 4. 螢火蟲定義
interface Firefly {
  x: number
  y: number
  brightness: number
  size: number
  color: string
  animationIndex: number // 用於選擇不同的動畫軌跡
  animationDuration: number // 動畫持續時間
  animationDelay: number // 動畫延遲
}

const petals: Petal[] = []
const bubbles: Bubble[] = []
const inkBlots: InkBlot[] = []
const fireflies: Firefly[] = []

// 初始化花瓣/雪花
const initPetals = (width: number, height: number) => {
  petals.length = 0
  // 根據屏幕寬度調整數量
  const isMobile = width < 1024
  const count = isMobile ? 8 : 15 // 移動端：8 個，桌面端：15 個（原 50）
  
  for (let i = 0; i < count; i++) {
    const shape = Math.random() > 0.5 ? 'petal' : 'snowflake'
    const petal: Petal = {
      x: Math.random() * width,
      y: -Math.random() * height,
      size: Math.random() * 15 + 5,
      rotation: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.6 + 0.3,
      speed: Math.random() * 0.5 + 0.2,
      sway: Math.random() * 40 - 20,
      color: isDark.value
        ? shape === 'petal' 
          ? `hsl(${Math.random() * 60 + 300}, 70%, 75%)` // 粉紫色花瓣（明亮）
          : `hsl(200, 80%, 90%)` // 淺藍雪花
        : shape === 'petal'
          ? `hsl(${Math.random() * 30 + 330}, 85%, 55%)` // 淺色模式：鮮豔粉紅色花瓣
          : `hsl(200, 90%, 50%)`, // 淺色模式：鮮豔藍色雪花
      shape
    }
    
    // 使用 anime.js 控制飄落和旋轉
    animeAnimate(petal, {
      y: height + 100,
      rotation: petal.rotation + Math.PI * 4,
      x: petal.x + petal.sway,
      duration: (15000 + Math.random() * 10000) / petal.speed,
      delay: i * 200,
      ease: 'linear',
      loop: true,
      autoplay: true,
      loopComplete: () => {
        petal.x = Math.random() * width
        petal.y = -50
      }
    })
    
    petals.push(petal)
  }
}

// 初始化深海氣泡
const initBubbles = (width: number, height: number) => {
  bubbles.length = 0
  // 根據屏幕寬度調整數量
  const isMobile = width < 1024
  const count = isMobile ? 15 : 40 // 移動端：10 個，桌面端：20 個（原 60）
  
  for (let i = 0; i < count; i++) {
    const bubble: Bubble = {
      x: Math.random() * width,
      y: height + Math.random() * 200,
      size: Math.random() * 20 + 5,
      opacity: Math.random() * 0.4 + 0.2,
      speed: Math.random() * 0.8 + 0.5, // 增加速度：0.5+0.3 → 0.8+0.5
      sway: 0,
      wobble: Math.random() * 30 - 15
    }
    
    // 使用 anime.js 控制上升和搖擺
    animeAnimate(bubble, {
      y: -100,
      duration: (15000 + Math.random() * 10000) / bubble.speed, // 更快：20000+15000 → 15000+10000
      delay: i * 150, // 更頻繁出現：300 → 150
      ease: 'linear',
      loop: true,
      autoplay: true,
      loopComplete: () => {
        bubble.x = Math.random() * width
        bubble.y = height + 50
      }
    })
    
    // 左右搖擺動畫
    animeAnimate(bubble, {
      sway: [
        { value: bubble.wobble, duration: 2000, ease: 'inOut(2)' },
        { value: -bubble.wobble, duration: 2000, ease: 'inOut(2)' },
        { value: 0, duration: 2000, ease: 'inOut(2)' }
      ],
      loop: true,
      autoplay: true
    })
    
    bubbles.push(bubble)
  }
}

// 初始化水墨暈染 - 參考 untitled-1.html 的實現（減少效果）
const initInkBlots = (width: number, height: number) => {
  inkBlots.length = 0
  
  // 移動端禁用水墨暈染效果
  const isMobile = width < 1024
  if (isMobile) return
  
  // 每隔一段時間創建新的水墨暈染
  const createInkBlot = () => {
    if (inkBlots.length >= 3) { // 限制最大數量：5 → 3
      inkBlots.shift() // 移除最舊的
    }
    
    // 創建多個墨點組成暈染效果（減少墨點數量）
    const numDots = 12 + Math.floor(Math.random() * 6) // 12-18 個墨點（原 20-30）
    const dots: InkDot[] = []
    
    for (let i = 0; i < numDots; i++) {
      dots.push({
        offsetX: (Math.random() - 0.5) * 150, // 擴散範圍縮小：200 → 150
        offsetY: (Math.random() - 0.5) * 150,
        size: Math.random() * 25 + 8, // 墨點大小：10-40px → 8-33px
        opacity: 0.8, // 降低初始不透明度：1 → 0.8
        scale: 0.1 // 初始縮放
      })
    }
    
    const blot: InkBlot = {
      x: Math.random() * width,
      y: Math.random() * height,
      opacity: 0.7, // 降低整體不透明度：1 → 0.7
      color: isDark.value
        ? // 深色模式：柔和的彩色墨水
          (() => {
            const hue = Math.random() * 360
            return `hsl(${hue}, 60%, 50%)`
          })()
        : // 淺色模式：明亮飽和的彩色墨水
          (() => {
            const hue = Math.random() * 360
            return `hsl(${hue}, 80%, 45%)` // 更高飽和度，適中亮度
          })(),
      dots
    }
    
    // 使用 anime.js 控制墨點擴散 (參考 untitled-1.html 的 2000-4000ms duration)
    blot.dots.forEach((dot, i) => {
      animeAnimate(dot, {
        scale: () => Math.random() * 3 + 1, // 隨機放大：1-5倍 → 1-4倍
        opacity: [0.8, 0], // 從 0.8 開始消失
        duration: 2000 + Math.random() * 2000, // 2-4 秒
        delay: i * 50, // 交錯延遲 (參考 stagger(100))
        ease: 'out(3)', // easeOutExpo 的替代
        autoplay: true
      })
    })
    
    // 整體暈染在所有墨點消失後移除
    setTimeout(() => {
      const index = inkBlots.indexOf(blot)
      if (index > -1) inkBlots.splice(index, 1)
    }, 4500) // 略長於最長動畫時間
    
    inkBlots.push(blot)
  }
  
  // 初始創建減少：3 → 2
  for (let i = 0; i < 2; i++) {
    setTimeout(() => createInkBlot(), i * 1500)
  }
  
  // 持續創建新的，間隔增加：3秒 → 5秒
  setInterval(createInkBlot, 5000)
}

// 初始化螢火蟲 - 使用 CSS 動畫風格 (參考 HyperOS)
const initFireflies = (width: number, height: number) => {
  fireflies.length = 0
  // 根據屏幕寬度調整數量
  const isMobile = width < 1024
  const count = isMobile ? 10 : 30 // 移動端：5 個，桌面端：10 個（原 20）
  
  for (let i = 0; i < count; i++) {
    const firefly: Firefly = {
      x: Math.random() * width,
      y: Math.random() * height,
      brightness: Math.random() * 0.8 + 0.2,
      size: Math.random() * 3 + 1.5,
      color: isDark.value
        ? `hsl(${Math.random() * 60 + 50}, 100%, 70%)` // 深色模式：黃綠色
        : `hsl(${Math.random() * 60 + 30}, 100%, 55%)`, // 淺色模式：亮橙黃色（更暖色調）
      animationIndex: i % 4, // 4 種不同的移動軌跡
      animationDuration: 200000 + Math.random() * 100000, // 200-300 秒 (超級緩慢，3-5 分鐘一個循環)
      animationDelay: i * 300 // 交錯啟動延遲增加
    }
    
    fireflies.push(firefly)
  }
}

// 更新螢火蟲位置 (模擬 CSS 關鍵幀動畫)
const updateFireflies = (width: number, height: number) => {
  const now = Date.now()
  // 根據屏幕寬度調整移動幅度
  const isMobile = width < 1024
  const moveScale = isMobile ? 0.3 : 0.6 // 移動端幅度減少 70%，桌面端減少 40%
  
  fireflies.forEach(firefly => {
    const elapsed = (now - firefly.animationDelay) % firefly.animationDuration
    const progress = elapsed / firefly.animationDuration
    
    // 根據不同的 animationIndex 使用不同的移動軌跡 (大幅減少移動量)
    switch (firefly.animationIndex) {
      case 0: // 軌跡 1：橢圓形移動 (幅度大幅減少)
        firefly.x = (firefly.x % width) + Math.sin(progress * Math.PI * 2) * 3 * moveScale
        firefly.y = (firefly.y % height) + Math.cos(progress * Math.PI * 2) * 2 * moveScale
        break
      case 1: // 軌跡 2：波浪形移動 (幾乎靜止)
        firefly.x = (firefly.x + 0.005 * moveScale) % width
        firefly.y = (firefly.y % height) + Math.sin(progress * Math.PI * 4) * 1.5 * moveScale
        break
      case 3: // 軌跡 3：對角線移動 (微小移動)
        firefly.x = (firefly.x + 0.004 * moveScale) % width
        firefly.y = (firefly.y + 0.005 * moveScale) % height
        break
      case 2: // 軌跡 4：隨機漂移 (極微小)
      default:
        firefly.x = (firefly.x + Math.sin(progress * Math.PI * 3) * 0.008 * moveScale) % width
        firefly.y = (firefly.y + Math.cos(progress * Math.PI * 2.5) * 0.006 * moveScale) % height
        break
    }
    
    // 邊界循環
    if (firefly.x < 0) firefly.x += width
    if (firefly.x > width) firefly.x -= width
    if (firefly.y < 0) firefly.y += height
    if (firefly.y > height) firefly.y -= height
    
    // 亮度閃爍 (3 秒一次閃爍 = 0.33 次/秒)
    const flickerSpeed = 0.33 // 3 秒產生一次閃爍
    firefly.brightness = 0.3 + Math.abs(Math.sin(now / 1000 * flickerSpeed + firefly.animationDelay / 100)) * 0.7
  })
}

// 繪製花瓣/雪花
const drawPetals = (ctx: CanvasRenderingContext2D) => {
  petals.forEach(petal => {
    ctx.save()
    ctx.translate(petal.x, petal.y)
    ctx.rotate(petal.rotation)
    ctx.globalAlpha = petal.opacity
    
    if (petal.shape === 'petal') {
      // 使用 SVG 圖片繪製花瓣
      if (flowerImage && flowerImage.complete) {
        const size = petal.size * 3 // 放大尺寸以適配 SVG
        
        ctx.save()
        
        // 先繪製彩色陰影光暈
        ctx.shadowColor = petal.color
        ctx.shadowBlur = 15
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        
        // 創建一個臨時 canvas 來處理 SVG 著色
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = size
        tempCanvas.height = size
        const tempCtx = tempCanvas.getContext('2d')
        
        if (tempCtx) {
          // 在臨時 canvas 上繪製 SVG
          tempCtx.drawImage(flowerImage, 0, 0, size, size)
          
          // 使用 source-in 混合模式填充顏色
          tempCtx.globalCompositeOperation = 'source-in'
          tempCtx.fillStyle = petal.color
          tempCtx.fillRect(0, 0, size, size)
          
          // 將著色後的圖片繪製到主 canvas
          ctx.drawImage(tempCanvas, -size / 2, -size / 2, size, size)
        }
        
        ctx.restore()
      }
    } else {
      // 繪製雪花（六角星形）
      ctx.strokeStyle = petal.color
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      
      for (let i = 0; i < 6; i++) {
        ctx.save()
        ctx.rotate((Math.PI / 3) * i)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(0, petal.size)
        ctx.stroke()
        
        // 雪花分支
        ctx.beginPath()
        ctx.moveTo(0, petal.size * 0.6)
        ctx.lineTo(-petal.size * 0.3, petal.size * 0.8)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, petal.size * 0.6)
        ctx.lineTo(petal.size * 0.3, petal.size * 0.8)
        ctx.stroke()
        
        ctx.restore()
      }
    }
    
    ctx.restore()
  })
}

// 繪製深海氣泡
const drawBubbles = (ctx: CanvasRenderingContext2D) => {
  bubbles.forEach(bubble => {
    const x = bubble.x + bubble.sway
    
    // 外圈光暈 - 淺色模式使用更鮮豔的顏色
    const gradient = ctx.createRadialGradient(x, bubble.y, 0, x, bubble.y, bubble.size)
    gradient.addColorStop(0, isDark.value 
      ? `rgba(100, 200, 255, ${bubble.opacity * 0.6})`
      : `rgba(100, 180, 255, ${bubble.opacity * 0.8})`) // 淺色模式：更亮的藍色
    gradient.addColorStop(0.7, isDark.value
      ? `rgba(50, 150, 200, ${bubble.opacity * 0.3})`
      : `rgba(50, 150, 255, ${bubble.opacity * 0.5})`) // 淺色模式：更鮮豔
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, bubble.y, bubble.size, 0, Math.PI * 2)
    ctx.fill()
    
    // 氣泡邊緣 - 淺色模式使用更明顯的顏色
    ctx.strokeStyle = isDark.value
      ? `rgba(150, 220, 255, ${bubble.opacity * 0.8})`
      : `rgba(50, 150, 255, ${bubble.opacity * 0.9})` // 淺色模式：更深的藍色邊緣
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x, bubble.y, bubble.size * 0.9, 0, Math.PI * 2)
    ctx.stroke()
    
    // 高光 - 淺色模式也保持明亮
    ctx.fillStyle = isDark.value
      ? `rgba(255, 255, 255, ${bubble.opacity * 0.6})`
      : `rgba(255, 255, 255, ${bubble.opacity * 0.9})` // 淺色模式：更明顯的高光
    ctx.beginPath()
    ctx.arc(x - bubble.size * 0.3, bubble.y - bubble.size * 0.3, bubble.size * 0.2, 0, Math.PI * 2)
    ctx.fill()
  })
}

// 繪製水墨暈染
// 繪製水墨暈染 - 參考 untitled-1.html 的 blur + contrast 技術
const drawInkBlots = (ctx: CanvasRenderingContext2D) => {
  inkBlots.forEach(blot => {
    ctx.save()
    ctx.translate(blot.x, blot.y)
    ctx.globalAlpha = blot.opacity
    
    // 關鍵：應用 blur + contrast 濾鏡創造墨水融合效果
    // 參考 untitled-1.html: filter: blur(10px) contrast(30)
    ctx.filter = 'blur(10px) contrast(30)'
    
    // 繪製所有墨點
    blot.dots.forEach(dot => {
      ctx.save()
      ctx.translate(dot.offsetX, dot.offsetY)
      ctx.scale(dot.scale, dot.scale)
      ctx.globalAlpha = dot.opacity
      
      // 繪製圓形墨點
      ctx.fillStyle = blot.color
      ctx.beginPath()
      ctx.arc(0, 0, dot.size, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.restore()
    })
    
    ctx.filter = 'none'
    ctx.restore()
  })
}

// 繪製螢火蟲 - 增強閃爍效果
const drawFireflies = (ctx: CanvasRenderingContext2D) => {
  fireflies.forEach(firefly => {
    // 根據亮度調整光暈大小（亮度越高，光暈越大）
    const glowSize = firefly.size * (6 + firefly.brightness * 8)
    
    // 外層大光暈（柔和擴散）
    const outerGradient = ctx.createRadialGradient(
      firefly.x, firefly.y, 0,
      firefly.x, firefly.y, glowSize * 1.5
    )
    
    const hslaColorOuter = firefly.color.replace('hsl', 'hsla').replace(')', `, ${firefly.brightness * 0.3})`)
    const hslaColorOuterFade = firefly.color.replace('hsl', 'hsla').replace(')', `, ${firefly.brightness * 0.1})`)
    
    outerGradient.addColorStop(0, hslaColorOuter)
    outerGradient.addColorStop(0.5, hslaColorOuterFade)
    outerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    
    ctx.fillStyle = outerGradient
    ctx.beginPath()
    ctx.arc(firefly.x, firefly.y, glowSize * 1.5, 0, Math.PI * 2)
    ctx.fill()
    
    // 內層核心光暈（明亮集中）
    const innerGradient = ctx.createRadialGradient(
      firefly.x, firefly.y, 0,
      firefly.x, firefly.y, glowSize
    )
    
    const hslaColor = firefly.color.replace('hsl', 'hsla').replace(')', `, ${firefly.brightness})`)
    const hslaColorFade = firefly.color.replace('hsl', 'hsla').replace(')', `, ${firefly.brightness * 0.5})`)
    
    innerGradient.addColorStop(0, hslaColor)
    innerGradient.addColorStop(0.4, hslaColorFade)
    innerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    
    ctx.fillStyle = innerGradient
    ctx.beginPath()
    ctx.arc(firefly.x, firefly.y, glowSize, 0, Math.PI * 2)
    ctx.fill()
    
    // 螢火蟲核心（明亮的白色中心）
    ctx.fillStyle = isDark.value
      ? `rgba(255, 255, 240, ${firefly.brightness * 0.95})`
      : `rgba(255, 245, 200, ${firefly.brightness * 0.85})`
    ctx.beginPath()
    ctx.arc(firefly.x, firefly.y, firefly.size * 1.2, 0, Math.PI * 2)
    ctx.fill()
    
    // 最亮的中心點（模擬發光核心）
    if (firefly.brightness > 0.7) {
      ctx.fillStyle = `rgba(255, 255, 255, ${firefly.brightness})`
      ctx.beginPath()
      ctx.arc(firefly.x, firefly.y, firefly.size * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

// 繪製背景
const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  
  if (isDark.value) {
    // 深色模式：深紫色漸變
    gradient.addColorStop(0, '#0a0a1a')
    gradient.addColorStop(0.5, '#1a1430')
    gradient.addColorStop(1, '#0f0820')
  } else {
    // 淺色模式：粉色漸變（明亮溫暖）
    gradient.addColorStop(0, '#ffe8f5')
    gradient.addColorStop(0.3, '#fff0f8')
    gradient.addColorStop(0.7, '#fef5fa')
    gradient.addColorStop(1, '#ffe8f0')
  }
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

// 主動畫循環
const animate = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const width = canvas.width
  const height = canvas.height
  
  // 更新螢火蟲位置和亮度
  updateFireflies(width, height)
  
  // 清空並繪製背景
  drawBackground(ctx, width, height)
  
  // 繪製所有元素（從後到前）
  drawInkBlots(ctx)
  drawBubbles(ctx)
  drawPetals(ctx)
  drawFireflies(ctx)
  
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
}

// Debounced resize handler - 防止頻繁觸發
const handleResize = () => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
  resizeTimeout = window.setTimeout(() => {
    resizeCanvas()
  }, 150) // 150ms 延遲
}

// 初始化
onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  
  // 載入 SVG 圖片
  loadFlowerSVG()
  
  resizeCanvas()
  lastWidth = window.innerWidth
  
  const width = canvas.width
  const height = canvas.height
  
  initPetals(width, height)
  initBubbles(width, height)
  initInkBlots(width, height)
  initFireflies(width, height)
  
  window.addEventListener('resize', handleResize)
  
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
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="slow-3d-fly-theme"
  />
</template>

<style scoped>
.slow-3d-fly-theme {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  min-height: 100dvh; /* 動態視窗高度,支援移動端工具列變化 */
  z-index: -1;
  pointer-events: none;
  /* 移除固定黑色背景，讓 Canvas 繪製的漸變顯示 */
}
</style>