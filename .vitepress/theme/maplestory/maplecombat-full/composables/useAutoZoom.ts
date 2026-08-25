// 桌面緊湊版自動縮放：佈局視口以 635px 設計寬排版，
// 視窗拉大時內容等比例放大且永遠滿版延展（不產生置中斷層、不露大片背景）。
const BASE_WIDTH = 635
const MAX_ZOOM = 1.5

function applyZoom(): void {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, window.innerWidth / BASE_WIDTH))
  document.documentElement.style.setProperty('zoom', String(zoom))
  // base.css 的 body min-height:100vh 在 zoom 下會放大成 100vh*zoom 造成多餘捲動，
  // 以實際視窗高/zoom 取代
  document.body.style.minHeight = `${Math.floor(window.innerHeight / zoom)}px`
}

/** main.ts 於 mount 前呼叫一次，並掛 resize 監聽。 */
export function setupAutoZoom(): void {
  applyZoom()
  window.addEventListener('resize', applyZoom, { passive: true })
}
