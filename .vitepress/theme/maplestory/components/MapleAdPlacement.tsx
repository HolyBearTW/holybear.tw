import React from 'react'
import { createApp, type App as VueApp } from 'vue'
import AdSenseSlot from '../../components/AdSenseSlot.vue'

type AdFormat = 'auto' | 'horizontal' | 'fixed'
type FixedAdWidth = 160 | 672 | 1200
type FixedAdHeight = 90 | 600

export default function MapleAdPlacement({
  slotId,
  format = 'auto',
  fixedWidth,
  fixedHeight,
}: {
  slotId: string
  format?: AdFormat
  fixedWidth?: FixedAdWidth
  fixedHeight?: FixedAdHeight
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container || !/^\d+$/.test(slotId)) return

    const app: VueApp = createApp(AdSenseSlot, { slotId, format, fixedWidth, fixedHeight })
    app.mount(container)
    return () => app.unmount()
  }, [slotId, format, fixedWidth, fixedHeight])

  if (!/^\d+$/.test(slotId)) return null
  return (
    <div
      ref={containerRef}
      className={`maple-manual-ad${format === 'fixed' ? ' maple-manual-ad-fixed' : ''}`}
    />
  )
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches
  )

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const update = () => setMatches(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [query])

  return matches
}

export function MapleResponsiveAdPlacement({
  desktopSlotId,
  mobileSlotId,
  desktopMinWidth,
  desktopWidth,
}: {
  desktopSlotId: string
  mobileSlotId: string
  desktopMinWidth: number
  desktopWidth: 672 | 1200
}) {
  const useFixedDesktopUnit = useMediaQuery(`(min-width: ${desktopMinWidth}px)`)
  return (
    <MapleAdPlacement
      slotId={useFixedDesktopUnit ? desktopSlotId : mobileSlotId}
      format={useFixedDesktopUnit ? 'fixed' : 'horizontal'}
      fixedWidth={desktopWidth}
      fixedHeight={90}
    />
  )
}

export function MapleContainerResponsiveAdPlacement({
  fixedSlotId,
  responsiveSlotId,
  requiredWidth = 1200,
}: {
  fixedSlotId: string
  responsiveSlotId: string
  requiredWidth?: number
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [hasEnoughWidth, setHasEnoughWidth] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateWidth = () => {
      const availableWidth = container.clientWidth
      if (availableWidth > 0) setHasEnoughWidth(availableWidth >= requiredWidth)
    }

    updateWidth()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateWidth)
    observer?.observe(container)
    window.addEventListener('resize', updateWidth, { passive: true })

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateWidth)
    }
  }, [requiredWidth])

  return (
    <div ref={containerRef} className="maple-container-responsive-ad">
      {hasEnoughWidth === null ? null : (
        <MapleAdPlacement
          slotId={hasEnoughWidth ? fixedSlotId : responsiveSlotId}
          format={hasEnoughWidth ? 'fixed' : 'horizontal'}
          fixedWidth={1200}
          fixedHeight={90}
        />
      )}
    </div>
  )
}
