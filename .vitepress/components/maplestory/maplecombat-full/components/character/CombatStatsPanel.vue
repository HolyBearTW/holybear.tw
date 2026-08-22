<script setup lang="ts">
// 戰鬥力資料模式面板：主要能力值表、特殊能力值、特殊項目（含職業專屬群組）。
import { computed } from 'vue'
import { useCharacterStore } from '@maplecombat/stores/character'
import StatInput from './shared/StatInput.vue'
import FamFinalSourcesControl from './shared/FamFinalSourcesControl.vue'
import CustomSelect from './shared/CustomSelect.vue'
import CoefficientCombobox from './shared/CoefficientCombobox.vue'
import SpecialStatsCombat from './SpecialStatsCombat.vue'
import BuffPanel from '@maplecombat/components/buffs/BuffPanel.vue'
import ContextGuide from '@maplecombat/components/layout/ContextGuide.vue'

const store = useCharacterStore()

const labels = computed(() => store.statLabels)
const job = computed(() => store.selectedJob)
const barrierMainLabel = computed(() => (job.value === 'xenon' ? '全屬' : labels.value.main))
const barrierSubLabel = computed(() =>
  job.value === 'dual' ? labels.value.secondSub || labels.value.sub : labels.value.sub,
)
const hideSubFields = computed(() => store.weaponSetData.hideSubFields)
const genesisFinalActive = computed(() => store.fields.genesisFinalCheck === true)

const weaponSetOptions = [
  { value: 'fortune', label: '命運' },
  { value: 'genesis', label: '創世' },
  { value: 'arcane', label: '神祕' },
  { value: 'absolab', label: '航海' },
  { value: 'fafnir', label: '深淵' },
]
const flameLevelOptions = [
  { value: '0', label: '無' },
  { value: '1', label: 'T1攻' },
  { value: '2', label: 'T2攻' },
  { value: '3', label: 'T3攻' },
  { value: '4', label: 'T4攻' },
  { value: '5', label: 'T5攻' },
  { value: '6', label: 'T6攻' },
  { value: '7', label: 'T7攻' },
]
const ruinFinalOptions = [
  { value: '0', label: '0%' },
  { value: '10', label: '10%' },
]
</script>

<template>
  <div class="calc-layout">
    <div class="calc-main">
      <!-- 表格1：主要能力值（緊湊版：標題列改為資料切換/職業列，由父層 head slot 傳入） -->
      <div class="section stat-table-card">
        <slot name="head" />
        <ContextGuide title="戰鬥力資料怎麼核對？">
          <ul>
            <li>先在村莊保持無魂、不開技能；只有「實用的戰鬥命令」可以保留，再讓左上計算值貼近官方戰鬥力。</li>
            <li>「技能・消耗」要填面板中兩項的合計；飛鏢、箭矢與彈丸不計入消耗數值。</li>
            <li>基本數值、百分比與未套用數值是三種不同來源，不要把面板總值重複填進百分比欄。</li>
          </ul>
        </ContextGuide>
        <div class="stat-table stat-table--main">
          <div class="st-row st-row--head">
            <span class="st-rowhead" aria-hidden="true"></span>
            <span class="st-colhead">基本數值</span>
            <span class="st-colhead">% 數值</span>
            <span class="st-colhead">%未套用數值</span>
            <span class="st-colhead"><span class="label-tag">技能.消耗</span>數值</span>
            <span class="st-colhead"
              ><span class="label-tag">技能.消耗</span><span class="label-value">%</span></span
            >
          </div>
          <div class="st-row">
            <span id="mainSectionTitle" class="st-rowhead">{{ labels.main }}</span>
            <div class="st-cell">
              <span class="st-cell-label">基本數值</span><StatInput id="baseMain" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">% 數值</span><StatInput id="percentMain" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">%未套用數值</span><StatInput id="noApplyMain" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label"><span class="label-tag">技能.消耗</span>數值</span
              ><StatInput id="skillBaseMain" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label"
                ><span class="label-tag">技能.消耗</span><span class="label-value">%</span></span
              ><StatInput id="skillPercentMain" restrict />
            </div>
          </div>
          <div class="st-row">
            <span id="subSectionTitle" class="st-rowhead">{{ labels.sub }}</span>
            <div class="st-cell">
              <span class="st-cell-label">基本數值</span><StatInput id="baseSub" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">% 數值</span><StatInput id="percentSub" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">%未套用數值</span><StatInput id="noApplySub" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label"><span class="label-tag">技能.消耗</span>數值</span
              ><StatInput id="skillBaseSub" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label"
                ><span class="label-tag">技能.消耗</span><span class="label-value">%</span></span
              ><StatInput id="skillPercentSub" restrict />
            </div>
          </div>
          <!-- 副屬性2：僅傑諾（第三主屬）與雙副屬職業顯示並固定計入 -->
          <div v-show="store.includeSecondSub" id="secondSubRow" class="st-row">
            <div class="st-rowhead st-rowhead--check">
              <span id="secondSubSectionTitle">{{ labels.secondSub || '副屬性2' }}</span>
            </div>
            <div class="st-cell">
              <span class="st-cell-label">基本數值</span><StatInput id="baseSubtwo" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">% 數值</span><StatInput id="percentSubtwo" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">%未套用數值</span
              ><StatInput id="noApplySubtwo" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label"><span class="label-tag">技能.消耗</span>數值</span
              ><StatInput id="skillBaseSubtwo" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label"
                ><span class="label-tag">技能.消耗</span><span class="label-value">%</span></span
              ><StatInput id="skillPercentSubtwo" restrict />
            </div>
          </div>
          <div class="st-row">
            <span class="st-rowhead">攻擊力</span>
            <div class="st-cell">
              <span class="st-cell-label">基本數值</span><StatInput id="atk" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">% 數值</span><StatInput id="percentAtk" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">%未套用數值</span><StatInput id="noApplyAtk" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label"><span class="label-tag">技能.消耗</span>數值</span
              ><StatInput id="skillAtk" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label"><span class="label-tag">技能.消耗</span>%</span
              ><StatInput id="skillPercentAtk" restrict />
            </div>
          </div>
        </div>
        <SpecialStatsCombat />
      </div>

      <!-- 表格3：特殊項目 -->
      <div class="section stat-table-card">
        <div class="section-title-row">
          <span class="section-title">特殊項目</span>
          <span class="buff-info weapon-correction-info">
            <button type="button" class="buff-info-trigger" aria-label="武器攻擊校正資訊"></button>
            <span class="buff-info-tooltip weapon-correction-tooltip" role="tooltip">
              <span class="buff-info-lines weapon-correction-list">
                <span class="buff-info-line">武器總攻擊：含星火不含潛能</span>
                <span class="buff-info-line">活動Buff：多個同時存在需加總</span>
                <span class="buff-info-line">P寵攻擊：Set技能所加的攻擊</span>
              </span>
            </span>
          </span>
        </div>
        <p class="holybear-field-note">
          武器總攻擊請填「含星火、不含潛能」的總值；多個活動 Buff 要相加。萌獸每條終傷會先逐條加總，再依遊戲的單精度規則計算。
        </p>
        <div class="stat-table stat-table--bonus">
          <div class="st-row">
            <span class="st-row-group-title">武器、寵物與常駐能力</span>
            <div class="st-cell weapon-set-group">
              <span class="st-cell-label">武器套組</span>
              <CustomSelect id="weaponSet" :options="weaponSetOptions" />
              <span
                id="genesisFinalStatus"
                class="checkbox-status final-auto-status"
                :class="{ active: genesisFinalActive }"
                title="命運/創世終傷"
                aria-label="命運/創世終傷"
                >{{ genesisFinalActive ? '10%終傷' : '0%終傷' }}</span
              >
            </div>
            <div class="st-cell">
              <span class="st-cell-label">武器星火</span>
              <CustomSelect id="flameLevel" :options="flameLevelOptions" />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">武器總攻擊</span><StatInput id="currentWeaponAtk" min="0" />
            </div>
            <div v-show="!hideSubFields" id="dynamicFieldsRow" class="st-cell">
              <span class="st-cell-label">卷軸攻擊總和</span><StatInput id="scrollAtk" />
            </div>
            <div v-show="!hideSubFields" id="dynamicStarRow" class="st-cell">
              <span class="st-cell-label">武器星力</span
              ><StatInput id="starCount" min="0" max="25" placeholder="請輸入星力" />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">女皇祝福</span><StatInput id="adjEmpressBless" />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">P寵攻擊</span>
              <CoefficientCombobox
                id="adjPetAtk"
                toggle-label="顯示P寵攻擊選項"
                :options="[
                  { value: '8', label: '8 (1set)' },
                  { value: '18', label: '18 (2set)' },
                  { value: '36', label: '36 (3set)' },
                ]"
              />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">萌獸終傷</span><FamFinalSourcesControl field-id="famFinal" />
            </div>
          </div>
          <div class="st-row">
            <span class="st-row-group-title">活動 Buff</span>
            <div class="st-cell">
              <span class="st-cell-label">活動B傷</span><StatInput id="adjEventBossDmg" />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">活動爆傷</span><StatInput id="adjEventCritDmg" />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">活動攻擊</span><StatInput id="adjEventAtk" />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">活動全屬</span><StatInput id="adjEventAllStat" />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">活動HP</span><StatInput id="adjEventHP" />
            </div>
          </div>
          <div class="st-row">
            <span class="st-row-group-title">結界與師徒</span>
            <div class="st-cell">
              <span class="st-cell-label">結界{{ barrierMainLabel }}</span
              ><StatInput id="adjBarrierMainStat" />
            </div>
            <div v-show="job !== 'xenon'" id="barrierSubStatGroup" class="st-cell">
              <span class="st-cell-label">結界{{ barrierSubLabel }}</span
              ><StatInput id="adjBarrierSubStat" />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">結界攻擊</span><StatInput id="adjBarrierAtk" />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">結界{{ barrierMainLabel }}%</span
              ><StatInput id="adjBarrierMainStatPercent" />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">師徒B傷</span><StatInput id="adjMentorBossDmg" />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">師徒攻擊</span><StatInput id="adjMentorAtk" />
            </div>
          </div>
        </div>
        <span
          v-show="job === 'xenon' || job === 'da' || store.isZeroJob || store.isRuinFinalJob"
          id="specialItemsSubtitle"
          class="compact-subtitle"
          >職業特殊項目</span
        >
        <div class="bonus-extra-grid bonus-extra-grid--special">
          <div v-show="job === 'xenon'" id="xenonStarGroup" class="input-group">
            <label>星力轉換屬性</label>
            <StatInput id="adjXenonStar" />
          </div>
          <div
            v-show="job === 'xenon'"
            id="xenonPowerCoefficientGroup"
            class="input-group"
            title="此為實驗性功能"
          >
            <label>戰鬥力係數</label>
            <CoefficientCombobox
              id="adjXenonPowerCoefficient"
              toggle-label="顯示傑諾戰鬥力係數選項"
              :options="[
                { value: '0.65625', label: '0.65625' },
                { value: '0.74375', label: '0.74375' },
              ]"
            />
          </div>
          <div v-show="job === 'da'" id="daHPGroup" class="input-group">
            <label>基本HP</label>
            <StatInput id="adjDAHP" />
          </div>
          <div v-show="job === 'da'" id="daStarGroup" class="input-group">
            <label>星力轉換HP</label>
            <StatInput id="adjDASpStar" />
          </div>
          <div
            v-show="job === 'da'"
            id="daPowerCoefficientGroup"
            class="input-group"
            title="此為實驗性功能"
          >
            <label>戰鬥力係數</label>
            <CoefficientCombobox
              id="adjDAPowerCoefficient"
              toggle-label="顯示惡魔復仇者戰鬥力係數選項"
              :options="[{ value: '0.75', label: '0.75' }]"
            />
          </div>
          <div v-show="store.isZeroJob" id="zeroWeaponFlameBossGroup" class="input-group">
            <label>武器基礎B總傷(含星火)</label>
            <StatInput id="adjZeroWeaponFlameBossDmg" />
          </div>
          <div v-show="store.isRuinFinalJob" id="ruinFinalGroup" class="input-group">
            <label>毀滅盾牌</label>
            <CustomSelect id="ruinFinal" :options="ruinFinalOptions" />
          </div>
        </div>
      </div>
    </div>

    <div class="calc-side">
      <BuffPanel mode="combat" />
    </div>
  </div>
</template>
