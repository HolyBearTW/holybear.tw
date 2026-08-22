<script setup lang="ts">
// 數值換算分頁。
// 三個基準面板（可選基準項目與單位），列出各屬性的等效換算值。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCharacterStore } from '@maplecombat/stores/character'
import { useBuffsStore } from '@maplecombat/stores/buffs'
import { useCheckboxField } from '@maplecombat/composables/useField'
import {
  buildTowerRingScenarioState,
  getTowerRingGains,
  MUGONG_BUFF_ID,
  TOWER_RING_COVERAGE,
  TOWER_RING_EQUIVALENT_ID,
  TOWER_RING_IDS,
} from '@maplecombat/core/buffs/towerRing'
import type { BuffComputeContext } from '@maplecombat/core/buffs/delta'
import towerRingIconGauge from '@maplecombat/assets/buff/技能/規範戒指.png'
import towerRingIconContinuous from '@maplecombat/assets/buff/技能/永續戒指.png'
import BuffSummaryBar from '@maplecombat/components/buffs/BuffSummaryBar.vue'
import CustomSelect from '@maplecombat/components/character/shared/CustomSelect.vue'
import TowerRingShareDialog from './TowerRingShareDialog.vue'
import {
  buildEfficiencyMetrics,
  getEfficiencyActualDelta,
  getVisibleMetricKeys,
  EFFICIENCY_PANEL_DEFAULTS,
  type EfficiencyMetric,
} from '@maplecombat/core/efficiency'
import { effFieldToCombatKey } from '@maplecombat/core/equipmentDelta'
import {
  formatEfficiencyEquivalent,
  formatEfficiencyUnitInput,
  formatPercentDecimals,
} from '@maplecombat/core/format'
import type { FieldValues } from '@maplecombat/core/types'
import ContextGuide from '@maplecombat/components/layout/ContextGuide.vue'

const store = useCharacterStore()
const buffs = useBuffsStore()

const showActualGain = useCheckboxField('effShowActualGain')
const showCombatGain = useCheckboxField('effShowCombatGain')

const metrics = computed(() =>
  buildEfficiencyMetrics({
    effJob: store.effSelectedJob,
    statLabels: store.statLabels,
    unitValues: Object.fromEntries(
      Object.entries(store.fields)
        .filter(([id]) => id.startsWith('effUnit'))
        .map(([id, value]) => [id, +String(value)]),
    ),
  }),
)

const baseOutput = computed(() => store.computeEffOutput(true))
const hasBase = computed(
  () => !!baseOutput.value && baseOutput.value > 0 && isFinite(baseOutput.value),
)

interface MetricResult extends EfficiencyMetric {
  gain: number
  combatGain: number
}

const metricResults = computed<MetricResult[]>(() => {
  const combatBaseValue = showCombatGain.value ? store.powerValue(store.computePower(false)) : 0
  return metrics.value.map((metric) => {
    const metricDelta = getEfficiencyActualDelta(metric)
    const changedOutput = store.computeEffOutput(true, metricDelta)
    const gain = changedOutput - baseOutput.value
    let combatGain = 0
    if (showCombatGain.value) {
      const delta: FieldValues = {}
      metric.fieldIds.forEach((fieldId) => {
        delta[effFieldToCombatKey(fieldId)] = metric.unit
      })
      combatGain = store.powerValue(store.computePower(false, delta)) - combatBaseValue
    }
    return { ...metric, gain, combatGain }
  })
})

// 顯示集合固定為自訂清單（原「常用」行為）；effDisplayMode 欄位保留於存檔格式但 UI 不再使用
const visibleKeys = computed(() =>
  getVisibleMetricKeys(metricResults.value, 'common', String(store.fields.effCustomMetricKeys)),
)
const visibleResults = computed(() =>
  metricResults.value.filter((metric) => visibleKeys.value.has(metric.key)),
)

/* 隱藏基準項目自身的換算列（1 STR = 1 STR 沒有意義） */
function resultsFor(selectedKey: string) {
  return visibleResults.value.filter((metric) => metric.key !== selectedKey)
}

// ── 三個基準面板 ──
const panels = computed(() => {
  const byKey = new Map(metricResults.value.map((m) => [m.key, m]))
  const fallbackKey = metricResults.value[0]?.key ?? ''
  return EFFICIENCY_PANEL_DEFAULTS.map((defaultKey, index) => {
    const panelIndex = index + 1
    const defaultMetricKey = byKey.has(defaultKey) ? defaultKey : fallbackKey
    let selectedKey = String(store.fields[`effSelectedMetric${panelIndex}`] || defaultMetricKey)
    if (!byKey.has(selectedKey)) selectedKey = defaultMetricKey
    return { index: panelIndex, metric: byKey.get(selectedKey)!, selectedKey }
  }).filter((panel) => panel.metric)
})

const openPickerIndex = ref(0)

function togglePicker(index: number) {
  openPickerIndex.value = openPickerIndex.value === index ? 0 : index
}

function choosePanelMetric(panelIndex: number, metricKey: string) {
  store.setField(`effSelectedMetric${panelIndex}`, metricKey)
  openPickerIndex.value = 0
}

function onUnitInput(metric: EfficiencyMetric, event: Event) {
  const nextValue = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(nextValue) && nextValue > 0) {
    store.setField(metric.unitId, String(nextValue))
  }
}

function onUnitChange(metric: EfficiencyMetric, event: Event) {
  const el = event.target as HTMLInputElement
  const nextValue = Number(el.value)
  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    el.value = '1'
    store.setField(metric.unitId, '1')
  } else {
    el.value = String(nextValue)
    store.setField(metric.unitId, String(nextValue))
  }
}

const customPanelOpen = ref(false)

const customCheckedKeys = computed(() => {
  const available = new Set(metricResults.value.map((m) => m.key))
  const keys = String(store.fields.effCustomMetricKeys || '')
    .split(',')
    .map((k) => k.trim())
    .filter((k) => available.has(k))
  return new Set(keys.length ? keys : [...visibleKeys.value])
})

function onCustomKeyToggle(metricKey: string, event: Event) {
  const checkbox = event.target as HTMLInputElement
  const next = new Set(customCheckedKeys.value)
  if (checkbox.checked) next.add(metricKey)
  else next.delete(metricKey)
  if (!next.size) {
    checkbox.checked = true
    return
  }
  store.setField('effCustomMetricKeys', [...next].join(','))
}

const equivalentDecimals = ref(window.innerWidth < 720 ? 1 : 3)
const onResize = () => {
  equivalentDecimals.value = window.innerWidth < 720 ? 1 : 3
}
onMounted(() => window.addEventListener('resize', onResize, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

function equivalentText(target: MetricResult, base: MetricResult, kind: 'actual' | 'combat') {
  const targetGain = kind === 'actual' ? target.gain : target.combatGain
  const baseGain = kind === 'actual' ? base.gain : base.combatGain
  const value = targetGain > 0 ? (target.unit * baseGain) / targetGain : NaN
  return formatEfficiencyEquivalent(value, target.suffix, equivalentDecimals.value)
}

function onDocumentClick(event: MouseEvent) {
  if (!event.composedPath().some(
    (node) => node instanceof HTMLElement && node.classList.contains('equipment-efficiency-metric-picker'),
  )) {
    openPickerIndex.value = 0
  }
}
onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))

// ── 各塔戒卡片獨立試算，不寫回或鏡像全域 Buff 狀態 ──
const regulationTrialMugong = ref(false)
const continuousTrialMugong = ref(false)
const continuousTrialGauge = ref(false)
const averageTrialOpen = ref(false)
const continuousTrialGaugeLevel = computed(() => buffs.preferredLevel(TOWER_RING_EQUIVALENT_ID))

// 規範等級下拉：選項取規範戒指的等級清單；改值只寫偏好等級，不啟用全域 Buff。
const regulationLevelOptions = computed(() =>
  (buffs.table.buffIndex[TOWER_RING_EQUIVALENT_ID]?.levelKeys ?? []).map((lv) => ({
    value: String(lv),
    label: `Lv.${lv}`,
  })),
)
const continuousGaugeLevelModel = computed<string>({
  get: () => String(continuousTrialGaugeLevel.value),
  set: (v) => buffs.rememberPreferredLevel(TOWER_RING_EQUIVALENT_ID, Number(v)),
})

function onContinuousGaugeToggle(event: Event) {
  continuousTrialGauge.value = (event.target as HTMLInputElement).checked
}

function scenarioPicks(ringId: string): Record<string, number> {
  if (ringId === TOWER_RING_EQUIVALENT_ID) {
    return { [MUGONG_BUFF_ID]: regulationTrialMugong.value ? 1 : 0 }
  }
  const regulationLevel = buffs.preferredLevel(TOWER_RING_EQUIVALENT_ID)
  return {
    [MUGONG_BUFF_ID]: continuousTrialMugong.value ? 1 : 0,
    [TOWER_RING_EQUIVALENT_ID]: continuousTrialGauge.value ? regulationLevel : 0,
  }
}

const towerRingIcons: Record<string, string> = {
  'skill:規範戒指': towerRingIconGauge,
  'skill:永續戒指': towerRingIconContinuous,
}

const towerRings = computed(() => {
  const ctx: BuffComputeContext = {
    job: store.effSelectedJob,
    statLabels: store.statLabels,
    currentWeaponAtk: +String(store.fields.currentWeaponAtk ?? '') || 0,
    combatWeaponAtk: store.combatSoulOrbWeaponAtk,
    soulOrb: buffs.soulOrb,
  }
  const commonInput = {
    table: buffs.table,
    ctx,
    fields: store.numericFields,
    effJob: store.effSelectedJob,
    baseAtkPercentRaw: store.fields.effPercentAtk,
    totalSharePercent: (() => {
      const raw = String(store.fields.towerRingTotalSharePercent ?? '').trim()
      return raw === '' ? null : Number(raw)
    })(),
    mugongCycles: [
      store.fields.towerRingMugongCycle1 === true,
      store.fields.towerRingMugongCycle2 === true,
      store.fields.towerRingMugongCycle3 === true,
    ] as const,
    coveragePercentages: TOWER_RING_COVERAGE.map((entry) => {
      const raw = String(store.fields[entry.field] ?? '').trim()
      return raw === '' ? NaN : Number(raw)
    }) as unknown as readonly [number, number, number, number],
  }
  return TOWER_RING_IDS.map((id) => {
    const state = buildTowerRingScenarioState(buffs.table, buffs.state, scenarioPicks(id))
    const gains = getTowerRingGains({ ...commonInput, state }, id, buffs.state[id] || 0)
    return {
      id,
      name: buffs.table.buffIndex[id]?.name ?? id,
      icon: towerRingIcons[id],
      showVsCurrent: gains.some((gain) => gain.current && gain.level > 0),
      gains,
    }
  }).filter((ring) => ring.gains.length)
})

const regulationRing = computed(() =>
  towerRings.value.find((ring) => ring.id === TOWER_RING_EQUIVALENT_ID),
)

function ringGainText(value: number | null, current = false): string {
  if (value === null) return '--'
  if (current) return '±0.000%'
  const abs = Math.abs(value)
  if (abs > 0 && abs < 0.001) return value < 0 ? '>-0.001%' : '<0.001%'
  return formatPercentDecimals(value, 3)
}
</script>

<template>
  <div class="view-panel active">
    <BuffSummaryBar view="valueConversion" />
    <ContextGuide title="效率換算與塔戒怎麼看？">
      <ul>
        <li>先選基準，例如「1% 主屬」；表格會列出其他能力要多少，才有相近的實際或戰鬥力提升。</li>
        <li>綠色是實際輸出換算，黃色是官方戰鬥力換算；兩者用途不同，換裝時建議同時比較。</li>
        <li>規範平均試算的未開戒指占比，是 5 分 40 秒內三次未開規範的 20 秒爆發占比總和；武公週期請依你的實戰勾選。</li>
      </ul>
    </ContextGuide>
    <div id="equipmentEfficiencyResult" class="equipment-efficiency-result">
      <div v-if="!hasBase" class="equipment-efficiency-status">
        請先到「角色資料 &gt; 實戰資料」填入主屬、攻擊力資料，才會顯示換算結果。
      </div>
      <div class="equipment-efficiency-toolbar">
        <label class="equipment-efficiency-combat-toggle">
          <input id="effShowActualGain" v-model="showActualGain" type="checkbox" />
          <span>依實際換算(綠)</span>
        </label>
        <label class="equipment-efficiency-combat-toggle">
          <input id="effShowCombatGain" v-model="showCombatGain" type="checkbox" />
          <span>依戰力換算(黃)</span>
        </label>
        <details
          id="effCustomPanel"
          class="equipment-efficiency-custom-panel"
          :open="customPanelOpen"
          @toggle="customPanelOpen = ($event.target as HTMLDetailsElement).open"
        >
          <summary>自訂顯示項目</summary>
        </details>
        <div
          v-show="customPanelOpen"
          id="effCustomMetricList"
          class="equipment-efficiency-custom-grid"
        >
          <label
            v-for="metric in metricResults"
            :key="metric.key"
            class="equipment-efficiency-custom-option"
          >
            <input
              type="checkbox"
              :data-eff-custom-key="metric.key"
              :checked="customCheckedKeys.has(metric.key)"
              @change="onCustomKeyToggle(metric.key, $event)"
            />
            <span>{{ metric.label }}</span>
          </label>
        </div>
      </div>

      <div
        v-if="hasBase"
        id="equipmentEfficiencyTable"
        class="equipment-efficiency-table"
        :class="{ 'show-actual-gain': showActualGain, 'show-combat-gain': showCombatGain }"
      >
        <details
          v-for="panel in panels"
          :key="panel.index"
          class="equipment-efficiency-group equipment-efficiency-panel"
          :data-panel-index="panel.index"
          :data-metric-key="panel.metric.key"
          open
          @click.prevent
        >
          <summary>
            <label
              class="equipment-efficiency-unit-control"
              :aria-label="`${panel.metric.label}基準數值`"
              @click.stop
            >
              <input
                type="text"
                inputmode="decimal"
                class="equipment-efficiency-unit-input"
                :data-panel-index="panel.index"
                :data-unit-id="panel.metric.unitId"
                :value="formatEfficiencyUnitInput(panel.metric.unit)"
                autocomplete="off"
                @click.stop
                @input="onUnitInput(panel.metric, $event)"
                @change="onUnitChange(panel.metric, $event)"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
              />
            </label>
            <div
              class="equipment-efficiency-metric-picker"
              :class="{ 'is-open': openPickerIndex === panel.index }"
              :data-panel-index="panel.index"
              @click.stop
            >
              <button
                type="button"
                class="equipment-efficiency-metric-trigger"
                :data-panel-index="panel.index"
                aria-haspopup="listbox"
                :aria-expanded="openPickerIndex === panel.index"
                @click="togglePicker(panel.index)"
              >
                <span class="equipment-efficiency-metric-trigger-text">{{
                  panel.metric.label
                }}</span>
              </button>
              <div class="equipment-efficiency-metric-menu" role="listbox">
                <button
                  v-for="metric in metricResults"
                  :key="metric.key"
                  type="button"
                  class="equipment-efficiency-metric-option"
                  :class="{ active: metric.key === panel.selectedKey }"
                  :data-metric-key="metric.key"
                  @click="choosePanelMetric(panel.index, metric.key)"
                >
                  {{ metric.label }}
                </button>
              </div>
            </div>
          </summary>
          <div class="equipment-equivalence-grid">
            <div
              v-for="target in resultsFor(panel.selectedKey)"
              :key="target.key"
              class="equipment-equivalence-row"
              :class="{ 'has-actual': showActualGain, 'has-combat': showCombatGain }"
            >
              <span class="equipment-equivalence-name">{{ target.label }}</span>
              <span class="equipment-equivalence-values">
                <span v-if="showActualGain" class="equipment-equivalence-value equiv-actual">
                  {{ equivalentText(target, panel.metric, 'actual') }}
                </span>
                <span v-if="showCombatGain" class="equipment-equivalence-value equiv-combat">
                  {{ equivalentText(target, panel.metric, 'combat') }}
                </span>
              </span>
            </div>
          </div>
        </details>
      </div>

      <div v-if="hasBase" id="towerRingSection" class="tower-ring-section">
        <div class="tower-ring-head">
          <span class="tower-ring-title">塔戒效益</span>
          <span class="tower-ring-info">
            <button
              type="button"
              class="buff-info-trigger"
              aria-label="塔戒效益計算說明"
            ></button>
            <span class="tower-ring-info-tooltip" role="tooltip">
              此區計算排除套用中的武公/規範，依是否勾選為主。
            </span>
          </span>
        </div>
        <div class="tower-ring-grid">
          <div
            v-for="ring in towerRings"
            :key="ring.id"
            class="tower-ring-card"
            :data-ring-id="ring.id"
          >
            <div class="tower-ring-name">
              <span class="tower-ring-name-main">
                <img class="tower-ring-icon" :src="ring.icon" :alt="ring.name" />
                <span>{{ ring.name }}</span>
              </span>
              <button
                v-if="ring.id === TOWER_RING_EQUIVALENT_ID"
                type="button"
                class="tower-ring-settings-btn"
                @click="averageTrialOpen = true"
              >
                平均效益試算
              </button>
              <div class="tower-ring-card-options" aria-label="此戒指的局部搭配試算">
                <label v-if="ring.id === TOWER_RING_EQUIVALENT_ID" class="tower-ring-trial-option">
                  <input v-model="regulationTrialMugong" type="checkbox" />
                  <span>武公</span>
                </label>
                <template v-else>
                  <label class="tower-ring-trial-option">
                    <input v-model="continuousTrialMugong" type="checkbox" />
                    <span>武公</span>
                  </label>
                  <label class="tower-ring-trial-option">
                    <input
                      :checked="continuousTrialGauge"
                      type="checkbox"
                      @change="onContinuousGaugeToggle"
                    />
                    <span>規範</span>
                  </label>
                  <span class="tower-ring-trial-level-slot" @click.stop>
                    <CustomSelect
                      v-model="continuousGaugeLevelModel"
                      :options="regulationLevelOptions"
                      select-class="tower-ring-trial-level-select"
                      aria-label="規範戒指比較等級"
                      :blur-on-choose="true"
                    />
                  </span>
                </template>
              </div>
            </div>
            <div class="tower-ring-rows">
              <div class="tower-ring-row tower-ring-row--head">
                <span class="tower-ring-level">等級</span>
                <span
                  v-if="ring.showVsCurrent"
                  class="tower-ring-colhead tower-ring-colhead--current"
                  >相對目前</span
                >
                <span class="tower-ring-colhead tower-ring-colhead--none">相對未裝備</span>
              </div>
              <div
                v-for="gain in ring.gains"
                :key="gain.level"
                class="tower-ring-row"
                :class="{ 'tower-ring-row--current': gain.current }"
              >
                <span class="tower-ring-level">
                  {{ gain.level === 0 ? '未裝備' : `Lv.${gain.level}` }}
                  <small v-if="gain.current" class="tower-ring-current-label">目前</small>
                </span>
                <span v-if="ring.showVsCurrent" class="tower-ring-value tower-ring-value--current">
                  {{ ringGainText(gain.vsCurrent, gain.current) }}
                </span>
                <span class="tower-ring-value tower-ring-value--none">
                  {{ ringGainText(gain.vsNone, gain.level === 0) }}
                </span>
              </div>
            </div>
            <p v-if="ring.id === TOWER_RING_EQUIVALENT_ID" class="tower-ring-average-hint">
              Lv.4 為 15 秒、Lv.5 為 20 秒；整場效益請開啟平均試算。
            </p>
          </div>
        </div>
      </div>
    </div>

    <TowerRingShareDialog
      v-if="averageTrialOpen"
      :gains="regulationRing?.gains || []"
      @close="averageTrialOpen = false"
    />
  </div>
</template>
