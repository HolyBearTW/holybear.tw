<script setup lang="ts">
// Buff 選擇面板（combat = 全部；eff = 僅含主動效果的 Buff）。
import { computed, ref, watch, type CSSProperties } from 'vue'
import { useBuffsStore } from '@maplecombat/stores/buffs'
import { useCharacterStore } from '@maplecombat/stores/character'
import { useUiStore } from '@maplecombat/stores/ui'
import { applicableCombatCorrectionKeys } from '@maplecombat/core/combatCorrections'
import { LEGACY_SOUL_SKILL_IDS } from '@maplecombat/core/buffs/delta'
import type { BuffCategory, BuffDefinition } from '@maplecombat/core/buffs/parse'
import BuffItem from './BuffItem.vue'
import CombatCorrectionControls from './CombatCorrectionControls.vue'
import SoulOrbControl from './SoulOrbControl.vue'
import SoulWeaponControl from './SoulWeaponControl.vue'
import ContextGuide from '@maplecombat/components/layout/ContextGuide.vue'

const props = withDefaults(
  defineProps<{
    mode: 'combat' | 'eff'
    embedded?: boolean
    panelId?: string
  }>(),
  { embedded: false, panelId: '' },
)
const buffs = useBuffsStore()
const character = useCharacterStore()
const ui = useUiStore()

interface BuffSection {
  key: string
  title: string
  category: BuffCategory
  buffs: BuffDefinition[]
  nonPermanent?: boolean
}

const visibleSections = computed<BuffSection[]>(() => {
  const sections: BuffSection[] = []
  const embeddedNonPermanentSections: BuffSection[] = []
  buffs.table.categories.forEach((category) => {
    let list =
      props.mode === 'eff' ? category.buffs.filter((buff) => buff.hasActive) : category.buffs
    list = [...list].sort(
      (left, right) => (left.type === 'level' ? 0 : 1) - (right.type === 'level' ? 0 : 1),
    )

    const regular = list.filter((buff) => !buff.nonPermanent)
    const nonPermanent = list.filter((buff) => buff.nonPermanent)
    if (regular.length) {
      sections.push({ key: category.key, title: category.title, category, buffs: regular })
    }
    if (nonPermanent.length) {
      const section = {
        key: `${category.key}-non-permanent`,
        title: category.key === 'skill' ? '非常駐技能' : `${category.title}・非常駐`,
        category,
        buffs: nonPermanent,
        nonPermanent: true,
      }
      if (props.embedded) embeddedNonPermanentSections.push(section)
      else sections.push(section)
    }
  })
  return props.embedded ? [...embeddedNonPermanentSections, ...sections] : sections
})

// 桌面緊湊版：整個面板一鍵收合，標題列常駐顯示已選數量
const selectedCount = computed(() =>
  visibleSections.value.reduce(
    (n, section) => n + section.buffs.filter((buff) => (buffs.state[buff.id] || 0) > 0).length,
    0,
  ),
)
const showLegacySoulOrb = computed(() =>
  LEGACY_SOUL_SKILL_IDS.some((id) => (buffs.state[id] || 0) > 0),
)
watch(showLegacySoulOrb, (legacyEnabled) => {
  if (legacyEnabled && character.fields.soulWeaponEnabled === true) {
    character.setField('soulWeaponEnabled', false)
  }
})
const bodyVisible = computed(() => props.embedded || ui.buffPanelOpen)
const panelId = computed(
  () => props.panelId || (props.mode === 'combat' ? 'buffPanelCombat' : 'buffPanelEff'),
)
const applicableCorrections = computed(() =>
  props.mode === 'combat'
    ? applicableCombatCorrectionKeys(
        character.selectedJob,
        String(character.fields.weaponSet ?? ''),
      )
    : [],
)
const matchesModeDefault = computed(() =>
  buffs.matchesDefaultForMode(props.mode, applicableCorrections.value),
)
const buffInfoStyle = ref<CSSProperties>({})

function positionBuffInfo(event: Event) {
  const anchor = event.currentTarget as HTMLElement
  const trigger = anchor.querySelector<HTMLElement>('.buff-info-trigger') ?? anchor
  const tooltipWidth = Math.min(300, window.innerWidth - 24)
  const viewportPadding = 12
  const gap = 8

  if (props.embedded) {
    const triggerRect = trigger.getBoundingClientRect()
    const overlayRect =
      anchor.closest<HTMLElement>('.buff-overlay')?.getBoundingClientRect() ??
      new DOMRect(0, 0, window.innerWidth, window.innerHeight)
    const boundaryRight = overlayRect.right - viewportPadding
    const availableRight = boundaryRight - triggerRect.right - gap
    const boundedTooltipWidth = Math.min(tooltipWidth, Math.max(180, availableRight))
    const availableHeight = Math.max(120, overlayRect.bottom - overlayRect.top - viewportPadding * 2)

    buffInfoStyle.value = {
      position: 'absolute',
      left: `calc(100% + ${gap}px)`,
      right: 'auto',
      top: '50%',
      bottom: 'auto',
      transform: 'translateY(-50%)',
      width: `${boundedTooltipWidth}px`,
      maxWidth: `${Math.max(180, availableRight)}px`,
      maxHeight: `${Math.min(340, availableHeight)}px`,
    }
    return
  }

  const container =
    anchor.closest<HTMLElement>('.buff-section-title') || anchor.closest<HTMLElement>('.buff-head')
  if (!container) return

  const rect = container.getBoundingClientRect()
  const belowTop = rect.bottom + gap
  const belowSpace = window.innerHeight - belowTop - viewportPadding
  const aboveSpace = rect.top - gap - viewportPadding
  const openAbove = belowSpace < 220 && aboveSpace > belowSpace
  const availableHeight = Math.max(120, openAbove ? aboveSpace : belowSpace)
  const pageZoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1

  buffInfoStyle.value = {
    position: 'absolute',
    left: '0',
    right: 'auto',
    width: 'min(300px, calc(100vw - 24px))',
    maxWidth: 'calc(100vw - 24px)',
    maxHeight: `${Math.min(340, availableHeight / pageZoom)}px`,
    top: openAbove ? 'auto' : 'calc(100% + 8px)',
    bottom: openAbove ? 'calc(100% + 8px)' : 'auto',
  }
}

function resetModeDefaults() {
  buffs.resetDefaultsForMode(props.mode, applicableCorrections.value)
}

function clearMode() {
  buffs.clearAllForMode(props.mode)
}
</script>

<template>
  <div :id="panelId" class="buff-panel" :class="{ 'buff-panel--embedded': embedded }">
    <div v-if="!embedded" class="buff-head">
      <span v-if="!embedded" class="buff-head-title">{{
        mode === 'combat' ? '選擇Buff/校正項' : '選擇Buff'
      }}</span>
      <CombatCorrectionControls v-if="mode === 'combat'" />
      <span class="buff-master-actions">
        <button
          type="button"
          class="buff-master-btn"
          :disabled="matchesModeDefault"
          title="套用一般試算預設；公會技能、冠軍庇護與塔戒仍需依角色實際狀況選擇"
          @click="resetModeDefaults"
        >
          套用一般預設
        </button>
        <button type="button" class="buff-master-btn" @click="clearMode">全部清除</button>
      </span>
      <span v-if="!embedded" class="buff-head-count">Buff {{ selectedCount }}</span>
      <button
        v-if="!embedded"
        type="button"
        class="buff-collapse-toggle"
        :aria-expanded="ui.buffPanelOpen"
        @click="ui.buffPanelOpen = !ui.buffPanelOpen"
      >
        <span
          class="buff-collapse-chevron"
          :class="{ 'is-expanded': ui.buffPanelOpen }"
          aria-hidden="true"
        ></span>
        <span>{{ ui.buffPanelOpen ? '收合' : '展開' }}</span>
      </button>
    </div>

    <ContextGuide v-if="!embedded && bodyVisible" title="Buff 要怎麼選？">
      <ul>
        <li>重新帶入角色時所有主動效果都從 0 開始；「可用」只表示 API 找到技能或裝備，不代表正在生效。</li>
        <li>「套用一般預設」不會假設公會技能、冠軍庇護或塔戒等級；這些項目請依角色實際狀況選擇。</li>
        <li>武公、靈魂鬥志、規範戒指與非常駐爆發不視為常駐預設；請放進各自的實戰情境或戒指試算。</li>
        <li>新版靈魂武器會分開計算共鳴攻擊、靈魂烙印與靈魂鬥志；API 有資料時會自動帶入。</li>
        <li>舊版「靈魂寶珠」數值與滿魂攻擊力，只會在武公、艾畢奈亞等舊版靈魂技能啟用時顯示。</li>
      </ul>
    </ContextGuide>

    <div
      v-for="section in visibleSections"
      v-show="bodyVisible"
      :key="section.key"
      class="buff-section"
      :class="{ 'buff-section--non-permanent': section.nonPermanent }"
    >
      <div class="buff-section-title">
        {{ section.title }}
        <span
          v-if="section.category.key === 'pass'"
          class="buff-info buff-pass-info"
          @mouseenter="positionBuffInfo"
          @focusin="positionBuffInfo"
        >
          <button
            type="button"
            class="buff-info-trigger"
            aria-label="傳授技能等效數值說明"
          ></button>
          <span class="buff-info-tooltip" role="tooltip" :style="buffInfoStyle">
            <span class="buff-info-title">非常駐傳授技能占比換算</span>
            <span class="buff-info-summary"
              >靈魂契約依占比60%換算，其餘依「持續時間/冷卻時間」為占比換算。</span
            >
          </span>
        </span>
      </div>
      <div class="buff-grid">
        <BuffItem
          v-for="buff in section.buffs"
          :key="buff.id"
          :buff="buff"
          :category="section.category"
        />
      </div>
    </div>

    <div v-if="!embedded" v-show="bodyVisible" class="buff-section buff-section--soul-weapon">
      <div class="buff-section-title">新版靈魂武器</div>
      <SoulWeaponControl />
    </div>

    <div
      v-if="!embedded && showLegacySoulOrb"
      v-show="bodyVisible"
      class="buff-section buff-section--soul-orb"
    >
      <div class="buff-section-title">舊版靈魂寶珠</div>
      <SoulOrbControl :mode="mode" />
    </div>
  </div>
</template>
