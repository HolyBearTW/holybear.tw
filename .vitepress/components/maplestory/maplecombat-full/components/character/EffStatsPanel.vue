<script setup lang="ts">
// 實戰資料模式面板。
import { computed } from 'vue'
import { useCharacterStore } from '@maplecombat/stores/character'
import StatInput from './shared/StatInput.vue'
import SpecialStatsEff from './SpecialStatsEff.vue'
import BuffPanel from '@maplecombat/components/buffs/BuffPanel.vue'
import ContextGuide from '@maplecombat/components/layout/ContextGuide.vue'

const store = useCharacterStore()
const labels = computed(() => store.statLabels)
const effJob = computed(() => store.effSelectedJob)
const includeSecondSub = computed(() => effJob.value === 'xenon' || effJob.value === 'dual')
</script>

<template>
  <div class="calc-layout">
    <div class="calc-main">
      <!-- 表格1：主要能力值（緊湊版：標題列改為資料切換/職業列，由父層 head slot 傳入） -->
      <div class="section stat-table-card">
        <slot name="head" />
        <ContextGuide title="實戰資料怎麼填？">
          <ul>
            <li>可先按「套用戰鬥力資料」，再補上實戰時才會開啟的職業主動 Buff。</li>
            <li>如果輸入值本身已包含某個 Buff，右側就不要再勾同一個 Buff，避免重複計算。</li>
            <li>每個實戰情境都有自己的實戰數值與 Buff；常駐、爆發、武公或規範可以分開設定。</li>
          </ul>
        </ContextGuide>
        <div class="stat-table stat-table--effmain">
          <div class="st-row st-row--head">
            <span class="st-rowhead" aria-hidden="true"></span>
            <span class="st-colhead">基本數值</span>
            <span class="st-colhead">% 數值</span>
            <span class="st-colhead">%未套用數值</span>
          </div>
          <div class="st-row">
            <span id="effMainSectionTitle" class="st-rowhead">{{ labels.main }}</span>
            <div class="st-cell">
              <span class="st-cell-label">基本數值</span><StatInput id="effBaseMain" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">% 數值</span><StatInput id="effPercentMain" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">%未套用數值</span
              ><StatInput id="effNoApplyMain" restrict />
            </div>
          </div>
          <div class="st-row">
            <span id="effSubSectionTitle" class="st-rowhead">{{ labels.sub }}</span>
            <div class="st-cell">
              <span class="st-cell-label">基本數值</span><StatInput id="effBaseSub" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">% 數值</span><StatInput id="effPercentSub" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">%未套用數值</span
              ><StatInput id="effNoApplySub" restrict />
            </div>
          </div>
          <div v-show="includeSecondSub" id="effSecondSubRow" class="st-row">
            <div class="st-rowhead st-rowhead--check">
              <span id="effSecondSubSectionTitle">{{ labels.secondSub || '副屬性2' }}</span>
            </div>
            <div class="st-cell">
              <span class="st-cell-label">基本數值</span><StatInput id="effBaseSubtwo" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">% 數值</span><StatInput id="effPercentSubtwo" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">%未套用數值</span
              ><StatInput id="effNoApplySubtwo" restrict />
            </div>
          </div>
          <div class="st-row">
            <span class="st-rowhead">攻擊力</span>
            <div class="st-cell">
              <span class="st-cell-label">基本數值</span><StatInput id="effAtk" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">% 數值</span><StatInput id="effPercentAtk" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">%未套用數值</span
              ><StatInput id="effNoApplyAtk" restrict />
            </div>
          </div>
        </div>
        <SpecialStatsEff />
        <template v-if="effJob === 'da'">
          <span class="compact-subtitle">職業特殊項目</span>
          <div class="bonus-extra-grid bonus-extra-grid--special">
            <div class="input-group">
              <label>基本HP</label><StatInput id="effBaseHP" restrict />
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="calc-side">
      <BuffPanel mode="eff" />
    </div>
  </div>
</template>
