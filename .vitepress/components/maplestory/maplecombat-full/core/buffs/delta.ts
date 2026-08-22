// Buff delta 計算：純函式（state 與 ctx 由呼叫端傳入）。
import type { BuffDelta, JobCategory, JobStatLabels } from '../types'
import type { BuffAbility, BuffDefinition, ParsedBuffTable, StatCategoryKey } from './parse'

/** Buff 狀態：id -> 等級（check 型用 0/1） */
export type BuffState = Record<string, number>

export interface SoulOrbState {
  value: number
  stat: string
  fullSoul: boolean
}

/** 互斥 Buff 群組：同組內同時只能啟用一個（遊戲規則） */
export const EXCLUSIVE_BUFF_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  ['pot:閃閃發亮的紅色星星藥水', 'pot:閃閃發亮的藍色星星藥水'],
  ['pot:VIP超級力量券', 'pot:VIP終極力量券'],
  ['pot:榮譽靈藥', 'pot:275等椅子'],
  ['pot:地圖天氣', 'pot:一片鮮奶油蛋糕', 'pot:瑪瑙蘋果'],
  ['skill:無雙之力', 'skill:妖精密語'],
  ['skill:夕陽的現身', 'skill:午夜的現身'],
]

/** 傳授技能（pass:）同時啟用上限（遊戲規則） */
export const PASS_SKILL_MAX = 13

export const SOUL_ORB_STATS: ReadonlyArray<readonly [string, string]> = [
  ['percentStr', 'STR%'],
  ['percentDex', 'DEX%'],
  ['percentInt', 'INT%'],
  ['percentLuk', 'LUK%'],
  ['allStatPercent', '全屬性%'],
  ['dmg', '傷害'],
  ['bossDmg', 'Boss傷害'],
  ['percentAtk', '攻擊力%'],
  ['ignoreDefense', '無視防禦率'],
]

export interface BuffComputeContext {
  job: JobCategory
  /** 主屬/副屬/副屬2 顯示標籤（靈魂寶珠 STR%/DEX%… 分配用） */
  statLabels: JobStatLabels
  /** 當前實際武器攻擊力（實戰滿魂使用） */
  currentWeaponAtk: number
  /** 武器攻擊校正後的基準總攻（含 Buff 戰鬥力滿魂使用） */
  combatWeaponAtk: number
  soulOrb: SoulOrbState
}

type AddFn = (key: string, value: number) => void
interface StatDefCtx {
  job: JobCategory
  includeSub: boolean
}

interface StatDef {
  label: string
  percent: boolean
  combatKey?: string
  effKey?: string
  combatAdd?: (add: AddFn, v: number, ctx: StatDefCtx) => void
  effAdd?: (add: AddFn, v: number, ctx: StatDefCtx) => void
}

// 能力類型定義表（buffs.js STAT_DEFS 的計算部分）
export const STAT_DEFS: Record<StatCategoryKey, StatDef> = {
  atkFlat: { label: '攻擊力', percent: false, combatKey: 'atk', effKey: 'effAtk' },
  percentAtk: { label: '攻擊力', percent: true, combatKey: 'percentAtk', effKey: 'effPercentAtk' },
  dmg: { label: '傷害', percent: true, combatKey: 'dmg', effKey: 'effDmg' },
  bossDmg: { label: 'B傷', percent: true, combatKey: 'bossDmg', effKey: 'effBossDmg' },
  critDmg: { label: '爆傷', percent: true, combatKey: 'critDmg', effKey: 'effCritDmg' },
  // 戰鬥力公式無無視防禦；實戰由 getEffBuffIgnoreFactor 乘法堆疊處理
  ignoreDefense: { label: '無視防禦率', percent: true },
  // 全屬數值：戰鬥力交由公式依職業分配（adjEventAllStat）；實戰直接分配
  allStatFlat: {
    label: '全屬性',
    percent: false,
    combatKey: 'adjEventAllStat',
    effAdd(add, v, ctx) {
      add('effBaseSub', v)
      if (ctx.job !== 'da') add('effBaseMain', v)
      if (ctx.includeSub) add('effBaseSubtwo', v)
    },
  },
  allStatPercent: {
    label: '全屬性',
    percent: true,
    combatAdd(add, v, ctx) {
      add('percentSub', v)
      if (ctx.job !== 'da') add('percentMain', v)
      if (ctx.includeSub) add('percentSubtwo', v)
    },
    effAdd(add, v, ctx) {
      add('effPercentSub', v)
      if (ctx.job !== 'da') add('effPercentMain', v)
      if (ctx.includeSub) add('effPercentSubtwo', v)
    },
  },
  mainFlat: { label: '主屬', percent: false, combatKey: 'baseMain', effKey: 'effBaseMain' },
  subFlat: { label: '副屬', percent: false, combatKey: 'baseSub', effKey: 'effBaseSub' },
  subtwoFlat: { label: '副屬2', percent: false, combatKey: 'baseSubtwo', effKey: 'effBaseSubtwo' },
  hpFlat: {
    label: 'HP',
    percent: false,
    combatKey: 'adjEventHP',
    effAdd(add, v, ctx) {
      if (ctx.job === 'da') add('effBaseMain', v) // 實戰僅惡魔復仇者以 HP 為主屬
    },
  },
}

/** 走訪已選 Buff 的能力（等級 > 0）；useInstant 時優先取 {} 內技能開啟當下數值 */
function eachSelectedAbility(
  table: ParsedBuffTable,
  state: BuffState,
  fn: (a: BuffAbility) => void,
  useInstant = false,
): void {
  table.categories.forEach((c) =>
    c.buffs.forEach((b) => {
      const lvl = state[b.id] || 0
      if (lvl <= 0) return
      const key = b.type === 'check' ? 1 : lvl
      const abis = (useInstant && b.instantLevels[key]) || b.levels[key]
      if (!abis) return
      abis.forEach(fn)
    }),
  )
}

export function getSoulOrbAttackBonus(currentWeaponAtk: number): number {
  return Math.floor(Math.max(0, currentWeaponAtk || 0) / 10)
}

/** 靈魂寶珠加成分配（combat / eff 共用，鍵前綴不同） */
function addSoulOrbDelta(add: AddFn, mode: 'combat' | 'eff', ctx: BuffComputeContext): void {
  if (ctx.soulOrb.fullSoul === false) return

  const value = Number(ctx.soulOrb.value) || 0
  const statLabels = ctx.statLabels
  const prefix = mode === 'eff' ? 'eff' : ''
  const keyFor = (baseKey: string) =>
    prefix ? prefix + baseKey.charAt(0).toUpperCase() + baseKey.slice(1) : baseKey
  const percentKeyFor = (stat: string) =>
    statLabels.main === stat
      ? keyFor('percentMain')
      : statLabels.sub === stat
        ? keyFor('percentSub')
        : statLabels.secondSub === stat
          ? keyFor('percentSubtwo')
          : ''
  const percentKeyByStat: Record<string, string> = {
    STR: percentKeyFor('STR'),
    DEX: percentKeyFor('DEX'),
    INT: percentKeyFor('INT'),
    LUK: percentKeyFor('LUK'),
  }

  if (value > 0) {
    switch (ctx.soulOrb.stat) {
      case 'percentStr':
        if (percentKeyByStat.STR) add(percentKeyByStat.STR, value)
        break
      case 'percentDex':
        if (percentKeyByStat.DEX) add(percentKeyByStat.DEX, value)
        break
      case 'percentInt':
        if (percentKeyByStat.INT) add(percentKeyByStat.INT, value)
        break
      case 'percentLuk':
        if (percentKeyByStat.LUK) add(percentKeyByStat.LUK, value)
        break
      case 'allStatPercent':
        add(keyFor('percentSub'), value)
        if (statLabels.main !== 'HP') add(keyFor('percentMain'), value)
        if (statLabels.secondSub) add(keyFor('percentSubtwo'), value)
        break
      case 'dmg':
        add(keyFor('dmg'), value)
        break
      case 'bossDmg':
        add(keyFor('bossDmg'), value)
        break
      case 'percentAtk':
        add(keyFor('percentAtk'), value)
        break
      case 'ignoreDefense':
        break
    }
  }

  const weaponAtk = mode === 'combat' ? ctx.combatWeaponAtk : ctx.currentWeaponAtk
  const attackBonus = getSoulOrbAttackBonus(weaponAtk)
  if (attackBonus > 0) add(keyFor('atk'), attackBonus)
}

/** 戰鬥力計算用 delta（含主動+被動） */
export function getCombatBuffDelta(
  table: ParsedBuffTable,
  state: BuffState,
  ctx: BuffComputeContext,
): BuffDelta {
  const delta: BuffDelta = {}
  const add: AddFn = (k, v) => {
    delta[k] = (delta[k] || 0) + v
  }
  const statCtx: StatDefCtx = {
    job: ctx.job,
    includeSub: ctx.job === 'xenon' || ctx.job === 'dual',
  }

  eachSelectedAbility(table, state, (a) => {
    const def = STAT_DEFS[a.cat]
    if (!def) return
    if (def.combatAdd) def.combatAdd(add, a.value, statCtx)
    else if (def.combatKey) add(def.combatKey, a.value)
  })
  addSoulOrbDelta(add, 'combat', ctx)
  return delta
}

export interface EffBuffDeltaOptions {
  /** true = 塔戒/靈魂寶珠技能取 {} 內技能開啟當下數值（即時增幅用），預設取等效數值 */
  instant?: boolean
}

/** 實戰計算用 delta（僅主動；無視防禦率不在此） */
export function getEffBuffDelta(
  table: ParsedBuffTable,
  state: BuffState,
  ctx: BuffComputeContext,
  options: EffBuffDeltaOptions = {},
): BuffDelta {
  const delta: BuffDelta = {}
  const add: AddFn = (k, v) => {
    delta[k] = (delta[k] || 0) + v
  }
  const statCtx: StatDefCtx = {
    job: ctx.job,
    includeSub: ctx.job === 'xenon' || ctx.job === 'dual',
  }

  eachSelectedAbility(
    table,
    state,
    (a) => {
      if (!a.active) return // 實戰僅計主動
      const def = STAT_DEFS[a.cat]
      if (!def) return
      if (def.effAdd) def.effAdd(add, a.value, statCtx)
      else if (def.effKey) add(def.effKey, a.value)
    },
    options.instant === true,
  )
  addSoulOrbDelta(add, 'eff', ctx)
  return delta
}

/** 無視防禦率乘法堆疊因子 ∏(1 - 無視i) */
export function getEffBuffIgnoreFactor(
  table: ParsedBuffTable,
  state: BuffState,
  soulOrb: SoulOrbState,
  options: EffBuffDeltaOptions = {},
): number {
  let f = 1
  eachSelectedAbility(
    table,
    state,
    (a) => {
      if (a.active && a.cat === 'ignoreDefense') f *= 1 - a.value / 100
    },
    options.instant === true,
  )
  if (
    soulOrb.fullSoul !== false &&
    (Number(soulOrb.value) || 0) > 0 &&
    soulOrb.stat === 'ignoreDefense'
  ) {
    f *= 1 - Math.max(0, Math.min(100, Number(soulOrb.value) || 0)) / 100
  }
  return f
}

/** 等級夾到合法值（buffs.js clampLevelById 移植） */
export function clampBuffLevel(buff: BuffDefinition | undefined, raw: unknown): number {
  if (!buff) return 0
  let v = parseInt(String(raw), 10)
  if (isNaN(v)) return buff.defaultLevel
  if (buff.type === 'check') return v > 0 ? 1 : 0
  const allowed = [0].concat(buff.levelKeys)
  if (allowed.indexOf(v) !== -1) return v
  v = Math.max(0, Math.min(buff.maxLevel, v))
  let best = 0
  let bd = Infinity
  for (const a of allowed) {
    const d = Math.abs(a - v)
    if (d < bd) {
      bd = d
      best = a
    }
  }
  return best
}

export function defaultBuffState(table: ParsedBuffTable): BuffState {
  const s: BuffState = {}
  table.categories.forEach((c) => c.buffs.forEach((b) => (s[b.id] = b.defaultLevel)))
  return s
}

export function emptyBuffState(table: ParsedBuffTable): BuffState {
  const s: BuffState = {}
  table.categories.forEach((c) => c.buffs.forEach((b) => (s[b.id] = 0)))
  return s
}
