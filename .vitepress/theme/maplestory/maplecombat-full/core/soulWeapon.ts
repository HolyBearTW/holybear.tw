import type { FieldValues, JobCategory, JobStatLabels } from './types'

export const SOUL_WEAPON_OPTION_STAT_OPTIONS = [
  { value: 'none', label: '未設定' },
  { value: 'atkFlat', label: '物理／魔法攻擊力' },
  { value: 'percentAtk', label: '物理／魔法攻擊力 %' },
  { value: 'bossDmg', label: 'Boss 傷害' },
  { value: 'dmg', label: '傷害' },
  { value: 'ignoreDefense', label: '無視防禦率' },
  { value: 'critRate', label: '爆擊機率' },
  { value: 'allStatFlat', label: '全屬性' },
  { value: 'allStatPercent', label: '全屬性 %' },
  { value: 'strFlat', label: 'STR' },
  { value: 'percentStr', label: 'STR %' },
  { value: 'dexFlat', label: 'DEX' },
  { value: 'percentDex', label: 'DEX %' },
  { value: 'intFlat', label: 'INT' },
  { value: 'percentInt', label: 'INT %' },
  { value: 'lukFlat', label: 'LUK' },
  { value: 'percentLuk', label: 'LUK %' },
  { value: 'hpFlat', label: 'MaxHP' },
  { value: 'percentHp', label: 'MaxHP %' },
  { value: 'mpFlat', label: 'MaxMP' },
  { value: 'percentMp', label: 'MaxMP %' },
] as const

export type SoulWeaponOptionStat = (typeof SOUL_WEAPON_OPTION_STAT_OPTIONS)[number]['value']
export const SOUL_WEAPON_OPTION_STAT_KEYS = SOUL_WEAPON_OPTION_STAT_OPTIONS.map(
  (option) => option.value,
)

export interface SoulWeaponState {
  enabled: boolean
  grade: number
  level: number
  powerIncrease: number
  optionStat: SoulWeaponOptionStat
  optionValue: number
}

const numberValue = (value: unknown): number => {
  const parsed = Number(String(value ?? '').replace(/,/g, '').replace(/%/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

export function soulWeaponResonanceAttack(level: number): number {
  const safeLevel = Math.max(0, Math.min(100, Math.trunc(level || 0)))
  if (safeLevel <= 0) return 0
  return safeLevel <= 60 ? safeLevel + 20 : safeLevel * 2 - 40
}

export function parseSoulWeaponGrade(value: unknown): number {
  const numeric = Math.trunc(
    numberValue(value) || numberValue(String(value ?? '').match(/\d+(?:\.\d+)?/)?.[0]),
  )
  if (numeric >= 1 && numeric <= 10) return numeric
  const text = String(value ?? '')
  const chineseGrade: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  }
  const match = text.match(/第?([一二三四五六七八九十])(?:階級)?/)
  return match ? chineseGrade[match[1]] || 0 : 0
}

export function parseSoulWeaponOption(textValue: unknown): {
  stat: SoulWeaponOptionStat
  value: number
} {
  const text = String(textValue ?? '').trim()
  const value = numberValue(text.match(/[-+]?\d+(?:\.\d+)?/)?.[0])
  const percent = /%|％/.test(text)
  let stat: SoulWeaponOptionStat = 'none'

  if (/Boss|BOSS|頭目|首領/i.test(text)) stat = 'bossDmg'
  else if (/無視/i.test(text)) stat = 'ignoreDefense'
  else if (/爆擊機率|暴擊率/i.test(text)) stat = 'critRate'
  else if (/物理攻擊力|魔法攻擊力|攻擊力|魔力/i.test(text)) stat = percent ? 'percentAtk' : 'atkFlat'
  else if (/全屬|所有屬性/i.test(text)) stat = percent ? 'allStatPercent' : 'allStatFlat'
  else if (/STR|力量/i.test(text)) stat = percent ? 'percentStr' : 'strFlat'
  else if (/DEX|敏捷/i.test(text)) stat = percent ? 'percentDex' : 'dexFlat'
  else if (/INT|智力/i.test(text)) stat = percent ? 'percentInt' : 'intFlat'
  else if (/LUK|幸運/i.test(text)) stat = percent ? 'percentLuk' : 'lukFlat'
  else if (/MaxHP|最大HP/i.test(text)) stat = percent ? 'percentHp' : 'hpFlat'
  else if (/MaxMP|最大MP/i.test(text)) stat = percent ? 'percentMp' : 'mpFlat'
  else if (/傷害/i.test(text)) stat = 'dmg'

  return { stat, value }
}

export function soulWeaponStateFromValues(
  values: Record<string, string | boolean | number | undefined>,
): SoulWeaponState {
  const optionStatRaw = String(values.soulWeaponOptionStat ?? 'none')
  const optionStat = SOUL_WEAPON_OPTION_STAT_KEYS.includes(optionStatRaw as SoulWeaponOptionStat)
    ? (optionStatRaw as SoulWeaponOptionStat)
    : 'none'
  const level = Math.max(0, Math.min(100, Math.trunc(numberValue(values.soulWeaponLevel))))
  return {
    enabled: values.soulWeaponEnabled === true || values.soulWeaponEnabled === 'true',
    grade: Math.max(0, Math.min(10, Math.trunc(numberValue(values.soulWeaponGrade)))),
    level,
    powerIncrease:
      numberValue(values.soulWeaponPowerIncrease) || soulWeaponResonanceAttack(level),
    optionStat,
    optionValue: Math.max(0, numberValue(values.soulWeaponOptionValue)),
  }
}

function add(fields: FieldValues, key: string, value: number): void {
  if (!value) return
  fields[key] = (fields[key] || 0) + value
}

function addLabeledStat(
  fields: FieldValues,
  statLabels: JobStatLabels,
  stat: string,
  value: number,
  percent: boolean,
): void {
  const mappings = [
    [statLabels.main, percent ? 'percentMain' : 'baseMain', percent ? 'effPercentMain' : 'effBaseMain'],
    [statLabels.sub, percent ? 'percentSub' : 'baseSub', percent ? 'effPercentSub' : 'effBaseSub'],
    [
      statLabels.secondSub,
      percent ? 'percentSubtwo' : 'baseSubtwo',
      percent ? 'effPercentSubtwo' : 'effBaseSubtwo',
    ],
  ] as const
  mappings.forEach(([label, combatKey, effKey]) => {
    if (label !== stat) return
    add(fields, combatKey, value)
    add(fields, effKey, value)
  })
}

/**
 * 新版靈魂武器是常駐角色能力，不受 Buff 總開關影響。
 * 呼叫前的面板基準必須先排除同一份 API 靈魂武器能力，避免重複套用。
 */
export function applySoulWeaponBonuses(
  fields: FieldValues,
  values: Record<string, string | boolean | number | undefined>,
  statLabels: JobStatLabels,
  job: JobCategory,
): FieldValues {
  const soul = soulWeaponStateFromValues(values)
  if (!soul.enabled) return fields

  add(fields, 'atk', soul.powerIncrease)
  add(fields, 'effAtk', soul.powerIncrease)

  const value = soul.optionValue
  switch (soul.optionStat) {
    case 'atkFlat':
      add(fields, 'atk', value)
      add(fields, 'effAtk', value)
      break
    case 'percentAtk':
      add(fields, 'percentAtk', value)
      add(fields, 'effPercentAtk', value)
      break
    case 'bossDmg':
      add(fields, 'bossDmg', value)
      add(fields, 'effBossDmg', value)
      break
    case 'dmg':
      add(fields, 'dmg', value)
      add(fields, 'effDmg', value)
      break
    case 'ignoreDefense': {
      const current = Math.max(0, Math.min(100, fields.effIgnoreDefense || 0))
      fields.effIgnoreDefense = 100 * (1 - (1 - current / 100) * (1 - value / 100))
      break
    }
    case 'allStatFlat':
      if (job !== 'da') addLabeledStat(fields, statLabels, statLabels.main, value, false)
      addLabeledStat(fields, statLabels, statLabels.sub, value, false)
      if (job === 'xenon' || job === 'dual') {
        addLabeledStat(fields, statLabels, statLabels.secondSub, value, false)
      }
      break
    case 'allStatPercent':
      if (job !== 'da') addLabeledStat(fields, statLabels, statLabels.main, value, true)
      addLabeledStat(fields, statLabels, statLabels.sub, value, true)
      if (job === 'xenon' || job === 'dual') {
        addLabeledStat(fields, statLabels, statLabels.secondSub, value, true)
      }
      break
    case 'strFlat':
      addLabeledStat(fields, statLabels, 'STR', value, false)
      break
    case 'percentStr':
      addLabeledStat(fields, statLabels, 'STR', value, true)
      break
    case 'dexFlat':
      addLabeledStat(fields, statLabels, 'DEX', value, false)
      break
    case 'percentDex':
      addLabeledStat(fields, statLabels, 'DEX', value, true)
      break
    case 'intFlat':
      addLabeledStat(fields, statLabels, 'INT', value, false)
      break
    case 'percentInt':
      addLabeledStat(fields, statLabels, 'INT', value, true)
      break
    case 'lukFlat':
      addLabeledStat(fields, statLabels, 'LUK', value, false)
      break
    case 'percentLuk':
      addLabeledStat(fields, statLabels, 'LUK', value, true)
      break
    case 'hpFlat':
      if (statLabels.main === 'HP') addLabeledStat(fields, statLabels, 'HP', value, false)
      break
    case 'percentHp':
      if (statLabels.main === 'HP') addLabeledStat(fields, statLabels, 'HP', value, true)
      break
    default:
      break
  }
  return fields
}
