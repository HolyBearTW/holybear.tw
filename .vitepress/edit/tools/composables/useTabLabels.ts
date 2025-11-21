import type { Ref } from 'vue'
import { computed, useSlots } from 'vue'

export function useTabLabels(): Ref<string[]> {
  const slots = useSlots()
  const tabLabels = computed(() => {
    const defaultSlot = slots.default?.()
    if (!defaultSlot) {
      return []
    }

    return defaultSlot
      .filter(
        vnode =>
          vnode.component?.proxy?.__tabComponent ||
          (vnode.type && typeof vnode.type === 'object' && '__name' in vnode.type && vnode.type.__name === 'PluginTabsTab') ||
          vnode.props
      )
      .map(vnode => vnode.props?.label)
      .filter(Boolean)
  })
  return tabLabels
}