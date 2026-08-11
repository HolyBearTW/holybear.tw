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
  const isRightSide = unit.x > 54
  const panelX = isRightSide
    ? Math.max(unit.x - 8, 18)
    : Math.min(unit.x + 8, 82)
  const panelY = Math.min(Math.max(unit.y + (unit.y > 66 ? -10 : 8), 20), 78)

  return {
    '--panel-x': `${panelX}%`,
    '--panel-y': `${panelY}%`,
    '--panel-shift-x': isRightSide ? '-100%' : '0%',
    '--panel-nudge-x': isRightSide ? '-12px' : '12px'
  }
})

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
  if (prefersReducedMotion()) return

  rotateTimer = window.setInterval(() => {
    if (isAutoRotationPaused.value) return
    activeIndex.value = (activeIndex.value + 1) % units.length
  }, 2800)
})

onBeforeUnmount(() => {
  if (rotateTimer) window.clearInterval(rotateTimer)
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
              <img src="/logo.png" alt="HolyBearTW" class="hero-logo no-zoom">
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
  padding-top: var(--vp-nav-height);
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
  position: relative;
  min-height: 0;
  overflow: hidden;
  color: #f6fbff;
  background: transparent;
  font-family: "LINESeed", var(--vp-font-family-base), "Inter", "Noto Sans TC", system-ui, sans-serif;
}

.hero-shell {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 0;
  width: min(100%, 1480px);
  margin: 0 auto;
  flex-direction: column;
  padding: clamp(32px, 6vh, 72px) clamp(18px, 3vw, 44px) 0;
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
  width: clamp(168px, 18vw, 238px);
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.04)),
    rgba(7, 16, 19, 0.34);
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.22),
    0 0 0 1px rgba(0, 255, 238, 0.12);
  filter:
    drop-shadow(0 16px 34px rgba(0, 255, 238, 0.25))
    drop-shadow(0 4px 14px rgba(143, 112, 255, 0.22));
  transform: translate3d(calc(var(--mx) * -5px), calc(var(--my) * -4px), 0);
}

.hero-logo-card::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.28), transparent 38%);
  pointer-events: none;
}

.hero-logo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 18px;
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
  color: var(--active-accent);
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
  color: #ffffff;
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
  color: rgba(246, 251, 255, 0.84);
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
  border: 1px solid rgba(246, 251, 255, 0.22);
  border-radius: 8px;
  padding: 11px 16px;
  color: #ffffff;
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
  background: #ffffff;
  color: #071013;
}

.hero-action.ghost {
  background: rgba(7, 16, 19, 0.34);
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
  border: 1px solid rgba(246, 251, 255, 0.12);
  border-radius: 50%;
  background:
    linear-gradient(90deg, transparent 49.7%, rgba(246, 251, 255, 0.18) 50%, transparent 50.3%),
    linear-gradient(0deg, transparent 49.7%, rgba(246, 251, 255, 0.18) 50%, transparent 50.3%);
  transform: rotate(calc(var(--mx) * 2deg));
}

.scene-ring {
  inset: 15%;
  z-index: 0;
  border: 1px solid rgba(246, 251, 255, 0.2);
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
  z-index: 4;
  display: grid;
  width: clamp(72px, 7vw, 98px);
  aspect-ratio: 1;
  place-items: center;
  border: 2px solid color-mix(in srgb, var(--node-accent), #ffffff 26%);
  border-radius: 50%;
  background: rgba(7, 16, 19, 0.74);
  color: #ffffff;
  text-decoration: none;
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.35),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
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
  color: var(--node-accent);
}

.scene-node.is-active,
.scene-node:hover,
.scene-node:focus-visible {
  background: color-mix(in srgb, var(--node-accent), #071013 72%);
  border-color: #ffffff;
  box-shadow:
    0 22px 52px color-mix(in srgb, var(--node-accent), transparent 68%),
    inset 0 0 0 1px rgba(255, 255, 255, 0.22);
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
  color: rgba(246, 251, 255, 0.85);
  font-size: 0.83rem;
  font-weight: 900;
  text-align: center;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
}

.avatar-rig {
  left: 50%;
  top: 52%;
  z-index: 3;
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
  border: 3px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0)),
    rgba(8, 17, 21, 0.9);
  box-shadow: 0 26px 80px rgba(0, 0, 0, 0.45);
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
  z-index: 7;
  display: grid;
  width: min(250px, 31vw);
  gap: 5px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-left: 5px solid var(--active-accent);
  border-radius: 8px;
  padding: 12px 14px;
  background: rgba(6, 13, 16, 0.72);
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(14px);
  pointer-events: auto;
  transform:
    translate(var(--panel-shift-x), -50%)
    translateX(var(--panel-nudge-x))
    translate3d(calc(var(--mx) * 5px), calc(var(--my) * 4px), 0);
  transition:
    left 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    top 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.2s ease,
    background 0.2s ease;
}

.panel-kicker {
  color: var(--active-accent);
  font-size: 0.78rem;
  font-weight: 900;
}

.active-panel strong {
  color: #ffffff;
  font-size: clamp(1rem, 1.6vw, 1.25rem);
}

.active-panel p {
  margin: 0;
  color: rgba(246, 251, 255, 0.76);
  font-size: 0.86rem;
  line-height: 1.55;
}

.active-panel a {
  justify-self: start;
  margin-top: 6px;
  color: #ffffff;
  font-size: 0.84rem;
  font-weight: 900;
  text-decoration: none;
  border-bottom: 2px solid var(--active-accent);
}

.active-panel a:hover,
.active-panel a:focus-visible {
  color: var(--active-accent);
  outline: none;
}

.floating-chip {
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(230px, 42vw);
  border: 1px solid rgba(246, 251, 255, 0.18);
  border-radius: 8px;
  padding: 9px 11px;
  color: rgba(246, 251, 255, 0.82);
  background: rgba(7, 16, 19, 0.56);
  font-size: 0.78rem;
  font-weight: 800;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
}

.floating-chip svg {
  width: 16px;
  height: 16px;
  color: var(--active-accent);
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
  border: 1px solid rgba(0, 255, 238, 0.18);
  border-radius: 18px;
  color: rgba(244, 248, 255, 0.96);
  background: rgba(18, 20, 26, 0.72);
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
  border-top: 1px solid rgba(246, 251, 255, 0.12);
}

.story-heading h2 {
  max-width: 460px;
  margin: 0;
  color: #ffffff;
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
  border: 1px solid rgba(246, 251, 255, 0.16);
  border-radius: 8px;
  padding: clamp(16px, 1.6vw, 20px);
  background: rgba(246, 251, 255, 0.07);
}

.story-item span {
  color: var(--active-accent);
  font-size: 0.8rem;
  font-weight: 900;
}

.story-item h3 {
  margin: 14px 0 10px;
  color: #ffffff;
  font-size: clamp(1.06rem, 1vw, 1.22rem);
  line-height: 1.25;
}

.story-item p {
  margin: 0;
  color: rgba(246, 251, 255, 0.72);
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
    padding-top: 4px;
    padding-bottom: 34px;
  }

  .hero-copy {
    max-width: none;
  }

  .hero-logo-card {
    width: clamp(154px, 17vw, 210px);
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
    padding: 14px 14px 22px;
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
    padding-top: 8px;
    overflow: visible;
  }

  .hero-logo-card {
    width: clamp(148px, 36vw, 214px);
    box-shadow:
      0 18px 42px rgba(0, 0, 0, 0.22),
      0 0 0 1px rgba(0, 255, 238, 0.12),
      0 0 28px rgba(0, 255, 238, 0.18);
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
