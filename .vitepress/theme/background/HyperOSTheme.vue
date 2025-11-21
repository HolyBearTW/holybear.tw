<template>
  <div class="hyperos-background">
    <div 
      v-for="(block, index) in blocks" 
      :key="index"
      class="color-block"
      :class="`block-${index + 1}`"
      :style="getBlockStyle(block)"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Block {
  color: string
  initialX: number
  initialY: number
  blur: number
  hideOnMobile?: boolean
}

// 4 個色塊的配置 - Xiaomi HyperOS 官方配色
//色塊位置
const blocks = ref<Block[]>([
  { 
    // 藍色 - 左上角
    color: 'linear-gradient(135deg, #4A9FF5 0%, #1E88E5 100%)', 
    initialX: 25, 
    initialY: 25,
    blur: 80
  },
  { 
    // 紅色 - 左下角
    color: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A52 100%)', 
    initialX: 25, 
    initialY: 95,
    blur: 70
  },
  { 
    // 黃橘色 - 右上角
    color: 'linear-gradient(135deg, #FFB84D 0%, #FF9500 100%)', 
    initialX: 110, 
    initialY: 15,
    blur: 90
  },
  { 
    // 青藍色 - 右下角 (替代綠色，更好的混色效果)
    color: 'linear-gradient(135deg, #4DD0E1 0%, #26C6DA 100%)', 
    initialX: 100, 
    initialY: 75,
    blur: 75
  }
])

const getBlockStyle = (block: Block) => {
  return {
    background: block.color,
    left: `${block.initialX}%`,
    top: `${block.initialY}%`,
    filter: `blur(${block.blur}px)`,
    transform: 'translate(-50%, -50%)'
  }
}

onMounted(() => {
  console.log('HyperOS Theme 已載入')
})
</script>

<style scoped>
.hyperos-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  min-height: 100dvh; /* 動態視窗高度,支援移動端工具列變化 */
  overflow: hidden;
  z-index: -1;
  background: linear-gradient(to bottom, #e0e7ff 0%, #fce7f3 50%, #dbeafe 100%);
}
/* 色塊基礎樣式  大小*/
.color-block {
  position: absolute;
  width: 100vh;
  height: 100vh;
  min-width: 300px;
  min-height: 300px;
  border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
  opacity: 0.6;
  will-change: transform, border-radius;
}

/* 色塊 1 - 藍色 */
.block-1 {
  animation: 
    float1 18s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite,
    morph1 15s ease-in-out infinite;
  animation-delay: 0s;
}

/* 色塊 2 - 紅色 */
.block-2 {
  animation: 
    float2 15s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite,
    morph2 16s ease-in-out infinite;
  animation-delay: 2s;
}

/* 色塊 3 - 黃橘色 */
.block-3 {
  animation: 
    float3 15s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite,
    morph3 18s ease-in-out infinite;
  animation-delay: 4s;
}

/* 色塊 4 - 青藍色 */
.block-4 {
  animation: 
    float4 22s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite,
    morph4 17s ease-in-out infinite;
  animation-delay: 1s;
}

/* 色塊 1 位移動畫 - 藍色從左上出發，限制重疊≤25% */
@keyframes float1 {
  0%, 100% { 
    transform: translate(-50%, -50%) scale(1); 
  }
  19% { 
    transform: translate(calc(-50% + 18vw), calc(-50% + 8vh)) scale(1.12); 
  }
  20% { 
    transform: translate(calc(-50% + 20vw), calc(-50% + 10vh)) scale(1.15); 
  }
  39% { 
    transform: translate(calc(-50% - 8vw), calc(-50% + 20vh)) scale(0.88); 
  }
  40% { 
    transform: translate(calc(-50% - 10vw), calc(-50% + 22vh)) scale(0.9); 
  }
  59% { 
    transform: translate(calc(-50% + 15vw), calc(-50% + 18vh)) scale(1.08); 
  }
  60% { 
    transform: translate(calc(-50% + 17vw), calc(-50% + 20vh)) scale(1.1); 
  }
  79% { 
    transform: translate(calc(-50% + 3vw), calc(-50% - 8vh)) scale(1.03); 
  }
  80% { 
    transform: translate(calc(-50% + 5vw), calc(-50% - 10vh)) scale(1.05); 
  }
}

/* 色塊 2 位移動畫 - 紅色從左下出發，限制重疊≤25% */
@keyframes float2 {
  0%, 100% { 
    transform: translate(-50%, -50%) scale(1); 
  }
  14% { 
    transform: translate(calc(-50% + 18vw), calc(-50% - 20vh)) scale(1.10); 
  }
  15% { 
    transform: translate(calc(-50% + 20vw), calc(-50% - 22vh)) scale(1.12); 
  }
  34% { 
    transform: translate(calc(-50% + 20vw), calc(-50% + 8vh)) scale(0.86); 
  }
  35% { 
    transform: translate(calc(-50% + 22vw), calc(-50% + 10vh)) scale(0.88); 
  }
  54% { 
    transform: translate(calc(-50% - 10vw), calc(-50% - 18vh)) scale(1.06); 
  }
  55% { 
    transform: translate(calc(-50% - 12vw), calc(-50% - 20vh)) scale(1.08); 
  }
  74% { 
    transform: translate(calc(-50% + 15vw), calc(-50% - 8vh)) scale(0.93); 
  }
  75% { 
    transform: translate(calc(-50% + 17vw), calc(-50% - 10vh)) scale(0.95); 
  }
  89% { 
    transform: translate(calc(-50% + 5vw), calc(-50% + 3vh)) scale(1.03); 
  }
  90% { 
    transform: translate(calc(-50% + 7vw), calc(-50% + 5vh)) scale(1.05); 
  }
}

/* 色塊 3 位移動畫 - 黃橘從右上出發，限制重疊≤25% */
@keyframes float3 {
  0%, 100% { 
    transform: translate(-50%, -50%) scale(1); 
  }
  17% { 
    transform: translate(calc(-50% - 20vw), calc(-50% + 15vh)) scale(0.90); 
  }
  18% { 
    transform: translate(calc(-50% - 22vw), calc(-50% + 17vh)) scale(0.92); 
  }
  37% { 
    transform: translate(calc(-50% - 15vw), calc(-50% - 10vh)) scale(1.16); 
  }
  38% { 
    transform: translate(calc(-50% - 17vw), calc(-50% - 12vh)) scale(1.18); 
  }
  57% { 
    transform: translate(calc(-50% - 20vw), calc(-50% + 20vh)) scale(0.88); 
  }
  58% { 
    transform: translate(calc(-50% - 22vw), calc(-50% + 22vh)) scale(0.9); 
  }
  77% { 
    transform: translate(calc(-50% - 8vw), calc(-50% - 15vh)) scale(1.08); 
  }
  78% { 
    transform: translate(calc(-50% - 10vw), calc(-50% - 17vh)) scale(1.1); 
  }
  87% { 
    transform: translate(calc(-50% - 18vw), calc(-50% + 5vh)) scale(1.00); 
  }
  88% { 
    transform: translate(calc(-50% - 20vw), calc(-50% + 7vh)) scale(1.02); 
  }
}

/* 色塊 4 位移動畫 - 青藍色從右下出發，限制重疊≤25% */
@keyframes float4 {
  0%, 100% { 
    transform: translate(-50%, -50%) scale(1); 
  }
  21% { 
    transform: translate(calc(-50% - 18vw), calc(-50% - 20vh)) scale(1.12); 
  }
  22% { 
    transform: translate(calc(-50% - 20vw), calc(-50% - 22vh)) scale(1.14); 
  }
  43% { 
    transform: translate(calc(-50% + 10vw), calc(-50% - 20vh)) scale(0.88); 
  }
  44% { 
    transform: translate(calc(-50% + 12vw), calc(-50% - 22vh)) scale(0.9); 
  }
  65% { 
    transform: translate(calc(-50% - 22vw), calc(-50% - 8vh)) scale(1.10); 
  }
  66% { 
    transform: translate(calc(-50% - 24vw), calc(-50% - 10vh)) scale(1.12); 
  }
  81% { 
    transform: translate(calc(-50% - 15vw), calc(-50% - 18vh)) scale(0.96); 
  }
  82% { 
    transform: translate(calc(-50% - 17vw), calc(-50% - 20vh)) scale(0.98); 
  }
  91% { 
    transform: translate(calc(-50% - 3vw), calc(-50% - 10vh)) scale(1.06); 
  }
  92% { 
    transform: translate(calc(-50% - 5vw), calc(-50% - 12vh)) scale(1.08); 
  }
}

/* 形狀變形動畫 - 增強凹槽擠壓效果 */
@keyframes morph1 {
  0%, 100% { 
    border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; 
  }
  20% { 
    border-radius: 65% 35% 20% 80% / 70% 25% 75% 30%; 
  }
  40% { 
    border-radius: 25% 75% 60% 40% / 30% 70% 40% 60%; 
  }
  60% { 
    border-radius: 80% 20% 40% 60% / 55% 85% 35% 45%; 
  }
  80% { 
    border-radius: 35% 65% 75% 25% / 45% 30% 70% 60%; 
  }
}

@keyframes morph2 {
  0%, 100% { 
    border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; 
  }
  18% { 
    border-radius: 20% 80% 55% 45% / 70% 60% 20% 80%; 
  }
  36% { 
    border-radius: 75% 25% 40% 60% / 35% 75% 45% 55%; 
  }
  54% { 
    border-radius: 30% 70% 80% 20% / 65% 35% 85% 25%; 
  }
  72% { 
    border-radius: 85% 15% 35% 65% / 40% 80% 30% 70%; 
  }
  90% { 
    border-radius: 40% 60% 65% 35% / 75% 25% 60% 40%; 
  }
}

@keyframes morph3 {
  0%, 100% { 
    border-radius: 50% 50% 40% 60% / 60% 40% 60% 40%; 
  }
  17% { 
    border-radius: 85% 15% 70% 30% / 25% 75% 40% 60%; 
  }
  34% { 
    border-radius: 20% 80% 35% 65% / 80% 20% 70% 30%; 
  }
  51% { 
    border-radius: 70% 30% 80% 20% / 40% 85% 25% 75%; 
  }
  68% { 
    border-radius: 35% 65% 25% 75% / 65% 35% 80% 20%; 
  }
  85% { 
    border-radius: 60% 40% 70% 30% / 50% 70% 35% 65%; 
  }
}

@keyframes morph4 {
  0%, 100% { 
    border-radius: 40% 60% 60% 40% / 50% 60% 40% 60%; 
  }
  16% { 
    border-radius: 75% 25% 20% 80% / 85% 40% 65% 35%; 
  }
  32% { 
    border-radius: 25% 75% 85% 15% / 30% 70% 20% 80%; 
  }
  48% { 
    border-radius: 80% 20% 45% 55% / 60% 85% 75% 25%; 
  }
  64% { 
    border-radius: 15% 85% 60% 40% / 70% 30% 85% 15%; 
  }
  80% { 
    border-radius: 65% 35% 75% 25% / 40% 80% 30% 70%; 
  }
  96% { 
    border-radius: 50% 50% 30% 70% / 75% 50% 60% 40%; 
  }
}

/* 響應式設計 */
/* 手機和平板設備上調整色塊大小和動畫 */
@media (max-width: 960px) {
  .color-block {
    width: 60vw;
    height: 60vh;
    min-width: 400px;
    min-height: 400px;
    opacity: 0.5;
  }
  
  /* 簡化移動端動畫 */
  .block-1, .block-2, .block-3, .block-4 {
    animation-duration: 30s, 20s;
  }
}
/* 手機和平板設備上調整色塊大小和動畫 */
@media (max-width: 640px) {
  .color-block {
    width: 70vw;
    height: 70vh;
    min-width: 300px;
    min-height: 300px;
    opacity: 0.45;
  }
}

/* 暗色模式適配 */
.dark .hyperos-background {
  background: linear-gradient(to bottom, #351257 0%, #351257 50%, #351257 100%);
}

.dark .color-block {
  opacity: 0.5;
}

/* 暗色模式色塊顏色 */
.dark .block-1 {
  background: linear-gradient(135deg, #5B7DBF 0%, #4A6FA5 100%) !important;
}

.dark .block-2 {
  background: linear-gradient(135deg, #C84B4B 0%, #A63D3D 100%) !important;
}

.dark .block-3 {
  background: linear-gradient(135deg, #d89b2b 0%, #d89b2b 100%) !important;
}

.dark .block-4 {
  background: linear-gradient(135deg, #21b121c7 0%, #21b121c7 100%) !important;
}

/* 減少動畫偏好設置 */
@media (prefers-reduced-motion: reduce) {
  .color-block {
    animation: none !important;
  }
}
</style>