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
  return <div ref={containerRef} className="maple-manual-ad" />
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
