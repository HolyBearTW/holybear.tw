<script setup lang="ts">
// 戰鬥力資料的特殊能力值表格（傷害/B傷/爆傷 + 技能.消耗）。
// 併入「主要能力值」卡片下方（省一張卡的高度）。
import StatInput from './shared/StatInput.vue'
</script>

<template>
  <div class="stat-table stat-table--dmg">
    <div class="st-row">
      <span class="st-row-group-title">傷害與爆擊</span>
      <div class="st-cell st-cell--info">
        <span class="st-cell-label"
          >傷害<span class="buff-info dmg-bug-info">
            <button type="button" class="buff-info-trigger" aria-label="傷害欄位說明"></button>
            <span class="buff-info-tooltip" role="tooltip">
              <span class="buff-info-lines">
                <span class="buff-info-line">貴族傳授目前有不計入[技能]傷害的Bug</span>
                <span class="buff-info-line">如有使用，1人情形需將[技能.消耗]傷害+2</span>
              </span>
            </span> </span
        ></span>
        <StatInput id="dmg" restrict />
      </div>
      <div class="st-cell">
        <span class="st-cell-label"><span class="label-tag">技能.消耗</span>傷害</span
        ><StatInput id="skillDmg" restrict />
      </div>
      <div class="st-cell">
        <span class="st-cell-label">B傷</span><StatInput id="bossDmg" restrict />
      </div>
      <div class="st-cell">
        <span class="st-cell-label"><span class="label-tag">技能.消耗</span>B傷</span
        ><StatInput id="skillBossDmg" restrict />
      </div>
      <div class="st-cell">
        <span class="st-cell-label">爆傷</span><StatInput id="critDmg" restrict />
      </div>
      <div class="st-cell">
        <span class="st-cell-label"><span class="label-tag">技能.消耗</span>爆傷</span
        ><StatInput id="skillCritDmg" restrict />
      </div>
    </div>
  </div>
</template>
