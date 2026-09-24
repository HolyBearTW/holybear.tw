import React from 'react'
import { createPortal } from 'react-dom'
import MapleAdPlacement from './MapleAdPlacement'
import { MAPLE_SIDE_AD_LAYOUT, MAPLESTORY_AD_SLOTS } from '../adsenseSlots'

function getSideWidth() {
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth
  const availableWidth = (viewportWidth - MAPLE_SIDE_AD_LAYOUT.contentMaxWidth) / 2 - MAPLE_SIDE_AD_LAYOUT.gap
  return Math.max(0, Math.min(MAPLE_SIDE_AD_LAYOUT.maxSideWidth, Math.floor(availableWidth)))
}

export default function MapleSideAdsOverlay() {
  const [sideWidth, setSideWidth] = React.useState(() =>
    typeof window === 'undefined' ? 0 : getSideWidth()
  )

  React.useEffect(() => {
    const updateSideWidth = () => setSideWidth(getSideWidth())
    window.addEventListener('resize', updateSideWidth, { passive: true })
    updateSideWidth()
    return () => window.removeEventListener('resize', updateSideWidth)
  }, [])

  if (typeof document === 'undefined' || sideWidth < MAPLE_SIDE_AD_LAYOUT.minSideWidth) return null

  return createPortal(
    <div
      className="maple-side-ads-overlay"
      style={{ '--maple-side-width': `${sideWidth}px` } as React.CSSProperties}
    >
      <div className="maple-side-ads-frame">
        <aside className="maple-side-ad maple-side-ad--left" aria-label="左側廣告">
          <MapleAdPlacement slotId={MAPLESTORY_AD_SLOTS.left} />
        </aside>
        <aside className="maple-side-ad maple-side-ad--right" aria-label="右側廣告">
          <MapleAdPlacement slotId={MAPLESTORY_AD_SLOTS.right} />
        </aside>
      </div>
    </div>,
    document.body,
  )
}
