// 背景主題配置文件
// 格式: [中文名稱, 英文名稱, 主題ID, 圖標emoji]
// 添加新主題只需在這個數組中添加一行

export const backgroundThemes = [
  ['🌇 夕陽天空之城', '🌇 Sunset Sky City', 'sunsetskycity', '🌇'],
  ['✈️ 往天空之城', '✈️ To the Sky City', 'uponthesky', '✈️'],
  ['🏙️ 核心塔', '🏙️ Core Tower', 'coretower', '🏙️'],
  ['⚡ 科技感', '⚡ Tech', 'tech', '⚡'],
  ['🌌 引力場', '🌌 Gravity Field', 'gravityfield', '🌌'],
  ['🌊 柔和抽象', '🌊 Soft Abstract', 'animated', '🌊'],
  ['🎮 電競RGB', '🎮 Gaming RGB', 'gaming', '🎮'],
  ['🌟 螢火蟲', '🌟 Fireflies', 'slow3dfly', '🌟'],
  ['💧 圓點光暈', '💧 Halo Dots', 'halo', '💧'],
  ['📱 HyperOS', '📱 HyperOS', 'hyperos', '📱'],
  ['📱 HyperOS 2', '📱 HyperOS 2', 'hyperos2', '📱'],
  ['🎃 萬聖節', '🎃 Halloween', 'halloween', '🎃'],
  ['🎄 聖誕節', '🎄 Christmas', 'christmas', '🎄'],
  ['⬜ 無背景', '⬜ No BG', 'none', '⬜'],
] as const

// 主題本地存儲鍵名
export const THEME_STORAGE_KEY = 'vitepress-background-theme'

// 每個活動階段只重設一次，之後保留使用者在該階段的手動選擇。
export const THEME_RESET_VERSION_KEY = 'vitepress-background-theme-reset-version'
export const THEME_RESET_VERSION = 'sunset-sky-city-default-v1'

export const BACKGROUND_THEME_BOOTSTRAP = {
  ids: backgroundThemes.map(([, , themeId]) => themeId),
  storageKey: THEME_STORAGE_KEY,
  resetKey: THEME_RESET_VERSION_KEY,
  phases: [
    { startsAt: 0, theme: 'sunsetskycity', resetVersion: THEME_RESET_VERSION },
    {
      startsAt: Date.parse('2026-10-24T00:00:00+08:00'),
      theme: 'halloween',
      resetVersion: 'halloween-2026-start-v1'
    },
    {
      startsAt: Date.parse('2026-11-01T00:00:00+08:00'),
      theme: 'sunsetskycity',
      resetVersion: 'halloween-2026-end-v1'
    }
  ]
}

type ThemeSelectionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

// Self-contained so the head bootstrap can serialize the same resolver.
// Select the phase at visitor runtime, even when the site was built earlier.
export function resolveBackgroundThemeSelection(
  config: typeof BACKGROUND_THEME_BOOTSTRAP,
  storage: ThemeSelectionStorage | null,
  now: number
) {
  let phase = config.phases[0]
  let nextChangeAt: number | null = null
  for (const candidate of config.phases) {
    if (candidate.startsAt > now) {
      nextChangeAt = candidate.startsAt
      break
    }
    phase = candidate
  }

  let theme = phase.theme
  if (storage) {
    try {
      if (storage.getItem(config.resetKey) !== phase.resetVersion) {
        storage.removeItem(config.storageKey)
        storage.setItem(config.storageKey, theme)
        storage.setItem(config.resetKey, phase.resetVersion)
      } else {
        const savedTheme = storage.getItem(config.storageKey)
        if (savedTheme && config.ids.includes(savedTheme as typeof config.ids[number])) {
          theme = savedTheme
        } else {
          storage.setItem(config.storageKey, theme)
        }
      }
    } catch {
      // Storage may be unavailable; the scheduled default still applies.
    }
  }
  return { theme, resetVersion: phase.resetVersion, nextChangeAt }
}

export function getBackgroundThemeSelection(now = Date.now()) {
  let storage: ThemeSelectionStorage | null = null
  if (typeof window !== 'undefined') {
    try { storage = window.localStorage } catch {}
  }
  return resolveBackgroundThemeSelection(BACKGROUND_THEME_BOOTSTRAP, storage, now)
}

// This is also evaluated at browser startup, rather than fixed by the build.
export const defaultTheme = resolveBackgroundThemeSelection(BACKGROUND_THEME_BOOTSTRAP, null, Date.now()).theme

// 主題切換事件名稱
export const THEME_CHANGE_EVENT = 'theme-change'

export function getInitialBackgroundTheme() {
  return getBackgroundThemeSelection().theme
}

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
