import type { DashboardData, EquipmentItem, LinkSkill } from '../types'
import { createCalculatorProfile } from '../calculator/mapleCombatCalculator'
import { fieldDefs } from '@maplecombat/constants/fields'
import { emptyBuffState, clampBuffLevel } from '@maplecombat/core/buffs/delta'
import { parseBuffTable } from '@maplecombat/core/buffs/parse'
import type { ParsedBuffTable } from '@maplecombat/core/buffs/parse'
import { buffTableText } from '@maplecombat/data/buffSource'
import { getDefaultJobByCategory, getJobByName, normalizeJobText } from '@maplecombat/data/jobs'
import { weaponDatabase, zeroWeaponDatabase } from '@maplecombat/data/weapons'
import {
  parseSoulWeaponGrade,
  parseSoulWeaponOption,
  soulWeaponResonanceAttack,
} from '@maplecombat/core/soulWeapon'
import { defaultCombatCorrections } from '@maplecombat/core/combatCorrections'
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
  const linkData = data.linkSkill as (DashboardData['linkSkill'] & Record<string, unknown>) | undefined
  const presetNo = Math.max(
    1,
    Math.min(3, numberValue(linkData?.preset_no ?? linkData?.use_preset_no) || 1),
  )
  const preset = linkData?.[`character_link_skill_preset_${presetNo}`]
  const links = [
    ...(Array.isArray(preset) ? (preset as LinkSkill[]) : data.linkSkill?.character_link_skill || []),
  ]
  if (data.linkSkill?.character_owned_link_skill) links.push(data.linkSkill.character_owned_link_skill)
  return links
}

const normalizedSkillName = (value: unknown): string =>
  normalizeJobText(String(value ?? ''))
    .replace(/[\s·・:：()（）\[\]【】]/g, '')
    .replace(/的/g, '')

const skillNamesMatch = (left: unknown, right: unknown): boolean => {
  const a = normalizedSkillName(left)
  const b = normalizedSkillName(right)
  if (!a || !b) return false
  if (a === b) return true
  return Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a))
}

const currentCharacterSkills = (data: DashboardData) =>
  [data.skill0, data.skill1, data.skill2, data.skill3, data.skill4, data.skill5, data.skill6]
    .filter(Boolean)
    .flatMap((group) => group?.character_skill || [])

const currentVCoreSkills = (data: DashboardData) =>
  (data.vMatrix?.character_v_core_equipment || []).flatMap((core) => {
    const level = Math.max(1, numberValue(core.v_core_level) + numberValue(core.slot_level))
    return [core.v_core_name, core.v_core_skill_1, core.v_core_skill_2, core.v_core_skill_3]
      .filter(Boolean)
      .map((skillName) => ({ skill_name: skillName, skill_level: level }))
  })

const detectedBuffAbilities = (
  table: ParsedBuffTable,
  buffId: string,
  rawLevel: unknown,
): { level: number } | null => {
  const buff = table.buffIndex[buffId]
  if (!buff) return null
  const level = buff.type === 'check' ? 1 : clampBuffLevel(buff, rawLevel)
  if (level <= 0) return null
  return { level }
}

const createBuffState = (data: DashboardData, items: EquipmentItem[]) => {
  const table = parseBuffTable(buffTableText)
  // API 只證明技能已裝備／已學會，不代表主動或條件效果正在發動。
  // 因此所有 Buff 維持 0；等級只作為使用者點擊後的精確試算偏好。
  const levels = emptyBuffState(table)
  const equippedLinks = currentLinkSkills(data)
  const characterSkills = [...currentCharacterSkills(data), ...currentVCoreSkills(data)]
  const apiBuffIds = new Set<string>()
  const preferredLevels: Record<string, number> = {}

  const applyDetectedBuff = (id: string, rawLevel: unknown): void => {
    const detected = detectedBuffAbilities(table, id, rawLevel)
    if (!detected) return
    apiBuffIds.add(id)
    if (table.buffIndex[id].type === 'level') preferredLevels[id] = detected.level
  }

  table.categories.forEach((category) =>
    category.buffs.forEach((buff) => {
      if (buff.id.startsWith('pot:')) return
      const sources = buff.id.startsWith('pass:') ? equippedLinks : characterSkills
      const matched = sources.find((skill) => skillNamesMatch(skill.skill_name, buff.name))
      if (matched) applyDetectedBuff(buff.id, matched.skill_level || 1)
    }),
  )

  const continuousRing = items.find((item) => /永續戒指/.test(item.item_name || ''))
  const gaugeRing = items.find((item) => /規範戒指/.test(item.item_name || ''))
  if (continuousRing) {
    applyDetectedBuff(
      'skill:永續戒指',
      Math.max(1, numberValue(continuousRing.special_ring_level) || 1),
    )
  }
  if (gaugeRing) {
    applyDetectedBuff(
      'skill:規範戒指',
      Math.max(1, numberValue(gaugeRing.special_ring_level) || 1),
    )
  }

  const weapon = items.find(
    (item) => item.item_equipment_part === '武器' || item.item_equipment_slot === '武器',
  )
  const legacySoulName = String(weapon?.soul_name || '')
  if (/武公/.test(legacySoulName)) applyDetectedBuff('skill:無雙之力', 1)
  else if (/艾畢奈亞/.test(legacySoulName)) applyDetectedBuff('skill:妖精密語', 1)

  return { levels, apiBuffIds: [...apiBuffIds], preferredLevels }
}

const parseSoulOrb = (weapon?: EquipmentItem) => {
  const hasLegacySoulFields = Boolean(weapon?.soul_name || weapon?.soul_option)
  const text = weapon?.soul_option || ''
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
    fullSoul: Boolean(weapon?.soul_name),
    sourceAvailable: hasLegacySoulFields,
  }
}

const parseSoulWeapon = (weapon?: EquipmentItem) => {
  const grade = parseSoulWeaponGrade(weapon?.soul_weapon_grade)
  const levelText = String(weapon?.soul_weapon_level ?? '')
  const level = Math.max(
    0,
    Math.min(
      100,
      Math.trunc(numberValue(weapon?.soul_weapon_level) || numberValue(levelText.match(/\d+/)?.[0])),
    ),
  )
  const powerText = String(weapon?.soul_weapon_power_increase ?? '')
  const powerIncrease =
    numberValue(weapon?.soul_weapon_power_increase) ||
    numberValue(powerText.match(/[-+]?\d+(?:\.\d+)?/)?.[0]) ||
    soulWeaponResonanceAttack(level)
  const optionText = String(weapon?.soul_weapon_option || '')
  const option = parseSoulWeaponOption(optionText)
  const enabled = Boolean(grade || level || powerIncrease || optionText.trim())
  return { enabled, grade, level, powerIncrease, optionText, ...option }
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
  const soulWeapon = parseSoulWeapon(weapon)
  // MapleCombat 的主要欄位定義來自遊戲「來源顯示」的完整拆分，並非
  // Nexon API 的 final_stat 或本站來源分析小計。API 沒有回傳「套用中的數值」
  // 三欄與「技能」分類，因此不得再用可歸屬來源小計冒充完整輸入。
  // 這些欄位由使用者依遊戲 tooltip 填寫並保留；此處只帶入 API 能精確確認的資料。
  const weaponSet = weaponSetFromItem(weapon)
  const isZero = profile.jobName === '神之子'
  const petSetAttack = petSetAttackFromApi(data)
  const zeroWeaponBaseBossDamage =
    numberValue(weapon?.item_base_option?.boss_damage) +
    numberValue(weapon?.item_add_option?.boss_damage)
  const defaults = Object.fromEntries(fieldDefs.map((field) => [field.id, field.default]))
  const {
    levels: buffLevels,
    apiBuffIds: autoFilledBuffIds,
    preferredLevels: preferredBuffLevels,
  } = createBuffState(data, items)
  const apiValues: Record<string, unknown> = {
    includeSecondSub: Boolean(profile.secondSubStat),
    famFinal: String(profile.familiarFinalDamageSources.reduce((sum, value) => sum + value, 0)),
    famFinalSources: profile.familiarFinalDamageSources.join(','),
    genesisFinalCheck: weaponSet === 'genesis',
    weaponSet,
    flameLevel: inferFlameLevel(weapon, weaponSet, profile.usesMagic, isZero),
    currentWeaponAtk: String(weaponAttack(weapon, profile.usesMagic, 'total')),
    scrollAtk: String(weaponAttack(weapon, profile.usesMagic, 'etc')),
    starCount: String(numberValue(weapon?.starforce)),
    soulWeaponEnabled: soulWeapon.enabled,
    soulWeaponGrade: String(soulWeapon.grade),
    soulWeaponLevel: String(soulWeapon.level),
    soulWeaponPowerIncrease: String(soulWeapon.powerIncrease),
    soulWeaponOptionStat: soulWeapon.stat,
    soulWeaponOptionValue: String(soulWeapon.value),
    towerRingSoulLevel: String(soulWeapon.grade || 7),
    adjEmpressBless: String(findBlessingLevel(data)),
    ...(petSetAttack !== null ? { adjPetAtk: String(petSetAttack) } : {}),
    adjMentorBossDmg: '0',
    adjMentorAtk: '0',
    adjDAHP: String(profile.baseHp),
    ...(profile.jobName === '傑諾'
      ? { adjXenonStar: String(xenonStarConversionStat(items)) }
      : {}),
    ...(isZero
      ? { adjZeroWeaponFlameBossDmg: String(zeroWeaponBaseBossDamage) }
      : {}),
    ruinFinal: hasRuinForceShield(items) ? '10' : '0',
    effIncludeSecondSub: Boolean(profile.secondSubStat),
    effFamFinal: String(profile.familiarFinalDamageSources.reduce((sum, value) => sum + value, 0)),
    effFamFinalSources: profile.familiarFinalDamageSources.join(','),
    effIgnoreDefense: String(profile.ignoreDefense),
    effMonsterDefense: '380',
    effBaseHP: String(profile.baseHp),
  }
  const values: Record<string, unknown> = { ...defaults, ...apiValues }
  const autoFilledFields = Object.keys(apiValues)
  if (soulWeapon.enabled && soulWeapon.grade > 0) {
    if (!autoFilledBuffIds.includes('skill:靈魂鬥志')) {
      autoFilledBuffIds.push('skill:靈魂鬥志')
    }
    preferredBuffLevels['skill:靈魂鬥志'] = soulWeapon.grade
  }

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
        // 上游校正只影響「含 Buff 戰力」的特殊規則；原始戰力永遠獨立計算。
        combatCorrections: defaultCombatCorrections(),
        apiDetectedBuffIds: autoFilledBuffIds,
      },
    },
    summary: `已重新帶入 ${autoFilledFields.length} 個 API 可確認欄位；遊戲「來源顯示」與「技能・消耗」仍保留原本手動數值`,
    autoFilledFields,
    autoFilledBuffIds,
    preferredBuffLevels,
    soulOrbFromApi: soulOrb.sourceAvailable,
  }
}
