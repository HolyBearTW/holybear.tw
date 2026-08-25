<script setup lang="ts">
// 實戰資料的特殊能力值（傷害/Boss/爆擊/萌獸終傷/無視與怪物防禦）。
// 併入「主要能力值」卡片下方（省一張卡的高度）。
import StatInput from './shared/StatInput.vue'
import FamFinalSourcesControl from './shared/FamFinalSourcesControl.vue'
</script>

<template>
  <div class="st-row-group-title eff-special-title">傷害與防禦</div>
  <div class="special-stats-grid special-stats-grid--eff">
    <div class="input-group"><label>傷害</label><StatInput id="effDmg" restrict /></div>
    <div class="input-group"><label>Boss傷害</label><StatInput id="effBossDmg" restrict /></div>
    <div class="input-group"><label>爆擊傷害</label><StatInput id="effCritDmg" restrict /></div>
    <div class="input-group">
      <label>萌獸終傷</label><FamFinalSourcesControl field-id="effFamFinal" restrict />
    </div>
    <div class="input-group">
      <label>無視防禦率</label><StatInput id="effIgnoreDefense" restrict />
    </div>
    <div class="input-group">
      <label>怪物防禦率</label><StatInput id="effMonsterDefense" restrict />
    </div>
  </div>
</template>
