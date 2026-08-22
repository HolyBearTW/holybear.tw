import { fieldDefs } from '@maplecombat/constants/fields'
import { getJobStatLabelsByName } from '@maplecombat/data/jobs'
import { parseFamSources } from './familiar'
import { calculatePower, powerValue, type CombatPowerContext } from './combatPower'
import { calculateEquipmentOutput } from './actualDamage'
import {
  getEquipmentActualDelta,
  getEquipmentDelta,
  effFieldToCombatKey,
  type EquipmentFamSources,
} from './equipmentDelta'
import {
  calculateCombatWeaponAttackBasis,
  calculateWeaponCorrectionValue,
  resolveWeaponDataKey,
  runWeaponCorrection,
} from './weaponCorrection'
import {
  getCombatBuffDelta,
  getEffBuffDelta,
  getEffBuffIgnoreFactor,
  type BuffComputeContext,
  type BuffState,
  type SoulOrbState,
} from './buffs/delta'
import {
  buildEfficiencyMetrics,
  getEfficiencyActualDelta,
  type EfficiencyMetric,
} from './efficiency'
import type { ParsedBuffTable } from './buffs/parse'
import type { FieldValues, JobCategory, PowerResult } from './types'
import {
  defaultCombatCorrections,
  normalizeCombatCorrections,
  type CombatCorrectionState,
} from './combatCorrections'
import type { CompactStateWorkspaceV1, StateSlotId } from '@maplecombat/stores/stateSlots'

export interface WeightedSlotResult {
  id: StateSlotId
  name: string
  weight: number
  fields: FieldValues
  powerNoBuff: PowerResult
  powerWithBuff: PowerResult
  effOutputNoBuff: number
  effOutputWithBuff: number
  equipmentChangedPower: PowerResult
  equipmentChangedActualOutput: number
}

export interface WeightedSummary {
  currentPower: PowerResult
  combatBuffPower: number
  combatBuffGain: number | null
  actualBuffGain: number | null
  equipmentChangedPower: number
  equipmentBattleGain: number | null
  equipmentActualGain: number | null
  slots: WeightedSlotResult[]
  effectiveWeights: Record<StateSlotId, number>
  usedFallbackWeights: boolean
}

export interface WeightedMetricResult extends EfficiencyMetric {
  gain: number
  combatGain: number
}

function numericFields(values: Record<string, string | boolean>): FieldValues {
  const out: FieldValues = {}
  for (const def of fieldDefs) {
    if (def.kind === 'checkbox') continue
    out[def.id] = +String(values[def.id] ?? '') || 0
  }
  return out
}

function weightedValues(workspace: CompactStateWorkspaceV1, id: StateSlotId): Record<string, string | boolean> {
  const state = workspace.states.find((entry) => entry.id === id) || workspace.states[0]
  return { ...workspace.shared.values, ...state.values, ...workspace.weighted.values }
}

function weaponInput(
  workspace: CompactStateWorkspaceV1,
  values: Record<string, string | boolean>,
) {
  return {
    weaponSet: String(values.weaponSet ?? ''),
    flameLevel: parseInt(String(values.flameLevel ?? '')) || 0,
    scrollAtk: parseInt(String(values.scrollAtk ?? '')) || 0,
    starCount: parseInt(String(values.starCount ?? '')) || 0,
    currentWeaponAtk: parseInt(String(values.currentWeaponAtk ?? '')) || 0,
    jobCategory: workspace.shared.selectedJob as JobCategory,
    isZeroJob: workspace.shared.selectedJobName === '神之子',
  }
}

function equipmentFamSources(
  values: Record<string, string | boolean>,
  baseKey: 'famFinalSources' | 'effFamFinalSources',
): EquipmentFamSources {
  return {
    base: parseFamSources(String(values[baseKey] ?? '')),
    old: parseFamSources(String(values.eqOldFamFinalSources ?? '')),
    new: parseFamSources(String(values.eqNewFamFinalSources ?? '')),
  }
}

function actualCtx(
  values: Record<string, string | boolean>,
  job: JobCategory,
  ignoreFactor: number,
) {
  return {
    effJob: job,
    ignoreFactor,
    effFamFinalSources: parseFamSources(String(values.effFamFinalSources ?? '')),
  }
}

function effectiveWeights(workspace: CompactStateWorkspaceV1): {
  weights: Record<StateSlotId, number>
  fallback: boolean
} {
  const raw = workspace.weighted.weights
  const sum = Object.values(raw).reduce((total, value) => total + Math.max(0, Number(value) || 0), 0)
  if (sum > 0) {
    return {
      weights: Object.fromEntries(
        Object.entries(raw).map(([id, value]) => [id, (Math.max(0, Number(value) || 0) / sum) * 100]),
      ) as Record<StateSlotId, number>,
      fallback: false,
    }
  }
  return {
    weights: { state1: 100, state2: 0, state3: 0, state4: 0, state5: 0 },
    fallback: true,
  }
}

function resolveFields(workspace: CompactStateWorkspaceV1, id: StateSlotId): FieldValues {
  const values = weightedValues(workspace, id)
  const fields = numericFields(values)
  const correction = runWeaponCorrection(weaponInput(workspace, values))
  fields.adjWeaponAtk = correction.correction
  fields.baseAtk = correction.baseAtk
  return fields
}

function combatCtx(
  workspace: CompactStateWorkspaceV1,
  values: Record<string, string | boolean>,
  useBuff: boolean,
  combatCorrections: CombatCorrectionState = defaultCombatCorrections(),
): CombatPowerContext {
  const selectedJob = workspace.shared.selectedJob as JobCategory
  const selectedJobName = workspace.shared.selectedJobName
  const wIn = weaponInput(workspace, values)
  const resolvedKey = resolveWeaponDataKey(wIn)
  return {
    jobCategory: selectedJob,
    jobName: selectedJobName,
    weaponSet: String(values.weaponSet ?? ''),
    genesisFinalChecked: values.genesisFinalCheck === true,
    useBuff,
    combatCorrections,
    overseasGenesisAtkDelta:
      calculateWeaponCorrectionValue('genesis', wIn) -
      calculateWeaponCorrectionValue(resolvedKey, wIn),
    xenonPowerCoefficientRaw: String(values.adjXenonPowerCoefficient ?? ''),
    daPowerCoefficientRaw: String(values.adjDAPowerCoefficient ?? ''),
    famFinalSources: parseFamSources(String(values.famFinalSources ?? '')),
  }
}

function buffCtx(
  workspace: CompactStateWorkspaceV1,
  values: Record<string, string | boolean>,
  soulOrb: SoulOrbState,
  combatCorrections: CombatCorrectionState = defaultCombatCorrections(),
): BuffComputeContext {
  const wIn = weaponInput(workspace, values)
  return {
    job: workspace.shared.selectedJob as JobCategory,
    statLabels: getJobStatLabelsByName(workspace.shared.selectedJobName),
    currentWeaponAtk: wIn.currentWeaponAtk,
    combatWeaponAtk: calculateCombatWeaponAttackBasis(wIn, combatCorrections),
    soulOrb,
  }
}

function slotResult(
  workspace: CompactStateWorkspaceV1,
  table: ParsedBuffTable,
  id: StateSlotId,
  weight: number,
): WeightedSlotResult {
  const state = workspace.states.find((entry) => entry.id === id) || workspace.states[0]
  const values = weightedValues(workspace, id)
  const fields = resolveFields(workspace, id)
  const buffState = (state.buffState?.levels || {}) as BuffState
  const soulOrb = state.buffState?.soulOrb || { value: 0, stat: 'percentStr', fullSoul: true }
  const combatCorrections = normalizeCombatCorrections(state.buffState?.combatCorrections)
  const context = buffCtx(workspace, values, soulOrb, combatCorrections)
  const combatBuffDelta = getCombatBuffDelta(table, buffState, context)
  const effBuffDelta = getEffBuffDelta(table, buffState, context)
  const ignoreFactor = getEffBuffIgnoreFactor(table, buffState, soulOrb)
  const job = workspace.shared.selectedJob as JobCategory
  const combatFamSources = equipmentFamSources(values, 'famFinalSources')
  const actualFamSources = equipmentFamSources(values, 'effFamFinalSources')
  const powerNoBuff = calculatePower(
    fields,
    combatCtx(workspace, values, false, combatCorrections),
    {},
    {},
  )
  const powerWithBuff = calculatePower(
    fields,
    combatCtx(workspace, values, true, combatCorrections),
    {},
    combatBuffDelta,
  )
  const effOutputNoBuff = calculateEquipmentOutput(fields, actualCtx(values, job, 1), {}, {})
  const effOutputWithBuff = calculateEquipmentOutput(
    fields,
    actualCtx(values, job, ignoreFactor),
    {},
    effBuffDelta,
  )
  const equipmentChangedPower = calculatePower(
    fields,
    combatCtx(workspace, values, false, combatCorrections),
    getEquipmentDelta(fields, job, combatFamSources),
    {},
  )
  const equipmentChangedActualOutput = calculateEquipmentOutput(
    fields,
    actualCtx(values, job, ignoreFactor),
    getEquipmentActualDelta(fields, job, actualFamSources),
    effBuffDelta,
  )
  return {
    id,
    name: state.name,
    weight,
    fields,
    powerNoBuff,
    powerWithBuff,
    effOutputNoBuff,
    effOutputWithBuff,
    equipmentChangedPower,
    equipmentChangedActualOutput,
  }
}

function ratioGain(after: number, before: number): number | null {
  if (!before || before <= 0 || !Number.isFinite(before) || !Number.isFinite(after)) return null
  return ((after - before) / before) * 100
}

export function weightedPercentGain(
  entries: Array<{ share: number; before: number; after: number }>,
): number | null {
  let result = 0
  for (const entry of entries) {
    if (entry.share <= 0) continue
    const gain = ratioGain(entry.after, entry.before)
    if (gain == null) return null
    result += (entry.share / 100) * gain
  }
  return result
}

function weightedAverage(slots: WeightedSlotResult[], fn: (slot: WeightedSlotResult) => number): number {
  return slots.reduce((sum, slot) => sum + (slot.weight / 100) * fn(slot), 0)
}

export function calculateWeightedSummary(
  workspace: CompactStateWorkspaceV1,
  table: ParsedBuffTable,
): WeightedSummary {
  const { weights, fallback } = effectiveWeights(workspace)
  const slots = workspace.states.map((state) => slotResult(workspace, table, state.id, weights[state.id]))

  return {
    currentPower: slots[0]?.powerNoBuff || { type: 'single', value: 0 },
    combatBuffPower: weightedAverage(slots, (slot) => powerValue(slot.powerWithBuff)),
    combatBuffGain: weightedPercentGain(
      slots.map((slot) => ({
        share: slot.weight,
        before: powerValue(slot.powerNoBuff),
        after: powerValue(slot.powerWithBuff),
      })),
    ),
    actualBuffGain: weightedPercentGain(
      slots.map((slot) => ({
        share: slot.weight,
        before: slot.effOutputNoBuff,
        after: slot.effOutputWithBuff,
      })),
    ),
    equipmentChangedPower: weightedAverage(slots, (slot) => powerValue(slot.equipmentChangedPower)),
    equipmentBattleGain: weightedPercentGain(
      slots.map((slot) => ({
        share: slot.weight,
        before: powerValue(slot.powerNoBuff),
        after: powerValue(slot.equipmentChangedPower),
      })),
    ),
    equipmentActualGain: weightedPercentGain(
      slots.map((slot) => ({
        share: slot.weight,
        before: slot.effOutputWithBuff,
        after: slot.equipmentChangedActualOutput,
      })),
    ),
    slots,
    effectiveWeights: weights,
    usedFallbackWeights: fallback,
  }
}

export function buildWeightedMetrics(
  workspace: CompactStateWorkspaceV1,
  table: ParsedBuffTable,
  showCombatGain: boolean,
): WeightedMetricResult[] {
  const summary = calculateWeightedSummary(workspace, table)
  const unitValues = Object.fromEntries(
    Object.entries(workspace.weighted.values)
      .filter(([id]) => id.startsWith('effUnit'))
      .map(([id, value]) => [id, +String(value)]),
  )
  const metrics = buildEfficiencyMetrics({
    effJob: workspace.shared.selectedJob as JobCategory,
    statLabels: getJobStatLabelsByName(workspace.shared.selectedJobName),
    unitValues,
  })
  return metrics.map((metric) => {
    const metricDelta = getEfficiencyActualDelta(metric)
    let gain = 0
    let combatGain = 0
    let invalidGain = false
    let invalidCombatGain = false
    summary.slots.forEach((slot) => {
      if (slot.weight <= 0) return
      const state = workspace.states.find((entry) => entry.id === slot.id) || workspace.states[0]
      const values = weightedValues(workspace, slot.id)
      const buffState = (state.buffState?.levels || {}) as BuffState
      const soulOrb = state.buffState?.soulOrb || {
        value: 0,
        stat: 'percentStr',
        fullSoul: true,
      }
      const effBuffDelta = getEffBuffDelta(table, buffState, buffCtx(workspace, values, soulOrb))
      const ignoreFactor = getEffBuffIgnoreFactor(table, buffState, soulOrb)
      const changedOutput = calculateEquipmentOutput(
        slot.fields,
        { effJob: workspace.shared.selectedJob as JobCategory, ignoreFactor },
        metricDelta,
        effBuffDelta,
      )
      const actualGain = ratioGain(changedOutput, slot.effOutputWithBuff)
      if (actualGain == null) invalidGain = true
      else gain += (slot.weight / 100) * actualGain
      if (showCombatGain) {
        const delta: FieldValues = {}
        metric.fieldIds.forEach((fieldId) => {
          delta[effFieldToCombatKey(fieldId)] = metric.unit
        })
        const changedPower = calculatePower(slot.fields, combatCtx(workspace, values, false), delta, {})
        const powerGain = ratioGain(powerValue(changedPower), powerValue(slot.powerNoBuff))
        if (powerGain == null) invalidCombatGain = true
        else combatGain += (slot.weight / 100) * powerGain
      }
    })
    return {
      ...metric,
      gain: invalidGain ? Number.NaN : gain,
      combatGain: invalidCombatGain ? Number.NaN : combatGain,
    }
  })
}
