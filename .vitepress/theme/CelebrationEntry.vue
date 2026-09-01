<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const entryRef = ref<HTMLElement | null>(null)
const bottomOffset = ref(24)
const isWithinCampaign = ref(false)

// 2026/10/06 00:00 in Asia/Taipei (UTC+8).
const campaignEndsAt = Date.UTC(2026, 9, 5, 16)
const shouldShow = computed(() => isWithinCampaign.value && !/^\/(?:en\/)?500days\/?$/.test(route.path))

let resizeObserver: ResizeObserver | undefined
let playerObserver: MutationObserver | undefined
let documentObserver: MutationObserver | undefined
let expiryTimer: number | undefined
let rafId: number | undefined
const initialPositionTimers: number[] = []

const schedulePositionUpdate = () => {
  if (rafId) return
  rafId = requestAnimationFrame(updatePosition)
}

const getFixedObstacles = () => {
  const entry = entryRef.value
  const candidates = new Set<Element>()

  document.querySelectorAll('.music-container, .sidebar-toggle').forEach((element) => candidates.add(element))
  document.querySelectorAll('button, a, [role="button"]').forEach((element) => candidates.add(element))

  return Array.from(candidates).filter((element) => {
    if (element === entry || entry?.contains(element)) return false

    const style = window.getComputedStyle(element)
    if (style.position !== 'fixed' || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
      return false
    }

    const rect = element.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return false

    const livesOnRight = rect.right > window.innerWidth - Math.min(180, window.innerWidth * .35)
    const livesNearBottom = rect.bottom > window.innerHeight * .45
    return livesOnRight && livesNearBottom
  })
}

const updatePosition = () => {
  rafId = undefined
  const entry = entryRef.value
  if (!entry || !shouldShow.value) return

  const base = window.innerWidth <= 640 ? 14 : 24
  const gap = window.innerWidth <= 640 ? 12 : 16
  const entryRect = entry.getBoundingClientRect()
  const desiredLeft = window.innerWidth - base - entryRect.width
  const desiredRight = window.innerWidth - base
  let nextBottom = base

  for (const obstacle of getFixedObstacles()) {
    const rect = obstacle.getBoundingClientRect()
    const overlapsHorizontally = rect.right > desiredLeft && rect.left < desiredRight
    if (!overlapsHorizontally) continue

    nextBottom = Math.max(nextBottom, window.innerHeight - rect.top + gap)
  }

  const maximumBottom = Math.max(base, window.innerHeight - entryRect.height - 76)
  bottomOffset.value = Math.min(nextBottom, maximumBottom)
}

const syncCampaignState = () => {
  isWithinCampaign.value = Date.now() < campaignEndsAt
  document.body.classList.toggle('has-days500-campaign', isWithinCampaign.value)
}

onMounted(async () => {
  syncCampaignState()
  if (!isWithinCampaign.value) return

  await nextTick()
  schedulePositionUpdate()
  initialPositionTimers.push(
    window.setTimeout(schedulePositionUpdate, 250),
    window.setTimeout(schedulePositionUpdate, 900)
  )
  window.addEventListener('resize', schedulePositionUpdate, { passive: true })
  window.addEventListener('scroll', schedulePositionUpdate, { passive: true })

  resizeObserver = new ResizeObserver(schedulePositionUpdate)
  if (entryRef.value) resizeObserver.observe(entryRef.value)
  const player = document.querySelector('.music-container')
  const sidebarToggle = document.querySelector('.sidebar-toggle')
  if (player) resizeObserver.observe(player)
  if (sidebarToggle) resizeObserver.observe(sidebarToggle)

  if (player) {
    playerObserver = new MutationObserver(schedulePositionUpdate)
    playerObserver.observe(player, { attributes: true, attributeFilter: ['class', 'style'] })
  }

  documentObserver = new MutationObserver(schedulePositionUpdate)
  documentObserver.observe(document.body, { childList: true, subtree: true })

  expiryTimer = window.setInterval(syncCampaignState, 60_000)
})

onBeforeUnmount(() => {
  document.body.classList.remove('has-days500-campaign')
  window.removeEventListener('resize', schedulePositionUpdate)
  window.removeEventListener('scroll', schedulePositionUpdate)
  resizeObserver?.disconnect()
  playerObserver?.disconnect()
  documentObserver?.disconnect()
  if (expiryTimer) window.clearInterval(expiryTimer)
  if (rafId) cancelAnimationFrame(rafId)
  initialPositionTimers.forEach((timer) => window.clearTimeout(timer))
})
</script>

<template>
  <a
    v-if="shouldShow"
    ref="entryRef"
    class="celebration-entry"
    href="/500days"
    :style="{ '--celebration-entry-bottom': `${bottomOffset}px` }"
    aria-label="前往 500 Days Celebration 五百日紀念頁"
  >
    <span class="entry-orbit" aria-hidden="true" />
    <span class="entry-copy" aria-hidden="true">
      <strong>500</strong>
      <small>DAYS</small>
    </span>
    <span class="entry-tooltip">五百日紀念</span>
  </a>
</template>

<style scoped>
.celebration-entry {
  position: fixed;
  right: 24px;
  bottom: var(--celebration-entry-bottom, 24px);
  z-index: 9998;
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  border: 1px solid rgba(255, 232, 169, .76);
  border-radius: 50%;
  color: #33200f !important;
  background: linear-gradient(145deg, #ffe59b, #e9ad4e 58%, #bd6f30);
  box-shadow: 0 14px 34px rgba(0,0,0,.3), inset 0 0 0 3px rgba(255,255,255,.22);
  text-decoration: none !important;
  isolation: isolate;
  transition: bottom .32s cubic-bezier(.22,1,.36,1), transform .25s ease, box-shadow .25s ease;
}

.celebration-entry:hover {
  color: #241509 !important;
  transform: translateY(-3px) scale(1.04);
  box-shadow: 0 18px 42px rgba(0,0,0,.36), 0 0 28px rgba(242,201,109,.2), inset 0 0 0 3px rgba(255,255,255,.28);
}

.celebration-entry:focus-visible {
  outline: 3px solid #ff7657;
  outline-offset: 4px;
}

.entry-orbit {
  position: absolute;
  inset: 5px;
  z-index: -1;
  border: 1px dashed rgba(85,45,13,.48);
  border-radius: 50%;
  animation: celebration-entry-spin 14s linear infinite;
}

.entry-orbit::before,
.entry-orbit::after {
  content: "";
  position: absolute;
  top: -3px;
  left: 50%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fff1bd;
  box-shadow: 0 0 8px rgba(255,241,189,.9);
}

.entry-orbit::after { top: auto; bottom: -3px; transform: translateX(-100%); }
.entry-copy { display: flex; flex-direction: column; align-items: center; line-height: .83; transform: translateY(1px); }
.entry-copy strong { font-family: Georgia, "Times New Roman", serif; font-size: 27px; letter-spacing: -.05em; }
.entry-copy small { margin-top: 5px; font-size: 8px; font-weight: 900; letter-spacing: .18em; }
.entry-tooltip { position: absolute; right: calc(100% + 12px); width: max-content; padding: 8px 11px; border: 1px solid rgba(242,201,109,.24); border-radius: 9px; color: #f9f5eb; background: rgba(13,16,26,.92); box-shadow: 0 10px 28px rgba(0,0,0,.24); font-size: 12px; font-weight: 800; letter-spacing: .08em; opacity: 0; pointer-events: none; transform: translateX(5px); transition: opacity .2s ease, transform .2s ease; }
.celebration-entry:hover .entry-tooltip,
.celebration-entry:focus-visible .entry-tooltip { opacity: 1; transform: translateX(0); }

@keyframes celebration-entry-spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
  .celebration-entry { right: 14px; width: 58px; height: 58px; }
  .entry-copy strong { font-size: 23px; }
  .entry-copy small { font-size: 7px; }
  .entry-tooltip { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .celebration-entry,
  .entry-tooltip { transition: none; }
  .entry-orbit { animation: none; }
}

:global(body:not(.has-days500-campaign) .VPNav a[href^="/500days"]) {
  display: none !important;
}

:global(html body.has-days500-campaign #app .VPNav a[href^="/500days"]) {
  color: #f2c96d !important;
  font-weight: 800 !important;
  text-shadow: 0 0 18px rgba(242,201,109,.18) !important;
}

:global(html body.has-days500-campaign #app .VPNav .VPNavBarMenu a.VPNavBarMenuLink[href^="/500days"]) {
  align-self: center;
  height: 34px;
  margin-inline: 5px;
  padding-inline: 11px;
  border: 1px solid rgba(242,201,109,.3);
  border-radius: 999px;
  background: rgba(242,201,109,.1);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.025);
}

:global(html body.has-days500-campaign #app .VPNav a[href^="/500days"]:hover) {
  color: #ff7657 !important;
}
</style>
