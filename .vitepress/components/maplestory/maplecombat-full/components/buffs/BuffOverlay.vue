<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, type CSSProperties } from 'vue'
import { useBuffsStore } from '@maplecombat/stores/buffs'
import { useUiStore } from '@maplecombat/stores/ui'
import BuffPanel from './BuffPanel.vue'
import SoulOrbControl from './SoulOrbControl.vue'

const props = defineProps<{
  panelId: string
  returnFocus?: HTMLElement | null
}>()

const ui = useUiStore()
const buffs = useBuffsStore()
const dialogRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)
const dialogStyle = ref<CSSProperties>({})
let previousBodyOverflow = ''
let previousBodyPaddingRight = ''
let previousHtmlOverflow = ''
let bodyLocked = false

function getFocusableElements() {
  if (!dialogRef.value) return []
  return Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null)
}

function restoreBodyScroll() {
  if (!bodyLocked) return
  document.body.style.overflow = previousBodyOverflow
  document.body.style.paddingRight = previousBodyPaddingRight
  document.documentElement.style.overflow = previousHtmlOverflow
  bodyLocked = false
}

function updateDialogSize() {
  const pageZoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1
  // 寬度連續變化（窄視窗貼邊、寬視窗上限 560），避免在 720px 斷點瞬間跳寬/跳高。
  const targetWidth = Math.min(560, window.innerWidth - 28)
  const targetHeight = window.innerHeight - 64
  // 高度依內容自動縮放（只到靈魂寶珠），以視窗高度為上限；內容超出才捲動。
  dialogStyle.value = {
    width: `${Math.max(320, targetWidth) / pageZoom}px`,
    maxHeight: `${Math.max(320, targetHeight) / pageZoom}px`,
  }
}

function closeOverlay() {
  restoreBodyScroll()
  ui.buffDrawerOpen = false
  nextTick(() => props.returnFocus?.focus())
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeOverlay()
    return
  }
  if (event.key !== 'Tab') return

  const focusable = getFocusableElements()
  if (focusable.length === 0) {
    event.preventDefault()
    dialogRef.value?.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

onMounted(() => {
  previousBodyOverflow = document.body.style.overflow
  previousBodyPaddingRight = document.body.style.paddingRight
  previousHtmlOverflow = document.documentElement.style.overflow
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
  document.body.style.overflow = 'hidden'
  document.documentElement.style.overflow = 'hidden'
  if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
  bodyLocked = true
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', updateDialogSize, { passive: true })
  updateDialogSize()
  nextTick(() => closeButtonRef.value?.focus())
})

onBeforeUnmount(() => {
  restoreBodyScroll()
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updateDialogSize)
})
</script>

<template>
  <div class="maplecombat-embedded-overlay-root">
    <div class="buff-overlay-backdrop" @mousedown.self="closeOverlay">
      <section
        ref="dialogRef"
        class="buff-overlay"
        :style="dialogStyle"
        role="dialog"
        aria-modal="true"
        aria-labelledby="buff-overlay-title"
        tabindex="-1"
      >
        <header class="buff-overlay-head">
          <h2 id="buff-overlay-title">選擇 Buff</h2>
          <div class="buff-overlay-actions">
            <button
              type="button"
              class="buff-master-btn"
              :disabled="buffs.matchesDefaultForMode('eff')"
              @click="buffs.resetDefaultsForMode('eff')"
            >
              套用預設
            </button>
            <button type="button" class="buff-master-btn" @click="buffs.clearAllForMode('eff')">
              全部清除
            </button>
            <button
              ref="closeButtonRef"
              type="button"
              class="buff-overlay-close"
              aria-label="關閉選擇 Buff"
              @click="closeOverlay"
            >
              <svg
                class="buff-overlay-close-icon"
                viewBox="0 0 12 12"
                aria-hidden="true"
                focusable="false"
              >
                <line x1="2" y1="2" x2="10" y2="10" />
                <line x1="10" y1="2" x2="2" y2="10" />
              </svg>
            </button>
          </div>
        </header>

        <div class="buff-overlay-body">
          <section class="buff-overlay-soul-orb">
            <span class="buff-section-title">靈魂寶珠</span>
            <SoulOrbControl mode="eff" />
          </section>
          <BuffPanel mode="eff" embedded :panel-id="panelId" />
        </div>
      </section>
    </div>
  </div>
</template>
