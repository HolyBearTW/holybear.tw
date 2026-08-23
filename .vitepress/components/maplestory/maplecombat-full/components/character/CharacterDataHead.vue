<script setup lang="ts">
// 戰鬥力/實戰資料分頁列 + 職業選擇 + 資料複製，併入主要能力值卡片頂部。
import { computed, ref } from 'vue'
import { useUiStore, type CalculatorMode } from '@maplecombat/stores/ui'
import { useCharacterStore } from '@maplecombat/stores/character'
import { useStateSlotsStore, type StateSlotId } from '@maplecombat/stores/stateSlots'
import JobCombobox from './JobCombobox.vue'
import StatPreviewDialog from './StatPreviewDialog.vue'
import CustomSelect from './shared/CustomSelect.vue'

const ui = useUiStore()
const store = useCharacterStore()
const slots = useStateSlotsStore()

const copiedButton = ref<'eff' | 'combat' | null>(null)
const previewOpen = ref(false)
let copyResetTimer = 0

const scenarioOptions = computed(() =>
  slots.workspace.states.map((state) => ({ value: state.id, label: state.name })),
)
const selectedScenario = computed({
  get: () => (slots.workspace.activeSlot === 'weighted' ? 'state1' : slots.workspace.activeSlot),
  set: (value: string) => {
    store.activateWorkspaceSlot(value as StateSlotId)
    ui.calculatorMode = 'effStats'
  },
})

function showCopied(which: 'eff' | 'combat') {
  copiedButton.value = which
  window.clearTimeout(copyResetTimer)
  copyResetTimer = window.setTimeout(() => {
    copiedButton.value = null
  }, 1500)
}

function copyEffToCombat() {
  store.copyEffDataToCombat()
  showCopied('eff')
}

function copyCombatToEff() {
  store.copyCombatDataToEff()
  showCopied('combat')
}

function switchMode(mode: CalculatorMode) {
  if (mode === 'effStats' && slots.isWeightedActive) store.activateWorkspaceSlot('state1')
  ui.calculatorMode = mode
}
</script>

<template>
  <div class="stat-card-head">
    <div class="stat-card-head-mode-row">
      <div class="mode-tabs">
        <button
          class="mode-tab"
          :class="{ active: ui.calculatorMode === 'calculator' }"
          data-mode="calculator"
          @click="switchMode('calculator')"
        >
          <span class="mode-tab-main">戰鬥力資料</span>
          <span class="mode-tab-badge">共用</span>
        </button>
        <button
          class="mode-tab"
          :class="{ active: ui.calculatorMode === 'effStats' }"
          data-mode="effStats"
          @click="switchMode('effStats')"
        >
          <span class="mode-tab-main">實戰資料</span>
          <span class="mode-tab-badge" :title="slots.activeLabel">{{ slots.activeLabel }}</span>
        </button>
      </div>
      <div v-if="ui.calculatorMode === 'effStats'" class="scenario-quick-select">
        <span>目前情境</span>
        <CustomSelect
          v-model="selectedScenario"
          :options="scenarioOptions"
          aria-label="切換實戰情境"
          :blur-on-choose="true"
        />
      </div>
      <span class="buff-info character-data-help">
        <button type="button" class="buff-info-trigger" aria-label="資料用途說明"></button>
        <span class="buff-info-tooltip character-data-help-tooltip" role="tooltip">
          <span class="buff-info-lines">
            <span class="buff-info-line">戰鬥力資料：多狀態共用，影響戰鬥力相關計算</span>
            <span class="buff-info-line">實戰資料：各情境獨立，可用「目前情境」直接切換</span>
            <span class="buff-info-line">重新命名、複製或重設情境請到 Buff 與情境的「管理情境」</span>
          </span>
        </span>
      </span>
    </div>
    <p v-if="ui.calculatorMode === 'effStats'" class="scenario-linkage-note">
      <strong>狀態 1～5</strong>
      各自保存「實戰資料、Buff、塔戒」，並用於「加權比較、裝備替換、效率與戒指」計算。
    </p>
    <div class="stat-card-head-controls">
      <div class="stat-card-head-job">
        <JobCombobox />
      </div>
      <div class="stat-card-head-actions">
        <button
          v-show="ui.calculatorMode === 'calculator'"
          id="copyEffToCombatBtn"
          type="button"
          class="data-copy-btn eff-copy-combat-btn"
          :class="{ copied: copiedButton === 'eff' }"
          title="將實戰資料的數值複製到戰鬥力資料對應欄位"
          @click="copyEffToCombat"
        >
          {{ copiedButton === 'eff' ? '已複製 ✓' : '套用實戰資料' }}
        </button>
        <button
          v-show="ui.calculatorMode === 'effStats'"
          id="copyCombatToEffBtn"
          type="button"
          class="data-copy-btn eff-copy-combat-btn"
          :class="{ copied: copiedButton === 'combat' }"
          title="將戰鬥力資料的數值複製到實戰資料對應欄位"
          @click="copyCombatToEff"
        >
          {{ copiedButton === 'combat' ? '已複製 ✓' : '套用戰鬥力資料' }}
        </button>
        <button type="button" class="stat-preview-btn" @click="previewOpen = true">數值總覽</button>
      </div>
    </div>
  </div>
  <StatPreviewDialog
    v-if="previewOpen"
    :initial-mode="ui.calculatorMode"
    @close="previewOpen = false"
  />
</template>
