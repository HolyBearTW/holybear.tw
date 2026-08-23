<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useCheckboxField, useStringField } from '@maplecombat/composables/useField'
import {
  getTowerRingAtkPercent,
  SOUL_FIGHTING_SPIRIT_ID,
  TOWER_RING_SETTINGS_ROWS,
  type TowerRingLevelGain,
} from '@maplecombat/core/buffs/towerRing'
import { formatPercentDecimals } from '@maplecombat/core/format'
import { useCharacterStore } from '@maplecombat/stores/character'
import { useBuffsStore } from '@maplecombat/stores/buffs'
import CustomSelect from '@maplecombat/components/character/shared/CustomSelect.vue'

const emit = defineEmits<{ close: [] }>()
const props = defineProps<{ gains: TowerRingLevelGain[] }>()
const store = useCharacterStore()
const buffs = useBuffsStore()

const totalShare = useStringField('towerRingTotalSharePercent')
const cycle1 = useCheckboxField('towerRingMugongCycle1')
const cycle2 = useCheckboxField('towerRingMugongCycle2')
const cycle3 = useCheckboxField('towerRingMugongCycle3')
const soulCycle1 = useCheckboxField('towerRingSoulCycle1')
const soulCycle2 = useCheckboxField('towerRingSoulCycle2')
const soulCycle3 = useCheckboxField('towerRingSoulCycle3')
const soulLevel = useStringField('towerRingSoulLevel')
const mugongCycles = [cycle1, cycle2, cycle3]
const soulCycles = [soulCycle1, soulCycle2, soulCycle3]
const cycleNames = ['第一週期', '第二週期', '第三週期']
const soulLevelOptions = computed(() =>
  (buffs.table.buffIndex[SOUL_FIGHTING_SPIRIT_ID]?.levelKeys ?? []).map((level) => ({
    value: String(level),
    label: `階級 ${level}`,
  })),
)

function setCycleBuff(kind: 'mugong' | 'soul', index: number, event: Event) {
  const enabled = (event.target as HTMLInputElement).checked
  if (kind === 'mugong') {
    mugongCycles[index].value = enabled
    if (enabled) soulCycles[index].value = false
  } else {
    soulCycles[index].value = enabled
    if (enabled) mugongCycles[index].value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

function updateCoverage(field: string, event: Event) {
  store.setField(field, (event.target as HTMLInputElement).value)
}

function attackPercent(level: number): number {
  return getTowerRingAtkPercent(buffs.table, level)
}

function averageGain(level: number): number | null {
  return props.gains.find((gain) => gain.level === level)?.equivalent ?? null
}

function averageGainText(level: number): string {
  const value = averageGain(level)
  return value === null ? '--' : formatPercentDecimals(value, 3)
}

const settingsSummary = computed(() => {
  const share = String(store.fields.towerRingTotalSharePercent ?? '').trim() || '未設定'
  const cycles = mugongCycles.map((cycle, index) =>
    cycle.value ? `${index + 1}:武公` : soulCycles[index].value ? `${index + 1}:鬥志` : `${index + 1}:無`,
  )
  return `塔戒占比： ${share}%｜靈魂技能： ${cycles.join(' / ')}`
})

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="maplecombat-embedded-overlay-root">
    <div class="tower-ring-settings-backdrop" role="presentation" @mousedown.self="emit('close')">
      <section
        class="tower-ring-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="塔戒占比設定"
      >
        <header class="tower-ring-settings-head">
          <div>
            <h2>規範戒指平均效益試算</h2>
            <p class="tower-ring-settings-summary">{{ settingsSummary }}</p>
          </div>
          <button
            type="button"
            class="tower-ring-settings-close"
            aria-label="關閉占比設定"
            @click="emit('close')"
          >
            ×
          </button>
        </header>

        <label class="tower-ring-share-field">
          <span>未開塔戒20秒占比（5分40秒共3次爆發加總）</span>
          <span class="tower-ring-share-control">
            <input
              v-model="totalShare"
              type="number"
              inputmode="decimal"
              min="0"
              max="100"
              step="0.1"
              aria-label="未開塔戒時爆發20秒占比"
            />
            <span>%</span>
          </span>
        </label>

        <fieldset class="tower-ring-cycle-settings tower-ring-soul-cycle-settings">
          <legend>每個爆發週期套用的靈魂技能</legend>
          <div v-for="(cycleName, index) in cycleNames" :key="cycleName" class="tower-ring-cycle-row">
            <strong>{{ cycleName }}</strong>
            <label>
              <input
                type="checkbox"
                :checked="mugongCycles[index].value"
                @change="setCycleBuff('mugong', index, $event)"
              />
              武公
            </label>
            <label>
              <input
                type="checkbox"
                :checked="soulCycles[index].value"
                @change="setCycleBuff('soul', index, $event)"
              />
              靈魂鬥志
            </label>
          </div>
          <label class="tower-ring-soul-level-field">
            <span>靈魂鬥志階級</span>
            <CustomSelect
              v-model="soulLevel"
              :options="soulLevelOptions"
              select-class="tower-ring-trial-level-select tower-ring-soul-level-select"
              aria-label="平均效益靈魂鬥志階級"
              :blur-on-choose="true"
            />
          </label>
        </fieldset>

        <p class="tower-ring-average-note">
          可依照爆發集中程度，自行調整Lv.1~Lv.4持續時間內，相對20秒輸出的傷害覆蓋率。
        </p>

        <div class="tower-ring-coverage-scroll">
          <div class="tower-ring-coverage-table" role="table" aria-label="規範戒指整場平均效益">
            <div class="tower-ring-coverage-row tower-ring-coverage-row--head" role="row">
              <span role="columnheader">等級</span>
              <span role="columnheader">秒數</span>
              <span role="columnheader">攻擊力%</span>
              <span role="columnheader">20秒傷害覆蓋率</span>
              <span role="columnheader">平均增幅</span>
            </div>
            <div
              v-for="entry in TOWER_RING_SETTINGS_ROWS"
              :key="entry.level"
              class="tower-ring-coverage-row"
              role="row"
            >
              <span role="cell">Lv.{{ entry.level }}</span>
              <span role="cell">{{ entry.seconds }}秒</span>
              <strong class="tower-ring-atk-percent" role="cell">
                {{ attackPercent(entry.level) }}%
              </strong>
              <span class="tower-ring-coverage-control" role="cell">
                <input
                  v-if="entry.field"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  max="100"
                  step="0.1"
                  :value="store.fields[entry.field]"
                  :aria-label="`Lv.${entry.level} 20秒傷害覆蓋率`"
                  @input="updateCoverage(entry.field, $event)"
                />
                <strong v-else class="tower-ring-coverage-fixed">100</strong>
                <span>%</span>
              </span>
              <strong class="tower-ring-average-gain" role="cell">
                {{ averageGainText(entry.level) }}
              </strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
