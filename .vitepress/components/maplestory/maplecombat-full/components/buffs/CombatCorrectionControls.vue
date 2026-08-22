<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useBuffsStore } from '@maplecombat/stores/buffs'
import { useCharacterStore } from '@maplecombat/stores/character'
import {
  applicableCombatCorrectionKeys,
  type CombatCorrectionKey,
} from '@maplecombat/core/combatCorrections'
import { resolveTooltipShift } from './tooltipPosition'

const buffs = useBuffsStore()
const character = useCharacterStore()
const rootRef = ref<HTMLElement | null>(null)
const inlineRef = ref<HTMLElement | null>(null)
const compactMode = ref(false)
const compactOpen = ref(false)
const activeTooltipId = ref<string | null>(null)
let headerResizeObserver: ResizeObserver | null = null

const LAYOUT_SAFETY_PX = 12
const DEFAULT_HEADER_GAP_PX = 8

const correctionMeta: Record<CombatCorrectionKey, { label: string; tooltip: string }> = {
  mentor: {
    label: '師徒系統校正',
    tooltip: '師徒能力計入含Buff戰鬥力(原始戰鬥力未計入)',
  },
  empress: {
    label: '女皇祝福校正',
    tooltip: '女皇祝福計入含Buff戰鬥力(海外職業原始戰鬥力未計入)',
  },
  genesis: {
    label: '創世武器校正',
    tooltip: '武器攻擊校正基準更正為與原廠職業相同',
  },
}

const applicableKeys = computed(() =>
  applicableCombatCorrectionKeys(
    character.selectedJob,
    String(character.fields.weaponSet ?? ''),
  ),
)
const selectedCount = computed(
  () => applicableKeys.value.filter((key) => buffs.combatCorrections[key]).length,
)

function cssPixels(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function measureLayout(): void {
  const root = rootRef.value
  const inline = inlineRef.value
  const header = root?.closest<HTMLElement>('.buff-head')
  if (!root || !inline || !header) return

  const title = header.querySelector<HTMLElement>('.buff-head-title')
  const actions = header.querySelector<HTMLElement>('.buff-master-actions')
  const count = header.querySelector<HTMLElement>('.buff-head-count')
  const collapse = header.querySelector<HTMLElement>('.buff-collapse-toggle')
  if (!title || !actions || !count || !collapse) return

  const headerStyle = getComputedStyle(header)
  const gap = cssPixels(headerStyle.columnGap) || DEFAULT_HEADER_GAP_PX
  const availableWidth =
    header.getBoundingClientRect().width -
    cssPixels(headerStyle.paddingLeft) -
    cssPixels(headerStyle.paddingRight)
  const contentWidths = [title, inline, actions, count, collapse].map(
    (element) => element.getBoundingClientRect().width,
  )
  const requiredWidth =
    contentWidths.reduce((total, width) => total + width, 0) +
    gap * (contentWidths.length - 1) +
    LAYOUT_SAFETY_PX
  const nextCompactMode = requiredWidth > availableWidth

  if (nextCompactMode !== compactMode.value) {
    compactMode.value = nextCompactMode
    activeTooltipId.value = null
  }
  if (!nextCompactMode) compactOpen.value = false
}

function scheduleLayoutMeasure(): void {
  void nextTick(measureLayout)
}

function correctionTooltipId(location: 'inline' | 'compact', key: CombatCorrectionKey): string {
  return `${location}-${key}`
}

function correctionTooltipDomId(location: 'inline' | 'compact', key: CombatCorrectionKey): string {
  return `combat-correction-${correctionTooltipId(location, key)}-tooltip`
}

async function positionCorrectionTooltip(
  location: 'inline' | 'compact',
  key: CombatCorrectionKey,
  event: MouseEvent | FocusEvent,
): Promise<void> {
  const tooltipId = correctionTooltipId(location, key)
  const anchor = event.currentTarget as HTMLElement
  activeTooltipId.value = tooltipId
  anchor.style.setProperty('--buff-tooltip-shift', '-50%')
  await nextTick()
  if (activeTooltipId.value !== tooltipId) return

  const tooltipElement = anchor.querySelector<HTMLElement>('.buff-correction-tooltip')
  if (!tooltipElement) return

  const pageZoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1
  const viewportPadding = 8
  const tooltipRect = tooltipElement.getBoundingClientRect()
  const shiftPixels =
    resolveTooltipShift(tooltipRect, {
      left: viewportPadding,
      right: window.innerWidth - viewportPadding,
      top: 0,
      bottom: window.innerHeight,
    }) / pageZoom
  anchor.style.setProperty('--buff-tooltip-shift', `calc(-50% + ${shiftPixels}px)`)
}

function hideCorrectionTooltip(location: 'inline' | 'compact', key: CombatCorrectionKey): void {
  if (activeTooltipId.value === correctionTooltipId(location, key)) activeTooltipId.value = null
}

function toggleCompactMenu(): void {
  compactOpen.value = !compactOpen.value
  if (!compactOpen.value) activeTooltipId.value = null
}

function onDocumentPointerDown(event: MouseEvent) {
  if (compactOpen.value && rootRef.value && !event.composedPath().includes(rootRef.value)) {
    compactOpen.value = false
    activeTooltipId.value = null
  }
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    compactOpen.value = false
    activeTooltipId.value = null
  }
}

function onCorrectionChange(key: CombatCorrectionKey, event: Event) {
  buffs.setCombatCorrection(key, (event.target as HTMLInputElement).checked)
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('resize', scheduleLayoutMeasure)

  const header = rootRef.value?.closest<HTMLElement>('.buff-head')
  if (header && typeof ResizeObserver !== 'undefined') {
    headerResizeObserver = new ResizeObserver(measureLayout)
    headerResizeObserver.observe(header)
  }
  scheduleLayoutMeasure()
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('resize', scheduleLayoutMeasure)
  headerResizeObserver?.disconnect()
})

watch(
  applicableKeys,
  () => {
    compactOpen.value = false
    activeTooltipId.value = null
    scheduleLayoutMeasure()
  },
  { flush: 'sync' },
)
</script>

<template>
  <span
    ref="rootRef"
    class="buff-correction-controls"
    :class="{ 'is-compact': compactMode }"
    :data-option-count="applicableKeys.length"
  >
    <span ref="inlineRef" class="buff-correction-inline" aria-label="戰鬥力校正">
      <button
        v-for="key in applicableKeys"
        :key="key"
        type="button"
        class="buff-correction-chip"
        :class="{ 'is-active': buffs.combatCorrections[key] }"
        :aria-label="correctionMeta[key].label"
        :aria-describedby="correctionTooltipDomId('inline', key)"
        :aria-pressed="buffs.combatCorrections[key]"
        @mouseenter="positionCorrectionTooltip('inline', key, $event)"
        @mouseleave="hideCorrectionTooltip('inline', key)"
        @focus="positionCorrectionTooltip('inline', key, $event)"
        @blur="hideCorrectionTooltip('inline', key)"
        @click="buffs.toggleCombatCorrection(key)"
      >
        <span class="buff-correction-chip-label">{{ correctionMeta[key].label }}</span>
        <span
          v-show="activeTooltipId === correctionTooltipId('inline', key)"
          :id="correctionTooltipDomId('inline', key)"
          class="buff-name-tooltip buff-correction-tooltip buff-name-tooltip--above"
          role="tooltip"
        >
          {{ correctionMeta[key].tooltip }}
        </span>
      </button>
    </span>

    <button
      type="button"
      class="buff-correction-compact-trigger"
      aria-controls="combatCorrectionMenu"
      :aria-expanded="compactMode && compactOpen"
      @click="toggleCompactMenu"
    >
      校正 {{ selectedCount }}/{{ applicableKeys.length }}
    </button>
    <span
      v-show="compactMode && compactOpen"
      id="combatCorrectionMenu"
      class="buff-correction-popover"
      role="group"
      aria-label="戰鬥力校正選項"
    >
      <label
        v-for="key in applicableKeys"
        :key="key"
        class="buff-correction-option"
        @mouseenter="positionCorrectionTooltip('compact', key, $event)"
        @mouseleave="hideCorrectionTooltip('compact', key)"
        @focusin="positionCorrectionTooltip('compact', key, $event)"
        @focusout="hideCorrectionTooltip('compact', key)"
      >
        <input
          class="buff-correction-checkbox"
          type="checkbox"
          :checked="buffs.combatCorrections[key]"
          :aria-label="correctionMeta[key].label"
          :aria-describedby="correctionTooltipDomId('compact', key)"
          @change="onCorrectionChange(key, $event)"
        />
        <span class="buff-correction-option-label">{{ correctionMeta[key].label }}</span>
        <span
          v-show="activeTooltipId === correctionTooltipId('compact', key)"
          :id="correctionTooltipDomId('compact', key)"
          class="buff-name-tooltip buff-correction-tooltip buff-name-tooltip--above"
          role="tooltip"
        >
          {{ correctionMeta[key].tooltip }}
        </span>
      </label>
    </span>
  </span>
</template>
