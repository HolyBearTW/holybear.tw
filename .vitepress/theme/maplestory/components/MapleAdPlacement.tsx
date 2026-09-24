import React from 'react'
import { createApp, type App as VueApp } from 'vue'
import AdSenseSlot from '../../components/AdSenseSlot.vue'

export default function MapleAdPlacement({ slotId, side = false, format = 'auto' }: { slotId: string; side?: boolean; format?: 'auto' | 'horizontal' }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [wideScreen, setWideScreen] = React.useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 2000px)').matches
  )

  React.useEffect(() => {
    if (!side || !slotId) return
    const query = window.matchMedia('(min-width: 2000px)')
    const update = () => setWideScreen(query.matches)
    query.addEventListener('change', update)
    update()
    return () => query.removeEventListener('change', update)
  }, [side, slotId])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container || !/^\d+$/.test(slotId) || (side && !wideScreen)) return

    const app: VueApp = createApp(AdSenseSlot, { slotId, format })
    app.mount(container)
    return () => app.unmount()
  }, [side, slotId, wideScreen, format])

  if (!/^\d+$/.test(slotId) || (side && !wideScreen)) return null
  return <div ref={containerRef} className="maple-manual-ad" />
}
