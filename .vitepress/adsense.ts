// Shared by the MapleStory Auto ads script and manual ad units.
export const ADSENSE_CLIENT_ID = 'ca-pub-9896576854551135'

export const ADSENSE_SCRIPT_ID = 'holybear-adsense'
export const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`

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
