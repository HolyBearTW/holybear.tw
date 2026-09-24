// Shared by the MapleStory Auto ads script and manual ad units.
export const ADSENSE_CLIENT_ID = 'ca-pub-9896576854551135'

export const ADSENSE_SCRIPT_ID = 'holybear-adsense'
export const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`
export type AdSenseScriptStatus = 'loading' | 'loaded' | 'failed'

const ADSENSE_SCRIPT_TIMEOUT_MS = 15_000
let mapleAdSenseScriptStatus: AdSenseScriptStatus = 'loading'
let mapleAdSenseScriptPromise: Promise<AdSenseScriptStatus> | null = null

export const FUNDING_CHOICES_SCRIPT_ID = 'holybear-funding-choices'
export const FUNDING_CHOICES_SCRIPT_SRC = `https://fundingchoicesmessages.google.com/i/${ADSENSE_CLIENT_ID.replace(/^ca-/, '')}?ers=1`
export const FUNDING_CHOICES_SIGNAL_SCRIPT_ID = 'holybear-funding-choices-signal'
export const FUNDING_CHOICES_SIGNAL_SCRIPT = `(function() {
    function signalGooglefcPresent() {
        if (!window.frames['googlefcPresent']) {
            if (document.body) {
                const iframe = document.createElement('iframe');
                iframe.style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;';
                iframe.style.display = 'none';
                iframe.name = 'googlefcPresent';
                document.body.appendChild(iframe);
            } else {
                setTimeout(signalGooglefcPresent, 0);
            }
        }
    }
    signalGooglefcPresent();
})();`

function hasMapleAdSenseRuntime(): boolean {
  if (typeof window === 'undefined') return false
  const queue = (window as Window & { adsbygoogle?: Array<Record<string, never>> }).adsbygoogle
  return Array.isArray(queue) && queue.push !== Array.prototype.push
}

// Keep the script for this document's lifetime. Removing it cannot unload
// Google's Auto ads runtime after a client-side route change.
export function ensureMapleAdSenseScript(): Promise<AdSenseScriptStatus> {
  if (typeof document === 'undefined') return Promise.resolve('failed')

  if (hasMapleAdSenseRuntime()) {
    mapleAdSenseScriptStatus = 'loaded'
    return Promise.resolve(mapleAdSenseScriptStatus)
  }

  const existingScript = (document.getElementById(ADSENSE_SCRIPT_ID) as HTMLScriptElement | null)
    || document.querySelector<HTMLScriptElement>(`script[src="${ADSENSE_SCRIPT_SRC}"]`)

  if (existingScript?.dataset.adsenseStatus === 'loaded') {
    mapleAdSenseScriptStatus = 'loaded'
    return Promise.resolve(mapleAdSenseScriptStatus)
  }
  if (mapleAdSenseScriptStatus === 'failed' || existingScript?.dataset.adsenseStatus === 'failed') {
    mapleAdSenseScriptStatus = 'failed'
    return Promise.resolve(mapleAdSenseScriptStatus)
  }
  if (mapleAdSenseScriptPromise) return mapleAdSenseScriptPromise

  const script = existingScript || document.createElement('script')
  if (!existingScript) {
    script.id = ADSENSE_SCRIPT_ID
    script.async = true
    script.src = ADSENSE_SCRIPT_SRC
    script.crossOrigin = 'anonymous'
    script.dataset.overlays = 'bottom'
  }

  mapleAdSenseScriptStatus = 'loading'
  script.dataset.adsenseStatus = 'loading'
  mapleAdSenseScriptPromise = new Promise((resolve) => {
    let timeoutId: number | undefined
    const finish = (status: AdSenseScriptStatus) => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
      mapleAdSenseScriptStatus = status
      script.dataset.adsenseStatus = status
      resolve(status)
    }
    const handleLoad = () => finish('loaded')
    const handleError = () => finish('failed')
    timeoutId = window.setTimeout(() => finish('failed'), ADSENSE_SCRIPT_TIMEOUT_MS)

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })

    if (!existingScript) {
      try {
        ;(document.head || document.documentElement).appendChild(script)
      } catch {
        finish('failed')
      }
    }
  })

  return mapleAdSenseScriptPromise
}

// The recovery tag follows the same MapleStory-only scope as the site's ad units.
export function ensureAdBlockingRecoveryTag(): void {
  if (typeof document === 'undefined') return

  if (!document.getElementById(FUNDING_CHOICES_SCRIPT_ID)
    && !document.querySelector(`script[src="${FUNDING_CHOICES_SCRIPT_SRC}"]`)) {
    const script = document.createElement('script')
    script.id = FUNDING_CHOICES_SCRIPT_ID
    script.async = true
    script.src = FUNDING_CHOICES_SCRIPT_SRC
    document.head.appendChild(script)
  }

  if (!document.getElementById(FUNDING_CHOICES_SIGNAL_SCRIPT_ID)) {
    const signalScript = document.createElement('script')
    signalScript.id = FUNDING_CHOICES_SIGNAL_SCRIPT_ID
    signalScript.textContent = FUNDING_CHOICES_SIGNAL_SCRIPT
    document.head.appendChild(signalScript)
  }
}
