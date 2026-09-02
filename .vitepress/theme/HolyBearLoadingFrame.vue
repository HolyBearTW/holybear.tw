<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import loadingOrbUrl from './assets/animations/holy-bear-orb-navbar.webp?inline'

const isVisible = ref(true)
const isPopping = ref(false)
const isLeaving = ref(false)
let previousBodyOverflow = ''
let previousDocumentOverflow = ''
let routeShowTimer: number | undefined
let routePopTimer: number | undefined
let routeLeaveTimer: number | undefined
let routeHideTimer: number | undefined
let pageEnterTimer: number | undefined
let routeLoadingPending = false
let initialMinimumTimer: number | undefined
let initialSafetyTimer: number | undefined
let initialLoadHandler: (() => void) | undefined
let initialMinimumElapsed = false
let initialFinishRequested = false
let initialLoadingFinished = false
let loadingStartedAt = 0

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

function triggerPageEnter(isRouteNavigation = false) {
  if (pageEnterTimer) window.clearTimeout(pageEnterTimer)
  document.body.classList.remove('holy-bear-page-enter', 'holy-bear-route-enter')
  void document.body.offsetWidth

  window.requestAnimationFrame(() => {
    document.body.classList.add('holy-bear-page-enter')
    document.body.classList.toggle('holy-bear-route-enter', isRouteNavigation)
    window.dispatchEvent(new CustomEvent('holybear-loading-complete'))
    pageEnterTimer = window.setTimeout(() => {
      document.body.classList.remove('holy-bear-page-enter', 'holy-bear-route-enter')
      pageEnterTimer = undefined
    }, 1400)
  })
}

function startRouteLoading() {
  clearRouteTimers()
  if (pageEnterTimer) window.clearTimeout(pageEnterTimer)
  pageEnterTimer = undefined
  document.body.classList.remove('holy-bear-page-enter', 'holy-bear-route-enter')
  routeLoadingPending = true
  loadingStartedAt = performance.now()
  isLeaving.value = false
  isPopping.value = false

  // 站內頁面若能在一秒內完成，不打斷使用者，也不顯示載入動畫。
  routeShowTimer = window.setTimeout(() => {
    if (!routeLoadingPending) return

    if (!isVisible.value) {
      isVisible.value = true
      lockPageScroll()
    }
    window.requestAnimationFrame(() => {
      if (routeLoadingPending) isPopping.value = true
    })
  }, 1000)
  routePopTimer = window.setTimeout(finishRouteLoading, 12000)
}

function handleInternalNavigation(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  const target = event.target as HTMLElement | null
  const link = target?.closest('a')
  if (!link || link.target === '_blank' || link.hasAttribute('download')) return

  const url = new URL(link.href, window.location.href)
  if (url.origin !== window.location.origin) return

  const isSameDocument = url.pathname === window.location.pathname && url.search === window.location.search
  if (isSameDocument) return

  startRouteLoading()
}

function finishRouteLoading() {
  if (!routeLoadingPending) return

  if (!initialLoadingFinished && !initialMinimumElapsed) {
    initialFinishRequested = true
    return
  }

  routeLoadingPending = false
  clearRouteTimers()
  if (!isVisible.value) {
    triggerPageEnter(true)
    return
  }

  isPopping.value = true
  const minimumVisibleTime = initialLoadingFinished ? 240 : 0
  const elapsed = performance.now() - loadingStartedAt
  routeLeaveTimer = window.setTimeout(() => {
    isLeaving.value = true
    triggerPageEnter(initialLoadingFinished)

    routeHideTimer = window.setTimeout(() => {
      isVisible.value = false
      initialLoadingFinished = true
      restorePageScroll()
    }, 760)
  }, Math.max(0, minimumVisibleTime - elapsed))
}

onMounted(() => {
  lockPageScroll()
  // Vue 畫面已在同一位置掛載，移除原始 HTML 的同款靜態畫面並直接接手。
  document.getElementById('holy-bear-boot-frame')?.remove()
  document.documentElement.classList.remove('holy-bear-booting')
  document.addEventListener('click', handleInternalNavigation, true)
  window.addEventListener('holybear-route-loading-start', startRouteLoading)
  window.addEventListener('holybear-route-loading-finish', finishRouteLoading)

  // 首次進站不再使用固定時間關閉；內容完成後才退場，慢速裝置不會露出空白頁。
  routeLoadingPending = true
  loadingStartedAt = performance.now()
  window.requestAnimationFrame(() => {
    if (routeLoadingPending) isPopping.value = true
  })

  initialMinimumTimer = window.setTimeout(() => {
    initialMinimumElapsed = true
    if (initialFinishRequested) finishRouteLoading()
  }, 650)

  const requestInitialFinish = () => {
    const path = window.location.pathname.replace(/\/$/, '')
    // 此頁會在 React 主畫面實際掛載後自行送出完成事件。
    if (path !== '/maplestory') finishRouteLoading()
  }

  initialLoadHandler = requestInitialFinish
  if (document.readyState === 'complete') {
    window.requestAnimationFrame(() => window.requestAnimationFrame(requestInitialFinish))
  } else {
    window.addEventListener('load', requestInitialFinish, { once: true })
  }

  // 個別外部資源失敗時仍要讓使用者取回頁面操作權。
  initialSafetyTimer = window.setTimeout(finishRouteLoading, 12000)
})

onUnmounted(() => {
  clearRouteTimers()
  if (initialMinimumTimer) window.clearTimeout(initialMinimumTimer)
  if (initialSafetyTimer) window.clearTimeout(initialSafetyTimer)
  if (initialLoadHandler) window.removeEventListener('load', initialLoadHandler)
  if (pageEnterTimer) window.clearTimeout(pageEnterTimer)
  document.body.classList.remove('holy-bear-page-enter', 'holy-bear-route-enter')
  document.documentElement.classList.remove('holy-bear-booting')
  document.removeEventListener('click', handleInternalNavigation, true)
  window.removeEventListener('holybear-route-loading-start', startRouteLoading)
  window.removeEventListener('holybear-route-loading-finish', finishRouteLoading)
  restorePageScroll()
})
</script>

<template>
  <div v-show="isVisible" class="brand-loading-frame" :class="{ 'is-popping': isPopping, 'is-leaving': isLeaving }" aria-hidden="true">
    <div class="brand-loading-ball">
      <img
        class="brand-loading-orb"
        :src="loadingOrbUrl"
        decoding="sync"
        fetchpriority="high"
        alt=""
      />
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
  z-index: 2147483000;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 50%, rgba(0, 184, 212, 0.16), transparent 31%),
    radial-gradient(circle at 18% 16%, rgba(143, 112, 255, 0.12), transparent 34%),
    radial-gradient(circle at 88% 82%, rgba(0, 255, 238, 0.1), transparent 30%),
    linear-gradient(135deg, #f8fcfd 0%, #eef9fb 52%, #f7f3ff 100%);
  color: rgba(16, 91, 108, 0.42);
  transition: transform 0.7s cubic-bezier(0.76, 0, 0.24, 1) 0.8s;
}

:global(html.dark .brand-loading-frame) {
  background:
    radial-gradient(circle at 50% 50%, rgba(0, 255, 238, 0.1), transparent 30%),
    radial-gradient(circle at 18% 16%, rgba(143, 112, 255, 0.12), transparent 34%),
    #061018;
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

:global(html:not(.dark) .brand-loading-frame .brand-loading-orb) {
  filter:
    drop-shadow(0 18px 30px rgba(7, 108, 133, 0.2))
    drop-shadow(0 0 26px rgba(143, 112, 255, 0.2));
}

:global(html:not(.dark) .brand-loading-frame .brand-loading-ball::after) {
  position: absolute;
  z-index: 0;
  inset: 5%;
  border: 1px solid rgba(7, 108, 133, 0.2);
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 28%, rgba(247, 253, 255, 0.94), rgba(201, 241, 247, 0.84) 48%, rgba(224, 215, 255, 0.76));
  box-shadow:
    0 18px 46px rgba(7, 108, 133, 0.18),
    0 0 36px rgba(143, 112, 255, 0.18);
  content: '';
  pointer-events: none;
}

:global(html:not(.dark) .brand-loading-frame .brand-loading-ball::before) {
  background: conic-gradient(
    from 0deg,
    transparent 0deg 35deg,
    #00b8d4 62deg 92deg,
    transparent 120deg 205deg,
    #7c4dff 235deg 280deg,
    transparent 310deg 360deg
  );
  filter:
    drop-shadow(0 0 8px rgba(0, 184, 212, 0.82))
    drop-shadow(0 0 10px rgba(124, 77, 255, 0.66));
}

/* 讓品牌球體有真正可見的旋轉層，小熊本身維持正面 */
.brand-loading-ball::before {
  position: absolute;
  z-index: 2;
  inset: -6%;
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
    width: 190px;
    height: 190px;
  }

  .brand-loading-marquee {
    bottom: 24px;
    font-size: 23vw;
    letter-spacing: -3px;
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
