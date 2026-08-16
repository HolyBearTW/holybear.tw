<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ArrowDown,
  BookOpen,
  Code2,
  Gamepad2,
  Github,
  MessageCircle,
  Music2,
  Paintbrush,
  Rocket,
  Sparkles,
  Terminal
} from 'lucide-vue-next'

const units = [
  {
    label: '日誌雜記',
    greeting: '開聊',
    message: '日常碎念、踩坑紀錄和專案進度都丟這邊，想看近況從這裡開始。',
    accent: '#34d7ff',
    icon: BookOpen,
    link: '/blog/',
    x: 13,
    y: 30,
    depth: 16
  },
  {
    label: '作品集',
    greeting: '看成品',
    message: '做過的模組、工具和小專案集中放這，想挖寶可以先點一圈。',
    accent: '#ffcf3f',
    icon: Rocket,
    link: '/Mod',
    x: 35,
    y: 11,
    depth: 24
  },
  {
    label: '技術文件',
    greeting: '查資料',
    message: '常用設定、踩坑路線和筆記都收好，之後不用再重新通靈。',
    accent: '#ff7f6e',
    icon: Code2,
    link: '/docs/',
    x: 67,
    y: 13,
    depth: 20
  },
  {
    label: '新楓之谷',
    greeting: '打楓谷',
    message: '角色戰力、裝備和能力值相關工具都在這，想研究機體可以開起來看。',
    accent: '#8eff72',
    icon: Gamepad2,
    link: '/maplestory',
    x: 86,
    y: 36,
    depth: 14
  },
  {
    label: '文章編輯器',
    greeting: '來寫文',
    message: 'Markdown 編輯、預覽和整理流程放在站內，想慢慢修稿就用這個。',
    accent: '#c79cff',
    icon: Paintbrush,
    link: '/editmd',
    x: 77,
    y: 76,
    depth: 22
  },
  {
    label: '交流入口',
    greeting: '來交流',
    message: 'Telegram、GitHub 和站內工具都接在這，有想法或回饋可以直接丟過來。',
    accent: '#61f2c2',
    icon: MessageCircle,
    link: 'https://t.me/HolyBearTW',
    x: 45,
    y: 89,
    depth: 18
  },
  {
    label: '簡繁轉換',
    greeting: '轉一下',
    message: '簡繁文字需要順手轉換時，這邊開起來就能用，不用到處找工具。',
    accent: '#ff9f43',
    icon: Sparkles,
    link: '/converter',
    x: 17,
    y: 74,
    depth: 12
  }
]

const storyItems = [
  {
    kicker: 'Blog',
    title: '日常、踩坑、想到什麼就記什麼',
    text: '不只放結論，也留一點當下怎麼想、怎麼繞路，之後回頭看才有料。'
  },
  {
    kicker: 'Docs',
    title: '常查的東西先整理起來',
    text: '設定、筆記、工具用法集中放文件區，未來的自己少受一點苦。'
  },
  {
    kicker: 'Tools',
    title: '能做成工具的就別只停在想法',
    text: '楓谷分析、文字處理和一些小作品都放這，能用就直接拿來用。'
  }
]

const heroRef = ref<HTMLElement | null>(null)
const activeIndex = ref(0)
const pointer = ref({ x: 0, y: 0, sx: 50, sy: 50 })
const isAutoRotationPaused = ref(false)
const viewportWidth = ref(1440)
let rotateTimer: number | undefined

const activeUnit = computed(() => units[activeIndex.value])

const heroStyle = computed(() => ({
  '--mx': pointer.value.x.toFixed(3),
  '--my': pointer.value.y.toFixed(3),
  '--spotlight-x': `${pointer.value.sx.toFixed(2)}%`,
  '--spotlight-y': `${pointer.value.sy.toFixed(2)}%`,
  '--active-accent': activeUnit.value.accent
}))

const activePanelStyle = computed(() => {
  const unit = activeUnit.value
  const isBottomCenter = unit.y > 82 && unit.x >= 35 && unit.x <= 65

  if (isBottomCenter) {
    return {
      '--panel-x': `${unit.x}%`,
      '--panel-y': `${unit.y + 7}%`,
      '--panel-shift-x': '-50%',
      '--panel-shift-y': '0%',
      '--panel-nudge-x': '0px',
      '--panel-nudge-y': '14px'
    }
  }

  const isRightSide = unit.x >= 50
  const opensLeft = !isRightSide || viewportWidth.value < 1200
  const panelX = opensLeft ? unit.x - 8 : unit.x + 6
  const panelY = Math.min(Math.max(unit.y, 22), 78)

  return {
    '--panel-x': `${panelX}%`,
    '--panel-y': `${panelY}%`,
    '--panel-shift-x': opensLeft ? '-100%' : '0%',
    '--panel-shift-y': '-50%',
    '--panel-nudge-x': opensLeft ? '-12px' : '8px',
    '--panel-nudge-y': '0px'
  }
})

const syncViewportWidth = () => {
  viewportWidth.value = window.innerWidth
}

const prefersReducedMotion = () => {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const prefersStaticTouchLayout = () => {
  return typeof window !== 'undefined' &&
    window.matchMedia('(hover: none), (pointer: coarse), (max-width: 720px)').matches
}

const resetPointer = () => {
  pointer.value = { x: 0, y: 0, sx: 50, sy: 50 }
}

const handlePointerMove = (event: PointerEvent) => {
  const target = heroRef.value
  if (!target) return

  if (prefersStaticTouchLayout()) {
    resetPointer()
    return
  }

  const rect = target.getBoundingClientRect()
  const px = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
  const py = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1)

  pointer.value = {
    x: (px - 0.5) * 2,
    y: (py - 0.5) * 2,
    sx: px * 100,
    sy: py * 100
  }
}

const handlePointerLeave = () => {
  resetPointer()
}

const setActiveUnit = (index: number) => {
  activeIndex.value = index
}

const pauseAutoRotation = () => {
  isAutoRotationPaused.value = true
}

const resumeAutoRotation = () => {
  isAutoRotationPaused.value = false
}

const getUnitStyle = (unit: typeof units[number], index: number) => ({
  '--x': `${unit.x}%`,
  '--y': `${unit.y}%`,
  '--depth': unit.depth,
  '--node-accent': unit.accent,
  '--node-delay': `${index * 0.18}s`
})

const scrollToStory = () => {
  const target = document.getElementById('hero-story')
  target?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

onMounted(() => {
  syncViewportWidth()
  window.addEventListener('resize', syncViewportWidth, { passive: true })

  if (prefersReducedMotion()) return

  rotateTimer = window.setInterval(() => {
    if (isAutoRotationPaused.value) return
    activeIndex.value = (activeIndex.value + 1) % units.length
  }, 2800)
})

onBeforeUnmount(() => {
  if (rotateTimer) window.clearInterval(rotateTimer)
  window.removeEventListener('resize', syncViewportWidth)
})
</script>

<template>
  <main
    ref="heroRef"
    class="hb-home-lobby"
    :style="heroStyle"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
    <section class="hero-shell" aria-labelledby="hero-title">
      <div class="hero-stage">
        <div class="hero-copy">
          <div class="hero-brand-lockup">
            <div class="hero-logo-card">
              <img src="/animations/logo.png" alt="HolyBearTW" class="hero-logo no-zoom">
            </div>
          </div>
          <div class="hero-title-group">
            <p class="eyebrow">HolyBear Site Lobby</p>
            <h1 id="hero-title">聖小熊的秘密基地</h1>
            <p class="hero-home-text">這裡是聖小熊的個人網站</p>
          </div>
          <p class="hero-intro">
            實驗紀錄、踩坑心得、生活碎念和作品都收在這裡。想翻日誌、查文件、找工具，入口都幫你排好了，直接開逛。
          </p>

          <div class="hero-actions">
            <a class="hero-action primary" href="/blog/">
              <BookOpen aria-hidden="true" />
              <span>看日誌</span>
            </a>
            <a class="hero-action ghost" href="/docs/">
              <Code2 aria-hidden="true" />
              <span>查文件</span>
            </a>
            <a class="hero-action ghost" href="/maplestory">
              <Gamepad2 aria-hidden="true" />
              <span>楓谷工具</span>
            </a>
          </div>
        </div>

        <div class="scene" aria-label="聖小熊站內入口">
          <div class="scene-grid" aria-hidden="true"></div>
          <div class="scene-ring ring-one" aria-hidden="true"></div>
          <div class="scene-ring ring-two" aria-hidden="true"></div>
          <div class="scene-ring ring-three" aria-hidden="true"></div>

          <a
            v-for="(unit, index) in units"
            :key="unit.label"
            class="scene-node"
            :class="{ 'is-active': index === activeIndex }"
            :style="getUnitStyle(unit, index)"
            :href="unit.link"
            :aria-label="unit.label"
            @pointerenter="pauseAutoRotation(); setActiveUnit(index)"
            @pointerleave="resumeAutoRotation"
            @focus="pauseAutoRotation(); setActiveUnit(index)"
            @blur="resumeAutoRotation"
          >
            <component :is="unit.icon" aria-hidden="true" />
            <span class="node-label">{{ unit.label }}</span>
          </a>

          <div class="avatar-rig">
            <div class="avatar-halo" aria-hidden="true"></div>
            <div class="avatar-frame">
              <img src="/holybear.png" alt="聖小熊" class="no-zoom">
            </div>
          </div>

          <div
            class="active-panel"
            :style="activePanelStyle"
            @pointerenter="pauseAutoRotation"
            @pointerleave="resumeAutoRotation"
            @focusin="pauseAutoRotation"
            @focusout="resumeAutoRotation"
          >
            <span class="panel-kicker">{{ activeUnit.greeting }}</span>
            <strong>{{ activeUnit.label }}</strong>
            <p>{{ activeUnit.message }}</p>
            <a :href="activeUnit.link">去逛 {{ activeUnit.label }}</a>
          </div>

          <div class="floating-chip chip-one" aria-hidden="true">
            <Terminal />
            <span>站務引擎</span>
          </div>
          <div class="floating-chip chip-two" aria-hidden="true">
            <Music2 />
            <span>背景音樂</span>
          </div>
          <div class="floating-chip chip-three" aria-hidden="true">
            <Github />
            <span>GitHub</span>
          </div>
        </div>
      </div>

      <button class="scroll-cue" type="button" @click="scrollToStory" aria-label="前往站內入口">
        <ArrowDown aria-hidden="true" />
        <span>SCROLL</span>
      </button>
    </section>

    <section id="hero-story" class="story-band" aria-labelledby="story-title">
      <div class="story-heading">
        <h2 id="story-title">先從這幾個站內入口開逛</h2>
      </div>

      <div class="story-grid">
        <article v-for="item in storyItems" :key="item.title" class="story-item">
          <span>{{ item.kicker }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
:global(body:has(.hb-home-lobby)) {
  margin: 0;
  overflow-x: hidden;
}

:global(body:has(.hb-home-lobby) .VPContent) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

:global(body:has(.hb-home-lobby) .VPPage),
:global(body:has(.hb-home-lobby) .VPContent),
:global(body:has(.hb-home-lobby) .VPContent .container),
:global(body:has(.hb-home-lobby) .VPContent .content),
:global(body:has(.hb-home-lobby) .VPContent .content-container),
:global(body:has(.hb-home-lobby) .vp-doc) {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  overflow: visible !important;
}

:global(body:has(.hb-home-lobby) .VPDoc),
:global(body:has(.hb-home-lobby) .VPDoc .container),
:global(body:has(.hb-home-lobby) .VPDoc .content),
:global(body:has(.hb-home-lobby) .VPDoc .content-container),
:global(body:has(.hb-home-lobby) .VPDoc .content-body) {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  padding-bottom: 0 !important;
}

:global(body:has(.hb-home-lobby) .VPNav) {
  z-index: 20;
}

:global(body:has(.hb-home-lobby) .VPFooter) {
  margin-top: 0 !important;
  padding-top: 12px !important;
  padding-bottom: 18px !important;
}

:global(body:has(.hb-home-lobby) img) {
  max-width: none;
}

.hb-home-lobby {
  --mx: 0;
  --my: 0;
  --spotlight-x: 50%;
  --spotlight-y: 50%;
  --active-accent: #34d7ff;
  --lobby-text: #f6fbff;
  --lobby-text-strong: #ffffff;
  --lobby-text-muted: rgba(246, 251, 255, 0.84);
  --lobby-text-soft: rgba(246, 251, 255, 0.72);
  --lobby-border: rgba(246, 251, 255, 0.18);
  --lobby-border-strong: rgba(255, 255, 255, 0.22);
  --lobby-grid-border: rgba(246, 251, 255, 0.12);
  --lobby-ring-border: rgba(246, 251, 255, 0.2);
  --lobby-grid-line: rgba(246, 251, 255, 0.18);
  --lobby-surface: rgba(7, 16, 19, 0.74);
  --lobby-surface-soft: rgba(246, 251, 255, 0.07);
  --lobby-panel: rgba(6, 13, 16, 0.72);
  --lobby-chip: rgba(7, 16, 19, 0.56);
  --lobby-primary-bg: #ffffff;
  --lobby-primary-text: #071013;
  --lobby-ghost-bg: rgba(7, 16, 19, 0.34);
  --lobby-ghost-text: #ffffff;
  --lobby-shadow: rgba(0, 0, 0, 0.35);
  --lobby-avatar-shadow: rgba(0, 0, 0, 0.45);
  --lobby-panel-shadow: rgba(0, 0, 0, 0.32);
  --lobby-chip-shadow: rgba(0, 0, 0, 0.25);
  --lobby-story-divider: rgba(246, 251, 255, 0.12);
  --lobby-story-border: rgba(246, 251, 255, 0.16);
  --lobby-story-shadow: none;
  --lobby-inset: rgba(255, 255, 255, 0.1);
  --lobby-node-active-base: #071013;
  --lobby-node-border-blend: #ffffff;
  --lobby-active-border: #ffffff;
  --lobby-avatar-border: rgba(255, 255, 255, 0.9);
  --lobby-avatar-base: rgba(8, 17, 21, 0.9);
  --lobby-avatar-sheen: rgba(255, 255, 255, 0.14);
  --lobby-logo-glow-opacity: 0.48;
  --lobby-logo-glow-filter: blur(30px) saturate(1.2);
  --lobby-label-shadow: rgba(0, 0, 0, 0.55);
  --lobby-cue-bg: rgba(18, 20, 26, 0.72);
  --lobby-cue-border: rgba(0, 255, 238, 0.18);
  --lobby-accent-text: var(--active-accent);
  --lobby-node-accent: var(--node-accent);
  --lobby-page-tint: transparent;
  position: relative;
  min-height: 0;
  overflow: hidden;
  color: var(--lobby-text);
  background: var(--lobby-page-tint);
  font-family: "LINESeed", var(--vp-font-family-base), "Inter", "Noto Sans TC", system-ui, sans-serif;
}

:global(html.dark .hb-home-lobby) {
  color-scheme: dark;
}

:global(html:not(.dark) .hb-home-lobby) {
  color-scheme: light;
  --lobby-text: #163746;
  --lobby-text-strong: #082936;
  --lobby-text-muted: rgba(17, 54, 69, 0.82);
  --lobby-text-soft: rgba(17, 54, 69, 0.7);
  --lobby-border: rgba(7, 108, 133, 0.22);
  --lobby-border-strong: rgba(7, 108, 133, 0.3);
  --lobby-grid-border: rgba(7, 108, 133, 0.18);
  --lobby-ring-border: rgba(7, 108, 133, 0.24);
  --lobby-grid-line: rgba(7, 108, 133, 0.2);
  --lobby-surface: rgba(249, 253, 255, 0.82);
  --lobby-surface-soft: rgba(255, 255, 255, 0.68);
  --lobby-panel: rgba(249, 253, 255, 0.88);
  --lobby-chip: rgba(249, 253, 255, 0.78);
  --lobby-primary-bg: #087f94;
  --lobby-primary-text: #ffffff;
  --lobby-ghost-bg: rgba(255, 255, 255, 0.72);
  --lobby-ghost-text: #123442;
  --lobby-shadow: rgba(35, 76, 94, 0.18);
  --lobby-avatar-shadow: rgba(35, 76, 94, 0.22);
  --lobby-panel-shadow: rgba(35, 76, 94, 0.18);
  --lobby-chip-shadow: rgba(35, 76, 94, 0.14);
  --lobby-story-divider: rgba(7, 108, 133, 0.18);
  --lobby-story-border: rgba(7, 108, 133, 0.22);
  --lobby-story-shadow: 0 14px 34px rgba(35, 76, 94, 0.14);
  --lobby-inset: rgba(255, 255, 255, 0.78);
  --lobby-node-active-base: #eefcff;
  --lobby-node-border-blend: #087f94;
  --lobby-active-border: #087f94;
  --lobby-avatar-border: rgba(7, 108, 133, 0.48);
  --lobby-avatar-base: rgba(239, 250, 253, 0.9);
  --lobby-avatar-sheen: rgba(255, 255, 255, 0.72);
  --lobby-logo-glow-opacity: 0.3;
  --lobby-logo-glow-filter: blur(34px) saturate(1.05);
  --lobby-label-shadow: rgba(255, 255, 255, 0.88);
  --lobby-cue-bg: rgba(249, 253, 255, 0.84);
  --lobby-cue-border: rgba(8, 127, 148, 0.28);
  --lobby-accent-text: color-mix(in srgb, var(--active-accent), #07546a 58%);
  --lobby-node-accent: color-mix(in srgb, var(--node-accent), #123442 32%);
  --lobby-page-tint: transparent;
}

.hero-shell {
  position: relative;
  z-index: 3;
  display: flex;
  min-height: 0;
  width: min(100%, 1480px);
  margin: 0 auto;
  flex-direction: column;
  padding: calc(var(--vp-nav-height) + 4px) clamp(18px, 3vw, 44px) 0;
}

.hero-stage {
  display: grid;
  grid-template-columns: minmax(320px, 0.72fr) minmax(520px, 1.28fr);
  align-items: center;
  gap: clamp(24px, 5vw, 76px);
  flex: 0 0 auto;
  padding: 0 0 clamp(20px, 3.5vh, 36px);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transform: translate3d(calc(var(--mx) * -8px), calc(var(--my) * -5px), 0);
}

.hero-brand-lockup {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 700px;
}

.hero-logo-card {
  position: relative;
  width: min(340px, calc(100vw - 24px));
  aspect-ratio: 1;
  overflow: visible;
  border: 0;
  border-radius: 50%;
  background: transparent;
  box-shadow: none;
  filter: none;
  transform: translate3d(calc(var(--mx) * -5px), calc(var(--my) * -4px), 0);
}

.hero-logo-card::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 320px;
  height: 320px;
  z-index: -1;
  border-radius: 50%;
  background: var(--vp-home-hero-name-background);
  background-size: 400% 400%;
  background-position: 0% 50%;
  transform: translate3d(-50%, -50%, 0) scale(1.12);
  animation: holyBearHeroGradient 10s ease-in-out infinite alternate;
  opacity: var(--lobby-logo-glow-opacity);
  filter: var(--lobby-logo-glow-filter);
  pointer-events: none;
}

.hero-logo-card::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: transparent;
  pointer-events: none;
}

.hero-logo {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.hero-title-group {
  container-type: inline-size;
  width: 100%;
  min-width: 0;
  margin-top: clamp(24px, 4.2vh, 42px);
  text-align: center;
}

.eyebrow {
  margin: 0 0 16px;
  color: var(--lobby-accent-text);
  font-size: clamp(0.74rem, 0.7rem + 0.2vw, 0.9rem);
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.hero-copy h1 {
  display: block;
  max-width: min(780px, 100%);
  margin: 0;
  background: var(--vp-home-hero-name-background);
  background-size: 400% 400%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  font-size: clamp(1.65rem, min(4.25vw, 10.6cqw), 4.4rem);
  font-weight: 850;
  line-height: 1.04;
  letter-spacing: 0;
  overflow: visible;
  white-space: nowrap;
  text-wrap: nowrap;
  overflow-wrap: normal;
  word-break: keep-all;
  isolation: isolate;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  will-change: filter, background-position;
  animation: gradientRotate 5s ease infinite, dynamicGlow 5s ease infinite;
}

.hero-home-text {
  max-width: min(760px, 100%);
  margin: 6px auto 0;
  color: var(--lobby-text-strong);
  font-size: clamp(1.5rem, min(4vw, 8.6cqw), 4rem);
  font-weight: 850;
  line-height: 1.04;
  letter-spacing: 0;
  overflow: visible;
  white-space: nowrap;
  text-wrap: nowrap;
  overflow-wrap: normal;
  word-break: keep-all;
}

.hero-intro {
  max-width: 620px;
  margin: 24px auto 0;
  color: var(--lobby-text-muted);
  font-size: clamp(1rem, 0.92rem + 0.25vw, 1.16rem);
  line-height: 1.78;
  text-wrap: pretty;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 34px;
}

.hero-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 46px;
  max-width: 100%;
  border: 1px solid var(--lobby-border-strong);
  border-radius: 8px;
  padding: 11px 16px;
  color: var(--lobby-ghost-text);
  font-weight: 900;
  text-decoration: none;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.hero-action svg {
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
}

.hero-action.primary {
  background: var(--lobby-primary-bg);
  color: var(--lobby-primary-text);
}

.hero-action.ghost {
  background: var(--lobby-ghost-bg);
}

.hero-action:hover,
.hero-action:focus-visible {
  border-color: var(--active-accent);
  transform: translateY(-2px);
}

.scene {
  position: relative;
  justify-self: center;
  width: min(100%, 820px);
  min-height: min(68svh, 680px);
  aspect-ratio: 1.12;
  isolation: isolate;
  transform: translate3d(calc(var(--mx) * 8px), calc(var(--my) * 6px), 0);
}

.scene-grid,
.scene-ring,
.avatar-rig,
.floating-chip,
.scene-node {
  position: absolute;
}

.scene-grid {
  inset: 9%;
  z-index: 0;
  border: 1px solid var(--lobby-grid-border);
  border-radius: 50%;
  background:
    linear-gradient(90deg, transparent 49.7%, var(--lobby-grid-line) 50%, transparent 50.3%),
    linear-gradient(0deg, transparent 49.7%, var(--lobby-grid-line) 50%, transparent 50.3%);
  transform: rotate(calc(var(--mx) * 2deg));
}

.scene-ring {
  inset: 15%;
  z-index: 0;
  border: 1px solid var(--lobby-ring-border);
  border-radius: 50%;
  transform: rotate(calc(var(--mx) * 5deg));
}

.ring-one {
  border-color: rgba(52, 215, 255, 0.32);
}

.ring-two {
  inset: 25%;
  border-color: rgba(255, 207, 63, 0.28);
  transform: rotate(58deg) translate3d(calc(var(--mx) * -8px), calc(var(--my) * 6px), 0);
}

.ring-three {
  inset: 5%;
  border-color: rgba(255, 127, 110, 0.2);
  transform: rotate(-28deg) translate3d(calc(var(--mx) * 8px), calc(var(--my) * -6px), 0);
}

.scene-node {
  left: var(--x);
  top: var(--y);
  z-index: 8;
  display: grid;
  width: clamp(72px, 7vw, 98px);
  aspect-ratio: 1;
  place-items: center;
  border: 2px solid color-mix(in srgb, var(--node-accent), var(--lobby-node-border-blend) 26%);
  border-radius: 50%;
  background: var(--lobby-surface);
  color: var(--lobby-text-strong);
  text-decoration: none;
  box-shadow:
    0 18px 42px var(--lobby-shadow),
    inset 0 0 0 1px var(--lobby-inset);
  cursor: pointer;
  transform:
    translate(-50%, -50%)
    translate3d(calc(var(--mx) * var(--depth) * 1px), calc(var(--my) * var(--depth) * 1px), 0);
  transition: background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, scale 0.2s ease;
  animation: nodeFloat 4.8s ease-in-out infinite;
  animation-delay: var(--node-delay);
}

.scene-node svg {
  width: clamp(24px, 3vw, 34px);
  height: clamp(24px, 3vw, 34px);
  color: var(--lobby-node-accent);
}

.scene-node.is-active,
.scene-node:hover,
.scene-node:focus-visible {
  background: color-mix(in srgb, var(--node-accent), var(--lobby-node-active-base) 72%);
  border-color: var(--lobby-active-border);
  box-shadow:
    0 22px 52px color-mix(in srgb, var(--node-accent), transparent 68%),
    inset 0 0 0 1px var(--lobby-border-strong);
  outline: none;
  scale: 1.08;
}

.node-label {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  width: max-content;
  max-width: 132px;
  transform: translateX(-50%);
  color: var(--lobby-text-muted);
  font-size: 0.83rem;
  font-weight: 900;
  text-align: center;
  text-shadow: 0 2px 12px var(--lobby-label-shadow);
}

.avatar-rig {
  left: 50%;
  top: 52%;
  z-index: 5;
  width: min(48%, 430px);
  min-width: 260px;
  transform:
    translate(-50%, -50%)
    translate3d(calc(var(--mx) * -18px), calc(var(--my) * -12px), 0);
}

.avatar-halo {
  position: absolute;
  inset: 10% 4% -2%;
  border: 2px solid var(--active-accent);
  border-radius: 50%;
  opacity: 0.42;
  transform: rotate(-12deg);
}

.avatar-frame {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1;
  border: 3px solid var(--lobby-avatar-border);
  border-radius: 50%;
  background:
    linear-gradient(135deg, var(--lobby-avatar-sheen), rgba(255, 255, 255, 0)),
    var(--lobby-avatar-base);
  box-shadow: 0 26px 80px var(--lobby-avatar-shadow);
}

.avatar-frame img {
  width: 100%;
  height: 100%;
  margin: 0;
  object-fit: cover;
  object-position: 62% 52%;
  transform: translate3d(calc(var(--mx) * -3px), calc(var(--my) * -2px), 0) scale(1.04);
}

.active-panel {
  position: absolute;
  left: var(--panel-x);
  top: var(--panel-y);
  z-index: 20;
  display: grid;
  width: min(250px, 31vw);
  gap: 5px;
  border: 1px solid var(--lobby-border-strong);
  border-left: 5px solid var(--active-accent);
  border-radius: 8px;
  padding: 12px 14px;
  background: var(--lobby-panel);
  box-shadow: 0 16px 38px var(--lobby-panel-shadow);
  backdrop-filter: blur(14px);
  pointer-events: auto;
  transform:
    translate(var(--panel-shift-x), var(--panel-shift-y))
    translateX(var(--panel-nudge-x))
    translateY(var(--panel-nudge-y))
    translate3d(calc(var(--mx) * 5px), calc(var(--my) * 4px), 0);
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.panel-kicker {
  color: var(--lobby-accent-text);
  font-size: 0.78rem;
  font-weight: 900;
}

.active-panel strong {
  color: var(--lobby-text-strong);
  font-size: clamp(1rem, 1.6vw, 1.25rem);
}

.active-panel p {
  margin: 0;
  color: var(--lobby-text-soft);
  font-size: 0.86rem;
  line-height: 1.55;
}

.active-panel a {
  justify-self: start;
  margin-top: 6px;
  color: var(--lobby-text-strong);
  font-size: 0.84rem;
  font-weight: 900;
  text-decoration: none;
  border-bottom: 2px solid var(--active-accent);
}

.active-panel a:hover,
.active-panel a:focus-visible {
  color: var(--lobby-accent-text);
  outline: none;
}

.floating-chip {
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(230px, 42vw);
  border: 1px solid var(--lobby-border);
  border-radius: 8px;
  padding: 9px 11px;
  color: var(--lobby-text-muted);
  background: var(--lobby-chip);
  font-size: 0.78rem;
  font-weight: 800;
  box-shadow: 0 18px 40px var(--lobby-chip-shadow);
}

.floating-chip svg {
  width: 16px;
  height: 16px;
  color: var(--lobby-accent-text);
}

.chip-one {
  left: 6%;
  top: 51%;
  transform: translate3d(calc(var(--mx) * 24px), calc(var(--my) * 12px), 0);
}

.chip-two {
  right: 4%;
  top: 54%;
  transform: translate3d(calc(var(--mx) * -18px), calc(var(--my) * 18px), 0);
}

.chip-three {
  left: 58%;
  bottom: 4%;
  transform: translate3d(calc(var(--mx) * -12px), calc(var(--my) * -18px), 0);
}

.scroll-cue {
  position: fixed;
  right: clamp(12px, 2vw, 22px);
  bottom: clamp(106px, 13vh, 142px);
  z-index: 30;
  display: inline-grid;
  place-items: center;
  width: 54px;
  height: 54px;
  min-height: 54px;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--lobby-cue-border);
  border-radius: 18px;
  color: rgba(244, 248, 255, 0.96);
  background: var(--lobby-cue-bg);
  box-shadow:
    0 18px 36px rgba(0, 0, 0, 0.28),
    0 0 0 1px rgba(255, 255, 255, 0.08) inset;
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.scroll-cue::before {
  content: "";
  position: absolute;
  inset: 8px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-dark) 100%);
  box-shadow:
    0 6px 20px rgba(0, 204, 238, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.scroll-cue svg {
  position: relative;
  z-index: 1;
  width: 22px;
  height: 22px;
  color: #ffffff;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.28));
}

.scroll-cue span {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  white-space: nowrap;
  border: 0;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
}

.scroll-cue:hover,
.scroll-cue:focus-visible {
  border-color: rgba(0, 255, 238, 0.42);
  outline: none;
  transform: translateY(-3px);
  box-shadow:
    0 22px 44px rgba(0, 0, 0, 0.34),
    0 0 22px rgba(0, 204, 238, 0.22),
    0 0 0 1px rgba(255, 255, 255, 0.12) inset;
}

.scroll-cue:hover::before,
.scroll-cue:focus-visible::before {
  background: linear-gradient(135deg, var(--vp-c-brand-dark) 0%, var(--vp-c-brand-darker) 100%);
  transform: scale(1.04);
}

.story-band {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(340px, 1.2fr);
  gap: clamp(20px, 4vw, 54px);
  width: min(100%, 1480px);
  margin: 0 auto;
  padding: clamp(20px, 3vw, 28px) clamp(18px, 3vw, 44px) clamp(18px, 2.5vw, 34px);
  border-top: 1px solid var(--lobby-story-divider);
}

.story-heading h2 {
  max-width: 460px;
  margin: 0;
  color: var(--lobby-text-strong);
  font-size: clamp(2rem, 3.3vw, 3.35rem);
  line-height: 1.05;
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.story-item {
  min-height: 168px;
  border: 1px solid var(--lobby-story-border);
  border-radius: 8px;
  padding: clamp(16px, 1.6vw, 20px);
  background: var(--lobby-surface-soft);
  box-shadow: var(--lobby-story-shadow);
}

.story-item span {
  color: var(--lobby-accent-text);
  font-size: 0.8rem;
  font-weight: 900;
}

.story-item h3 {
  margin: 14px 0 10px;
  color: var(--lobby-text-strong);
  font-size: clamp(1.06rem, 1vw, 1.22rem);
  line-height: 1.25;
}

.story-item p {
  margin: 0;
  color: var(--lobby-text-soft);
  font-size: 0.94rem;
  line-height: 1.7;
}

@keyframes nodeFloat {
  0%,
  100% {
    margin-top: 0;
  }

  50% {
    margin-top: -10px;
  }
}

@media (max-width: 1100px) {
  .hero-stage {
    grid-template-columns: minmax(260px, 0.82fr) minmax(420px, 1.18fr);
    gap: clamp(18px, 3vw, 42px);
    padding-top: 0;
    padding-bottom: 34px;
  }

  .hero-copy {
    max-width: none;
  }

  .hero-logo-card {
    width: min(340px, calc(100vw - 24px));
  }

  .hero-title-group {
    margin-top: clamp(18px, 3vh, 30px);
  }

  .hero-copy h1 {
    font-size: clamp(1.65rem, min(3.8vw, 10.6cqw), 3.35rem);
  }

  .hero-home-text {
    font-size: clamp(1.5rem, min(3.65vw, 8.6cqw), 3.25rem);
  }

  .scene {
    width: min(100%, 760px);
    min-height: min(62svh, 620px);
    margin: 0 auto;
  }

  .story-band {
    grid-template-columns: 1fr;
    padding-top: 20px;
  }
}

@media (max-width: 900px) {
  .hero-stage {
    grid-template-columns: 1fr;
    padding-bottom: 42px;
  }

  .hero-copy {
    max-width: 760px;
    margin-inline: auto;
  }

  .scene {
    width: min(100%, 820px);
    min-height: 620px;
    margin: 0 auto;
  }
}

@media (max-width: 720px) {
  :global(body:has(.hb-home-lobby) .VPContent) {
    padding-top: 0 !important;
  }

  .hero-shell {
    padding: var(--vp-nav-height) 14px 22px;
  }

  .hero-stage {
    padding-top: 4px;
  }

  .hero-copy {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    transform: none;
  }

  .hero-brand-lockup {
    justify-content: center;
    margin-inline: auto;
    padding-top: 0;
    overflow: visible;
  }

  .hero-logo-card {
    width: min(340px, calc(100vw - 24px));
    box-shadow: none;
    filter: none;
    transform: none;
  }

  .hero-title-group {
    text-align: center;
  }

  .hero-copy h1 {
    font-size: clamp(1.72rem, min(6vw, 11.6cqw), 2.72rem);
  }

  .hero-home-text {
    font-size: clamp(1.5rem, min(5.4vw, 8.4cqw), 2.8rem);
  }

  .hero-intro {
    max-width: 34rem;
    margin-inline: auto;
    font-size: 0.98rem;
  }

  .hero-actions {
    justify-content: center;
  }

  .scene {
    min-height: 520px;
    aspect-ratio: auto;
    margin-bottom: 190px;
    overflow: visible;
    transform: none;
  }

  .scene-grid,
  .scene-ring {
    transform: none;
  }

  .ring-two {
    transform: rotate(58deg);
  }

  .ring-three {
    transform: rotate(-28deg);
  }

  .scene-node {
    width: 64px;
    transform: translate(-50%, -50%);
  }

  .node-label {
    max-width: 88px;
    font-size: 0.72rem;
  }

  .avatar-rig {
    width: min(62%, 320px);
    min-width: 218px;
    transform: translate(-50%, -50%);
  }

  .avatar-frame img {
    transform: scale(1.04);
  }

  .active-panel {
    left: 50%;
    top: calc(100% + 16px);
    bottom: auto;
    width: min(300px, calc(100vw - 28px));
    transform: translateX(-50%);
  }

  .floating-chip {
    display: none;
  }

  .scroll-cue {
    right: 50px;
    bottom: 54px;
    width: 48px;
    height: 48px;
    min-height: 48px;
    border-radius: 16px;
  }

  .scroll-cue::before {
    inset: 7px;
    border-radius: 12px;
  }

  .story-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 460px) {
  .hero-brand-lockup {
    max-width: 100%;
  }

  .hero-copy h1 {
    font-size: clamp(1.62rem, min(7vw, 11.4cqw), 2.55rem);
  }

  .hero-home-text {
    font-size: clamp(1.4rem, min(6.5vw, 8.2cqw), 2.9rem);
  }

  .eyebrow {
    margin-bottom: 10px;
  }

  .hero-actions {
    flex-wrap: nowrap;
    align-items: center;
    width: 100%;
  }

  .hero-action {
    flex: 1 1 0;
    min-width: 0;
    padding-inline: 8px;
    font-size: 0.86rem;
    white-space: nowrap;
  }

  .scene {
    min-height: 470px;
    margin-bottom: 190px;
  }

  .scene-node {
    width: 56px;
  }

  .scroll-cue {
    right: 50px;
    bottom: 54px;
  }

  .node-label {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hb-home-lobby *,
  .hb-home-lobby *::before,
  .hb-home-lobby *::after {
    animation: none !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
