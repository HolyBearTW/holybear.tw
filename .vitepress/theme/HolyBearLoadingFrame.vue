<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useData } from 'vitepress'

const isVisible = ref(true)
const isPopping = ref(false)
const isLeaving = ref(false)
const { isDark } = useData()
let previousBodyOverflow = ''
let previousDocumentOverflow = ''
let routeShowTimer: number | undefined
let routePopTimer: number | undefined
let routeLeaveTimer: number | undefined
let routeHideTimer: number | undefined
let routeLoadingPending = false

function restorePageScroll() {
  document.body.style.overflow = previousBodyOverflow
  document.documentElement.style.overflow = previousDocumentOverflow
  document.body.classList.remove('holy-bear-loading-active')
  document.documentElement.classList.remove('holy-bear-loading-active')
}

function lockPageScroll() {
  previousBodyOverflow = document.body.style.overflow
  previousDocumentOverflow = document.documentElement.style.overflow
  document.body.style.overflow = 'hidden'
  document.documentElement.style.overflow = 'hidden'
  document.body.classList.add('holy-bear-loading-active')
  document.documentElement.classList.add('holy-bear-loading-active')
}

function clearRouteTimers() {
  if (routeShowTimer) window.clearTimeout(routeShowTimer)
  if (routePopTimer) window.clearTimeout(routePopTimer)
  if (routeLeaveTimer) window.clearTimeout(routeLeaveTimer)
  if (routeHideTimer) window.clearTimeout(routeHideTimer)
  routeShowTimer = undefined
  routePopTimer = undefined
  routeLeaveTimer = undefined
  routeHideTimer = undefined
}

function startRouteLoading() {
  clearRouteTimers()
  routeLoadingPending = true
  routeShowTimer = window.setTimeout(() => {
    isVisible.value = true
    isPopping.value = false
    isLeaving.value = false
    lockPageScroll()
  }, 400)
}

function handleInternalNavigation(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  const target = event.target as HTMLElement | null
  const link = target?.closest('a')
  if (!link || link.target === '_blank' || link.hasAttribute('download')) return

  const url = new URL(link.href, window.location.href)
  if (url.origin !== window.location.origin || url.pathname === window.location.pathname && url.hash === window.location.hash) return

  startRouteLoading()
}

function finishRouteLoading() {
  if (!routeLoadingPending) return
  routeLoadingPending = false
  clearRouteTimers()
  if (!isVisible.value) return

  isPopping.value = true
  routePopTimer = window.setTimeout(() => {
    isLeaving.value = true
    document.body.classList.add('holy-bear-page-enter')
    window.dispatchEvent(new CustomEvent('holybear-loading-complete'))
    window.setTimeout(() => document.body.classList.remove('holy-bear-page-enter'), 1400)

    routeHideTimer = window.setTimeout(() => {
      isVisible.value = false
      restorePageScroll()
    }, 1000)
  }, 850)
}

onMounted(() => {
  lockPageScroll()
  document.addEventListener('click', handleInternalNavigation, true)
  window.addEventListener('holybear-route-loading-start', startRouteLoading)
  window.addEventListener('holybear-route-loading-finish', finishRouteLoading)

  // 內容準備好後，品牌球先在中央彈出，再揭開頁面。
  window.setTimeout(() => {
    isPopping.value = true
    window.setTimeout(() => {
      isLeaving.value = true
      document.body.classList.add('holy-bear-page-enter')
      window.dispatchEvent(new CustomEvent('holybear-loading-complete'))
      window.setTimeout(() => {
        document.body.classList.remove('holy-bear-page-enter')
      }, 1400)
      window.setTimeout(() => {
        isVisible.value = false
        restorePageScroll()
      }, 1000)
    }, 850)
  }, 1800)
})

onUnmounted(() => {
  clearRouteTimers()
  document.removeEventListener('click', handleInternalNavigation, true)
  window.removeEventListener('holybear-route-loading-start', startRouteLoading)
  window.removeEventListener('holybear-route-loading-finish', finishRouteLoading)
  restorePageScroll()
})
</script>

<template>
  <div v-if="isVisible" class="brand-loading-frame" :class="{ 'is-popping': isPopping, 'is-leaving': isLeaving, 'is-dark': isDark }" aria-hidden="true">
    <div class="brand-loading-ball">
      <img class="brand-loading-orb" src="/animations/holy-bear-orb.png" alt="" />
    </div>

    <div class="brand-loading-marquee">
      <div class="brand-loading-marquee-track" :class="{ 'is-paused': isLeaving }">
        <span v-for="i in 5" :key="i">Loading...&nbsp;</span>
      </div>
    </div>

    <div class="brand-loading-curtain"></div>
  </div>
</template>

<style scoped>
.brand-loading-frame {
  position: fixed;
  inset: 0;
  z-index: 2000;
  overflow: hidden;
  background: #f1f1f1;
  color: #a8a8a8;
  transition: transform 0.7s cubic-bezier(0.76, 0, 0.24, 1) 0.8s;
}

.brand-loading-frame.is-dark {
  background: #061018;
  color: #c2ccd2;
}

.brand-loading-frame.is-leaving {
  transform: translateY(-100%);
}

.brand-loading-ball {
  position: absolute;
  z-index: 5;
  top: 50%;
  left: 50%;
  width: clamp(180px, 28vw, 320px);
  height: clamp(180px, 28vw, 320px);
  opacity: 1;
  transform: translate(-50%, -50%) scale(0.45);
  isolation: isolate;
  transition: transform 0.85s cubic-bezier(0.68, -0.6, 0.32, 1.6), opacity 0.35s ease;
}

.brand-loading-frame.is-popping .brand-loading-ball {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.brand-loading-frame.is-leaving .brand-loading-ball {
  opacity: 0;
  transform: translate(-50%, -50%) scale(3.5);
  transition: transform 0.9s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.7s ease;
}

.brand-loading-frame.is-leaving {
  background: transparent;
  transition-delay: 0s;
}

.brand-loading-orb {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  animation: brand-orb-float 4s ease-in-out infinite;
  transform: scale(1.12);
}

/* 讓品牌球體有真正可見的旋轉層，小熊本身維持正面 */
.brand-loading-ball::before {
  position: absolute;
  z-index: 2;
  inset: 1%;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg 35deg,
    #00FFEE 62deg 92deg,
    transparent 120deg 205deg,
    #8F70FF 235deg 280deg,
    transparent 310deg 360deg
  );
  content: '';
  pointer-events: none;
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
  animation: brand-orbit-spin 2.8s linear infinite;
  filter: drop-shadow(0 0 7px rgba(0, 255, 238, 0.75));
}

.brand-loading-marquee {
  position: absolute;
  right: 0;
  bottom: clamp(16px, 8.14vw, 48px);
  left: 0;
  overflow: hidden;
  padding-bottom: 0.12em;
  color: inherit;
  font-size: 22.39vw;
  letter-spacing: -5.28px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

@media (min-width: 640px) {
  .brand-loading-marquee {
    font-size: 16.15vw;
    letter-spacing: -7.44px;
  }
}

@media (min-width: 1024px) {
  .brand-loading-marquee {
    font-size: 11.24vw;
    letter-spacing: -0.67vw;
    line-height: 1.2;
  }
}

.brand-loading-marquee-track {
  display: flex;
  width: max-content;
  animation: brand-loading-marquee 8s linear infinite;
}

.brand-loading-marquee-track.is-paused {
  animation-play-state: paused;
  transform: translateY(25vh);
  transition: transform 1s cubic-bezier(0.68, -0.6, 0.32, 1.6);
}

.brand-loading-curtain {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #00FFEE 0%, #8F70FF 100%);
  transform: translateY(100%);
  transition: transform 0s;
}

.brand-loading-frame.is-leaving .brand-loading-curtain {
  opacity: 0;
  transform: translateY(100%);
  transition: opacity 0.2s ease;
}

@keyframes brand-loading-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-20%); }
}

@keyframes brand-orb-float {
  0%, 100% { transform: translateY(0) scale(1.12); }
  50% { transform: translateY(-7px) scale(1.14); }
}

@keyframes brand-orbit-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 392px) {
  .brand-loading-ball {
  width: 180px;
  height: 180px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand-loading-frame,
  .brand-loading-ball,
  .brand-loading-curtain,
  .brand-loading-marquee-track,
  .brand-loading-orb,
  .brand-loading-ball::before {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

:global(html.holy-bear-loading-active),
:global(body.holy-bear-loading-active) {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

:global(html.holy-bear-loading-active::-webkit-scrollbar),
:global(body.holy-bear-loading-active::-webkit-scrollbar) {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
</style>
