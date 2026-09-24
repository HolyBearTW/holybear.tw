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
  const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null)
  const [sideWidth, setSideWidth] = React.useState(() =>
    typeof window === 'undefined' ? 0 : getSideWidth()
  )
  const [anchorTops, setAnchorTops] = React.useState<{ left: number | null; right: number | null }>({
    left: null,
    right: null,
  })

  React.useEffect(() => {
    const container = document.createElement('div')
    container.className = 'maple-side-ads-portal'
    const appRoot = document.getElementById('app') ?? document.body.firstElementChild
    document.body.insertBefore(container, appRoot)
    setPortalContainer(container)
    return () => container.remove()
  }, [])

  React.useEffect(() => {
    const updateSideWidth = () => setSideWidth(getSideWidth())
    window.addEventListener('resize', updateSideWidth, { passive: true })
    updateSideWidth()
    return () => window.removeEventListener('resize', updateSideWidth)
  }, [])

  React.useEffect(() => {
    let animationFrame = 0

    const updateAnchorTops = () => {
      animationFrame = 0
      const navBottom = document.querySelector('.VPNav')?.getBoundingClientRect().bottom ?? 0
      const minimumTop = Math.ceil(navBottom + 16)
      const readTop = (name: 'profile' | 'equipment') => {
        const anchor = document.querySelector<HTMLElement>(`[data-maple-side-ad-anchor="${name}"]`)
        return anchor ? Math.max(minimumTop, Math.round(anchor.getBoundingClientRect().top)) : null
      }
      const next = { left: readTop('profile'), right: readTop('equipment') }
      setAnchorTops((current) =>
        current.left === next.left && current.right === next.right ? current : next
      )
    }

    const scheduleUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateAnchorTops)
    }

    const mutationObserver = new MutationObserver(scheduleUpdate)
    const appRoot = document.getElementById('app')
    if (appRoot) mutationObserver.observe(appRoot, { childList: true, subtree: true })
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate, { passive: true })
    scheduleUpdate()

    return () => {
      mutationObserver.disconnect()
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  if (!portalContainer || sideWidth < MAPLE_SIDE_AD_LAYOUT.minSideWidth) return null

  const alignmentStyle = (top: number | null): React.CSSProperties => ({
    top: top === null ? '50%' : `${top}px`,
    transform: top === null ? 'translateY(-50%)' : 'none',
  })

  return createPortal(
    <div
      className="maple-side-ads-overlay"
      style={{
        '--maple-side-width': `${sideWidth}px`,
        '--maple-side-fixed-overflow': `${Math.max(0, 160 - sideWidth)}px`,
      } as React.CSSProperties}
    >
      <div className="maple-side-ads-frame">
        <aside
          className="maple-side-ad maple-side-ad--left"
          aria-label="左側廣告"
          style={alignmentStyle(anchorTops.left)}
        >
          <MapleAdPlacement slotId={MAPLESTORY_AD_SLOTS.left} format="fixed" fixedWidth={160} fixedHeight={600} />
        </aside>
        <aside
          className="maple-side-ad maple-side-ad--right"
          aria-label="右側廣告"
          style={alignmentStyle(anchorTops.right)}
        >
          <MapleAdPlacement slotId={MAPLESTORY_AD_SLOTS.right} format="fixed" fixedWidth={160} fixedHeight={600} />
        </aside>
      </div>
    </div>,
    portalContainer,
  )
}
