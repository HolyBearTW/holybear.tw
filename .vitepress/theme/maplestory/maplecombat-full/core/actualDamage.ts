import type { BuffDelta, FieldValues, JobCategory } from './types'
import { resolveFamMult } from './familiar'
import { floorPercentApplied } from './percentFloor'
import { calculateDefenseMultiplier } from '../../calculator/combatMath'

export interface ActualDamageContext {
  /** 實戰分頁的職業分類（localStorage effSelectedJob） */
  effJob: JobCategory
  /** Buff 無視防禦率乘法堆疊因子 ∏(1-無視i)；不計 Buff 時為 1 */
  ignoreFactor: number
  /** 實戰萌獸終傷逐條來源（已解析）；有值時直接以 float32 累加，不猜測組成。 */
  effFamFinalSources?: number[]
}

export interface ActualFormulaInputs {
  main: { base: number; percent: number; noApply: number; total: number }
  sub: { base: number; percent: number; noApply: number; total: number }
  subtwo: { base: number; percent: number; noApply: number; total: number } | null
  attack: { base: number; percent: number; noApply: number; total: number }
  damage: number
  bossDamage: number
  critDamage: number
  totalStat: number
  finalMultiplier: number
  defenseMultiplier: number
}

/** 實戰公式實際採用的數值，同時供數值預覽顯示。 */
export function resolveActualFormulaInputs(
  fields: FieldValues,
  ctx: ActualDamageContext,
  delta: FieldValues = {},
  effBuffDelta: BuffDelta = {},
): ActualFormulaInputs {
  const getVal = (id: string) => (fields[id] || 0) + (delta[id] || 0) + (effBuffDelta[id] || 0)
  const statValue = (baseId: string, percentId: string, noApplyId: string) => {
    const base = getVal(baseId)
    const percent = getVal(percentId)
    const noApply = getVal(noApplyId)
    return { base, percent, noApply, total: base * (1 + percent / 100) + noApply }
  }

  const main = statValue('effBaseMain', 'effPercentMain', 'effNoApplyMain')
  const sub = statValue('effBaseSub', 'effPercentSub', 'effNoApplySub')
  const includeSecondSub = ctx.effJob === 'xenon' || ctx.effJob === 'dual'
  const subtwo = includeSecondSub
    ? statValue('effBaseSubtwo', 'effPercentSubtwo', 'effNoApplySubtwo')
    : null

  let totalStat: number
  if (ctx.effJob === 'xenon') {
    totalStat = main.total + sub.total + (subtwo?.total || 0)
  } else if (ctx.effJob === 'da') {
    const totalHP = floorPercentApplied(main.base, main.percent) + main.noApply
    const baseHP = getVal('effBaseHP')
    const hpEquiv = Math.floor(baseHP / 3.5) + Math.floor((totalHP - baseHP) / 3.5) * 0.8
    totalStat = hpEquiv + sub.total
  } else {
    totalStat = main.total * 4 + sub.total + (subtwo?.total || 0)
  }

  const attack = statValue('effAtk', 'effPercentAtk', 'effNoApplyAtk')
  const damage = getVal('effDmg')
  const bossDamage = getVal('effBossDmg')
  const critDamage = getVal('effCritDmg')
  const equipmentFamMultiplierFactor = delta.__eqFamFinalMultiplierFactor ?? 1
  const finalMultiplier =
    resolveFamMult(ctx.effFamFinalSources, getVal('effFamFinal')) * equipmentFamMultiplierFactor

  const monsterDefense = getVal('effMonsterDefense')
  const eqIgnoreResidualFactor =
    delta.__eqIgnoreResidualFactor != null ? delta.__eqIgnoreResidualFactor : 1
  const ignoreDefense = Math.max(
    0,
    Math.min(
      1,
      1 - (1 - getVal('effIgnoreDefense') / 100) * ctx.ignoreFactor * eqIgnoreResidualFactor,
    ),
  )
  const defenseMultiplier = calculateDefenseMultiplier(ignoreDefense * 100, monsterDefense)

  return {
    main,
    sub,
    subtwo,
    attack,
    damage,
    bossDamage,
    critDamage,
    totalStat,
    finalMultiplier,
    defenseMultiplier,
  }
}

/**
 * 實戰輸出公式。
 * delta 可帶特殊鍵 __eqIgnoreResidualFactor（裝備無視防禦乘法因子）。
 */
export function calculateEquipmentOutput(
  fields: FieldValues,
  ctx: ActualDamageContext,
  delta: FieldValues = {},
  effBuffDelta: BuffDelta = {},
): number {
  const resolved = resolveActualFormulaInputs(fields, ctx, delta, effBuffDelta)
  const damageMultiplier = 1 + (resolved.damage + resolved.bossDamage) / 100
  const critMultiplier = 1.35 + resolved.critDamage / 100
  const elementalResistanceMultiplier = 0.525

  return (
    resolved.attack.total *
    damageMultiplier *
    critMultiplier *
    resolved.totalStat *
    resolved.finalMultiplier *
    resolved.defenseMultiplier *
    elementalResistanceMultiplier
  )
}
