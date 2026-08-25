/**
 * 桌面緊湊高密度：在 main.ts mount 前呼叫，
 * 設定 data-density 讓 compact CSS 變數覆寫在首繪前生效。
 * 嵌入版以 data-density 作為本站樣式範圍，避免影響外層戰力工具。
 */
export function applyDensity(host?: HTMLElement): void {
  if (host) host.dataset.density = 'compact'
}
