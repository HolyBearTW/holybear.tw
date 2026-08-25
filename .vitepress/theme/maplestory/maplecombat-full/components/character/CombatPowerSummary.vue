<script setup lang="ts">
// 當前戰鬥力顯示面板（顯示不含 Buff 的戰力）。
import { computed, watch } from 'vue'
import { useCharacterStore } from '@maplecombat/stores/character'
import { formatPower } from '@maplecombat/core/format'
import { useCombatPowerFit, queueCombatPowerFit } from '@maplecombat/composables/useCombatPowerFit'

const store = useCharacterStore()
const display = computed(() => formatPower(store.powerValue(store.powerNoBuff)))

useCombatPowerFit()
watch(display, () => queueCombatPowerFit())
</script>

<template>
  <div id="resultDisplayPanel" class="result-display calculator-result combat-power-summary">
    <div id="singleResultWrap" class="result-item">
      <span class="result-label">當前戰鬥力</span>
      <div id="resultValue" class="result-value">{{ display }}</div>
    </div>
  </div>
</template>
