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
let navSearchObserver = null
const navSearchOriginals = new Map()

function focusCharacterSearch() {
  const input = document.querySelector('#maplestory-root .maple-character-search-input')
  if (!input) return

  input.focus({ preventScroll: true })
  input.select()
  input.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function handleMapleNavSearchClick(event) {
  const target = event.target instanceof Element
    ? event.target.closest('.VPNavBarSearchButton, .DocSearch-Button')
    : null
  if (!target) return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
  focusCharacterSearch()
}

function handleMapleNavSearchShortcut(event) {
  const target = event.target
  const isEditing = target instanceof HTMLElement && (
    target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
  )
  const isCommandK = (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k'
  const isSlash = event.key === '/' && !isEditing && !event.ctrlKey && !event.metaKey && !event.altKey
  if (!isCommandK && !isSlash) return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
  focusCharacterSearch()
}

function syncMapleNavSearch() {
  const isDesktop = window.innerWidth >= 768

  document.querySelectorAll('.VPNavBarSearchButton, .DocSearch-Button').forEach((button) => {
    const placeholder = button.querySelector('.text, .DocSearch-Button-Placeholder')
    if (!placeholder) return

    if (!navSearchOriginals.has(button)) {
      navSearchOriginals.set(button, {
        placeholder,
        text: placeholder.textContent,
        ariaLabel: button.getAttribute('aria-label'),
        title: button.getAttribute('title')
      })
    }

    if (!isDesktop) {
      const original = navSearchOriginals.get(button)
      button.classList.remove('maple-character-nav-search')
      // This function also runs from a MutationObserver watching the nav.
      // Avoid replacing the same text node repeatedly, otherwise a docked
      // DevTools window can cross the mobile breakpoint and create an endless
      // observer -> textContent -> observer loop.
      if (placeholder.textContent !== original.text) placeholder.textContent = original.text
      button.setAttribute('aria-label', '搜尋新楓之谷角色')
      button.setAttribute('title', '搜尋新楓之谷角色')
      return
    }

    button.classList.add('maple-character-nav-search')
    button.setAttribute('aria-label', '搜尋新楓之谷角色')
    button.setAttribute('title', '搜尋新楓之谷角色')
    if (placeholder.textContent !== '搜尋角色') placeholder.textContent = '搜尋角色'
  })
}

function restoreMapleNavSearchButton(button) {
  const original = navSearchOriginals.get(button)
  button.classList.remove('maple-character-nav-search')
  if (!original) return

  original.placeholder.textContent = original.text
  if (original.ariaLabel === null) button.removeAttribute('aria-label')
  else button.setAttribute('aria-label', original.ariaLabel)
  if (original.title === null) button.removeAttribute('title')
  else button.setAttribute('title', original.title)
  navSearchOriginals.delete(button)
}

function syncMapleNavContrast() {
  document.body.classList.toggle('maple-nav-over-hero', window.scrollY < 96)
}

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

  syncMapleNavSearch()
  syncMapleNavContrast()
  navSearchObserver = new MutationObserver(syncMapleNavSearch)
  navSearchObserver.observe(document.querySelector('.VPNav') || document.body, {
    childList: true,
    subtree: true,
    characterData: true
  })
  document.addEventListener('click', handleMapleNavSearchClick, true)
  window.addEventListener('keydown', handleMapleNavSearchShortcut, true)
  window.addEventListener('scroll', syncMapleNavContrast, { passive: true })
  window.addEventListener('resize', syncMapleNavSearch, { passive: true })
})

onBeforeUnmount(() => {
  readyObserver?.disconnect()
  readyObserver = null
  if (root) {
    root.unmount()
  }


  navSearchObserver?.disconnect()
  navSearchObserver = null
  document.removeEventListener('click', handleMapleNavSearchClick, true)
  window.removeEventListener('keydown', handleMapleNavSearchShortcut, true)
  window.removeEventListener('scroll', syncMapleNavContrast)
  window.removeEventListener('resize', syncMapleNavSearch)
  document.body.classList.remove('maple-nav-over-hero')

  navSearchOriginals.forEach((original, button) => {
    restoreMapleNavSearchButton(button)
  })
  navSearchOriginals.clear()
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
  --hb-nav-hover-color: #67e8f9;
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

/* The top navigation sits on a dark MapleStory scene in both themes. */
body.maple-nav-over-hero:has(#maplestory-root) .VPNavBar .VPNavBarTitle .title,
body.maple-nav-over-hero:has(#maplestory-root) .VPNavBar .VPNavBarTitle .title *,
body.maple-nav-over-hero:has(#maplestory-root) .VPNavBar .VPNavBarMenuLink,
body.maple-nav-over-hero:has(#maplestory-root) .VPNavBar .VPNavBarMenuLink *,
body.maple-nav-over-hero:has(#maplestory-root) .VPNavBar .VPNavBarMenuGroup > .button,
body.maple-nav-over-hero:has(#maplestory-root) .VPNavBar .VPNavBarMenuGroup > .button *,
body.maple-nav-over-hero:has(#maplestory-root) .VPNavBar .VPNavBarTranslations > .button,
body.maple-nav-over-hero:has(#maplestory-root) .VPNavBar .VPNavBarTranslations > .button *,
body.maple-nav-over-hero:has(#maplestory-root) .VPNavBar .VPSocialLink {
  color: rgba(255, 255, 255, 0.9) !important;
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.42);
}

/* Visual fallback while VitePress is reconciling its desktop search button DOM. */
@media (min-width: 768px) {
  body:has(#maplestory-root) .DocSearch-Button-Placeholder,
  body:has(#maplestory-root) .VPNavBarSearchButton .text {
    font-size: 0 !important;
  }

  body:has(#maplestory-root) .DocSearch-Button-Placeholder::after,
  body:has(#maplestory-root) .VPNavBarSearchButton .text::after {
    content: '搜尋角色';
    font-size: 12px;
  }
}

@media (max-width: 767px) {
  body.maple-nav-over-hero:has(#maplestory-root) .VPNavBarSearchButton,
  body.maple-nav-over-hero:has(#maplestory-root) .VPNavBarSearchButton .vpi-search {
    color: rgba(255, 255, 255, 0.94) !important;
  }

  body.maple-nav-over-hero:has(#maplestory-root) .VPNavBarHamburger .top,
  body.maple-nav-over-hero:has(#maplestory-root) .VPNavBarHamburger .middle,
  body.maple-nav-over-hero:has(#maplestory-root) .VPNavBarHamburger .bottom,
  body.maple-nav-over-hero:has(#maplestory-root) .VPNavBarHamburger.active:hover .top,
  body.maple-nav-over-hero:has(#maplestory-root) .VPNavBarHamburger.active:hover .middle,
  body.maple-nav-over-hero:has(#maplestory-root) .VPNavBarHamburger.active:hover .bottom {
    background-color: rgba(255, 255, 255, 0.94) !important;
  }
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

#maplestory-root .maple-empty-state {
  width: min(100%, 30rem);
  color: #ffffff;
  background: transparent;
  border: 0;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

#maplestory-root .maple-empty-state-icon {
  color: #7dd3fc;
  background: rgba(8, 47, 73, 0.74);
  border: 1px solid rgba(125, 211, 252, 0.28);
  box-shadow: inset 0 0 24px rgba(56, 189, 248, 0.08);
}

#maplestory-root .maple-empty-state h2 {
  color: #f8fafc !important;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.38);
}

#maplestory-root .maple-empty-state p {
  color: #d6e2e8 !important;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.34);
}

#maplestory-root .maple-ranking-panel {
  background: rgba(6, 18, 26, 0.58) !important;
  border-color: rgba(255, 255, 255, 0.14) !important;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.2) !important;
  backdrop-filter: blur(16px) saturate(140%) !important;
  -webkit-backdrop-filter: blur(16px) saturate(140%) !important;
}

#maplestory-root .maple-character-loading-text {
  color: #e2f3f8 !important;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.72);
}

#maplestory-root .maple-ranking-page-input {
  color: #e2e8f0 !important;
  background: transparent !important;
  border-color: rgba(203, 213, 225, 0.46) !important;
  box-shadow: none !important;
  color-scheme: dark;
}

#maplestory-root .maple-ranking-page-input:focus {
  border-color: #818cf8 !important;
  box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.18) !important;
}

#maplestory-root .maple-ranking-crown.is-gold {
  color: #facc15 !important;
  filter: drop-shadow(0 1px 4px rgba(250, 204, 21, 0.34));
}

#maplestory-root .maple-ranking-crown.is-silver {
  color: #cbd5e1 !important;
  filter: drop-shadow(0 1px 4px rgba(203, 213, 225, 0.28));
}

#maplestory-root .maple-ranking-crown.is-bronze {
  color: #d97706 !important;
  filter: drop-shadow(0 1px 4px rgba(217, 119, 6, 0.3));
}

#maplestory-root .maple-union-member-tooltip {
  color: #e2e8f0;
  background: rgba(8, 18, 28, 0.94);
  border-color: rgba(148, 163, 184, 0.34);
  backdrop-filter: blur(14px) saturate(135%);
  -webkit-backdrop-filter: blur(14px) saturate(135%);
}

#maplestory-root .maple-character-search-input {
  background: rgba(6, 18, 26, 0.5) !important;
  border-color: rgba(255, 255, 255, 0.16) !important;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18) !important;
  backdrop-filter: blur(22px) saturate(150%) !important;
  -webkit-backdrop-filter: blur(22px) saturate(150%) !important;
}

#maplestory-root .maple-search-leading-icon {
  z-index: 2;
  color: #7dd3fc !important;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.42));
  pointer-events: none;
}

#maplestory-root form:focus-within .maple-search-leading-icon {
  color: #bae6fd !important;
}

#maplestory-root .maple-date-control {
  padding: 6px 8px 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  background: rgba(6, 18, 26, 0.46);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
}

#maplestory-root .maple-date-control input {
  background: rgba(10, 24, 34, 0.5) !important;
  border-color: rgba(255, 255, 255, 0.14) !important;
  box-shadow: none !important;
}

html:not(.dark) #maplestory-root .maple-empty-state {
  color: var(--maple-light-text);
}

html:not(.dark) #maplestory-root .maple-ranking-panel {
  background: rgba(249, 253, 255, 0.76) !important;
  border-color: rgba(36, 94, 112, 0.22) !important;
  box-shadow: 0 14px 36px rgba(35, 76, 94, 0.14) !important;
}

html:not(.dark) #maplestory-root .maple-character-loading-text {
  color: #082f3e !important;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.78);
}

html:not(.dark) #maplestory-root .maple-ranking-page-input {
  color: #173746 !important;
  background: transparent !important;
  border-color: rgba(36, 94, 112, 0.38) !important;
  color-scheme: light;
}

html:not(.dark) #maplestory-root .maple-ranking-page-input:focus {
  border-color: #087f94 !important;
  box-shadow: 0 0 0 2px rgba(8, 127, 148, 0.14) !important;
}

html:not(.dark) #maplestory-root .maple-ranking-crown.is-gold {
  color: #b77900 !important;
}

html:not(.dark) #maplestory-root .maple-ranking-crown.is-silver {
  color: #64748b !important;
}

html:not(.dark) #maplestory-root .maple-ranking-crown.is-bronze {
  color: #a65313 !important;
}

html:not(.dark) #maplestory-root .maple-character-search-input {
  color: #173746 !important;
  background: rgba(249, 253, 255, 0.68) !important;
  border-color: rgba(36, 94, 112, 0.24) !important;
  box-shadow: 0 10px 28px rgba(35, 76, 94, 0.13) !important;
}

html:not(.dark) #maplestory-root .maple-character-search-input::placeholder {
  color: #365967 !important;
  opacity: 1;
}

html:not(.dark) #maplestory-root .maple-character-search-input + div button[type="submit"] {
  color: #365967 !important;
}

html:not(.dark) #maplestory-root .maple-search-leading-icon {
  color: #087f94 !important;
  filter: none;
}

html:not(.dark) #maplestory-root form:focus-within .maple-search-leading-icon {
  color: #05677a !important;
}

html:not(.dark) #maplestory-root .maple-date-control {
  color: #294b59 !important;
  background: rgba(249, 253, 255, 0.64);
  border-color: rgba(36, 94, 112, 0.22);
  box-shadow: 0 8px 24px rgba(35, 76, 94, 0.12);
  text-shadow: none !important;
}

html:not(.dark) #maplestory-root .maple-date-control input {
  color: #173746 !important;
  background: rgba(255, 255, 255, 0.62) !important;
  border-color: rgba(36, 94, 112, 0.2) !important;
}

html:not(.dark) #maplestory-root .maple-date-control > span {
  color: #082936 !important;
  font-weight: 600;
  text-shadow: none !important;
}

html:not(.dark) #maplestory-root .maple-empty-state-icon {
  color: #087f94;
  background: rgba(214, 241, 246, 0.82);
  border-color: rgba(8, 127, 148, 0.24);
  box-shadow: inset 0 0 24px rgba(8, 127, 148, 0.08);
}

html:not(.dark) #maplestory-root .maple-empty-state h2 {
  color: #031f2b !important;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

html:not(.dark) #maplestory-root .maple-empty-state p {
  color: #0b3444 !important;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.48);
}

html:not(.dark) body:has(#maplestory-root) #maplestory-root .custom-vp-tip {
  color: #294b59 !important;
  background: rgba(249, 253, 255, 0.74) !important;
  border-left-color: #087f94 !important;
  box-shadow: 0 14px 36px rgba(35, 76, 94, 0.14) !important;
  backdrop-filter: blur(24px) saturate(145%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(145%) !important;
}

html:not(.dark) body:has(#maplestory-root) #maplestory-root .custom-vp-tip .font-bold {
  color: #087f94 !important;
}

html:not(.dark) body:has(#maplestory-root) #maplestory-root .custom-vp-tip li,
html:not(.dark) body:has(#maplestory-root) #maplestory-root .custom-vp-tip form,
html:not(.dark) body:has(#maplestory-root) #maplestory-root .custom-vp-tip form button {
  color: #294b59 !important;
}

html:not(.dark) body:has(#maplestory-root) #maplestory-root .custom-vp-tip .font-mono {
  color: #365967 !important;
  font-weight: 600;
}

html:not(.dark) body:has(#maplestory-root) #maplestory-root .custom-vp-tip form button[type="submit"] {
  color: #ffffff !important;
  background: #087f94 !important;
}

html:not(.dark) #maplestory-root .maple-hero-title {
  color: #ffffff !important;
  text-shadow: 0 2px 9px rgba(0, 0, 0, 0.5);
}

html:not(.dark) #maplestory-root .maple-hero-subtitle,
html:not(.dark) #maplestory-root .maple-settings-button {
  color: rgba(255, 255, 255, 0.82) !important;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.48);
}

html:not(.dark) #maplestory-root .maple-ranking-go-button {
  color: #ffffff !important;
  background: #087f94 !important;
  border-color: #087f94 !important;
}

html:not(.dark) #maplestory-root .maple-ranking-go-button:hover {
  color: #ffffff !important;
  background: #056f82 !important;
  border-color: #056f82 !important;
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

html:not(.dark) #maplestory-root .maple-pet-type-badge {
  color: #076f82 !important;
  background: rgba(205, 241, 247, 0.96) !important;
  border-color: rgba(8, 127, 148, 0.3) !important;
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

html:not(.dark) #maplestory-root .maple-aut-heading {
  color: #075f70 !important;
}

html:not(.dark) #maplestory-root .maple-aut-dot {
  background: #087f94 !important;
  box-shadow: 0 0 6px rgba(8, 127, 148, 0.55) !important;
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

html:not(.dark) #maplestory-root .maple-growth-create-button,
html:not(.dark) #maplestory-root .maple-growth-note-button,
html:not(.dark) #maplestory-root .maple-growth-note-button:hover,
html:not(.dark) #maplestory-root .maple-growth-note-button:focus-visible {
  color: #ffffff !important;
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

/* Growth history and Union Raider use the same airy card language as the rest of the tool. */
html:not(.dark) #maplestory-root .maple-growth-history,
html:not(.dark) #maplestory-root .maple-growth-state,
html:not(.dark) #maplestory-root .maple-union-raider {
  background: rgba(249, 253, 255, 0.92) !important;
  border-color: rgba(36, 94, 112, 0.22) !important;
  box-shadow: 0 10px 28px rgba(35, 76, 94, 0.1) !important;
}

html:not(.dark) #maplestory-root .maple-growth-state.is-error {
  color: #b4233d !important;
  background: rgba(255, 239, 242, 0.94) !important;
  border-color: rgba(194, 47, 63, 0.28) !important;
}

html:not(.dark) #maplestory-root .maple-growth-panel,
html:not(.dark) #maplestory-root .maple-union-panel {
  background: rgba(240, 248, 251, 0.82) !important;
  border-color: rgba(36, 94, 112, 0.18) !important;
}

html:not(.dark) #maplestory-root .maple-growth-eta,
html:not(.dark) #maplestory-root .maple-growth-summary-card,
html:not(.dark) #maplestory-root .maple-growth-event-card,
html:not(.dark) #maplestory-root .maple-union-summary,
html:not(.dark) #maplestory-root .maple-union-stat,
html:not(.dark) #maplestory-root .maple-union-member,
html:not(.dark) #maplestory-root .maple-union-board-frame {
  background: rgba(255, 255, 255, 0.9) !important;
  border-color: rgba(36, 94, 112, 0.18) !important;
}

html:not(.dark) #maplestory-root .maple-growth-tooltip {
  color: var(--maple-light-text) !important;
  background: rgba(255, 255, 255, 0.98) !important;
  border-color: rgba(36, 94, 112, 0.28) !important;
  box-shadow: 0 8px 22px rgba(35, 76, 94, 0.16) !important;
}

html:not(.dark) #maplestory-root .maple-growth-range-button.is-current {
  color: #ffffff !important;
  background: #0a9b68 !important;
}

html:not(.dark) #maplestory-root .maple-growth-calendar-cell {
  --tw-ring-color: rgba(36, 94, 112, 0.22) !important;
}

html:not(.dark) #maplestory-root .maple-growth-calendar-cell.is-unavailable {
  background: rgba(207, 223, 229, 0.62) !important;
}

html:not(.dark) #maplestory-root .maple-growth-calendar-cell.is-heat-0 {
  background: rgba(205, 220, 226, 0.78) !important;
}

html:not(.dark) #maplestory-root .maple-growth-calendar-cell.is-heat-1 {
  background: #c7ead8 !important;
}

html:not(.dark) #maplestory-root .maple-growth-calendar-cell.is-heat-2 {
  background: #7fd2a8 !important;
}

html:not(.dark) #maplestory-root .maple-growth-calendar-cell.is-heat-3 {
  background: #32b879 !important;
}

html:not(.dark) #maplestory-root .maple-growth-calendar-cell.is-heat-4 {
  background: #079455 !important;
}

html:not(.dark) #maplestory-root .maple-growth-timeline-node {
  background: #f9fdff !important;
  box-shadow: 0 0 0 4px rgba(249, 253, 255, 1) !important;
}

html:not(.dark) #maplestory-root .maple-growth-timeline-node.is-latest {
  box-shadow: 0 0 0 4px rgba(249, 253, 255, 1), 0 0 12px rgba(16, 150, 105, 0.42) !important;
}

html:not(.dark) #maplestory-root .maple-growth-timeline-line {
  background: linear-gradient(to bottom, #34d399, #10b981 58%, rgba(36, 94, 112, 0.32)) !important;
}

html:not(.dark) #maplestory-root .maple-growth-timeline-connector {
  background: rgba(16, 185, 129, 0.58) !important;
}

html:not(.dark) #maplestory-root .maple-growth-latest-badge {
  color: #087a4b !important;
  background: rgba(205, 245, 222, 0.94) !important;
}

html:not(.dark) #maplestory-root .maple-growth-event-date {
  color: #526b78 !important;
  background: rgba(228, 239, 243, 0.94) !important;
}

html:not(.dark) #maplestory-root .maple-growth-event-before {
  color: #526b78 !important;
  background: rgba(238, 246, 248, 0.96) !important;
  border-color: rgba(36, 94, 112, 0.22) !important;
}

html:not(.dark) #maplestory-root .maple-growth-event-after {
  color: #087a4b !important;
  background: rgba(218, 246, 231, 0.96) !important;
  border-color: rgba(8, 122, 75, 0.3) !important;
}

html:not(.dark) #maplestory-root .maple-union-board {
  background: rgba(220, 234, 239, 0.72) !important;
  border-color: rgba(36, 94, 112, 0.24) !important;
}

html:not(.dark) #maplestory-root .maple-union-board-cell {
  border-color: rgba(36, 94, 112, 0.2) !important;
}

html:not(.dark) #maplestory-root .maple-union-board-cell.is-empty {
  background: rgba(244, 249, 251, 0.86) !important;
}

html:not(.dark) #maplestory-root .maple-union-board-cell.is-highlighted {
  --tw-ring-color: rgba(81, 69, 205, 0.86) !important;
  filter: brightness(1.04) saturate(1.1) !important;
}

html:not(.dark) #maplestory-root .maple-union-hover-label {
  color: #5145cd !important;
  background: rgba(231, 229, 255, 0.94) !important;
}

html:not(.dark) #maplestory-root .maple-union-hover-label span {
  color: #526b78 !important;
}

html:not(.dark) #maplestory-root .maple-union-member-tooltip {
  color: #173746 !important;
  background: rgba(249, 253, 255, 0.96) !important;
  border-color: rgba(36, 94, 112, 0.28) !important;
  box-shadow: 0 10px 28px rgba(35, 76, 94, 0.2) !important;
}

html:not(.dark) #maplestory-root .maple-union-preset {
  color: #526b78 !important;
  background: rgba(237, 247, 250, 0.96) !important;
  border-color: rgba(36, 94, 112, 0.22) !important;
  box-shadow: none !important;
}

html:not(.dark) #maplestory-root .maple-union-preset:not(:disabled):hover {
  color: #087f94 !important;
  background: rgba(213, 242, 247, 0.98) !important;
  border-color: rgba(8, 127, 148, 0.42) !important;
}

html:not(.dark) #maplestory-root .maple-union-preset.is-current {
  color: #ffffff !important;
  background: linear-gradient(135deg, #087f94, #00aeca) !important;
  border-color: rgba(0, 136, 160, 0.72) !important;
  box-shadow: 0 5px 14px rgba(0, 150, 180, 0.25) !important;
}

html:not(.dark) #maplestory-root .maple-union-preset:disabled {
  color: #8aa0aa !important;
  background: rgba(237, 247, 250, 0.58) !important;
  border-color: rgba(36, 94, 112, 0.12) !important;
}

html:not(.dark) #maplestory-root .maple-union-member:hover {
  background: rgba(238, 244, 255, 0.96) !important;
  border-color: rgba(81, 69, 205, 0.32) !important;
}

html:not(.dark) #maplestory-root .maple-union-live-dot {
  border-color: #ffffff !important;
}

html:not(.dark) #maplestory-root .maple-union-rank {
  color: #704900 !important;
  background: rgba(245, 201, 94, 0.72) !important;
}
</style>
