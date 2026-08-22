<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useCheckboxField, useStringField } from '@maplecombat/composables/useField'
import {
  getTowerRingAtkPercent,
  TOWER_RING_SETTINGS_ROWS,
  type TowerRingLevelGain,
} from '@maplecombat/core/buffs/towerRing'
import { formatPercentDecimals } from '@maplecombat/core/format'
import { useCharacterStore } from '@maplecombat/stores/character'
import { useBuffsStore } from '@maplecombat/stores/buffs'

const emit = defineEmits<{ close: [] }>()
const props = defineProps<{ gains: TowerRingLevelGain[] }>()
const store = useCharacterStore()
const buffs = useBuffsStore()

const totalShare = useStringField('towerRingTotalSharePercent')
const cycle1 = useCheckboxField('towerRingMugongCycle1')
const cycle2 = useCheckboxField('towerRingMugongCycle2')
const cycle3 = useCheckboxField('towerRingMugongCycle3')

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
  const cycles = [cycle1.value, cycle2.value, cycle3.value]
    .map((enabled, index) => (enabled ? String(index + 1) : ''))
    .filter(Boolean)
    .join('、')
  return `塔戒占比： ${share}%｜武公套用週期： ${cycles || '無'}`
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

        <fieldset class="tower-ring-cycle-settings">
          <legend>武公套用週期</legend>
          <label><input v-model="cycle1" type="checkbox" /> 第一週期</label>
          <label><input v-model="cycle2" type="checkbox" /> 第二週期</label>
          <label><input v-model="cycle3" type="checkbox" /> 第三週期</label>
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
