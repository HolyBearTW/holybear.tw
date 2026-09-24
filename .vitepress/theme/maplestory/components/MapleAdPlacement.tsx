import React from 'react'
import { createApp, type App as VueApp } from 'vue'
import AdSenseSlot from '../../components/AdSenseSlot.vue'

export default function MapleAdPlacement({ slotId, format = 'auto' }: { slotId: string; format?: 'auto' | 'horizontal' }) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container || !/^\d+$/.test(slotId)) return

    const app: VueApp = createApp(AdSenseSlot, { slotId, format })
    app.mount(container)
    return () => app.unmount()
  }, [slotId, format])

  if (!/^\d+$/.test(slotId)) return null
  return <div ref={containerRef} className="maple-manual-ad" />
}
