import type { DashboardData, EquipmentItem, LinkSkill } from '../types'
import { createCalculatorProfile } from '../calculator/mapleCombatCalculator'
import { fieldDefs } from '@maplecombat/constants/fields'
import { emptyBuffState, clampBuffLevel } from '@maplecombat/core/buffs/delta'
import { parseBuffTable } from '@maplecombat/core/buffs/parse'
import { buffTableText } from '@maplecombat/data/buffSource'
import { getDefaultJobByCategory, getJobByName, normalizeJobText } from '@maplecombat/data/jobs'
import { weaponDatabase, zeroWeaponDatabase } from '@maplecombat/data/weapons'
import type { SaveDataV1 } from '@maplecombat/services/saveData'

export interface MapleCombatAutoFillResult {
  saveData: SaveDataV1
  summary: string
  autoFilledFields: string[]
  autoFilledBuffIds: string[]
  preferredBuffLevels: Record<string, number>
  soulOrbFromApi: boolean
}

const numberValue = (value: unknown): number => {
  const parsed = Number(String(value ?? '').replace(/,/g, '').replace(/%/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

const activeEquipment = (data: DashboardData): EquipmentItem[] => {
  const preset = Number(data.equipment?.preset_no || 0)
  const presetItems =
    preset >= 1 && preset <= 3
      ? data.equipment?.[`item_equipment_preset_${preset}` as keyof typeof data.equipment]
      : undefined
  return (Array.isArray(presetItems) ? presetItems : data.equipment?.item_equipment) || []
}

const splitPanelTotal = (total: number, knownPercent: number) => {
  const percent = Math.max(0, knownPercent || 0)
  const multiplier = 1 + percent / 100
  const base = Math.max(0, Math.floor(total / Math.max(0.01, multiplier)))
  const applied = Math.floor((base * (100 + percent)) / 100)
  return { base, percent, noApply: Math.max(0, total - applied) }
}

const weaponSetFromItem = (weapon?: EquipmentItem) => {
  const name = `${weapon?.item_name || ''} ${weapon?.item_shape_name || ''}`
  if (/創世|Genesis/i.test(name)) return 'genesis'
  if (/命運|永恆|Eternal|Destiny|Fortune/i.test(name)) return 'fortune'
  if (/神秘|Arcane/i.test(name)) return 'arcane'
  if (/航海|Absolab/i.test(name)) return 'absolab'
  if (/夫尼爾|深淵|Fafnir/i.test(name)) return 'fafnir'
  if ((weapon?.item_level || 0) >= 250) return 'fortune'
  if ((weapon?.item_level || 0) >= 200) return 'arcane'
  return 'fortune'
}

const weaponAttack = (weapon: EquipmentItem | undefined, usesMagic: boolean, section: 'total' | 'base' | 'add' | 'etc') => {
  const option =
    section === 'total'
      ? weapon?.item_total_option
      : section === 'base'
        ? weapon?.item_base_option
        : section === 'add'
          ? weapon?.item_add_option
          : weapon?.item_etc_option
  return numberValue(usesMagic ? option?.magic_power : option?.attack_power)
}

const inferFlameLevel = (
  weapon: EquipmentItem | undefined,
  weaponSet: string,
  usesMagic: boolean,
  isZero: boolean,
): string => {
  const actualBase = weaponAttack(weapon, usesMagic, 'base')
  const actualFlame = weaponAttack(weapon, usesMagic, 'add')
  if (actualBase <= 0 || actualFlame <= 0) return '0'
  const database = isZero ? zeroWeaponDatabase : weaponDatabase
  const reference = database[weaponSet as keyof typeof database] || database.fortune
  let bestLevel = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (let level = 1; level <= 7; level += 1) {
    const expected = (reference.flames[level] || 0) * (actualBase / Math.max(1, reference.base))
    const distance = Math.abs(expected - actualFlame)
    if (distance < bestDistance) {
      bestDistance = distance
      bestLevel = level
    }
  }
  return String(bestLevel)
}

const findBlessingLevel = (data: DashboardData): number => {
  const commonSkills = data.skill0?.character_skill || []
  return commonSkills
    .filter((skill) => /女皇的祝福|精靈的祝福/.test(skill.skill_name || ''))
    .reduce((maximum, skill) => Math.max(maximum, numberValue(skill.skill_level)), 0)
}

const petSetAttackFromApi = (data: DashboardData): number | null => {
  const pets = data.petEquipment as unknown as Record<string, unknown> | undefined
  if (!pets) return null
  const types = [1, 2, 3]
    .map((index) => String(pets[`pet_${index}_pet_type`] ?? '').trim())
    .filter(Boolean)
  // 寵物裝備卷軸攻擊已包含在面板攻擊力；這裡只處理 API 明確標記的
  // 月光迷你（Luna Petite）Set 技能，避免把 70/80 攻再次重複加算。
  if (!types.length) return null
  const count = types.filter((type) => /月光迷你|Luna\s*Petite/i.test(type)).length
  return [0, 8, 18, 36][Math.min(3, count)]
}

const hasRuinForceShield = (items: EquipmentItem[]): boolean =>
  items.some((item) =>
    /毀滅(?:力量)?盾牌|Ruin\s*Force\s*Shield/i.test(
      `${item.item_name || ''} ${item.item_shape_name || ''}`,
    ),
  )

const xenonStarConversionStat = (items: EquipmentItem[]): number => {
  const equipmentStars = items.reduce((total, item) => total + numberValue(item.starforce), 0)
  return Math.floor(Math.min(100, equipmentStars) / 10) * 7
}

const currentLinkSkills = (data: DashboardData): LinkSkill[] => {
  const links = [...(data.linkSkill?.character_link_skill || [])]
  if (data.linkSkill?.character_owned_link_skill) links.push(data.linkSkill.character_owned_link_skill)
  return links
}

const createBuffState = (data: DashboardData, items: EquipmentItem[]) => {
  const table = parseBuffTable(buffTableText)
  // API 面板已包含角色當下的常駐與被動數值；初始情境不可再套用作者的
  // 「全套 Buff 預設」，否則傳授、藥水、公會技與塔戒會重複灌入。
  const levels = emptyBuffState(table)
  const equippedLinks = currentLinkSkills(data)
  const apiBuffIds: string[] = []
  const preferredLevels: Record<string, number> = {}

  table.categories.forEach((category) =>
    category.buffs.forEach((buff) => {
      if (!buff.id.startsWith('pass:')) return
      apiBuffIds.push(buff.id)
      const buffName = normalizeJobText(buff.name)
      const matched = equippedLinks.find((skill) => {
        const skillName = normalizeJobText(skill.skill_name)
        return skillName === buffName || skillName.includes(buffName) || buffName.includes(skillName)
      })
      if (!matched) {
        return
      }
      preferredLevels[buff.id] = clampBuffLevel(buff, matched.skill_level || 1)
    }),
  )

  const continuousRing = items.find((item) => /永續戒指/.test(item.item_name || ''))
  const gaugeRing = items.find((item) => /規範戒指/.test(item.item_name || ''))
  apiBuffIds.push('skill:永續戒指', 'skill:規範戒指')
  if (continuousRing) {
    preferredLevels['skill:永續戒指'] = Math.max(1, numberValue(continuousRing.special_ring_level) || 1)
  }
  if (gaugeRing) {
    preferredLevels['skill:規範戒指'] = Math.max(1, numberValue(gaugeRing.special_ring_level) || 1)
  }

  return { levels, apiBuffIds, preferredLevels }
}

const parseSoulOrb = (weapon?: EquipmentItem) => {
  const hasNewSoulFields = Boolean(
    weapon &&
      (Object.prototype.hasOwnProperty.call(weapon, 'soul_weapon_option') ||
        Object.prototype.hasOwnProperty.call(weapon, 'soul_weapon_grade')),
  )
  const hasLegacySoulFields = Boolean(
    weapon &&
      (Object.prototype.hasOwnProperty.call(weapon, 'soul_option') ||
        Object.prototype.hasOwnProperty.call(weapon, 'soul_name')),
  )
  const text = weapon?.soul_weapon_option || weapon?.soul_option || ''
  const value = numberValue(text.match(/[-+]?\d+(?:\.\d+)?/)?.[0])
  let stat = 'percentStr'
  if (/DEX|敏捷/i.test(text)) stat = 'percentDex'
  else if (/INT|智力/i.test(text)) stat = 'percentInt'
  else if (/LUK|幸運/i.test(text)) stat = 'percentLuk'
  else if (/全屬|所有屬性/i.test(text)) stat = 'allStatPercent'
  else if (/Boss|BOSS|頭目/i.test(text)) stat = 'bossDmg'
  else if (/攻擊力|魔法攻擊力|物理攻擊力/i.test(text)) stat = 'percentAtk'
  else if (/無視/i.test(text)) stat = 'ignoreDefense'
  else if (/傷害/i.test(text)) stat = 'dmg'
  return {
    value,
    stat,
    // 新制 API 沒有舊制即時「滿魂」狀態；不得因為有常駐屬性就預設勾滿魂。
    fullSoul: hasNewSoulFields ? false : Boolean(weapon?.soul_name),
    permanent: hasNewSoulFields,
    sourceAvailable: hasNewSoulFields || hasLegacySoulFields,
  }
}

const soulPercentForStat = (
  soul: ReturnType<typeof parseSoulOrb>,
  statName: string | undefined,
): number => {
  if (!soul.permanent || !statName || statName === 'HP') return 0
  const normalized = statName.toUpperCase()
  if (soul.stat === 'allStatPercent') return soul.value
  if (soul.stat === `percent${normalized[0]}${normalized.slice(1).toLowerCase()}`) return soul.value
  return 0
}

/**
 * 將 Nexon 查詢可可靠取得的資料映射到 MapleCombat 的完整 150 欄格式。
 * 公式與欄位會隨遊戲版本改動：更新 MapleCombat 時必須重新核對上游 release/commit、
 * 巴哈作者補充、黃金測試與此映射，不能只改畫面上的「核對日期」。
 */
export function createMapleCombatAutoFill(data: DashboardData): MapleCombatAutoFillResult {
  const profile = createCalculatorProfile(data)
  const items = activeEquipment(data)
  const weapon = items.find((item) => item.item_equipment_part === '武器' || item.item_equipment_slot === '武器')
  const job = getJobByName(profile.jobName) || getDefaultJobByCategory(profile.category)
  const soulOrb = parseSoulOrb(weapon)
  // 新制靈魂武器屬性已包含在 API 面板，拆分基本值時要算入已知百分比，
  // 但不再以舊制「滿魂 Buff」重複套用。
  const main = splitPanelTotal(
    profile.main,
    profile.mainPercent + soulPercentForStat(soulOrb, profile.mainStat),
  )
  const sub = splitPanelTotal(
    profile.sub,
    profile.subPercent + soulPercentForStat(soulOrb, profile.subStat),
  )
  const second = splitPanelTotal(
    profile.secondSub,
    profile.secondSubPercent + soulPercentForStat(soulOrb, profile.secondSubStat),
  )
  const attack = splitPanelTotal(
    profile.attack,
    profile.attackPercent + (soulOrb.permanent && soulOrb.stat === 'percentAtk' ? soulOrb.value : 0),
  )
  const weaponSet = weaponSetFromItem(weapon)
  const isZero = profile.jobName === '神之子'
  const petSetAttack = petSetAttackFromApi(data)
  const zeroWeaponBaseBossDamage =
    numberValue(weapon?.item_base_option?.boss_damage) +
    numberValue(weapon?.item_add_option?.boss_damage)
  const defaults = Object.fromEntries(fieldDefs.map((field) => [field.id, field.default]))
  const apiValues: Record<string, unknown> = {
    baseMain: String(main.base),
    percentMain: String(main.percent),
    noApplyMain: String(main.noApply),
    baseSub: String(sub.base),
    percentSub: String(sub.percent),
    noApplySub: String(sub.noApply),
    includeSecondSub: Boolean(profile.secondSubStat),
    baseSubtwo: String(second.base),
    percentSubtwo: String(second.percent),
    noApplySubtwo: String(second.noApply),
    atk: String(attack.base),
    percentAtk: String(attack.percent),
    noApplyAtk: String(attack.noApply),
    dmg: String(profile.damage),
    bossDmg: String(profile.bossDamage),
    critDmg: String(profile.criticalDamage),
    famFinal: String(profile.familiarFinalDamageSources.reduce((sum, value) => sum + value, 0)),
    famFinalSources: profile.familiarFinalDamageSources.join(','),
    genesisFinalCheck: weaponSet === 'genesis',
    weaponSet,
    flameLevel: inferFlameLevel(weapon, weaponSet, profile.usesMagic, isZero),
    currentWeaponAtk: String(weaponAttack(weapon, profile.usesMagic, 'total')),
    scrollAtk: String(weaponAttack(weapon, profile.usesMagic, 'etc')),
    starCount: String(numberValue(weapon?.starforce)),
    adjEmpressBless: String(findBlessingLevel(data) || 30),
    ...(petSetAttack !== null ? { adjPetAtk: String(petSetAttack) } : {}),
    adjDAHP: String(profile.baseHp),
    ...(profile.jobName === '傑諾'
      ? { adjXenonStar: String(xenonStarConversionStat(items)) }
      : {}),
    ...(isZero
      ? { adjZeroWeaponFlameBossDmg: String(zeroWeaponBaseBossDamage) }
      : {}),
    ruinFinal: hasRuinForceShield(items) ? '10' : '0',
    effBaseMain: String(main.base),
    effPercentMain: String(main.percent),
    effNoApplyMain: String(main.noApply),
    effBaseSub: String(sub.base),
    effPercentSub: String(sub.percent),
    effNoApplySub: String(sub.noApply),
    effIncludeSecondSub: Boolean(profile.secondSubStat),
    effBaseSubtwo: String(second.base),
    effPercentSubtwo: String(second.percent),
    effNoApplySubtwo: String(second.noApply),
    effAtk: String(attack.base),
    effPercentAtk: String(attack.percent),
    effNoApplyAtk: String(attack.noApply),
    effDmg: String(profile.damage),
    effBossDmg: String(profile.bossDamage),
    effCritDmg: String(profile.criticalDamage),
    effFamFinal: String(profile.familiarFinalDamageSources.reduce((sum, value) => sum + value, 0)),
    effFamFinalSources: profile.familiarFinalDamageSources.join(','),
    effIgnoreDefense: String(profile.ignoreDefense),
    effMonsterDefense: '380',
    effBaseHP: String(profile.baseHp),
  }
  const values: Record<string, unknown> = { ...defaults, ...apiValues }
  const autoFilledFields = Object.keys(apiValues)
  const {
    levels: buffLevels,
    apiBuffIds: autoFilledBuffIds,
    preferredLevels: preferredBuffLevels,
  } = createBuffState(data, items)

  return {
    saveData: {
      app: 'holybear-maplecombat',
      version: 1,
      savedAt: new Date().toISOString(),
      selectedJob: job.category,
      selectedJobName: job.name,
      effSelectedJob: job.category,
      values,
      buffState: {
        master: true,
        levels: buffLevels,
        soulOrb,
        combatCorrections: { mentor: false, empress: false, genesis: false },
      },
    },
    summary: `已填入 ${autoFilledFields.length}/150 欄：職業、面板基準、潛能、武器、無視、傳授、塔戒與使用中萌獸`,
    autoFilledFields,
    autoFilledBuffIds,
    preferredBuffLevels,
    soulOrbFromApi: soulOrb.sourceAvailable,
  }
}
