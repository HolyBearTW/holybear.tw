// 塔戒整場輸出增幅：以三次爆發週期占比、各週期武公狀態與塔戒覆蓋率計算。
import { calculateEquipmentOutput, type ActualDamageContext } from '../actualDamage'
import type { FieldValues } from '../types'
import {
  getEffBuffDelta,
  getEffBuffIgnoreFactor,
  clampBuffLevel,
  type BuffComputeContext,
  type BuffState,
} from './delta'
import type { BuffAbility, BuffDefinition, ParsedBuffTable } from './parse'

export const TOWER_RING_IDS: readonly string[] = ['skill:規範戒指', 'skill:永續戒指']
export const TOWER_RING_EQUIVALENT_ID = 'skill:規範戒指'
export const MUGONG_BUFF_ID = 'skill:無雙之力'

export const TOWER_RING_COVERAGE = [
  { level: 1, seconds: 9, defaultPercent: 45, field: 'towerRingCoverageLv1' },
  { level: 2, seconds: 11, defaultPercent: 55, field: 'towerRingCoverageLv2' },
  { level: 3, seconds: 13, defaultPercent: 65, field: 'towerRingCoverageLv3' },
  { level: 4, seconds: 15, defaultPercent: 75, field: 'towerRingCoverageLv4' },
] as const

export const TOWER_RING_SETTINGS_ROWS = [
  ...TOWER_RING_COVERAGE,
  { level: 5, seconds: 20, defaultPercent: 100, field: null },
  { level: 6, seconds: 20, defaultPercent: 100, field: null },
] as const

export interface TowerRingCycleSettings {
  totalSharePercent: number | null
  mugongCycles: readonly [boolean, boolean, boolean]
}

export interface TowerRingWholeBattleInput extends TowerRingCycleSettings {
  baseAtkPercent: number | null
  mugongAtkPercent: number
  ringAtkPercent: number
  coverage: number
}

export interface TowerRingGainInput extends TowerRingCycleSettings {
  table: ParsedBuffTable
  state: BuffState
  ctx: BuffComputeContext
  fields: FieldValues
  effJob: ActualDamageContext['effJob']
  /** 實戰資料攻擊力%的原始輸入；空值時不可計算。 */
  baseAtkPercentRaw: unknown
  /** Lv.1～Lv.4 的 20 秒傷害覆蓋率百分比；未提供時使用預設值。 */
  coveragePercentages?: readonly [number, number, number, number]
}

export interface TowerRingLevelGain {
  level: number
  /** 相對未裝備（Lv.0）的完整實戰輸出差值。 */
  vsNone: number | null
  /** 相對目前全域等級錨點的完整實戰輸出差值。 */
  vsCurrent: number | null
  current: boolean
  /** 三週期加權後的整場輸出增幅。 */
  equivalent: number | null
}

/**
 * 塔戒卡片的局部情境：先移除所有非常駐 Buff，再套用該卡片明示的搭配。
 * 非常駐清單由資料表判定，避免新增 Buff 後漏進試算基準。
 */
export function buildTowerRingScenarioState(
  table: ParsedBuffTable,
  state: BuffState,
  picks: Readonly<Record<string, number>> = {},
): BuffState {
  const scenario: BuffState = { ...state }
  table.categories.forEach((category) => {
    category.buffs.forEach((buff) => {
      if (buff.nonPermanent) scenario[buff.id] = 0
    })
  })
  Object.entries(picks).forEach(([id, level]) => {
    scenario[id] = clampBuffLevel(table.buffIndex[id], level)
  })
  return scenario
}

function abilityValue(abilities: BuffAbility[] | undefined, category: BuffAbility['cat']): number {
  return (abilities || [])
    .filter((ability) => ability.cat === category)
    .reduce((sum, ability) => sum + ability.value, 0)
}

function rawPercentAtk(buff: BuffDefinition | undefined, level: number): number {
  if (!buff) return 0
  return abilityValue(buff.instantLevels[level] || buff.levels[level], 'percentAtk')
}

export function getTowerRingAtkPercent(table: ParsedBuffTable, level: number): number {
  return rawPercentAtk(table.buffIndex[TOWER_RING_EQUIVALENT_ID], level)
}

function ringCoverage(input: TowerRingGainInput, level: number): number {
  if (level >= 5) return 1
  const entry = TOWER_RING_COVERAGE.find((item) => item.level === level)
  if (!entry) return 0
  const percent = input.coveragePercentages?.[level - 1] ?? entry.defaultPercent
  return Number.isFinite(percent) && percent >= 0 && percent <= 100 ? percent / 100 : NaN
}

function effOutput(input: TowerRingGainInput, state: BuffState): number {
  const delta = getEffBuffDelta(input.table, state, input.ctx, { instant: true })
  const ignoreFactor = getEffBuffIgnoreFactor(input.table, state, input.ctx.soulOrb, {
    instant: true,
  })
  return calculateEquipmentOutput(input.fields, { effJob: input.effJob, ignoreFactor }, {}, delta)
}

function gainPercent(base: number, changed: number): number | null {
  if (!base || base <= 0 || !Number.isFinite(base) || !Number.isFinite(changed)) return null
  return ((changed - base) / base) * 100
}

/**
 * 取得未套用塔戒、未套用武公的攻擊力%。
 * 其他已選 Buff 仍照目前狀態計入；前方 Buff 區的武公開關會被強制忽略。
 */
export function resolveTowerRingBaseAtkPercent(input: TowerRingGainInput): number | null {
  const raw = String(input.baseAtkPercentRaw ?? '').trim()
  if (raw === '' || !Number.isFinite(Number(raw))) return null

  const baseState: BuffState = { ...input.state, [MUGONG_BUFF_ID]: 0 }
  for (const ringId of TOWER_RING_IDS) baseState[ringId] = 0
  const delta = getEffBuffDelta(input.table, baseState, input.ctx)
  const value = Number(raw) + Number(delta.effPercentAtk || 0)
  return Number.isFinite(value) ? value : null
}

export function calculateTowerRingCycleShares(
  input: Pick<
    TowerRingWholeBattleInput,
    'totalSharePercent' | 'baseAtkPercent' | 'mugongAtkPercent' | 'mugongCycles'
  >,
): [number, number, number] | null {
  const { totalSharePercent, baseAtkPercent, mugongAtkPercent, mugongCycles } = input
  if (
    totalSharePercent === null ||
    !Number.isFinite(totalSharePercent) ||
    totalSharePercent < 0 ||
    totalSharePercent > 100 ||
    baseAtkPercent === null ||
    !Number.isFinite(baseAtkPercent) ||
    !Number.isFinite(mugongAtkPercent)
  ) {
    return null
  }

  const baseDenominator = 100 + baseAtkPercent
  if (baseDenominator <= 0 || 100 + baseAtkPercent + mugongAtkPercent <= 0) return null

  const mugongMultiplier = (100 + baseAtkPercent + mugongAtkPercent) / (100 + baseAtkPercent)
  const weights = mugongCycles.map((enabled) => (enabled ? mugongMultiplier : 1))
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0)
  if (!Number.isFinite(weightTotal) || weightTotal <= 0) return null

  return weights.map((weight) => (totalSharePercent * weight) / weightTotal) as [
    number,
    number,
    number,
  ]
}

export function calculateTowerRingWholeBattleGain(input: TowerRingWholeBattleInput): number | null {
  if (
    !Number.isFinite(input.ringAtkPercent) ||
    !Number.isFinite(input.coverage) ||
    input.coverage < 0 ||
    input.coverage > 1
  ) {
    return null
  }

  const shares = calculateTowerRingCycleShares(input)
  if (!shares || input.baseAtkPercent === null) return null

  return shares.reduce((total, share, index) => {
    const denominator =
      100 + input.baseAtkPercent! + (input.mugongCycles[index] ? input.mugongAtkPercent : 0)
    return total + (share * input.coverage * input.ringAtkPercent) / denominator
  }, 0)
}

/**
 * 以目前全域等級作為錨點，比較未裝與各候選等級的完整實戰輸出差值。
 * equivalent 暫無 UI 入口，保留供未來「整場平均」選配功能復用。
 */
export function getTowerRingGains(
  input: TowerRingGainInput,
  ringId: string,
  anchorLevel = 0,
): TowerRingLevelGain[] {
  const ring = input.table.buffIndex[ringId]
  if (!ring) return []

  const currentLevel = ring.levelKeys.includes(anchorLevel) ? anchorLevel : 0
  const noneState: BuffState = { ...input.state, [ringId]: 0 }
  const noneOutput = effOutput(input, noneState)
  const anchorState: BuffState = { ...input.state, [ringId]: currentLevel }
  const anchorOutput = effOutput(input, anchorState)
  const baseAtkPercent = resolveTowerRingBaseAtkPercent(input)
  const mugong = input.table.buffIndex[MUGONG_BUFF_ID]
  const mugongAtkPercent = rawPercentAtk(mugong, 1)

  return [0, ...ring.levelKeys].map((level) => {
    const ringState: BuffState = { ...input.state, [ringId]: level }
    const output = effOutput(input, ringState)
    return {
      level,
      vsNone: gainPercent(noneOutput, output),
      vsCurrent: gainPercent(anchorOutput, output),
      current: level === currentLevel,
      equivalent:
        level > 0 && ringId === TOWER_RING_EQUIVALENT_ID
          ? calculateTowerRingWholeBattleGain({
              totalSharePercent: input.totalSharePercent,
              baseAtkPercent,
              mugongAtkPercent,
              mugongCycles: input.mugongCycles,
              ringAtkPercent: rawPercentAtk(ring, level),
              coverage: ringCoverage(input, level),
            })
          : null,
    }
  })
}
