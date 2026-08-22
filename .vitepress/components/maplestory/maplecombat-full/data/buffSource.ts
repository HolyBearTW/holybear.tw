// Buff 資料源。
// 增益表以 Vite ?raw 匯入、圖示以 import.meta.glob 收集（建置時自動納入 bundle）。
import buffTableTextRaw from '@maplecombat/assets/buff/增益表.txt?raw'
import { normName } from '@maplecombat/core/buffs/parse'

export const buffTableText: string = buffTableTextRaw

// 資料夾名 → 分類 key。
// 這些 key 內嵌於 buff id 並出現在匯出 JSON，不可更動。
const FOLDER_KEYS: Record<string, string> = {
  技能: 'skill',
  藥水: 'pot',
  傳授技能: 'pass',
  // 靈魂寶珠相關技能圖示（無雙之力/妖精密語）獨立存放，分類 key 仍屬 skill（id 不可變）
  靈魂寶珠: 'skill',
}

const iconModules = import.meta.glob('@maplecombat/assets/buff/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** catKey -> { 正規化名稱: 圖檔 URL } */
export const buffImageMaps: Record<string, Record<string, string>> = (() => {
  const maps: Record<string, Record<string, string>> = {}
  for (const [path, url] of Object.entries(iconModules)) {
    const parts = path.split('/')
    const fileName = decodeURIComponent(parts[parts.length - 1] || '')
    const folder = decodeURIComponent(parts[parts.length - 2] || '')
    const key = FOLDER_KEYS[folder] || folder
    if (!maps[key]) maps[key] = {}
    maps[key][normName(fileName.replace(/\.png$/i, ''))] = url
  }
  return maps
})()

/** 取 buff 圖示 URL（無對應圖示回傳 null） */
export function buffImageFor(catKey: string, buffName: string): string | null {
  return (buffImageMaps[catKey] || {})[normName(buffName)] || null
}
