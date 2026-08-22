// 增益表解析：純字串 → 資料，無 DOM。

/** 三個分區對應的圖片資料夾。key 內嵌於 buff id（匯出 JSON 相容），不可更動。 */
export const CATEGORY_META: Record<string, { key: string; folder: string }> = {
  技能: { key: 'skill', folder: '技能' },
  藥水: { key: 'pot', folder: '藥水' },
  傳授技能: { key: 'pass', folder: '傳授技能' },
}

export type StatCategoryKey =
  | 'atkFlat'
  | 'percentAtk'
  | 'dmg'
  | 'bossDmg'
  | 'critDmg'
  | 'ignoreDefense'
  | 'allStatFlat'
  | 'allStatPercent'
  | 'mainFlat'
  | 'subFlat'
  | 'subtwoFlat'
  | 'hpFlat'

export interface BuffAbility {
  cat: StatCategoryKey
  value: number
  active: boolean
  equivalent: boolean
}

export interface BuffDefinition {
  name: string
  /** 快速操作區可使用的短名稱；未提供時沿用 name。 */
  shortName?: string
  /** UI 顯示名（tooltip）；未提供時沿用 name。僅影響顯示，不參與 id/圖片比對。 */
  displayName?: string
  note: string
  infoNote: string
  nonPermanent: boolean
  /** 例如 skill:無雙之力 — 內嵌分類 key，出現在匯出 JSON 的 buffState */
  id: string
  type: 'check' | 'level'
  defaultLevel: number
  levels: Record<number, BuffAbility[]>
  /** 由能力列的 {} 內非 * 項目解析，例如持續／冷卻秒數。 */
  levelNotes: Record<number, string>
  /** 即時數值（技能開啟當下；取 {} 內 * 前綴項）：無該級時沿用 levels 的等效數值 */
  instantLevels: Record<number, BuffAbility[]>
  hasActive: boolean
  levelKeys: number[]
  minLevel: number
  maxLevel: number
  infoRange?: [number, number]
}

export interface BuffCategory {
  key: string
  title: string
  folder: string
  buffs: BuffDefinition[]
}

export interface ParsedBuffTable {
  categories: BuffCategory[]
  buffIndex: Record<string, BuffDefinition>
}

interface StatDefMatch {
  aliases: string[]
  whenPercent: boolean | null
}

// 能力名稱比對表（與 delta.ts 的 STAT_DEFS 對應；解析只需 aliases/whenPercent）
const STAT_MATCHERS: Record<StatCategoryKey, StatDefMatch> = {
  atkFlat: { aliases: ['攻擊力'], whenPercent: false },
  percentAtk: { aliases: ['攻擊力'], whenPercent: true },
  dmg: { aliases: ['傷害'], whenPercent: null },
  bossDmg: { aliases: ['Boss傷害'], whenPercent: null },
  critDmg: { aliases: ['爆擊傷害'], whenPercent: null },
  ignoreDefense: { aliases: ['無視防禦率'], whenPercent: null },
  allStatFlat: { aliases: ['全屬', '全屬性'], whenPercent: false },
  allStatPercent: { aliases: ['全屬', '全屬性'], whenPercent: true },
  mainFlat: { aliases: ['主屬'], whenPercent: null },
  subFlat: { aliases: ['副屬'], whenPercent: null },
  subtwoFlat: { aliases: ['副屬2'], whenPercent: null },
  hpFlat: { aliases: ['HP'], whenPercent: null },
}

/** 能力名稱 -> 計算分類 */
function statCategory(rawName: string, isPercent: boolean): StatCategoryKey | null {
  const n = String(rawName).replace(/^等效/, '').replace(/%$/, '').trim()
  if (n === '') return 'allStatFlat' // 增益表漏字（(主動):20）視為全屬數值
  for (const cat of Object.keys(STAT_MATCHERS) as StatCategoryKey[]) {
    const def = STAT_MATCHERS[cat]
    if (
      def.aliases.indexOf(n) !== -1 &&
      (def.whenPercent === null || def.whenPercent === isPercent)
    )
      return cat
  }
  return null
}

/** 解析單一能力字串（已去 {}）成 BuffAbility[] */
export function parseAbilities(str: string): BuffAbility[] {
  const cleaned = String(str).replace(/\{[^}]*\}/g, '')
  const tokens = cleaned
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
  const out: BuffAbility[] = []
  let curActive = true // (主動)/(被動) 標記可延續到後續未標記的項（如 HP）
  for (const tok of tokens) {
    const m = tok.match(/^(?:\((主動|被動)\))?\s*(.*?)[:：]\s*([-\d.]+)\s*(%?)\s*$/)
    if (!m) continue
    if (m[1]) curActive = m[1] === '主動'
    const value = parseFloat(m[3])
    if (!isFinite(value)) continue
    const rawStatName = String(m[2] || '').trim()
    const equivalent = /^等效/.test(rawStatName)
    const cat = statCategory(rawStatName, m[4] === '%')
    if (!cat) continue
    out.push({ cat, value, active: curActive, equivalent })
  }
  return out
}

/** 解析 {} 內以 * 標記的「技能開啟當下」數值（如 {*攻擊力%:85%,持續20秒,冷卻120秒}） */
export function parseInstantAbilities(str: string): BuffAbility[] {
  const groups = String(str).match(/\{[^}]*\}/g)
  if (!groups) return []
  const out: BuffAbility[] = []
  for (const group of groups) {
    const tokens = group
      .slice(1, -1)
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter((t) => t.startsWith('*'))
    for (const tok of tokens) {
      const m = tok.slice(1).match(/^\s*(.*?)[:：]\s*([-\d.]+)\s*(%?)\s*$/)
      if (!m) continue
      const value = parseFloat(m[2])
      if (!isFinite(value)) continue
      const cat = statCategory(String(m[1] || '').trim(), m[3] === '%')
      if (!cat) continue
      out.push({ cat, value, active: true, equivalent: false })
    }
  }
  return out
}

function parseAbilityNote(str: string): string {
  const groups = String(str).match(/\{[^}]*\}/g)
  if (!groups) return ''
  return groups
    .flatMap((group) =>
      group
        .slice(1, -1)
        .split(/[,，]/)
        .map((token) => token.trim())
        .filter((token) => token && !token.startsWith('*')),
    )
    .join('、')
}

/** 解析增益表全文 */
export function parseBuffTable(text: string): ParsedBuffTable {
  const categories: BuffCategory[] = []
  const buffIndex: Record<string, BuffDefinition> = {}
  let cat: BuffCategory | null = null
  let buff: BuffDefinition | null = null
  const lines = String(text).replace(/^﻿/, '').split(/\r?\n/)

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    let m: RegExpMatchArray | null

    if ((m = line.match(/^<(.+?)>$/))) {
      // <識別名|顯示標題>：識別名決定 key/圖檔資料夾（維持既有 id 相容），顯示標題只影響 UI。
      const [idName, displayTitle] = m[1].split('|').map((s) => s.trim())
      const meta = CATEGORY_META[idName] || { key: idName, folder: idName }
      cat = { key: meta.key, title: displayTitle || idName, folder: meta.folder, buffs: [] }
      categories.push(cat)
      buff = null
      continue
    }

    if ((m = line.match(/^\[(.+?)\]\s*(.*)$/))) {
      if (!cat) continue
      const rawNote = m[2] || ''
      const tags = [...rawNote.matchAll(/<([^>]+)>/g)].map((match) => match[1].trim())
      const shortNameTag = tags.find((tag) => /^簡稱\s*[:：]/.test(tag))
      const displayNameTag = tags.find((tag) => /^顯示\s*[:：]/.test(tag))
      buff = {
        name: m[1],
        shortName: shortNameTag?.replace(/^簡稱\s*[:：]\s*/, '').trim() || undefined,
        displayName: displayNameTag?.replace(/^顯示\s*[:：]\s*/, '').trim() || undefined,
        note: rawNote.replace(/<[^>]+>/g, '').trim(),
        infoNote: tags
          .filter(
            (tag) =>
              tag !== '非常駐' && !/^簡稱\s*[:：]/.test(tag) && !/^顯示\s*[:：]/.test(tag),
          )
          .join(' / '),
        nonPermanent: tags.includes('非常駐'),
        id: cat.key + ':' + m[1],
        type: 'check',
        defaultLevel: 0,
        levels: {},
        levelNotes: {},
        instantLevels: {},
        hasActive: false,
        levelKeys: [],
        minLevel: 0,
        maxLevel: 0,
      }
      // type 在後續標記行決定；先標記為尚未指定
      ;(buff as { type: string | null }).type = null
      cat.buffs.push(buff)
      buffIndex[buff.id] = buff
      continue
    }

    if (!buff) continue

    if (/^\(預設勾選\)/.test(line)) {
      buff.type = 'check'
      buff.defaultLevel = 1
      continue
    }
    if (/^\(預設不勾選\)/.test(line)) {
      buff.type = 'check'
      buff.defaultLevel = 0
      continue
    }
    if ((m = line.match(/^\(預設[:：]\s*(\d+)\)/))) {
      buff.type = 'level'
      buff.defaultLevel = parseInt(m[1], 10)
      continue
    }
    // (資訊範圍:3-6)：限制等效數值資訊面板只列出此等級區間
    if ((m = line.match(/^\(資訊範圍[:：]\s*(\d+)\s*[-~]\s*(\d+)\)/))) {
      buff.infoRange = [parseInt(m[1], 10), parseInt(m[2], 10)]
      continue
    }

    if ((m = line.match(/^Lv\.?\s*(\d+)\s*(.*)$/))) {
      const lv = parseInt(m[1], 10)
      const abis = parseAbilities(m[2])
      buff.levels[lv] = abis
      buff.levelNotes[lv] = parseAbilityNote(m[2])
      const instant = parseInstantAbilities(m[2])
      if (instant.length) buff.instantLevels[lv] = instant
      if (abis.some((a) => a.active)) buff.hasActive = true
      continue
    }

    if (buff.type === 'check' && line[0] === '(') {
      const abis = parseAbilities(line)
      buff.levels[1] = abis
      buff.levelNotes[1] = parseAbilityNote(line)
      const instant = parseInstantAbilities(line)
      if (instant.length) buff.instantLevels[1] = instant
      if (abis.some((a) => a.active)) buff.hasActive = true
    }
  }

  // 收尾：等級鍵、min/max、預設型別
  categories.forEach((c) =>
    c.buffs.forEach((b) => {
      const keys = Object.keys(b.levels)
        .map(Number)
        .sort((x, y) => x - y)
      b.levelKeys = keys
      b.minLevel = keys.length ? keys[0] : 0
      b.maxLevel = keys.length ? keys[keys.length - 1] : 0
      if ((b as { type: string | null }).type == null) b.type = 'check'
    }),
  )

  return { categories, buffIndex }
}

/** 名稱正規化：去職業註記/冒號後綴/區域Buff/「的」/空白/字尾羅馬數字，用於圖片與名稱比對。 */
export function normName(s: string): string {
  return String(s)
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[:：][\s\S]*$/, '')
    .replace(/區域Buff/gi, '')
    .replace(/\s+/g, '')
    .replace(/的/g, '')
    .replace(/(?:III|II|I)$/, '')
}
