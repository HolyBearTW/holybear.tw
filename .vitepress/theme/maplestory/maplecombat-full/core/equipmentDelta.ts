import type { FieldValues, JobCategory } from './types'
import { guessFamSources, resolveFamMult } from './familiar'

export interface EquipmentFamSources {
  base?: number[]
  old?: number[]
  new?: number[]
}

// 裝備變更欄位對照（target 欄位 ← eqNew/eqOld 後綴）
const EQUIPMENT_DELTA_FIELDS: ReadonlyArray<readonly [string, string]> = [
  ['baseMain', 'BaseMain'],
  ['percentMain', 'PercentMain'],
  ['noApplyMain', 'NoApplyMain'],
  ['baseSub', 'BaseSub'],
  ['percentSub', 'PercentSub'],
  ['noApplySub', 'NoApplySub'],
  ['baseSubtwo', 'BaseSubtwo'],
  ['percentSubtwo', 'PercentSubtwo'],
  ['noApplySubtwo', 'NoApplySubtwo'],
  ['atk', 'Atk'],
  ['percentAtk', 'PercentAtk'],
  ['dmg', 'Dmg'],
  ['bossDmg', 'BossDmg'],
  ['critDmg', 'CritDmg'],
]

function getEquipmentFamMultiplierFactor(
  fields: FieldValues,
  basePct: number,
  sources?: EquipmentFamSources,
): number | null {
  const oldPct = fields.eqOldFamFinal || 0
  const newPct = fields.eqNewFamFinal || 0
  const hasFamChange =
    oldPct !== 0 ||
    newPct !== 0 ||
    (sources?.old?.length || 0) > 0 ||
    (sources?.new?.length || 0) > 0
  if (!hasFamChange) return null

  // 未啟用逐條時，各組先由自己的總值推測來源；不可先合併總值再猜整體組成。
  const baseSources = sources?.base?.length ? sources.base : guessFamSources(basePct)
  const oldSources = sources?.old?.length ? sources.old : guessFamSources(oldPct)
  const newSources = sources?.new?.length ? sources.new : guessFamSources(newPct)
  const adjustedSources = [...baseSources]
  for (const oldSource of oldSources) {
    const index = adjustedSources.indexOf(oldSource)
    if (index >= 0) adjustedSources.splice(index, 1)
  }
  adjustedSources.push(...newSources)

  const changedPct = basePct - oldPct + newPct
  const baseMultiplier = resolveFamMult(sources?.base, basePct)
  const changedMultiplier = resolveFamMult(adjustedSources, changedPct)
  return changedMultiplier / baseMultiplier
}

function getEquipmentStatDelta(fields: FieldValues, jobCategory: JobCategory): FieldValues {
  const getVal = (id: string) => fields[id] || 0
  const delta: FieldValues = {}
  EQUIPMENT_DELTA_FIELDS.forEach(([target, suffix]) => {
    delta[target] = getVal(`eqNew${suffix}`) - getVal(`eqOld${suffix}`)
  })

  // 萌獸終傷由目前來源扣除原裝備來源，再加入變更後裝備來源。
  // 保留 famFinal: 0 維持既有 delta shape，實際差異由倍率因子傳入公式。
  delta.famFinal = 0

  // 全屬 / 全屬%：惡魔復仇者只視為副屬；其餘職業併入主屬與副屬。
  const isDA = jobCategory === 'da'
  const includeSecondSub = jobCategory === 'xenon' || jobCategory === 'dual'
  const allStatDelta = getVal('eqNewAllStat') - getVal('eqOldAllStat')
  const allStatPercentDelta = getVal('eqNewAllStatPercent') - getVal('eqOldAllStatPercent')
  if (!isDA) {
    delta.baseMain += allStatDelta
    delta.percentMain += allStatPercentDelta
  }
  delta.baseSub += allStatDelta
  delta.percentSub += allStatPercentDelta
  if (includeSecondSub) {
    delta.baseSubtwo += allStatDelta
    delta.percentSubtwo += allStatPercentDelta
  }

  return delta
}

/** 裝備 delta：eqNew* - eqOld* 差值，全屬依職業分配 */
export function getEquipmentDelta(
  fields: FieldValues,
  jobCategory: JobCategory,
  famSources?: EquipmentFamSources,
): FieldValues {
  const delta = getEquipmentStatDelta(fields, jobCategory)
  const famMultiplierFactor = getEquipmentFamMultiplierFactor(
    fields,
    fields.famFinal || 0,
    famSources,
  )
  if (famMultiplierFactor != null) {
    delta.__eqFamFinalMultiplierFactor = famMultiplierFactor
  }

  return delta
}

/** 轉成 eff* 欄位 delta，並計算裝備無視防禦乘法因子 */
export function getEquipmentActualDelta(
  fields: FieldValues,
  jobCategory: JobCategory,
  famSources?: EquipmentFamSources,
): FieldValues {
  const equipmentDelta = getEquipmentStatDelta(fields, jobCategory)
  const getVal = (id: string) => fields[id] || 0
  // 無視防禦對戰鬥力無影響，僅影響實戰輸出，故只在此併入。
  // 無視防禦率為乘法堆疊（非加總）：殘存防禦透過率 ×= (1-新)/(1-舊)。
  // 例：基礎99% 換上 +20% 裝備 → 1-(1-99%)×(1-20%)=99.2%，而非 99%+20%。
  const eqOldIgnore = getVal('eqOldIgnoreDefense')
  const eqNewIgnore = getVal('eqNewIgnoreDefense')
  const oldResidual = 1 - eqOldIgnore / 100
  const eqIgnoreResidualFactor = oldResidual !== 0 ? (1 - eqNewIgnore / 100) / oldResidual : 0
  const delta: FieldValues = {
    effBaseMain: equipmentDelta.baseMain || 0,
    effPercentMain: equipmentDelta.percentMain || 0,
    effNoApplyMain: equipmentDelta.noApplyMain || 0,
    effBaseSub: equipmentDelta.baseSub || 0,
    effPercentSub: equipmentDelta.percentSub || 0,
    effNoApplySub: equipmentDelta.noApplySub || 0,
    effBaseSubtwo: equipmentDelta.baseSubtwo || 0,
    effPercentSubtwo: equipmentDelta.percentSubtwo || 0,
    effNoApplySubtwo: equipmentDelta.noApplySubtwo || 0,
    effAtk: equipmentDelta.atk || 0,
    effPercentAtk: equipmentDelta.percentAtk || 0,
    effDmg: equipmentDelta.dmg || 0,
    effBossDmg: equipmentDelta.bossDmg || 0,
    effCritDmg: equipmentDelta.critDmg || 0,
    effFamFinal: equipmentDelta.famFinal || 0,
    __eqIgnoreResidualFactor: eqIgnoreResidualFactor,
  }
  const famMultiplierFactor = getEquipmentFamMultiplierFactor(
    fields,
    fields.effFamFinal || 0,
    famSources,
  )
  if (famMultiplierFactor != null) {
    delta.__eqFamFinalMultiplierFactor = famMultiplierFactor
  }
  return delta
}

/** 將實戰資料欄位 id 轉成戰鬥力公式的 delta key（effBaseMain -> baseMain） */
export function effFieldToCombatKey(effFieldId: string): string {
  const stripped = String(effFieldId).replace(/^eff/, '')
  return stripped.charAt(0).toLowerCase() + stripped.slice(1)
}
