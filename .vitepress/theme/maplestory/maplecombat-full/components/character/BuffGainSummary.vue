<script setup lang="ts">
// 含Buff增幅顯示面板。
import { computed, watch } from 'vue'
import { useCharacterStore } from '@maplecombat/stores/character'
import { formatPower, formatPercentDecimals } from '@maplecombat/core/format'
import { queueCombatPowerFit } from '@maplecombat/composables/useCombatPowerFit'

const props = defineProps<{ mode: 'combat' | 'eff' }>()
const store = useCharacterStore()

const before = computed(() =>
  props.mode === 'combat' ? store.powerValue(store.powerNoBuff) : store.effOutputNoBuff,
)
const after = computed(() =>
  props.mode === 'combat' ? store.powerValue(store.powerWithBuff) : store.effOutputWithBuff,
)

const gain = computed(() => {
  if (!before.value || before.value <= 0 || !isFinite(before.value) || !isFinite(after.value)) {
    return null
  }
  return (after.value / before.value - 1) * 100
})

const displayText = computed(() => {
  if (gain.value === null) return '-'
  const absRaw = Math.abs(gain.value)
  if (absRaw > 0 && absRaw < 0.001) {
    return gain.value < 0 ? '>-0.001%' : '<0.001%'
  }
  return formatPercentDecimals(gain.value, 3)
})

// 倍率原始值存到 data-raw-percent 供字級自適應減位
const rawPercentAttr = computed(() => {
  if (gain.value === null) return undefined
  const absRaw = Math.abs(gain.value)
  if (absRaw > 0 && absRaw < 0.001) return undefined
  return String(gain.value)
})

const subvalueText = computed(() => {
  if (props.mode !== 'combat' || gain.value === null) return ''
  return after.value > 0 ? formatPower(after.value) : ''
})

watch([displayText, subvalueText], () => queueCombatPowerFit())
</script>

<template>
  <div
    :id="mode === 'combat' ? 'combatBuffGainPanel' : 'effBuffGainPanel'"
    class="result-display calculator-result combat-power-summary buff-gain-summary"
  >
    <div class="result-item">
      <span v-if="mode === 'combat'" class="buff-info buff-gain-info">
        <button
          type="button"
          class="buff-info-trigger"
          aria-label="含 Buff 戰力增幅說明"
        ></button>
        <span class="buff-info-tooltip" role="tooltip">
          <span class="buff-info-lines">
            <span class="buff-info-line">將傳授、共通技能與Buff等計入戰鬥力公式的變化</span>
          </span>
        </span>
      </span>
      <span class="result-label">{{
        mode === 'combat' ? '含Buff戰力增幅' : '含Buff實際增幅'
      }}</span>
      <div
        :id="mode === 'combat' ? 'combatBuffGainValue' : 'effBuffGainValue'"
        class="result-value buff-gain-value"
        :data-raw-percent="rawPercentAttr"
      >
        {{ displayText }}
      </div>
      <span v-if="subvalueText" class="buff-gain-subvalue">{{ subvalueText }}</span>
    </div>
  </div>
</template>
