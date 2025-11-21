// 背景主題配置文件
// 格式: [顯示名稱, 主題ID, 圖標emoji]
// 添加新主題只需在這個數組中添加一行

export const backgroundThemes = [
  ['⚡ 科技感', 'tech', '⚡'],
  ['🌌 引力場', 'gravityfield', '🌌'],
  ['🌊 柔和抽象', 'animated', '🌊'],
  ['🎮 電競RGB ', 'gaming', '🎮'],
  ['🌟 螢火蟲', 'slow3dfly', '🌟'],
  ['💧 圓點光暈', 'halo', '💧'],
  ['📱 HyperOS', 'hyperos', '📱'],
  ['📱 HyperOS 2', 'hyperos2', '📱'],
  ['🎃 萬聖節', 'halloween', '🎃'],
  ['🎄 聖誕節', 'christmas', '🎄'],
  ['⬜ 無背景', 'none', '⬜'],
]

// 預設主題 (使用主題ID)
export const defaultTheme = 'tech'

// 主題本地存儲鍵名
export const THEME_STORAGE_KEY = 'vitepress-background-theme'

// 主題切換事件名稱
export const THEME_CHANGE_EVENT = 'theme-change'

// 生成導航欄配置 (供 config.mts 使用)
export function generateNavThemes() {
  return backgroundThemes.map(([name, id]) => ({
    text: name,
    link: `#theme-${id}`
  }))
}

// 獲取主題信息
export function getThemeById(id: string) {
  return backgroundThemes.find(([_, themeId]) => themeId === id)
}

// 獲取所有主題ID
export function getAllThemeIds() {
  return backgroundThemes.map(([_, id]) => id)
}
