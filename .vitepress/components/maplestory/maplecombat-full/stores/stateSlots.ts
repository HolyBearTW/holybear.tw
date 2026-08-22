import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { mapleCombatStorage } from '@maplecombat/services/storage'
import { fieldDefs } from '@maplecombat/constants/fields'
import type { BuffExportState } from './buffs'

export const STATE_SLOT_IDS = ['state1', 'state2', 'state3', 'state4', 'state5'] as const
export type StateSlotId = (typeof STATE_SLOT_IDS)[number]
export type WorkspaceSlotId = StateSlotId | 'weighted'

export interface SharedWorkspaceData {
  selectedJob: string
  selectedJobName: string
  effSelectedJob: string
  values: Record<string, string | boolean>
}

export interface ScenarioStateData {
  id: StateSlotId
  name: string
  values: Record<string, string | boolean>
  buffState?: BuffExportState
}

export interface WeightedPageData {
  weights: Record<StateSlotId, number>
  values: Record<string, string | boolean>
}

export interface CompactStateWorkspaceV1 {
  version: 1
  activeSlot: WorkspaceSlotId
  shared: SharedWorkspaceData
  states: ScenarioStateData[]
  weighted: WeightedPageData
}

const STORAGE_KEY = 'mapleCombatCompactWorkspaceV1'
const MAX_STATE_NAME_LENGTH = 12

const ACTUAL_FIELD_IDS = new Set([
  'effBaseMain',
  'effPercentMain',
  'effNoApplyMain',
  'effBaseSub',
  'effPercentSub',
  'effNoApplySub',
  'effIncludeSecondSub',
  'effBaseSubtwo',
  'effPercentSubtwo',
  'effNoApplySubtwo',
  'effAtk',
  'effPercentAtk',
  'effNoApplyAtk',
  'effDmg',
  'effBossDmg',
  'effCritDmg',
  'effFamFinal',
  'effFamFinalSources',
  'effIgnoreDefense',
  'effMonsterDefense',
  'effBaseHP',
])

const WEIGHTED_FIELD_PREFIXES = ['eqOld', 'eqNew', 'effUnit', 'effSelectedMetric', 'effMetricPanelOpen']
const WEIGHTED_FIELD_IDS = new Set([
  'effShowActualGain',
  'effShowCombatGain',
  'effDisplayMode',
  'effCustomMetricKeys',
])

export function isScenarioField(id: string): boolean {
  return ACTUAL_FIELD_IDS.has(id) || id.startsWith('towerRing')
}

export function isWeightedField(id: string): boolean {
  return WEIGHTED_FIELD_IDS.has(id) || WEIGHTED_FIELD_PREFIXES.some((prefix) => id.startsWith(prefix))
}

export function isSharedField(id: string): boolean {
  return !isScenarioField(id) && !isWeightedField(id)
}

function defaultStateName(index: number): string {
  return `狀態${index + 1}`
}

function normalizeStateName(name: unknown, fallback: string): string {
  const trimmed = String(name ?? '').trim()
  return (trimmed || fallback).slice(0, MAX_STATE_NAME_LENGTH)
}

function defaultValueById(id: string): string | boolean {
  return fieldDefs.find((def) => def.id === id)?.default ?? ''
}

function valuesFromFields(
  fields: Record<string, string | boolean>,
  predicate: (id: string) => boolean,
): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {}
  fieldDefs.forEach((def) => {
    if (predicate(def.id)) values[def.id] = fields[def.id] ?? def.default
  })
  return values
}

function defaultValues(predicate: (id: string) => boolean): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {}
  fieldDefs.forEach((def) => {
    if (predicate(def.id)) values[def.id] = def.default
  })
  return values
}

function normalizeWeights(raw: unknown): Record<StateSlotId, number> {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return Object.fromEntries(
    STATE_SLOT_IDS.map((id, index) => {
      const value = Number(obj[id])
      const fallback = index === 0 ? 100 : 0
      return [id, Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback]
    }),
  ) as Record<StateSlotId, number>
}

function normalizeWorkspace(data: unknown): CompactStateWorkspaceV1 | null {
  if (!data || typeof data !== 'object') return null
  const raw = data as Record<string, unknown>
  const sharedRaw = raw.shared && typeof raw.shared === 'object' ? (raw.shared as Record<string, unknown>) : {}
  const weightedRaw =
    raw.weighted && typeof raw.weighted === 'object' ? (raw.weighted as Record<string, unknown>) : {}
  const rawStates = Array.isArray(raw.states) ? raw.states : []
  const states = STATE_SLOT_IDS.map((id, index) => {
    const src =
      (rawStates.find((entry) => entry && typeof entry === 'object' && (entry as Record<string, unknown>).id === id) as
        | Record<string, unknown>
        | undefined) ?? {}
    return {
      id,
      name: normalizeStateName(src.name, defaultStateName(index)),
      values:
        src.values && typeof src.values === 'object'
          ? ({ ...defaultValues(isScenarioField), ...(src.values as Record<string, string | boolean>) } as Record<
              string,
              string | boolean
            >)
          : defaultValues(isScenarioField),
      buffState: src.buffState as BuffExportState | undefined,
    }
  })

  const active = String(raw.activeSlot || STATE_SLOT_IDS[0]) as WorkspaceSlotId
  return {
    version: 1,
    activeSlot: active === 'weighted' || STATE_SLOT_IDS.includes(active as StateSlotId) ? active : 'state1',
    shared: {
      selectedJob: String(sharedRaw.selectedJob || 'normal'),
      selectedJobName: String(sharedRaw.selectedJobName || ''),
      effSelectedJob: String(sharedRaw.effSelectedJob || sharedRaw.selectedJob || 'normal'),
      values:
        sharedRaw.values && typeof sharedRaw.values === 'object'
          ? ({ ...defaultValues(isSharedField), ...(sharedRaw.values as Record<string, string | boolean>) } as Record<
              string,
              string | boolean
            >)
          : defaultValues(isSharedField),
    },
    states,
    weighted: {
      weights: normalizeWeights(weightedRaw.weights),
      values:
        weightedRaw.values && typeof weightedRaw.values === 'object'
          ? ({ ...defaultValues(isWeightedField), ...(weightedRaw.values as Record<string, string | boolean>) } as Record<
              string,
              string | boolean
            >)
          : defaultValues(isWeightedField),
    },
  }
}

function createWorkspaceFromRuntime(
  fields: Record<string, string | boolean>,
  job: { selectedJob: string; selectedJobName: string; effSelectedJob: string },
  buffState?: BuffExportState,
): CompactStateWorkspaceV1 {
  return {
    version: 1,
    activeSlot: 'state1',
    shared: {
      selectedJob: job.selectedJob,
      selectedJobName: job.selectedJobName,
      effSelectedJob: job.effSelectedJob,
      values: valuesFromFields(fields, isSharedField),
    },
    states: STATE_SLOT_IDS.map((id, index) => ({
      id,
      name: defaultStateName(index),
      values: index === 0 ? valuesFromFields(fields, isScenarioField) : defaultValues(isScenarioField),
      buffState: index === 0 ? buffState : undefined,
    })),
    weighted: {
      weights: normalizeWeights(null),
      values: valuesFromFields(fields, isWeightedField),
    },
  }
}

export const useStateSlotsStore = defineStore('stateSlots', () => {
  const initialized = ref(false)
  const workspace = reactive<CompactStateWorkspaceV1>({
    version: 1,
    activeSlot: 'state1',
    shared: {
      selectedJob: 'normal',
      selectedJobName: '',
      effSelectedJob: 'normal',
      values: defaultValues(isSharedField),
    },
    states: STATE_SLOT_IDS.map((id, index) => ({
      id,
      name: defaultStateName(index),
      values: defaultValues(isScenarioField),
    })),
    weighted: {
      weights: normalizeWeights(null),
      values: defaultValues(isWeightedField),
    },
  })

  const activeState = computed(() =>
    workspace.activeSlot === 'weighted'
      ? null
      : workspace.states.find((state) => state.id === workspace.activeSlot) || workspace.states[0],
  )
  const isWeightedActive = computed(() => workspace.activeSlot === 'weighted')
  const activeLabel = computed(() => activeState.value?.name ?? '加權')

  function persist(): void {
    if (!initialized.value) return
    mapleCombatStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
  }

  function replaceWorkspace(next: CompactStateWorkspaceV1): void {
    workspace.version = 1
    workspace.activeSlot = next.activeSlot
    workspace.shared = next.shared
    workspace.states = next.states
    workspace.weighted = next.weighted
  }

  function ensureInitialized(
    fields: Record<string, string | boolean>,
    job: { selectedJob: string; selectedJobName: string; effSelectedJob: string },
    buffState?: BuffExportState,
  ): void {
    if (initialized.value) return
    let restored: CompactStateWorkspaceV1 | null = null
    try {
      restored = normalizeWorkspace(JSON.parse(mapleCombatStorage.getItem(STORAGE_KEY) || 'null'))
    } catch {
      restored = null
    }
    replaceWorkspace(restored || createWorkspaceFromRuntime(fields, job, buffState))
    initialized.value = true
    persist()
  }

  function snapshotValues(slot: WorkspaceSlotId = workspace.activeSlot): Record<string, string | boolean> {
    const values = { ...workspace.shared.values }
    if (slot === 'weighted') {
      return { ...values, ...workspace.weighted.values }
    }
    const state = workspace.states.find((entry) => entry.id === slot) || workspace.states[0]
    return { ...values, ...state.values, ...workspace.weighted.values }
  }

  function scenarioValues(id: StateSlotId): Record<string, string | boolean> {
    const state = workspace.states.find((entry) => entry.id === id) || workspace.states[0]
    return { ...workspace.shared.values, ...state.values, ...workspace.weighted.values }
  }

  function setActiveSlot(slot: WorkspaceSlotId): void {
    workspace.activeSlot = slot
    persist()
  }

  function saveField(id: string, value: string | boolean): void {
    if (!initialized.value) return
    if (isSharedField(id)) workspace.shared.values[id] = value
    else if (workspace.activeSlot === 'weighted' || isWeightedField(id)) workspace.weighted.values[id] = value
    else activeState.value!.values[id] = value
    persist()
  }

  function saveSharedJob(job: { selectedJob: string; selectedJobName: string; effSelectedJob: string }): void {
    workspace.shared.selectedJob = job.selectedJob
    workspace.shared.selectedJobName = job.selectedJobName
    workspace.shared.effSelectedJob = job.effSelectedJob
    persist()
  }

  function saveBuffForActive(buffState: BuffExportState): void {
    if (!initialized.value || workspace.activeSlot === 'weighted') return
    activeState.value!.buffState = buffState
    persist()
  }

  function saveRuntimeSnapshot(
    fields: Record<string, string | boolean>,
    job: { selectedJob: string; selectedJobName: string; effSelectedJob: string },
    buffState?: BuffExportState,
  ): void {
    if (!initialized.value) return
    workspace.shared.values = valuesFromFields(fields, isSharedField)
    workspace.weighted.values = valuesFromFields(fields, isWeightedField)
    saveSharedJob(job)
    if (workspace.activeSlot !== 'weighted') {
      activeState.value!.values = valuesFromFields(fields, isScenarioField)
      if (buffState) activeState.value!.buffState = buffState
    }
    persist()
  }

  function setWeight(id: StateSlotId, raw: unknown): void {
    const value = Number(raw)
    workspace.weighted.weights[id] = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
    persist()
  }

  function renameState(id: StateSlotId, name: string): void {
    const index = STATE_SLOT_IDS.indexOf(id)
    const state = workspace.states.find((entry) => entry.id === id)
    if (!state) return
    state.name = normalizeStateName(name, defaultStateName(index))
    persist()
  }

  function copyState(from: StateSlotId, to: StateSlotId): void {
    if (from === to) return
    const src = workspace.states.find((entry) => entry.id === from)
    const dest = workspace.states.find((entry) => entry.id === to)
    if (!src || !dest) return
    dest.values = { ...src.values }
    dest.buffState = src.buffState ? JSON.parse(JSON.stringify(src.buffState)) : undefined
    persist()
  }

  function resetState(id: StateSlotId): void {
    const state = workspace.states.find((entry) => entry.id === id)
    if (!state) return
    state.values = defaultValues(isScenarioField)
    state.buffState = undefined
    persist()
  }

  function importWorkspace(data: unknown): boolean {
    const normalized = normalizeWorkspace(data)
    if (!normalized) return false
    replaceWorkspace(normalized)
    initialized.value = true
    persist()
    return true
  }

  function exportWorkspace(): CompactStateWorkspaceV1 {
    return JSON.parse(JSON.stringify(workspace)) as CompactStateWorkspaceV1
  }

  function fieldDefault(id: string): string | boolean {
    return defaultValueById(id)
  }

  return {
    initialized,
    workspace,
    activeState,
    activeLabel,
    isWeightedActive,
    ensureInitialized,
    snapshotValues,
    scenarioValues,
    setActiveSlot,
    saveField,
    saveSharedJob,
    saveBuffForActive,
    saveRuntimeSnapshot,
    setWeight,
    renameState,
    copyState,
    resetState,
    importWorkspace,
    exportWorkspace,
    fieldDefault,
  }
})
