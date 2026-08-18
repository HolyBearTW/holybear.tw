// 背景主題配置文件
// 格式: [中文名稱, 英文名稱, 主題ID, 圖標emoji]
// 添加新主題只需在這個數組中添加一行

export const backgroundThemes = [
  ['⚡ 科技感', '⚡ Tech', 'tech', '⚡'],
  ['🌌 引力場', '🌌 Gravity Field', 'gravityfield', '🌌'],
  ['🌊 柔和抽象', '🌊 Soft Abstract', 'animated', '🌊'],
  ['🎮 電競RGB', '🎮 Gaming RGB', 'gaming', '🎮'],
  ['🌟 螢火蟲', '🌟 Fireflies', 'slow3dfly', '🌟'],
  ['💧 圓點光暈', '💧 Halo Dots', 'halo', '💧'],
  ['📱 HyperOS', '📱 HyperOS', 'hyperos', '📱'],
  ['📱 HyperOS 2', '📱 HyperOS 2', 'hyperos2', '📱'],
  ['🔷 核心塔', '🔷 Core Tower', 'coretower', '🔷'],
  ['🎃 萬聖節', '🎃 Halloween', 'halloween', '🎃'],
  ['🎄 聖誕節', '🎄 Christmas', 'christmas', '🎄'],
  ['⬜ 無背景', '⬜ No BG', 'none', '⬜'],
] as const

// 預設主題 (使用主題ID)
export const defaultTheme = 'coretower'

// 主題本地存儲鍵名
export const THEME_STORAGE_KEY = 'vitepress-background-theme'

// 主題切換事件名稱
export const THEME_CHANGE_EVENT = 'theme-change'

// 生成導航欄配置 (供 config.mts 使用)
export function generateNavThemes(locale: 'zh-TW' | 'en' = 'zh-TW') {
  return backgroundThemes.map(([zhName, enName, id]) => ({
    text: locale === 'en' ? enName : zhName,
    link: `#theme-${id}`
  }))
}

// 獲取主題信息
export function getThemeById(id: string) {
  return backgroundThemes.find(([_, __, themeId]) => themeId === id)
}

// 獲取所有主題ID
export function getAllThemeIds() {
  return backgroundThemes.map(([_, __, id]) => id)
}
