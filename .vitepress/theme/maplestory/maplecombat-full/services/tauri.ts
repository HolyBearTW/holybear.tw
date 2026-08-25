import { invoke, isTauri as isTauriRuntime } from '@tauri-apps/api/core'

/** 是否在 Tauri 桌面環境執行 */
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false
  // Tauri 2 官方判定使用 globalThis.isTauri；保留 internals 檢查相容舊 runtime。
  return isTauriRuntime() || '__TAURI_INTERNALS__' in window
}

/**
 * 桌面版另存新檔。回傳 true = 已寫入；false = 使用者取消。
 * 對應 Rust 端 save_export_file command 契約。
 */
export async function saveExportFile(defaultFileName: string, contents: string): Promise<boolean> {
  return invoke<boolean>('save_export_file', { defaultFileName, contents })
}
