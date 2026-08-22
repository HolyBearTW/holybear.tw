import { createApp, nextTick, watch, type App as VueApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { DashboardData } from '../types'
import type {
  MapleCombatSection,
  MapleCombatSectionResult,
} from '../components/FullMapleCombatEmbed'
import App from './App.vue'
import { createMapleCombatAutoFill } from './autoFill'
import { useBuffsStore } from '@maplecombat/stores/buffs'
import { useCharacterStore } from '@maplecombat/stores/character'
import { useStateSlotsStore, type StateSlotId } from '@maplecombat/stores/stateSlots'
import { isScenarioField, isSharedField, isWeightedField } from '@maplecombat/stores/stateSlots'
import { useUiStore } from '@maplecombat/stores/ui'
import { fieldDefById, fieldDefs } from '@maplecombat/constants/fields'
import { emptyBuffState } from '@maplecombat/core/buffs/delta'
import { applyDensity } from '@maplecombat/composables/useDensity'
import { calculateWeightedSummary } from '@maplecombat/core/weightedStates'
import {
  bindCompactThemeHost,
  releaseCompactThemeHost,
  setCompactTheme,
  type CompactTheme,
} from '@maplecombat/composables/useTheme'
import {
  mapleCombatStorage,
  setMapleCombatStorageScope,
} from '@maplecombat/services/storage'
import {
  configureEquipmentCatalog,
  currentEquipmentNewFields,
  currentEquipmentOldFields,
} from '@maplecombat/services/equipmentCatalog'

import embedCss from './styles/embed-overrides.css?inline'

export interface MapleCombatMountOptions {
  data: DashboardData
  theme: CompactTheme
  section: MapleCombatSection
  onDirtyChange?: (dirty: boolean) => void
  onResultChange?: (result: MapleCombatSectionResult) => void
}

export interface MapleCombatController {
  resetFromCharacter(): void
  clearAll(): void
  setSection(section: MapleCombatSection): void
  setTheme(theme: CompactTheme): void
  unmount(): void
}

const INITIALIZED_KEY = 'holybearAutoFillVersion'
const AUTO_FILL_VERSION = '2026-08-22-v5'
const AUTO_FILL_SNAPSHOT_KEY = 'holybearAutoFillSnapshotV2'
const embeddedCss = embedCss

interface AutoFillSnapshot {
  values: Record<string, string | boolean>
  buffLevels: Record<string, number>
  soulOrb?: { value: number; stat: string; fullSoul: boolean }
}

const sameValue = (left: unknown, right: unknown) => String(left ?? '') === String(right ?? '')

const autoFillValue = (id: string, value: unknown): string | boolean => {
  const field = fieldDefById[id]
  if (field?.kind === 'checkbox') return value === true || value === 'true'
  return String(value ?? '')
}

const readAutoFillSnapshot = (): AutoFillSnapshot | null => {
  try {
    const parsed = JSON.parse(mapleCombatStorage.getItem(AUTO_FILL_SNAPSHOT_KEY) || 'null')
    return parsed && typeof parsed === 'object' ? (parsed as AutoFillSnapshot) : null
  } catch {
    return null
  }
}

const snapshotState = (
  character: ReturnType<typeof useCharacterStore>,
  buffs: ReturnType<typeof useBuffsStore>,
  slots: ReturnType<typeof useStateSlotsStore>,
) =>
  JSON.stringify({
    fields: character.fields,
    selectedJob: character.selectedJob,
    selectedJobName: character.selectedJobName,
    effSelectedJob: character.effSelectedJob,
    buffs: buffs.collectState(),
    workspace: slots.exportWorkspace(),
  })

/**
 * 完整計算機只從 React lazy modal 呼叫；Pinia、原作者介面、CSS 與 Buff 圖片
 * 都留在此動態 chunk，避免增加楓之谷首頁或角色查詢的初次載入成本。
 */
export async function mountMapleCombat(
  host: HTMLElement,
  options: MapleCombatMountOptions,
): Promise<MapleCombatController> {
  const scope = options.data.ocid || options.data.basic.character_name || 'anonymous'
  setMapleCombatStorageScope(scope)
  configureEquipmentCatalog(options.data)
  applyDensity(host)
  bindCompactThemeHost(host, options.theme)

  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
  shadow.replaceChildren()
  const style = document.createElement('style')
  style.textContent = embeddedCss
  const root = document.createElement('div')
  root.id = 'app'
  shadow.append(style, root)

  const autoFill = createMapleCombatAutoFill(options.data)
  const pinia = createPinia()
  setActivePinia(pinia)
  const character = useCharacterStore(pinia)
  const buffs = useBuffsStore(pinia)
  const slots = useStateSlotsStore(pinia)
  const ui = useUiStore(pinia)
  let activeSection = options.section
  let lastScenarioSlot: StateSlotId =
    slots.workspace.activeSlot === 'weighted' ? 'state1' : slots.workspace.activeSlot

  const publishResult = () => {
    const baselinePower = character.powerValue(character.powerNoBuff)
    let projectedPower = baselinePower
    let actualPercentChange: number | null = null

    const percentGain = (before: number, after: number) => {
      if (!Number.isFinite(before) || !Number.isFinite(after) || before <= 0) return null
      return (after / before - 1) * 100
    }

    if (activeSection === 'buffs') {
      projectedPower = character.powerValue(character.powerWithBuff)
      actualPercentChange = percentGain(character.effOutputNoBuff, character.effOutputWithBuff)
    } else if (activeSection === 'equipment') {
      projectedPower = character.powerValue(character.equipmentChangedPower)
      actualPercentChange = character.equipmentActualGain
    } else if (activeSection === 'weighted') {
      const summary = calculateWeightedSummary(slots.workspace, buffs.table)
      if (ui.activeView === 'characterInput') {
        projectedPower = summary.combatBuffPower
        actualPercentChange = summary.actualBuffGain
      } else if (ui.activeView === 'equipmentChange') {
        projectedPower = summary.equipmentChangedPower
        actualPercentChange = summary.equipmentActualGain
      }
    }

    options.onResultChange?.({ section: activeSection, baselinePower, projectedPower, actualPercentChange })
  }

  const applyApiData = (force = false) => {
    const previous = readAutoFillSnapshot()
    const firstV2Merge = mapleCombatStorage.getItem(INITIALIZED_KEY) !== AUTO_FILL_VERSION
    const overwriteApiFields = force || firstV2Merge || !previous
    const workspace = slots.exportWorkspace()
    const state1 = workspace.states.find((state) => state.id === 'state1') || workspace.states[0]
    if (!state1) return

    workspace.shared.selectedJob = autoFill.saveData.selectedJob
    workspace.shared.selectedJobName = autoFill.saveData.selectedJobName
    workspace.shared.effSelectedJob = autoFill.saveData.effSelectedJob

    const snapshotValues: Record<string, string | boolean> = {}
    autoFill.autoFilledFields.forEach((id) => {
      const next = autoFillValue(id, autoFill.saveData.values[id])
      snapshotValues[id] = next
      const target = isSharedField(id)
        ? workspace.shared.values
        : isScenarioField(id)
          ? state1.values
          : workspace.weighted.values
      const current = target[id]
      const previousValue = previous?.values?.[id]
      const isStillAutoFilled = previousValue !== undefined && sameValue(current, previousValue)
      const isEmptyOrDefault = current === undefined || sameValue(current, fieldDefById[id]?.default)
      if (overwriteApiFields || isStillAutoFilled || isEmptyOrDefault) target[id] = next
    })

    // 「原裝備」永遠代表上方所選的現役裝備；每次開啟／重新帶入時都以
    // 最新 API 覆蓋左欄。右側新裝備與其他手動情境仍照原本邏輯保留。
    Object.entries(currentEquipmentOldFields()).forEach(([id, value]) => {
      const next = autoFillValue(id, value)
      snapshotValues[id] = next
      const target = isSharedField(id)
        ? workspace.shared.values
        : isScenarioField(id)
          ? state1.values
          : workspace.weighted.values
      target[id] = next
    })

    const newEquipmentFields = currentEquipmentNewFields()
    const newEquipmentIsEmpty = Object.keys(newEquipmentFields).every((id) => {
      const target = isSharedField(id)
        ? workspace.shared.values
        : isScenarioField(id)
          ? state1.values
          : workspace.weighted.values
      return target[id] === undefined || sameValue(target[id], fieldDefById[id]?.default)
    })
    Object.entries(newEquipmentFields).forEach(([id, value]) => {
      const next = autoFillValue(id, value)
      const target = isSharedField(id)
        ? workspace.shared.values
        : isScenarioField(id)
          ? state1.values
          : workspace.weighted.values
      const previousValue = previous?.values?.[id]
      const isStillAutoFilled = previousValue !== undefined && sameValue(target[id], previousValue)
      if (force || newEquipmentIsEmpty || isStillAutoFilled) target[id] = next
      snapshotValues[id] = next
    })

    const apiBuffState = autoFill.saveData.buffState
    const currentBuffState = overwriteApiFields
      ? apiBuffState
        ? JSON.parse(JSON.stringify(apiBuffState))
        : buffs.collectState()
      : state1.buffState
        ? JSON.parse(JSON.stringify(state1.buffState))
      : apiBuffState
        ? JSON.parse(JSON.stringify(apiBuffState))
        : buffs.collectState()
    const snapshotBuffLevels: Record<string, number> = {}
    if (apiBuffState) {
      autoFill.autoFilledBuffIds.forEach((id) => {
        const next = Number(apiBuffState.levels[id]) || 0
        snapshotBuffLevels[id] = next
        const current = Number(currentBuffState.levels[id]) || 0
        const previousValue = previous?.buffLevels?.[id]
        if (overwriteApiFields || previousValue === undefined || current === previousValue) {
          currentBuffState.levels[id] = next
        }
      })
      if (autoFill.soulOrbFromApi) {
        const nextSoul = { ...apiBuffState.soulOrb }
        const currentSoul = currentBuffState.soulOrb
        const isStillAutoFilled = previous?.soulOrb && JSON.stringify(currentSoul) === JSON.stringify(previous.soulOrb)
        if (overwriteApiFields || !previous?.soulOrb || isStillAutoFilled) currentBuffState.soulOrb = nextSoul
      }
      state1.buffState = currentBuffState
    }

    slots.importWorkspace(workspace)
    character.reloadWorkspaceSlot()
    Object.entries(autoFill.preferredBuffLevels).forEach(([id, level]) => {
      buffs.rememberPreferredLevel(id, level)
    })
    mapleCombatStorage.setItem(INITIALIZED_KEY, AUTO_FILL_VERSION)
    mapleCombatStorage.setItem(
      AUTO_FILL_SNAPSHOT_KEY,
      JSON.stringify({
        values: snapshotValues,
        buffLevels: snapshotBuffLevels,
        soulOrb: autoFill.soulOrbFromApi && apiBuffState ? apiBuffState.soulOrb : undefined,
      } satisfies AutoFillSnapshot),
    )
  }

  applyApiData()

  const clearAll = () => {
    const workspace = slots.exportWorkspace()
    const emptyLevels = emptyBuffState(buffs.table)
    const emptyState = {
      master: true,
      levels: emptyLevels,
      soulOrb: { value: 0, stat: 'percentStr', fullSoul: false },
      combatCorrections: { mentor: false, empress: false, genesis: false },
    }

    fieldDefs.forEach((field) => {
      if (isSharedField(field.id)) workspace.shared.values[field.id] = field.default
      else if (isWeightedField(field.id)) workspace.weighted.values[field.id] = field.default
    })
    workspace.states.forEach((state) => {
      fieldDefs.forEach((field) => {
        if (isScenarioField(field.id)) state.values[field.id] = field.default
      })
      state.buffState = JSON.parse(JSON.stringify(emptyState))
    })
    slots.importWorkspace(workspace)
    character.reloadWorkspaceSlot()
    options.onDirtyChange?.(true)
  }

  const setSection = (section: MapleCombatSection) => {
    activeSection = section
    host.dataset.calculatorSection = section
    if (section === 'weighted') {
      if (slots.workspace.activeSlot !== 'weighted') lastScenarioSlot = slots.workspace.activeSlot
      character.activateWorkspaceSlot('weighted')
      ui.activeView = 'characterInput'
      publishResult()
      return
    }
    if (slots.workspace.activeSlot === 'weighted') {
      character.activateWorkspaceSlot(lastScenarioSlot)
    }
    if (section === 'equipment') ui.activeView = 'equipmentChange'
    else if (section === 'efficiency') ui.activeView = 'valueConversion'
    else ui.activeView = 'characterInput'
    if (section === 'buffs') ui.buffPanelOpen = true
    publishResult()
  }
  setSection(options.section)

  const app: VueApp = createApp(App)
  app.use(pinia)
  app.mount(root)
  await nextTick()

  let baseline = snapshotState(character, buffs, slots)
  options.onDirtyChange?.(false)
  const stopDirtyWatch = watch(
    [() => character.fields, () => buffs.state, () => buffs.soulOrb, () => slots.workspace],
    () => options.onDirtyChange?.(snapshotState(character, buffs, slots) !== baseline),
    { deep: true, flush: 'post' },
  )
  const stopResultWatch = watch(
    [
      () => character.fields,
      () => buffs.state,
      () => buffs.soulOrb,
      () => slots.workspace,
      () => ui.activeView,
    ],
    publishResult,
    { deep: true, flush: 'post', immediate: true },
  )

  return {
    resetFromCharacter() {
      applyApiData(true)
      options.onDirtyChange?.(true)
    },
    clearAll,
    setSection,
    setTheme(theme) {
      setCompactTheme(theme)
    },
    unmount() {
      stopDirtyWatch()
      stopResultWatch()
      baseline = ''
      app.unmount()
      releaseCompactThemeHost(host)
      shadow.replaceChildren()
    },
  }
}
