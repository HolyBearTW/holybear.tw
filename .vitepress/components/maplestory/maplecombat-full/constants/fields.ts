// 欄位註冊表：所有可儲存輸入欄位（150 個）。
// id 同時是 localStorage key 與匯出 JSON values 的 key，不可更動。

export type FieldKind = 'number' | 'checkbox' | 'select' | 'hidden'

export interface FieldDef {
  id: string
  kind: FieldKind
  default: string | boolean
  /** select 合法選項（匯入時驗證，非法值忽略） */
  options?: string[]
}

const n = (id: string, def = ''): FieldDef => ({ id, kind: 'number', default: def })
const c = (id: string, def = false): FieldDef => ({ id, kind: 'checkbox', default: def })
const s = (id: string, def: string, options: string[]): FieldDef => ({
  id,
  kind: 'select',
  default: def,
  options,
})
const h = (id: string, def: string): FieldDef => ({ id, kind: 'hidden', default: def })

// prettier-ignore
export const fieldDefs: FieldDef[] = [
  // ── 戰鬥力資料：主要能力值 ──
  n('baseMain'), n('percentMain'), n('noApplyMain'), n('skillBaseMain'), n('skillPercentMain'),
  n('baseSub'), n('percentSub'), n('noApplySub'), n('skillBaseSub'), n('skillPercentSub'),
  c('includeSecondSub'),
  n('baseSubtwo'), n('percentSubtwo'), n('noApplySubtwo'), n('skillBaseSubtwo'), n('skillPercentSubtwo'),
  n('atk'), n('percentAtk'), n('noApplyAtk'), n('skillAtk'), n('skillPercentAtk'),
  // ── 戰鬥力資料：特殊能力值 ──
  n('dmg'), n('skillDmg'), n('bossDmg'), n('skillBossDmg'), n('critDmg'), n('skillCritDmg'),
  // ── 戰鬥力資料：特殊項目 ──
  c('genesisFinalCheck'),
  s('weaponSet', 'fortune', ['fortune', 'genesis', 'arcane', 'absolab', 'fafnir']),
  s('flameLevel', '3', ['0', '1', '2', '3', '4', '5', '6', '7']),
  n('currentWeaponAtk'), n('scrollAtk', '72'), n('starCount', '22'),
  n('adjEmpressBless', '30'), n('adjPetAtk', '0'), n('famFinal'), h('famFinalSources', ''),
  n('adjEventBossDmg'), n('adjEventCritDmg'), n('adjEventAtk'), n('adjEventAllStat'), n('adjEventHP'),
  n('adjBarrierMainStat'), n('adjBarrierSubStat'), n('adjBarrierAtk'), n('adjBarrierMainStatPercent'),
  n('adjMentorBossDmg', '10'), n('adjMentorAtk', '10'),
  n('adjXenonStar', '70'), n('adjXenonPowerCoefficient', '0.65625'),
  n('adjDAHP'), n('adjDASpStar'), n('adjDAPowerCoefficient', '0.75'),
  n('adjZeroWeaponFlameBossDmg', '30'),
  s('ruinFinal', '0', ['0', '10']),
  // ── 實戰資料 ──
  n('effBaseMain'), n('effPercentMain'), n('effNoApplyMain'),
  n('effBaseSub'), n('effPercentSub'), n('effNoApplySub'),
  c('effIncludeSecondSub'),
  n('effBaseSubtwo'), n('effPercentSubtwo'), n('effNoApplySubtwo'),
  n('effAtk'), n('effPercentAtk'), n('effNoApplyAtk'),
  n('effDmg'), n('effBossDmg'), n('effCritDmg'),
  n('effFamFinal'), h('effFamFinalSources', ''), n('effIgnoreDefense'), n('effMonsterDefense', '380'), n('effBaseHP'),
  // ── 裝備變更：原裝備 ──
  n('eqOldBaseMain'), n('eqOldPercentMain'), n('eqOldNoApplyMain'),
  n('eqOldBaseSub'), n('eqOldPercentSub'), n('eqOldNoApplySub'),
  n('eqOldBaseSubtwo'), n('eqOldPercentSubtwo'), n('eqOldNoApplySubtwo'),
  n('eqOldAllStat'), n('eqOldAllStatPercent'),
  n('eqOldAtk'), n('eqOldPercentAtk'),
  n('eqOldDmg'), n('eqOldBossDmg'), n('eqOldCritDmg'), n('eqOldFamFinal'), h('eqOldFamFinalSources', ''), n('eqOldIgnoreDefense'),
  // ── 裝備變更：變更後裝備 ──
  n('eqNewBaseMain'), n('eqNewPercentMain'), n('eqNewNoApplyMain'),
  n('eqNewBaseSub'), n('eqNewPercentSub'), n('eqNewNoApplySub'),
  n('eqNewBaseSubtwo'), n('eqNewPercentSubtwo'), n('eqNewNoApplySubtwo'),
  n('eqNewAllStat'), n('eqNewAllStatPercent'),
  n('eqNewAtk'), n('eqNewPercentAtk'),
  n('eqNewDmg'), n('eqNewBossDmg'), n('eqNewCritDmg'), n('eqNewFamFinal'), h('eqNewFamFinalSources', ''), n('eqNewIgnoreDefense'),
  // ── 數值換算：顯示設定 ──
  c('effShowActualGain', true), c('effShowCombatGain'),
  h('effDisplayMode', 'common'),
  h('effCustomMetricKeys', 'baseMain,percentMain,allStatPercent,atk,percentAtk,dmg,critDmg'),
  h('effSelectedMetric1', 'percentMain'), h('effSelectedMetric2', 'atk'), h('effSelectedMetric3', 'dmg'),
  h('effMetricPanelOpen1', 'true'), h('effMetricPanelOpen2', 'true'), h('effMetricPanelOpen3', 'true'),
  // ── 塔戒整場增幅設定 ──
  n('towerRingTotalSharePercent', '36'),
  c('towerRingMugongCycle1', true), c('towerRingMugongCycle2'), c('towerRingMugongCycle3', true),
  n('towerRingCoverageLv1', '45'), n('towerRingCoverageLv2', '55'),
  n('towerRingCoverageLv3', '65'), n('towerRingCoverageLv4', '75'),
  // ── 數值換算：基準單位 ──
  n('effUnitBaseMain', '1'), n('effUnitPercentMain', '1'), n('effUnitNoApplyMain', '1'),
  n('effUnitBaseSub', '1'), n('effUnitPercentSub', '1'), n('effUnitNoApplySub', '1'),
  n('effUnitBaseSubtwo', '1'), n('effUnitPercentSubtwo', '1'), n('effUnitNoApplySubtwo', '1'),
  n('effUnitAtk', '1'), n('effUnitPercentAtk', '1'), n('effUnitDmg', '1'), n('effUnitBossDmg', '1'),
  n('effUnitCritDmg', '1'), n('effUnitFamFinal', '1'), n('effUnitIgnoreDefense', '1'),
  n('effUnitAllStat', '1'), n('effUnitAllStatPercent', '1'),
]

export const fieldDefById: Record<string, FieldDef> = Object.fromEntries(
  fieldDefs.map((def) => [def.id, def]),
)
