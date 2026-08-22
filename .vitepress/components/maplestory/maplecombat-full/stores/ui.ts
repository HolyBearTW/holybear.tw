import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { mapleCombatStorage } from '@maplecombat/services/storage'
import { getStoredString } from './persist'

export type ViewKey = 'characterInput' | 'equipmentChange' | 'valueConversion'
export type CalculatorMode = 'calculator' | 'effStats'

const VALID_VIEWS: ViewKey[] = ['characterInput', 'equipmentChange', 'valueConversion']
const VALID_MODES: CalculatorMode[] = ['calculator', 'effStats']

function restoreView(): ViewKey {
  // view id 遷移：current→characterInput、equipment→valueConversion；
  // 已移除的 apiImport 分頁退回 characterInput
  const migration: Record<string, ViewKey> = {
    current: 'characterInput',
    equipment: 'valueConversion',
  }
  let saved = getStoredString('activeView', 'characterInput')
  if (migration[saved]) saved = migration[saved]
  return VALID_VIEWS.includes(saved as ViewKey) ? (saved as ViewKey) : 'characterInput'
}

function restoreMode(): CalculatorMode {
  const saved = getStoredString('activeCalculatorMode', 'calculator')
  return VALID_MODES.includes(saved as CalculatorMode) ? (saved as CalculatorMode) : 'calculator'
}

export const useUiStore = defineStore('ui', () => {
  const activeView = ref<ViewKey>(restoreView())
  const calculatorMode = ref<CalculatorMode>(restoreMode())
  // 桌面緊湊版 Buff 面板收合狀態（store 層級讓 combat/eff 兩個面板實例同步），預設收合
  const buffPanelOpen = ref(getStoredString('compactBuffPanelOpen', 'false') === 'true')
  // 裝備變更／數值換算共用的 Buff 抽屜；每次啟動預設收合。
  const buffDrawerOpen = ref(false)

  watch(activeView, (view) => mapleCombatStorage.setItem('activeView', view), { flush: 'sync' })
  watch(calculatorMode, (mode) => mapleCombatStorage.setItem('activeCalculatorMode', mode), {
    flush: 'sync',
  })
  watch(buffPanelOpen, (open) => mapleCombatStorage.setItem('compactBuffPanelOpen', String(open)), {
    flush: 'sync',
  })

  return { activeView, calculatorMode, buffPanelOpen, buffDrawerOpen }
})
