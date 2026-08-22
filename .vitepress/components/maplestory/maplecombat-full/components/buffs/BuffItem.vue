<script setup lang="ts">
// 單一 Buff 項目：圖示 + 勾選框或等級輸入。
import { computed, nextTick, ref, type CSSProperties } from 'vue'
import type { BuffCategory, BuffDefinition } from '@maplecombat/core/buffs/parse'
import { useBuffsStore } from '@maplecombat/stores/buffs'
import { buffImageFor } from '@maplecombat/data/buffSource'
import { resolveTooltipPlacement, resolveTooltipShift } from './tooltipPosition'

const props = defineProps<{
  buff: BuffDefinition
  category: BuffCategory
}>()

const buffs = useBuffsStore()
const level = computed(() => buffs.state[props.buff.id] ?? props.buff.defaultLevel)
const isOn = computed(() => level.value > 0)
const imageSrc = computed(() => buffImageFor(props.category.key, props.buff.name))
const tooltipStyle = ref<CSSProperties>({})
const tooltipRef = ref<HTMLElement | null>(null)
const tooltipVisible = ref(false)
const tooltipPlacement = ref<'above' | 'below'>('above')
const tooltip = computed(() => {
  const label = props.buff.displayName || props.buff.name
  return props.buff.nonPermanent && (props.buff.note || props.buff.infoNote)
    ? `${label}・${props.buff.note || props.buff.infoNote}`
    : label
})

function onIconClick() {
  if (props.buff.type !== 'check') return
  buffs.toggle(props.buff.id)
}

async function positionTooltip(event: MouseEvent) {
  const anchor = event.currentTarget as HTMLElement
  tooltipVisible.value = true
  tooltipPlacement.value = 'above'
  tooltipStyle.value = { '--buff-tooltip-shift': '-50%' } as CSSProperties
  await nextTick()

  const tooltipElement = tooltipRef.value
  if (!tooltipElement) return

  const rect = anchor.getBoundingClientRect()
  const pageZoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1
  const viewportPadding = 8
  const boundaryElement = anchor.closest<HTMLElement>('.buff-overlay-body, .buff-panel')
  const boundary = boundaryElement?.getBoundingClientRect()
  const boundaryLeft = Math.max(viewportPadding, (boundary?.left ?? 0) + viewportPadding)
  const boundaryRight = Math.min(
    window.innerWidth - viewportPadding,
    (boundary?.right ?? window.innerWidth) - viewportPadding,
  )
  const boundaryTop = Math.max(viewportPadding, (boundary?.top ?? 0) + viewportPadding)
  const boundaryBottom = Math.min(
    window.innerHeight - viewportPadding,
    (boundary?.bottom ?? window.innerHeight) - viewportPadding,
  )
  const tooltipHeight = tooltipElement.getBoundingClientRect().height
  tooltipPlacement.value = resolveTooltipPlacement(
    rect,
    { left: boundaryLeft, right: boundaryRight, top: boundaryTop, bottom: boundaryBottom },
    tooltipHeight,
    6 * pageZoom,
  )
  await nextTick()

  const tooltipRect = tooltipElement.getBoundingClientRect()
  const shiftPixels =
    resolveTooltipShift(tooltipRect, {
      left: boundaryLeft,
      right: boundaryRight,
      top: boundaryTop,
      bottom: boundaryBottom,
    }) / pageZoom
  tooltipStyle.value = {
    '--buff-tooltip-shift': `calc(-50% + ${shiftPixels}px)`,
  } as CSSProperties
}

function hideTooltip() {
  tooltipVisible.value = false
}

function onCheckChange(event: Event) {
  buffs.setLevel(props.buff.id, (event.target as HTMLInputElement).checked ? 1 : 0)
}

function onLevelInput(event: Event) {
  const raw = parseInt((event.target as HTMLInputElement).value, 10)
  if (isNaN(raw)) return // 允許暫時空白，blur 時再修正
  buffs.setLevelUnclamped(props.buff.id, raw)
}

function onLevelChange(event: Event) {
  const el = event.target as HTMLInputElement
  buffs.setLevel(props.buff.id, el.value)
  el.value = String(buffs.state[props.buff.id])
}
</script>

<template>
  <div
    class="buff-item"
    :class="{
      'buff-item--on': isOn,
      'buff-item--non-permanent': buff.nonPermanent,
    }"
    :data-buff-id="buff.id"
    :data-buff-type="buff.type"
  >
    <div
      class="buff-icon-wrap"
      :style="tooltipStyle"
      @mouseenter="positionTooltip"
      @mouseleave="hideTooltip"
      @mousedown.prevent
      @click="onIconClick"
    >
      <img v-if="imageSrc" class="buff-icon" :src="imageSrc" :alt="buff.name" draggable="false" />
      <span v-else class="buff-icon buff-icon--missing" role="img" :aria-label="buff.name"></span>
      <span
        v-show="tooltipVisible"
        ref="tooltipRef"
        class="buff-name-tooltip"
        :class="`buff-name-tooltip--${tooltipPlacement}`"
        role="tooltip"
      >
        {{ tooltip }}
      </span>
    </div>
    <div class="buff-control" :class="`buff-control--${buff.type}`">
      <input
        v-if="buff.type === 'check'"
        class="buff-check"
        type="checkbox"
        :data-buff-id="buff.id"
        :checked="isOn"
        :aria-label="buff.name"
        @change="onCheckChange"
      />
      <input
        v-else
        class="buff-level"
        type="number"
        :data-buff-id="buff.id"
        min="0"
        :max="buff.maxLevel"
        :value="level"
        inputmode="numeric"
        :aria-label="buff.name"
        @input="onLevelInput"
        @change="onLevelChange"
      />
    </div>
  </div>
</template>
