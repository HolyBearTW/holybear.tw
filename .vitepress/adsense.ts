// Shared by the MapleStory Auto ads script and manual ad units.
export const ADSENSE_CLIENT_ID = 'ca-pub-9896576854551135'

export const ADSENSE_SCRIPT_ID = 'holybear-adsense'
export const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`

// Keep the script for this document's lifetime. Removing it cannot unload
// Google's Auto ads runtime after a client-side route change.
export function ensureMapleAdSenseScript(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(ADSENSE_SCRIPT_ID) || document.querySelector(`script[src="${ADSENSE_SCRIPT_SRC}"]`)) return

  const script = document.createElement('script')
  script.id = ADSENSE_SCRIPT_ID
  script.async = true
  script.src = ADSENSE_SCRIPT_SRC
  script.crossOrigin = 'anonymous'
  script.dataset.overlays = 'bottom'
  document.head.appendChild(script)
}
