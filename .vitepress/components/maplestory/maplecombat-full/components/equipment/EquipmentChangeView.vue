<script setup lang="ts">
// 裝備變更分頁：戰鬥力與增幅統一由外層固定摘要顯示。
import { watch } from 'vue'
import { useCharacterStore } from '@maplecombat/stores/character'
import EquipmentSidePanel from './EquipmentSidePanel.vue'
import BuffSummaryBar from '@maplecombat/components/buffs/BuffSummaryBar.vue'
import ContextGuide from '@maplecombat/components/layout/ContextGuide.vue'
import CustomSelect from '@maplecombat/components/character/shared/CustomSelect.vue'
import {
  applySelectedEquipment,
  equipmentOptions,
  selectedEquipment,
  selectedEquipmentKey,
} from '@maplecombat/services/equipmentCatalog'

const store = useCharacterStore()

watch(selectedEquipmentKey, () => applySelectedEquipment(store.setField))
</script>

<template>
  <div class="view-panel active">
    <BuffSummaryBar view="equipmentChange" />
    <div v-if="equipmentOptions.length" class="equipment-source-picker">
      <div class="equipment-source-copy">
        <img
          v-if="selectedEquipment?.icon"
          :src="selectedEquipment.icon"
          :alt="selectedEquipment.label"
          class="equipment-source-icon"
        />
        <span>
          <strong>目前裝備</strong>
          <small>選擇部位後，左欄會直接換成該件裝備的 API 數值。</small>
        </span>
      </div>
      <CustomSelect
        v-model="selectedEquipmentKey"
        :options="equipmentOptions"
        aria-label="選擇目前裝備"
        select-class="equipment-source-select"
      />
    </div>
    <ContextGuide title="裝備替換怎麼用？">
      <ul>
        <li>先選擇要替換的目前裝備；左欄會自動帶入，右欄再填新裝備的「總數值」。</li>
        <li>戰鬥力增幅與實際增幅可能方向不同，例如攻擊力％換 B 傷；請以用途選擇，不要只看單一數字。</li>
        <li>萌獸終傷只有在同時更換召喚萌獸時才調整；單純換裝讓左右維持 0 即可。</li>
        <li>Buff 與實戰情境會影響稀釋程度；比較攻擊力％時，建議再到「加權」綜合常駐、武公與規範狀態。</li>
      </ul>
    </ContextGuide>
    <div class="equipment-change-result">
      <div class="equipment-grid">
        <EquipmentSidePanel side="old" />
        <EquipmentSidePanel side="new" />
      </div>
    </div>
  </div>
</template>
