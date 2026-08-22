<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@maplecombat/stores/ui'
import { useCharacterStore } from '@maplecombat/stores/character'
import CompactToolbar from '@maplecombat/components/layout/CompactToolbar.vue'
import CharacterInputView from '@maplecombat/components/character/CharacterInputView.vue'
import EquipmentChangeView from '@maplecombat/components/equipment/EquipmentChangeView.vue'
import ValueConversionView from '@maplecombat/components/conversion/ValueConversionView.vue'
import WeightedAnalysisView from '@maplecombat/components/weighted/WeightedAnalysisView.vue'
import { useStateSlotsStore } from '@maplecombat/stores/stateSlots'

const ui = useUiStore()
const slots = useStateSlotsStore()
const character = useCharacterStore()

const validationWarnings = computed(() => {
  const warnings: string[] = []
  const fieldNumber = (id: string) => Number(character.fields[id]) || 0
  // Nexon API 回傳的是已結算面板，MapleCombat 原公式則要求拆分部分技能與校正來源。
  // 兩者的原始戰力差距不等於漏抓資料；外層會以官方戰力作基準進行比例校正。
  if (fieldNumber('baseMain') <= 0 || fieldNumber('atk') <= 0) {
    warnings.push('主屬基本數值或攻擊力為 0，後續換算會失真。')
  }
  if (fieldNumber('percentMain') > 1500 || fieldNumber('percentAtk') > 500) {
    warnings.push('屬性％或攻擊力％高於合理檢查範圍，可能把總數值誤填到百分比欄。')
  }
  if (fieldNumber('bossDmg') > 1500 || fieldNumber('critDmg') > 500 || fieldNumber('famFinal') > 250) {
    warnings.push('B 傷、爆傷或萌獸終傷明顯偏高，請確認沒有把含 Buff 結果重複輸入。')
  }
  if (fieldNumber('effMonsterDefense') < 0 || fieldNumber('effMonsterDefense') > 500) {
    warnings.push('怪物防禦率通常應在 0～500% 間；目前輸入會使實際增幅無法正確比較。')
  }
  return warnings
})
</script>

<template>
  <div class="maplecombat-shell">
    <CompactToolbar />
    <div v-if="validationWarnings.length" class="holybear-validation-banner" role="alert">
      <strong>⚠️ 數值防呆提醒</strong>
      <ul>
        <li v-for="warning in validationWarnings" :key="warning">{{ warning }}</li>
      </ul>
    </div>
    <div class="container">
      <WeightedAnalysisView v-if="slots.isWeightedActive" :view="ui.activeView" />
      <template v-else>
        <CharacterInputView v-show="ui.activeView === 'characterInput'" />
        <EquipmentChangeView v-show="ui.activeView === 'equipmentChange'" />
        <ValueConversionView v-show="ui.activeView === 'valueConversion'" />
      </template>
    </div>
  </div>
</template>
