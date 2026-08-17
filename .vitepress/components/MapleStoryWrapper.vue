<template>
  <div id="maplestory-root"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './maplestory/App'

let root = null
let readyObserver = null

function announceReady(container) {
  if (!container.firstElementChild) return false

  window.dispatchEvent(new CustomEvent('holybear-route-loading-finish'))
  return true
}

onMounted(() => {
  const container = document.getElementById('maplestory-root')
  if (container) {
    root = ReactDOM.createRoot(container)
    root.render(React.createElement(App))

    readyObserver = new MutationObserver(() => {
      if (announceReady(container)) {
        readyObserver?.disconnect()
        readyObserver = null
      }
    })
    readyObserver.observe(container, { childList: true })

    requestAnimationFrame(() => {
      if (announceReady(container)) {
        readyObserver?.disconnect()
        readyObserver = null
      }
    })
  }
})

onBeforeUnmount(() => {
  readyObserver?.disconnect()
  readyObserver = null
  if (root) {
    root.unmount()
  }
})
</script>

<style scoped>
#maplestory-root {
  width: 100%;
  min-height: 500px;
}
</style>

<style>
/* MapleStory tool: transparent navigation at the top, glass surface after scrolling. */
body:has(#maplestory-root) .VPNav {
  background: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

body:has(#maplestory-root) .VPNavBar.top,
body:has(#maplestory-root) .VPNavBar.top > .wrapper,
body:has(#maplestory-root) .VPNavBar.top > .container,
body:has(#maplestory-root) .VPNavBar.top .content,
body:has(#maplestory-root) .VPNavBar.top .content-body {
  background: transparent !important;
  background-image: none !important;
  border-color: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

html:not(.dark) body:has(#maplestory-root) .VPNavBar:not(.top) {
  background: rgba(255, 255, 255, 0.68) !important;
  border-bottom-color: rgba(15, 23, 42, 0.1) !important;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.12) !important;
  backdrop-filter: blur(20px) saturate(150%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(150%) !important;
}

html.dark body:has(#maplestory-root) .VPNavBar:not(.top) {
  background: rgba(6, 13, 16, 0.76) !important;
  border-bottom-color: rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28) !important;
  backdrop-filter: blur(20px) saturate(150%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(150%) !important;
}

body:has(#maplestory-root) .VPNavBar:not(.top) > .wrapper,
body:has(#maplestory-root) .VPNavBar:not(.top) > .container,
body:has(#maplestory-root) .VPNavBar:not(.top) .content,
body:has(#maplestory-root) .VPNavBar:not(.top) .content-body {
  background: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* MapleStory tool: dedicated light palette for its React/Tailwind interface. */

html:not(.dark) body:has(#maplestory-root) .VPFooter,
html:not(.dark) body:has(#maplestory-root) .VPFooter a {
  color: #526b78 !important;
  text-shadow: none;
}

html:not(.dark) #maplestory-root {
  --maple-light-surface: rgba(249, 253, 255, 0.9);
  --maple-light-surface-strong: rgba(255, 255, 255, 0.96);
  --maple-light-surface-soft: rgba(230, 244, 248, 0.78);
  --maple-light-border: rgba(36, 94, 112, 0.2);
  --maple-light-border-strong: rgba(36, 94, 112, 0.3);
  --maple-light-text: #173746;
  --maple-light-text-strong: #082936;
  --maple-light-text-muted: #526b78;
}

html:not(.dark) #maplestory-root > div {
  color: var(--maple-light-text);
  background: transparent;
}

html:not(.dark) #maplestory-root [class~="bg-[#0a0c10]"],
html:not(.dark) #maplestory-root [class~="bg-[#0d1117]"],
html:not(.dark) #maplestory-root [class~="bg-[#0e141e]"],
html:not(.dark) #maplestory-root [class~="bg-[#11151b]"],
html:not(.dark) #maplestory-root [class~="bg-[#15171c]"],
html:not(.dark) #maplestory-root [class~="bg-[#161b22]"],
html:not(.dark) #maplestory-root [class~="bg-[#1a1d24]"],
html:not(.dark) #maplestory-root [class~="bg-[#1a1d24]/90"],
html:not(.dark) #maplestory-root [class~="bg-[#1a1d24]/95"],
html:not(.dark) #maplestory-root [class~="bg-slate-950"],
html:not(.dark) #maplestory-root [class~="bg-slate-950/40"],
html:not(.dark) #maplestory-root [class~="bg-slate-950/50"],
html:not(.dark) #maplestory-root [class~="bg-slate-900"],
html:not(.dark) #maplestory-root [class~="bg-slate-900/30"],
html:not(.dark) #maplestory-root [class~="bg-slate-900/40"],
html:not(.dark) #maplestory-root [class~="bg-slate-900/50"],
html:not(.dark) #maplestory-root [class~="bg-slate-900/60"],
html:not(.dark) #maplestory-root [class~="bg-slate-900/80"] {
  background-color: var(--maple-light-surface) !important;
}

html:not(.dark) #maplestory-root [class~="bg-[#0d1117]/50"],
html:not(.dark) #maplestory-root [class~="bg-[#0d1117]/80"],
html:not(.dark) #maplestory-root [class~="bg-slate-800"],
html:not(.dark) #maplestory-root [class~="bg-slate-800/50"],
html:not(.dark) #maplestory-root [class~="bg-slate-700"],
html:not(.dark) #maplestory-root [class~="bg-slate-700/50"] {
  background-color: var(--maple-light-surface-soft) !important;
}

html:not(.dark) #maplestory-root [class~="text-white"],
html:not(.dark) #maplestory-root [class~="text-slate-100"],
html:not(.dark) #maplestory-root [class~="text-slate-200"] {
  color: var(--maple-light-text-strong) !important;
}

html:not(.dark) #maplestory-root [class~="text-slate-300"] {
  color: var(--maple-light-text) !important;
}

html:not(.dark) #maplestory-root [class~="text-slate-400"],
html:not(.dark) #maplestory-root [class~="text-[#B8BFC5]"] {
  color: var(--maple-light-text-muted) !important;
}

html:not(.dark) #maplestory-root [class~="text-slate-500"],
html:not(.dark) #maplestory-root [class~="text-slate-600"] {
  color: #657d89 !important;
}

html:not(.dark) #maplestory-root [class~="text-indigo-300"],
html:not(.dark) #maplestory-root [class~="text-indigo-400"],
html:not(.dark) #maplestory-root [class~="text-indigo-500"] {
  color: #5145cd !important;
}

html:not(.dark) #maplestory-root [class~="text-purple-300"],
html:not(.dark) #maplestory-root [class~="text-purple-400"] {
  color: #7a3db8 !important;
}

html:not(.dark) #maplestory-root [class~="text-cyan-400"],
html:not(.dark) #maplestory-root [class~="text-sky-300"],
html:not(.dark) #maplestory-root [class~="text-sky-400"] {
  color: #087f94 !important;
}

html:not(.dark) #maplestory-root [class~="text-green-300"],
html:not(.dark) #maplestory-root [class~="text-green-400"],
html:not(.dark) #maplestory-root [class~="text-emerald-300"],
html:not(.dark) #maplestory-root [class~="text-emerald-400"] {
  color: #087a4b !important;
}

html:not(.dark) #maplestory-root [class~="text-yellow-300"],
html:not(.dark) #maplestory-root [class~="text-yellow-400"],
html:not(.dark) #maplestory-root [class~="text-yellow-500"],
html:not(.dark) #maplestory-root [class~="text-yellow-500/80"],
html:not(.dark) #maplestory-root [class~="text-amber-200"],
html:not(.dark) #maplestory-root [class~="text-amber-400"],
html:not(.dark) #maplestory-root [class~="text-amber-400/80"],
html:not(.dark) #maplestory-root [class~="text-amber-500"] {
  color: #9a6400 !important;
}

html:not(.dark) #maplestory-root [class~="text-orange-300"],
html:not(.dark) #maplestory-root [class~="text-orange-400"],
html:not(.dark) #maplestory-root [class~="text-orange-500"] {
  color: #b34b0c !important;
}

html:not(.dark) #maplestory-root [class~="text-red-300"],
html:not(.dark) #maplestory-root [class~="text-red-400"],
html:not(.dark) #maplestory-root [class~="text-red-500"] {
  color: #c22f3f !important;
}

html:not(.dark) #maplestory-root [class~="border-[#1f242e]"],
html:not(.dark) #maplestory-root [class~="border-slate-600"],
html:not(.dark) #maplestory-root [class~="border-slate-700"],
html:not(.dark) #maplestory-root [class~="border-slate-700/50"],
html:not(.dark) #maplestory-root [class~="border-slate-700/80"],
html:not(.dark) #maplestory-root [class~="border-slate-800"],
html:not(.dark) #maplestory-root [class~="border-slate-800/30"],
html:not(.dark) #maplestory-root [class~="border-slate-800/50"],
html:not(.dark) #maplestory-root [class~="border-slate-800/70"],
html:not(.dark) #maplestory-root [class~="border-slate-900"] {
  border-color: var(--maple-light-border) !important;
}

html:not(.dark) #maplestory-root input,
html:not(.dark) #maplestory-root select,
html:not(.dark) #maplestory-root textarea {
  color: var(--maple-light-text-strong);
  background-color: var(--maple-light-surface-strong) !important;
  border-color: var(--maple-light-border-strong) !important;
  color-scheme: light;
}

html:not(.dark) #maplestory-root input::placeholder,
html:not(.dark) #maplestory-root textarea::placeholder {
  color: #7a909b !important;
}

html:not(.dark) #maplestory-root [class~="hover:bg-slate-700"]:hover,
html:not(.dark) #maplestory-root [class~="hover:bg-slate-700/80"]:hover,
html:not(.dark) #maplestory-root [class~="hover:bg-slate-800"]:hover,
html:not(.dark) #maplestory-root [class~="hover:bg-slate-800/70"]:hover,
html:not(.dark) #maplestory-root [class~="hover:bg-white/5"]:hover {
  background-color: rgba(0, 159, 187, 0.1) !important;
}

html:not(.dark) #maplestory-root [class~="hover:text-white"]:hover {
  color: #087f94 !important;
}

html:not(.dark) #maplestory-root [class~="shadow-lg"],
html:not(.dark) #maplestory-root [class~="shadow-xl"],
html:not(.dark) #maplestory-root [class~="shadow-2xl"] {
  --tw-shadow-color: rgba(35, 76, 94, 0.16);
}

html:not(.dark) #maplestory-root .maple-hero-title,
html:not(.dark) #maplestory-root .maple-empty-state h2 {
  color: var(--maple-light-text-strong) !important;
  text-shadow: none;
}

html:not(.dark) #maplestory-root .maple-hero-subtitle,
html:not(.dark) #maplestory-root .maple-date-control,
html:not(.dark) #maplestory-root .maple-settings-button,
html:not(.dark) #maplestory-root .maple-empty-state p {
  color: var(--maple-light-text-muted) !important;
  text-shadow: none;
}

html:not(.dark) #maplestory-root .maple-equipment-tooltip,
html:not(.dark) #maplestory-root .maple-equipment-tooltip [class~="text-white"] {
  color: #ffffff !important;
}

html:not(.dark) #maplestory-root .maple-equipment-tooltip [class~="text-slate-300"] {
  color: #cbd5e1 !important;
}

html:not(.dark) #maplestory-root .maple-equipment-tooltip [class~="text-slate-400"],
html:not(.dark) #maplestory-root .maple-equipment-tooltip [class~="text-[#B8BFC5]"] {
  color: #b8bfc5 !important;
}

html:not(.dark) #maplestory-root .maple-equipment-tooltip [class~="text-indigo-300"] {
  color: #a5b4fc !important;
}

html:not(.dark) #maplestory-root .maple-recent-login-tooltip {
  background: rgba(255, 255, 255, 0.96) !important;
  box-shadow: 0 8px 22px rgba(35, 76, 94, 0.16) !important;
}

html:not(.dark) #maplestory-root .maple-recent-login-tooltip[class~="text-emerald-300"] {
  color: #087a4b !important;
  border-color: rgba(8, 122, 75, 0.35) !important;
}

html:not(.dark) #maplestory-root .maple-recent-login-tooltip[class~="text-red-300"] {
  color: #c22f3f !important;
  border-color: rgba(194, 47, 63, 0.35) !important;
}

html:not(.dark) #maplestory-root .maple-best-combat-power-tooltip {
  color: var(--maple-light-text) !important;
  background: rgba(255, 255, 255, 0.97) !important;
  border-color: rgba(8, 122, 75, 0.28) !important;
  box-shadow: 0 10px 26px rgba(35, 76, 94, 0.18) !important;
}

html:not(.dark) #maplestory-root .maple-best-combat-power-tooltip [class~="text-emerald-300"] {
  color: #087a4b !important;
}

html:not(.dark) #maplestory-root .maple-best-combat-power-tooltip [class~="text-slate-400"] {
  color: var(--maple-light-text-muted) !important;
}

html:not(.dark) #maplestory-root .maple-champion-shade {
  background: linear-gradient(to top, rgba(232, 243, 247, 0.96), rgba(232, 243, 247, 0.48), transparent) !important;
}

html:not(.dark) #maplestory-root .maple-champion-card [class~="drop-shadow-md"],
html:not(.dark) #maplestory-root .maple-champion-card [class~="drop-shadow-sm"] {
  filter: none;
}

html:not(.dark) #maplestory-root .maple-profile-banner {
  background-color: rgba(220, 239, 245, 0.78) !important;
}

html:not(.dark) #maplestory-root .maple-profile-city {
  opacity: 0.86 !important;
  filter: none !important;
  mix-blend-mode: normal !important;
}

html:not(.dark) #maplestory-root .maple-profile-city:hover,
html:not(.dark) #maplestory-root .group:hover .maple-profile-city {
  opacity: 0.96 !important;
}

html:not(.dark) #maplestory-root .maple-profile-shade {
  background: linear-gradient(to bottom, rgba(249, 253, 255, 0.02), rgba(249, 253, 255, 0.96)) !important;
}

html.dark #maplestory-root .maple-profile-city {
  opacity: 0.9 !important;
  filter: saturate(1.08) contrast(1.04) !important;
  mix-blend-mode: normal !important;
}

html.dark #maplestory-root .maple-profile-city:hover,
html.dark #maplestory-root .group:hover .maple-profile-city {
  opacity: 1 !important;
}

html:not(.dark) #maplestory-root .maple-preset-switcher {
  background: rgba(235, 246, 249, 0.86) !important;
  border-color: rgba(36, 94, 112, 0.22) !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.58);
}

html:not(.dark) #maplestory-root .maple-preset-label {
  color: var(--maple-light-text-strong) !important;
}

html:not(.dark) #maplestory-root .maple-preset-active-badge {
  color: #087a4b !important;
  background: rgba(205, 245, 222, 0.92) !important;
  border-color: rgba(8, 122, 75, 0.34) !important;
}

html:not(.dark) #maplestory-root .maple-preset-button {
  color: #526b78 !important;
  background: rgba(237, 247, 250, 0.96) !important;
  border-color: rgba(36, 94, 112, 0.22) !important;
  box-shadow: none !important;
}

html:not(.dark) #maplestory-root .maple-preset-button:hover {
  color: #087f94 !important;
  background: rgba(213, 242, 247, 0.98) !important;
  border-color: rgba(8, 127, 148, 0.42) !important;
}

html:not(.dark) #maplestory-root .maple-preset-button.is-current {
  color: #ffffff !important;
  background: linear-gradient(135deg, #087f94, #00aeca) !important;
  border-color: rgba(0, 136, 160, 0.72) !important;
  box-shadow: 0 5px 14px rgba(0, 150, 180, 0.25) !important;
}

html:not(.dark) #maplestory-root .maple-preset-live-dot {
  background: #18b86b !important;
  border-color: #ffffff !important;
}

html:not(.dark) #maplestory-root .maple-preset-warning {
  color: #875b00 !important;
  background: rgba(255, 244, 204, 0.86) !important;
  border-color: rgba(184, 124, 0, 0.28) !important;
}

html:not(.dark) #maplestory-root .maple-ability {
  box-shadow: none !important;
}

html:not(.dark) #maplestory-root .maple-ability-legendary {
  color: #087a4b !important;
  background: rgba(205, 245, 222, 0.76) !important;
  border-color: rgba(8, 122, 75, 0.48) !important;
}

html:not(.dark) #maplestory-root .maple-ability-unique {
  color: #8a5a00 !important;
  background: rgba(255, 239, 184, 0.8) !important;
  border-color: rgba(184, 124, 0, 0.52) !important;
}

html:not(.dark) #maplestory-root .maple-ability-epic {
  color: #7038a8 !important;
  background: rgba(237, 219, 255, 0.82) !important;
  border-color: rgba(122, 61, 184, 0.46) !important;
}

html:not(.dark) #maplestory-root .maple-ability-rare {
  color: #1f5fae !important;
  background: rgba(216, 234, 255, 0.84) !important;
  border-color: rgba(37, 99, 179, 0.42) !important;
}

html:not(.dark) #maplestory-root .maple-ability-normal {
  color: var(--maple-light-text) !important;
  background: rgba(235, 244, 247, 0.9) !important;
  border-color: rgba(36, 94, 112, 0.24) !important;
}

html:not(.dark) #maplestory-root .maple-familiar-section,
html:not(.dark) #maplestory-root .maple-hexa-stats,
html:not(.dark) #maplestory-root .maple-core-skills,
html:not(.dark) #maplestory-root .maple-link-section,
html:not(.dark) #maplestory-root .maple-symbol-stats {
  background: rgba(249, 253, 255, 0.9) !important;
  border-color: rgba(36, 94, 112, 0.22) !important;
}

html:not(.dark) #maplestory-root .maple-familiar-slot {
  background: rgba(255, 239, 248, 0.8) !important;
  border-color: rgba(219, 73, 145, 0.3) !important;
}

html:not(.dark) #maplestory-root .maple-familiar-slot.is-active {
  background: rgba(231, 249, 240, 0.9) !important;
  border-color: rgba(8, 122, 75, 0.34) !important;
}

html:not(.dark) #maplestory-root .maple-familiar-slot-status {
  color: #526b78 !important;
  background: rgba(237, 247, 250, 0.96) !important;
  border: 1px solid rgba(36, 94, 112, 0.22) !important;
}

html:not(.dark) #maplestory-root .maple-familiar-slot-status.is-active {
  color: #087a4b !important;
  background: rgba(205, 245, 222, 0.92) !important;
  border-color: rgba(8, 122, 75, 0.34) !important;
}

html:not(.dark) #maplestory-root .maple-familiar-card {
  background: rgba(250, 254, 255, 0.94) !important;
  border-color: rgba(36, 94, 112, 0.22) !important;
  box-shadow: 0 5px 18px rgba(35, 76, 94, 0.07) !important;
}

html:not(.dark) #maplestory-root .maple-familiar-card.is-special {
  background: linear-gradient(135deg, rgba(255, 249, 224, 0.95), rgba(255, 253, 244, 0.95)) !important;
  border-color: rgba(184, 124, 0, 0.42) !important;
}

html:not(.dark) #maplestory-root .maple-familiar-option {
  background: rgba(239, 248, 250, 0.82) !important;
  border-color: rgba(36, 94, 112, 0.2) !important;
}

html:not(.dark) #maplestory-root .maple-familiar-summoned-badge {
  color: #087a4b !important;
  background: rgba(205, 245, 222, 0.94) !important;
  border-color: rgba(8, 122, 75, 0.34) !important;
}

html:not(.dark) #maplestory-root .maple-familiar-linked-badge {
  color: #a52b68 !important;
  background: rgba(255, 224, 240, 0.94) !important;
  border-color: rgba(193, 48, 119, 0.32) !important;
}

html:not(.dark) #maplestory-root .maple-familiar-special-badge {
  color: #875b00 !important;
  background: rgba(255, 241, 196, 0.94) !important;
  border-color: rgba(184, 124, 0, 0.34) !important;
  box-shadow: none !important;
}

html:not(.dark) #maplestory-root .maple-hexa-summary {
  background: linear-gradient(135deg, rgba(244, 235, 255, 0.94), rgba(239, 246, 255, 0.94)) !important;
  border-color: rgba(122, 61, 184, 0.3) !important;
}

html:not(.dark) #maplestory-root .maple-hexa-summary-item,
html:not(.dark) #maplestory-root .maple-hexa-stat-row {
  background: rgba(253, 254, 255, 0.92) !important;
  border-color: rgba(81, 69, 205, 0.18) !important;
}

html:not(.dark) #maplestory-root .maple-hexa-core {
  background: rgba(250, 252, 255, 0.94) !important;
  border-color: rgba(139, 74, 210, 0.34) !important;
  box-shadow: 0 5px 18px rgba(106, 65, 170, 0.07) !important;
}

html:not(.dark) #maplestory-root .maple-hexa-grade {
  color: #6730a2 !important;
  background: rgba(232, 211, 255, 0.96) !important;
  border-left: 1px solid rgba(122, 61, 184, 0.28);
  border-bottom: 1px solid rgba(122, 61, 184, 0.28);
}

html:not(.dark) #maplestory-root .maple-hyper-level {
  color: #076f82 !important;
  background: rgba(205, 241, 247, 0.96) !important;
  border-left: 1px solid rgba(8, 127, 148, 0.28);
  border-bottom: 1px solid rgba(8, 127, 148, 0.28);
}

html:not(.dark) #maplestory-root .maple-set-count-badge {
  color: #087a4b !important;
  background: rgba(205, 245, 222, 0.94) !important;
  border: 1px solid rgba(8, 122, 75, 0.28);
}

html:not(.dark) #maplestory-root .maple-core-toggle {
  color: #526b78 !important;
  background: rgba(237, 247, 250, 0.96) !important;
  border-color: rgba(36, 94, 112, 0.22) !important;
}

html:not(.dark) #maplestory-root .maple-core-toggle:hover {
  color: #087f94 !important;
  background: rgba(213, 242, 247, 0.98) !important;
  border-color: rgba(8, 127, 148, 0.42) !important;
}

html:not(.dark) #maplestory-root .maple-core-toggle.is-active {
  color: #087f94 !important;
  background: rgba(205, 241, 247, 0.94) !important;
  border-color: rgba(8, 127, 148, 0.4) !important;
}

html:not(.dark) #maplestory-root .maple-core-item {
  background: rgba(249, 253, 255, 0.94) !important;
  border-color: rgba(81, 69, 205, 0.2) !important;
}

html:not(.dark) #maplestory-root .maple-symbol-card {
  box-shadow: 0 5px 18px rgba(35, 76, 94, 0.07) !important;
}

html:not(.dark) #maplestory-root .maple-symbol-card.is-arc {
  background: linear-gradient(135deg, rgba(242, 232, 255, 0.92), rgba(248, 244, 255, 0.94)) !important;
  border-color: rgba(139, 74, 210, 0.36) !important;
}

html:not(.dark) #maplestory-root .maple-symbol-card.is-aut {
  background: linear-gradient(135deg, rgba(220, 247, 251, 0.94), rgba(241, 252, 254, 0.94)) !important;
  border-color: rgba(0, 159, 187, 0.36) !important;
}

html:not(.dark) #maplestory-root .maple-ai-check-button {
  color: #ffffff !important;
  background: linear-gradient(135deg, #087f94, #00aeca) !important;
  box-shadow: 0 8px 20px rgba(0, 150, 180, 0.24) !important;
}

html:not(.dark) #maplestory-root .maple-ai-check-button:hover {
  background: linear-gradient(135deg, #076f82, #009bb6) !important;
}

html:not(.dark) #maplestory-root .maple-ai-check-button:disabled {
  opacity: 0.58;
}

html:not(.dark) #maplestory-root .maple-link-summary {
  background: linear-gradient(135deg, rgba(255, 247, 220, 0.94), rgba(250, 252, 245, 0.94)) !important;
  border-color: rgba(184, 124, 0, 0.32) !important;
}

html:not(.dark) #maplestory-root .maple-link-summary-item {
  background: rgba(255, 255, 255, 0.88) !important;
  border-color: rgba(184, 124, 0, 0.2) !important;
}

html:not(.dark) #maplestory-root .maple-link-card {
  background: rgba(249, 253, 255, 0.94) !important;
  border-color: rgba(36, 94, 112, 0.22) !important;
}

html:not(.dark) #maplestory-root .maple-link-card.is-owned {
  background: rgba(255, 251, 232, 0.94) !important;
  border-color: rgba(211, 145, 8, 0.48) !important;
}

html:not(.dark) #maplestory-root .maple-link-level {
  color: #704900 !important;
  background: rgba(245, 201, 94, 0.9) !important;
}

html:not(.dark) #maplestory-root .maple-link-owned-name {
  color: #8a5a00 !important;
}

html:not(.dark) #maplestory-root .maple-link-own-badge {
  color: #704900 !important;
  background: rgba(255, 232, 170, 0.96) !important;
  border-color: rgba(184, 124, 0, 0.34) !important;
}

html:not(.dark) #maplestory-root .maple-artifact-summary {
  background: linear-gradient(135deg, rgba(235, 247, 252, 0.96), rgba(244, 239, 255, 0.94)) !important;
  border-color: rgba(106, 65, 170, 0.3) !important;
}
</style>
