<script setup lang="ts">
// 單一 Buff 項目：圖示 + 勾選框或等級輸入。
import { computed, nextTick, onBeforeUnmount, ref, type CSSProperties } from 'vue'
import type { BuffCategory, BuffDefinition } from '@maplecombat/core/buffs/parse'
import { PASS_SKILL_MAX } from '@maplecombat/core/buffs/delta'
import { useBuffsStore } from '@maplecombat/stores/buffs'
import { buffImageFor } from '@maplecombat/data/buffSource'
import { resolveTooltipPlacement } from './tooltipPosition'

const props = defineProps<{
  buff: BuffDefinition
  category: BuffCategory
}>()

const buffs = useBuffsStore()
const activeLevel = computed(() => buffs.state[props.buff.id] || 0)
// 輸入框只顯示目前實際套用等級；未啟用時固定顯示 0，避免把上游的
// 預設／上次偏好誤認成角色真的擁有或正在使用的 Lv.4、Lv.5 等能力。
const level = computed(() => activeLevel.value)
const activationLevel = computed(() =>
  buffs.preferredLevel(props.buff.id) || props.buff.defaultLevel || props.buff.minLevel,
)
const isOn = computed(() => activeLevel.value > 0)
const passSelectedCount = computed(() =>
  Object.entries(buffs.state).filter(([id, value]) => id.startsWith('pass:') && value > 0).length,
)
const passLimitReached = computed(
  () => props.buff.id.startsWith('pass:') && !isOn.value && passSelectedCount.value >= PASS_SKILL_MAX,
)
const imageSrc = computed(() => buffImageFor(props.category.key, props.buff.name))
const tooltipStyle = ref<CSSProperties>({ visibility: 'hidden' })
const tooltipRef = ref<HTMLElement | null>(null)
const tooltipVisible = ref(false)
const tooltipPlacement = ref<'above' | 'below'>('above')
let tooltipHideTimer: number | undefined
const effectKind = computed(() => {
  const abilities = props.buff.levels[activationLevel.value] || []
  const hasActive = abilities.some((ability) => ability.active)
  const hasPassive = abilities.some((ability) => !ability.active)
  if (hasActive && hasPassive) return '被動＋主動／條件效果'
  if (hasActive) return '主動／條件觸發效果'
  if (hasPassive) return '被動效果'
  return ''
})
const tooltip = computed(() => {
  const label = props.buff.displayName || props.buff.name
  const baseDetail = props.buff.nonPermanent && (props.buff.note || props.buff.infoNote)
    ? `${label}・${props.buff.note || props.buff.infoNote}`
    : label
  const detail = effectKind.value ? `${baseDetail}・${effectKind.value}` : baseDetail
  if (passLimitReached.value) return `${detail}・傳授技能已達 ${PASS_SKILL_MAX} 個上限，請先取消另一項`
  if (!buffs.isApiDetected(props.buff.id)) return detail
  const apiLevel = props.buff.type === 'level' ? ` Lv.${activationLevel.value}` : ''
  return `${detail}・API 確認可用${apiLevel}，目前${isOn.value ? '已套用' : '未啟用'}；點圖示${isOn.value ? '取消' : '加入'}試算`
})

function onIconClick(event: MouseEvent) {
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) {
    void positionTooltip(event, true)
  }
  if (passLimitReached.value) return
  buffs.toggle(props.buff.id)
}

async function positionTooltip(event: MouseEvent, autoHide = false) {
  const anchor = event.currentTarget as HTMLElement
  window.clearTimeout(tooltipHideTimer)
  tooltipStyle.value = {
    position: 'fixed',
    left: '0',
    top: '0',
    right: 'auto',
    bottom: 'auto',
    transform: 'none',
    visibility: 'hidden',
  }
  tooltipVisible.value = true
  await nextTick()

  const tooltipElement = tooltipRef.value
  if (!tooltipElement) return
  if (typeof tooltipElement.showPopover === 'function' && !tooltipElement.matches(':popover-open')) {
    tooltipElement.showPopover()
  }

  const rect = anchor.getBoundingClientRect()
  const viewportPadding = 8
  const boundary = {
    left: viewportPadding,
    right: window.innerWidth - viewportPadding,
    top: viewportPadding,
    bottom: window.innerHeight - viewportPadding,
  }
  const measured = tooltipElement.getBoundingClientRect()
  tooltipPlacement.value = resolveTooltipPlacement(
    rect,
    boundary,
    measured.height,
    6,
  )
  const desiredLeft = rect.left + rect.width / 2 - measured.width / 2
  const left = Math.max(boundary.left, Math.min(boundary.right - measured.width, desiredLeft))
  const top = tooltipPlacement.value === 'above'
    ? Math.max(boundary.top, rect.top - measured.height - 6)
    : Math.min(boundary.bottom - measured.height, rect.bottom + 6)
  tooltipStyle.value = {
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
    right: 'auto',
    bottom: 'auto',
    transform: 'none',
    visibility: 'visible',
  } as CSSProperties
  if (autoHide) tooltipHideTimer = window.setTimeout(hideTooltip, 3200)
}

function hideTooltip() {
  window.clearTimeout(tooltipHideTimer)
  tooltipVisible.value = false
  if (tooltipRef.value?.matches(':popover-open')) tooltipRef.value.hidePopover()
}

onBeforeUnmount(hideTooltip)

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
    :data-api-detected="buffs.isApiDetected(buff.id) || undefined"
  >
    <div
      class="buff-icon-wrap"
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
        :style="tooltipStyle"
        popover="manual"
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
        :disabled="passLimitReached"
        inputmode="numeric"
        :aria-label="buff.name"
        :title="buffs.isApiDetected(buff.id) && !isOn ? `API 確認可用 Lv.${activationLevel}；目前未啟用` : undefined"
        @input="onLevelInput"
        @change="onLevelChange"
      />
      <span v-if="buffs.isApiDetected(buff.id)" class="buff-api-detected" title="API 確認已學會或已裝備；不代表效果正在啟用">
        可用
      </span>
    </div>
  </div>
</template>
