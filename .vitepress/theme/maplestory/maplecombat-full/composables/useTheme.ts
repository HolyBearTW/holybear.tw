// 桌面緊湊版亮/暗主題切換，設定 data-theme。
import { ref } from 'vue'
import { mapleCombatStorage } from '@maplecombat/services/storage'

export type CompactTheme = 'dark' | 'light'

const STORAGE_KEY = 'maplecombat:compactTheme'
let themeHost: HTMLElement | null = null

function restoreTheme(): CompactTheme {
  const saved = mapleCombatStorage.getItem(STORAGE_KEY)
  if (saved === 'dark' || saved === 'light') return saved
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

const theme = ref<CompactTheme>(restoreTheme())

/** 綁定 Shadow DOM host，主題不得修改 VitePress 的 documentElement。 */
export function bindCompactThemeHost(host: HTMLElement, initialTheme?: CompactTheme): void {
  themeHost = host
  if (initialTheme) theme.value = initialTheme
  applyCompactTheme()
}

export function releaseCompactThemeHost(host: HTMLElement): void {
  if (themeHost === host) themeHost = null
}

export function setCompactTheme(nextTheme: CompactTheme, persist = false): void {
  theme.value = nextTheme
  if (persist) mapleCombatStorage.setItem(STORAGE_KEY, nextTheme)
  applyCompactTheme()
}

export function applyCompactTheme(): void {
  if (themeHost) themeHost.dataset.theme = theme.value
}

export function useCompactTheme() {
  function toggle() {
    setCompactTheme(theme.value === 'dark' ? 'light' : 'dark', true)
  }
  return { theme, toggle }
}
