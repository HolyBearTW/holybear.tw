import type { BuffDelta, FieldValues, JobCategory, PowerResult } from './types'
import { resolveFamMult } from './familiar'
import { floorPercentApplied } from './percentFloor'
import type { CombatCorrectionState } from './combatCorrections'

export interface CombatPowerContext {
  /** 職業分類（localStorage selectedJob） */
  jobCategory: JobCategory
  /** 完整職業名稱（selectedJobName，用於 神之子/惡魔殺手 特判） */
  jobName: string
  /** 武器套裝選擇（weaponSet select 原始值） */
  weaponSet: string
  /** 創世武器 10% 終傷勾選 */
  genesisFinalChecked: boolean
  /** 是否計入 Buff（戰鬥力校正僅在此模式生效） */
  useBuff: boolean
  /** 使用者選擇的含 Buff 戰鬥力校正；未提供時全部視為關閉。 */
  combatCorrections?: CombatCorrectionState
  /**
   * 海外職業 + 創世武器 + useBuff 時加到 adjWeaponAtk 的校正差值
   * （= calculateWeaponCorrectionValue('genesis') - calculateWeaponCorrectionValue(resolveWeaponDataKey())）
   */
  overseasGenesisAtkDelta: number
  /** 戰鬥力係數欄位原始字串（空字串 = 使用預設，係數 1） */
  xenonPowerCoefficientRaw: string
  daPowerCoefficientRaw: string
  /** 萌獸終傷逐條來源（已解析）；有值時直接以 float32 累加，不猜測組成。 */
  famFinalSources?: number[]
}

// 空字串回傳 1（未輸入 = 不調整），與 0 的語意不同
export function powerCoefficientFactor(rawValue: string, defaultValue: number): number {
  const trimmed = String(rawValue).trim()
  if (trimmed === '') return 1
  const value = Number(trimmed)
  return Number.isFinite(value) ? value / defaultValue : 1
}

export interface FormulaStatBreakdown {
  base: number
  percent: number
  noApply: number
  total: number
  /** 顯示用：遊戲面板等值（由字面輸入算出，未扣技能.消耗、未套其他校正）。不參與公式。 */
  panel: number
  /** 顯示用：該數值輸入的技能.消耗（基本數值）。不參與公式。 */
  skillBase: number
  /** 顯示用：該數值輸入的技能.消耗（%）。不參與公式。 */
  skillPercent: number
}

/** 顯示用：傷害類（傷害/Boss/爆擊）的扣前面板值與技能.消耗。不參與公式。 */
export interface FormulaDamageBreakdown {
  /** 校正後代入值（= panel − skill） */
  value: number
  /** 遊戲面板等值（扣技能.消耗前） */
  panel: number
  /** 輸入的技能.消耗 */
  skill: number
}

export interface CombatFormulaInputs {
  main: FormulaStatBreakdown
  sub: FormulaStatBreakdown
  subtwo: FormulaStatBreakdown | null
  attack: FormulaStatBreakdown
  damage: number
  bossDamage: number
  critDamage: number
  /** 顯示用：傷害/Boss/爆擊的扣前面板值與技能.消耗。不參與公式。 */
  damageDetail: FormulaDamageBreakdown
  bossDamageDetail: FormulaDamageBreakdown
  critDamageDetail: FormulaDamageBreakdown
  rawDmgSum: number
  rawCritSum: number
  finalMult: number
  equivalentMain: number
}

/** 顯示用：由字面輸入重建遊戲面板等值（與戰鬥力公式同樣 floor，但不扣技能.消耗、不套其他校正）。 */
function panelStatValue(base: number, percent: number, noApply: number): number {
  return floorPercentApplied(base, percent) + noApply
}

/** 戰鬥力公式實際採用的校正後數值，同時供數值預覽顯示。 */
export function resolveCombatFormulaInputs(
  fields: FieldValues,
  ctx: CombatPowerContext,
  delta: FieldValues = {},
  buffDelta: BuffDelta = {},
): CombatFormulaInputs {
  const getVal = (id: string) => (fields[id] || 0) + (delta[id] || 0) + (buffDelta[id] || 0)
  const currentJob = ctx.jobCategory

  const adjEventAtk = getVal('adjEventAtk')
  const adjEventAllStat = getVal('adjEventAllStat')
  const adjEventBossDmg = getVal('adjEventBossDmg')
  const adjEventCritDmg = getVal('adjEventCritDmg')
  const adjEventHP = getVal('adjEventHP')
  const adjBarrierMainStat = getVal('adjBarrierMainStat')
  const adjBarrierSubStat = getVal('adjBarrierSubStat')
  const adjBarrierAtk = getVal('adjBarrierAtk')
  const adjBarrierMainStatPercent = getVal('adjBarrierMainStatPercent')
  const applyMentorCorrection = ctx.useBuff && ctx.combatCorrections?.mentor === true
  const adjMentorAtk = applyMentorCorrection ? 0 : getVal('adjMentorAtk')
  const adjMentorBossDmg = applyMentorCorrection ? 0 : getVal('adjMentorBossDmg')
  let adjWeaponAtk = getVal('adjWeaponAtk')
  const adjEmpressBless =
    currentJob === 'overseas'
      ? ctx.useBuff && ctx.combatCorrections?.empress === true
        ? getVal('adjEmpressBless')
        : 0
      : getVal('adjEmpressBless')
  const adjPetAtk = getVal('adjPetAtk')

  if (
    currentJob === 'overseas' &&
    ctx.useBuff &&
    ctx.combatCorrections?.genesis === true &&
    ctx.weaponSet === 'genesis'
  ) {
    adjWeaponAtk += ctx.overseasGenesisAtkDelta
  }

  const xenonStarBonus = currentJob === 'xenon' ? getVal('adjXenonStar') : 0
  const daStarBonus = currentJob === 'da' ? getVal('adjDASpStar') : 0
  const includeSecondSub = currentJob === 'xenon' || currentJob === 'dual'
  const barrierSubFlat =
    currentJob === 'xenon' ? adjBarrierMainStat : currentJob === 'dual' ? 0 : adjBarrierSubStat
  const barrierSecondSubFlat =
    currentJob === 'xenon' ? adjBarrierMainStat : currentJob === 'dual' ? adjBarrierSubStat : 0
  const barrierSubPercent = currentJob === 'xenon' ? adjBarrierMainStatPercent : 0

  const mainPercent = getVal('percentMain') + adjBarrierMainStatPercent - getVal('skillPercentMain')
  const mainNoApply = getVal('noApplyMain')
  let mainBase = 0
  let mainTotal = 0
  let equivalentMain = 0

  if (currentJob === 'da') {
    const effectiveBaseMain = getVal('baseMain') + adjEventHP + adjBarrierMainStat
    mainBase = effectiveBaseMain - getVal('skillBaseMain') + daStarBonus
    const roundedMain = floorPercentApplied(mainBase, mainPercent)
    mainTotal = roundedMain + mainNoApply
    const baseHP = getVal('adjDAHP')
    equivalentMain = baseHP / 3.5 + ((mainTotal - baseHP) / 3.5) * 0.8
  } else {
    mainBase =
      getVal('baseMain') +
      xenonStarBonus +
      adjEventAllStat +
      adjBarrierMainStat -
      getVal('skillBaseMain')
    mainTotal = floorPercentApplied(mainBase, mainPercent) + mainNoApply
    equivalentMain = mainTotal
  }

  const subBase =
    getVal('baseSub') + adjEventAllStat + barrierSubFlat - getVal('skillBaseSub') + xenonStarBonus
  const subPercent = getVal('percentSub') + barrierSubPercent - getVal('skillPercentSub')
  const subNoApply = getVal('noApplySub')
  const subTotal = floorPercentApplied(subBase, subPercent) + subNoApply

  let subtwo: FormulaStatBreakdown | null = null
  if (includeSecondSub) {
    const base =
      getVal('baseSubtwo') +
      adjEventAllStat +
      barrierSecondSubFlat -
      getVal('skillBaseSubtwo') +
      xenonStarBonus
    const percent = getVal('percentSubtwo') + barrierSubPercent - getVal('skillPercentSubtwo')
    const noApply = getVal('noApplySubtwo')
    subtwo = {
      base,
      percent,
      noApply,
      total: floorPercentApplied(base, percent) + noApply,
      panel: panelStatValue(getVal('baseSubtwo'), getVal('percentSubtwo'), noApply),
      skillBase: getVal('skillBaseSubtwo'),
      skillPercent: getVal('skillPercentSubtwo'),
    }
  }

  const attackBase =
    getVal('atk') +
    adjWeaponAtk +
    adjEmpressBless +
    adjPetAtk +
    adjEventAtk +
    adjBarrierAtk -
    getVal('skillAtk') -
    adjMentorAtk
  const attackPercent = getVal('percentAtk') - getVal('skillPercentAtk')
  const attackNoApply = getVal('noApplyAtk')
  const attackTotal = floorPercentApplied(attackBase, attackPercent) + attackNoApply

  const zeroBossDmgPenalty = ctx.jobName === '神之子' ? getVal('adjZeroWeaponFlameBossDmg') : 0
  const damage = getVal('dmg') - getVal('skillDmg')
  const bossDamage =
    getVal('bossDmg') +
    adjEventBossDmg -
    adjMentorBossDmg -
    zeroBossDmgPenalty -
    getVal('skillBossDmg')
  const critDamage = getVal('critDmg') + adjEventCritDmg - getVal('skillCritDmg')
  const rawDmgSum = 1 + (damage + bossDamage) / 100
  const rawCritSum = 1.35 + critDamage / 100

  const genesisMult = ctx.genesisFinalChecked ? 1.1 : 1.0
  const ruinMult =
    currentJob === 'da' || ctx.jobName === '惡魔殺手' ? 1 + getVal('ruinFinal') / 100 : 1
  const equipmentFamMultiplierFactor = delta.__eqFamFinalMultiplierFactor ?? 1
  const famMult =
    resolveFamMult(ctx.famFinalSources, getVal('famFinal')) * equipmentFamMultiplierFactor

  return {
    main: {
      base: mainBase,
      percent: mainPercent,
      noApply: mainNoApply,
      total: mainTotal,
      panel: panelStatValue(getVal('baseMain'), getVal('percentMain'), mainNoApply),
      skillBase: getVal('skillBaseMain'),
      skillPercent: getVal('skillPercentMain'),
    },
    sub: {
      base: subBase,
      percent: subPercent,
      noApply: subNoApply,
      total: subTotal,
      panel: panelStatValue(getVal('baseSub'), getVal('percentSub'), subNoApply),
      skillBase: getVal('skillBaseSub'),
      skillPercent: getVal('skillPercentSub'),
    },
    subtwo,
    attack: {
      base: attackBase,
      percent: attackPercent,
      noApply: attackNoApply,
      total: attackTotal,
      panel: panelStatValue(getVal('atk'), getVal('percentAtk'), attackNoApply),
      skillBase: getVal('skillAtk'),
      skillPercent: getVal('skillPercentAtk'),
    },
    damage,
    bossDamage,
    critDamage,
    damageDetail: { value: damage, panel: getVal('dmg'), skill: getVal('skillDmg') },
    bossDamageDetail: {
      value: bossDamage,
      panel: getVal('bossDmg'),
      skill: getVal('skillBossDmg'),
    },
    critDamageDetail: {
      value: critDamage,
      panel: getVal('critDmg'),
      skill: getVal('skillCritDmg'),
    },
    rawDmgSum,
    rawCritSum,
    finalMult: genesisMult * famMult * ruinMult,
    equivalentMain,
  }
}

/**
 * 戰鬥力主公式。
 * fields/delta/buffDelta 三者為獨立加項（getVal = fields + delta + buffDelta）。
 */
export function calculatePower(
  fields: FieldValues,
  ctx: CombatPowerContext,
  delta: FieldValues = {},
  buffDelta: BuffDelta = {},
): PowerResult {
  const currentJob = ctx.jobCategory
  const resolved = resolveCombatFormulaInputs(fields, ctx, delta, buffDelta)
  const combatSubtwo = resolved.subtwo?.total || 0
  const commonMultiplier =
    (resolved.attack.total * resolved.rawDmgSum * resolved.rawCritSum * resolved.finalMult) / 100

  if (currentJob === 'xenon') {
    const baseStatSum = resolved.main.total + resolved.sub.total + combatSubtwo
    const factor = powerCoefficientFactor(ctx.xenonPowerCoefficientRaw, 0.74375)
    const powerHigh = Math.floor(2.625 * baseStatSum * commonMultiplier * factor)
    const powerLow = Math.floor(2.975 * baseStatSum * commonMultiplier * factor)

    return { type: 'range', high: powerHigh, low: powerLow }
  } else if (currentJob === 'da') {
    const factor = powerCoefficientFactor(ctx.daPowerCoefficientRaw, 0.75)
    const powerHigh = Math.floor(
      0.85 *
        (resolved.equivalentMain + resolved.sub.total + combatSubtwo) *
        commonMultiplier *
        factor,
    )
    const powerLow = Math.floor(
      0.75 *
        (resolved.equivalentMain + resolved.sub.total + combatSubtwo) *
        commonMultiplier *
        factor,
    )

    return { type: 'range', high: powerHigh, low: powerLow }
  } else {
    const powerNormal = Math.floor(
      (4 * resolved.main.total + resolved.sub.total + combatSubtwo) * commonMultiplier,
    )
    return { type: 'single', value: powerNormal }
  }
}

/** 從戰鬥力結果取單一代表值（range 職業取低戰力） */
export function powerValue(result: PowerResult | null | undefined): number {
  if (!result) return 0
  return result.type === 'range' ? result.low : result.value
}
