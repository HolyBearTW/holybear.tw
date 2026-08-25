<script setup lang="ts">
// 角色資料分頁：結果列常駐頂端 + 主要能力值/實戰面板。
// 分頁切換、職業選擇與資料複製併入卡片頂部的 CharacterDataHead。
import { useUiStore } from '@maplecombat/stores/ui'
import CharacterDataHead from './CharacterDataHead.vue'
import CombatPowerSummary from './CombatPowerSummary.vue'
import BuffGainSummary from './BuffGainSummary.vue'
import CombatStatsPanel from './CombatStatsPanel.vue'
import EffStatsPanel from './EffStatsPanel.vue'

const ui = useUiStore()
</script>

<template>
  <div class="view-panel character-input-view active">
    <!-- 結果列常駐頂端 -->
    <div class="compact-result-bar">
      <CombatPowerSummary />
      <BuffGainSummary :mode="ui.calculatorMode === 'calculator' ? 'combat' : 'eff'" />
    </div>
    <div
      id="calculatorMode"
      class="mode-panel"
      :class="{ active: ui.calculatorMode === 'calculator' }"
    >
      <CombatStatsPanel>
        <template #head>
          <!-- v-if 保證 jobSearchInput / 複製按鈕 id 全頁唯一（僅渲染於目前模式的面板） -->
          <CharacterDataHead v-if="ui.calculatorMode === 'calculator'" />
        </template>
      </CombatStatsPanel>
    </div>
    <div id="effStatsMode" class="mode-panel" :class="{ active: ui.calculatorMode === 'effStats' }">
      <EffStatsPanel>
        <template #head>
          <CharacterDataHead v-if="ui.calculatorMode === 'effStats'" />
        </template>
      </EffStatsPanel>
    </div>
  </div>
</template>
