import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { mapleCombatStorage } from '@maplecombat/services/storage'
import { fieldDefs, fieldDefById } from '@maplecombat/constants/fields'
import { hydrateField, persistField, runStorageMigrations, getStoredString } from './persist'
import { useBuffsStore } from './buffs'
import { getDefaultJobByCategory, getJobByName, getJobStatLabelsByName } from '@maplecombat/data/jobs'
import { weaponDatabase, zeroWeaponDatabase } from '@maplecombat/data/weapons'
import { parseFamSources } from '@maplecombat/core/familiar'
import type { BuffDelta, FieldValues, JobCategory, PowerResult, WeaponSetKey } from '@maplecombat/core/types'
import {
  calculatePower,
  powerValue,
  resolveCombatFormulaInputs,
  type CombatPowerContext,
} from '@maplecombat/core/combatPower'
import { calculateEquipmentOutput, resolveActualFormulaInputs } from '@maplecombat/core/actualDamage'
import {
  getEquipmentActualDelta,
  getEquipmentDelta,
  type EquipmentFamSources,
} from '@maplecombat/core/equipmentDelta'
import {
  calculateCombatWeaponAttackBasis,
  calculateWeaponCorrectionValue,
  resolveWeaponDataKey,
  runWeaponCorrection,
  type WeaponCorrectionInput,
} from '@maplecombat/core/weaponCorrection'
import {
  getCombatBuffDelta,
  getEffBuffDelta,
  getEffBuffIgnoreFactor,
  type BuffComputeContext,
} from '@maplecombat/core/buffs/delta'
import { normalizeSavedData, type SaveDataV1 } from '@maplecombat/services/saveData'
import { useStateSlotsStore, type WorkspaceSlotId } from './stateSlots'

// 戰鬥力資料 ↔ 實戰資料 欄位對應
const combatToEffFieldMap: Record<string, string> = {
  baseMain: 'effBaseMain',
  percentMain: 'effPercentMain',
  noApplyMain: 'effNoApplyMain',
  baseSub: 'effBaseSub',
  percentSub: 'effPercentSub',
  noApplySub: 'effNoApplySub',
  includeSecondSub: 'effIncludeSecondSub',
  baseSubtwo: 'effBaseSubtwo',
  percentSubtwo: 'effPercentSubtwo',
  noApplySubtwo: 'effNoApplySubtwo',
  atk: 'effAtk',
  percentAtk: 'effPercentAtk',
  noApplyAtk: 'effNoApplyAtk',
  dmg: 'effDmg',
  bossDmg: 'effBossDmg',
  critDmg: 'effCritDmg',
  famFinal: 'effFamFinal',
  adjDAHP: 'effBaseHP',
}

// 舊版無 workspace 的 JSON 不含這些欄位；匯入時缺少代表使用預設空值，不能沿用目前畫面殘值。
const fieldsAddedAfterLegacySaveFormats = new Set([
  'adjEventCritDmg',
  'adjBarrierMainStat',
  'adjBarrierSubStat',
  'adjBarrierAtk',
  'adjBarrierMainStatPercent',
])

export const useCharacterStore = defineStore('character', () => {
  const buffs = useBuffsStore()
  const slots = useStateSlotsStore()

  runStorageMigrations()

  // ── 欄位狀態（值保持原始字串：空字串 ≠ 0 的語意） ──
  const fields = reactive<Record<string, string | boolean>>({})
  fieldDefs.forEach((def) => {
    fields[def.id] = hydrateField(def)
  })

  // ── 職業狀態 ──
  const savedJobName = getStoredString('selectedJobName', '')
  const savedJobCategory = getStoredString('selectedJob', 'normal')
  const startupJob = getJobByName(savedJobName) || getDefaultJobByCategory(savedJobCategory)
  const selectedJobName = ref(startupJob.name)
  const selectedJob = ref<JobCategory>(startupJob.category)
  const effSelectedJob = ref<JobCategory>(startupJob.category)

  const isZeroJob = computed(() => selectedJobName.value === '神之子')
  const isRuinFinalJob = computed(
    () => selectedJob.value === 'da' || selectedJobName.value === '惡魔殺手',
  )
  const includeSecondSub = computed(
    () => selectedJob.value === 'xenon' || selectedJob.value === 'dual',
  )
  const statLabels = computed(() => getJobStatLabelsByName(selectedJobName.value))

  const str = (id: string) => String(fields[id] ?? '')
  const num = (id: string) => +String(fields[id] ?? '') || 0

  // ── 武器攻擊校正 ──
  const weaponCorrectionInput = computed<WeaponCorrectionInput>(() => ({
    weaponSet: str('weaponSet'),
    flameLevel: parseInt(str('flameLevel')) || 0,
    scrollAtk: parseInt(str('scrollAtk')) || 0,
    starCount: parseInt(str('starCount')) || 0,
    currentWeaponAtk: parseInt(str('currentWeaponAtk')) || 0,
    jobCategory: selectedJob.value,
    isZeroJob: isZeroJob.value,
  }))
  const weaponCorrection = computed(() => runWeaponCorrection(weaponCorrectionInput.value))
  const combatSoulOrbWeaponAtk = computed(() =>
    calculateCombatWeaponAttackBasis(weaponCorrectionInput.value, buffs.combatCorrections),
  )
  const weaponSetData = computed(() => {
    const db = isZeroJob.value ? zeroWeaponDatabase : weaponDatabase
    return db[(db[str('weaponSet') as WeaponSetKey] ? str('weaponSet') : 'fortune') as WeaponSetKey]
  })

  // ── 計算輸入（欄位數值 + 衍生的 adjWeaponAtk/baseAtk） ──
  const numericFields = computed<FieldValues>(() => {
    const out: FieldValues = {}
    for (const def of fieldDefs) {
      if (def.kind === 'checkbox') continue
      out[def.id] = +String(fields[def.id] ?? '') || 0
    }
    out.adjWeaponAtk = weaponCorrection.value.correction
    out.baseAtk = weaponCorrection.value.baseAtk
    return out
  })

  function combatCtx(useBuff: boolean): CombatPowerContext {
    const wIn = weaponCorrectionInput.value
    const resolvedKey = resolveWeaponDataKey(wIn)
    return {
      jobCategory: selectedJob.value,
      jobName: selectedJobName.value,
      weaponSet: str('weaponSet'),
      genesisFinalChecked: fields.genesisFinalCheck === true,
      useBuff,
      combatCorrections: { ...buffs.combatCorrections },
      overseasGenesisAtkDelta:
        calculateWeaponCorrectionValue('genesis', wIn) -
        calculateWeaponCorrectionValue(resolvedKey, wIn),
      xenonPowerCoefficientRaw: str('adjXenonPowerCoefficient'),
      daPowerCoefficientRaw: str('adjDAPowerCoefficient'),
      famFinalSources: parseFamSources(str('famFinalSources')),
    }
  }

  // 實戰公式 context：帶入實戰萌獸終傷逐條來源（空時退回 overseasFamMult）。
  function effCtx(ignoreFactor: number) {
    return {
      effJob: effSelectedJob.value,
      ignoreFactor,
      effFamFinalSources: parseFamSources(str('effFamFinalSources')),
    }
  }

  function buffCtx(mode: 'combat' | 'eff'): BuffComputeContext {
    return {
      job: mode === 'combat' ? selectedJob.value : effSelectedJob.value,
      statLabels: statLabels.value,
      currentWeaponAtk: num('currentWeaponAtk'),
      combatWeaponAtk: combatSoulOrbWeaponAtk.value,
      soulOrb: buffs.soulOrb,
    }
  }

  // ── Buff delta ──
  const combatBuffDelta = computed<BuffDelta>(() =>
    getCombatBuffDelta(buffs.table, buffs.state, buffCtx('combat')),
  )
  const effBuffDelta = computed<BuffDelta>(() =>
    getEffBuffDelta(buffs.table, buffs.state, buffCtx('eff')),
  )
  const effIgnoreFactor = computed(() =>
    getEffBuffIgnoreFactor(buffs.table, buffs.state, buffs.soulOrb),
  )

  // ── 戰鬥力 / 實戰輸出 ──
  function computePower(useBuff: boolean, delta: FieldValues = {}): PowerResult {
    return calculatePower(
      numericFields.value,
      combatCtx(useBuff),
      delta,
      useBuff ? combatBuffDelta.value : {},
    )
  }

  function computeEffOutput(useBuff: boolean, delta: FieldValues = {}): number {
    return calculateEquipmentOutput(
      numericFields.value,
      effCtx(useBuff ? effIgnoreFactor.value : 1),
      delta,
      useBuff ? effBuffDelta.value : {},
    )
  }

  const powerNoBuff = computed(() => computePower(false))
  const powerWithBuff = computed(() => computePower(true))
  const effOutputNoBuff = computed(() => computeEffOutput(false))
  const effOutputWithBuff = computed(() => computeEffOutput(true))

  // ── 數值預覽：直接取正式公式採用的校正後中間值 ──
  const combatPreviewNoBuff = computed(() =>
    resolveCombatFormulaInputs(numericFields.value, combatCtx(false)),
  )
  const combatPreviewWithBuff = computed(() =>
    resolveCombatFormulaInputs(numericFields.value, combatCtx(true), {}, combatBuffDelta.value),
  )
  const effPreviewNoBuff = computed(() => resolveActualFormulaInputs(numericFields.value, effCtx(1)))
  const effPreviewWithBuff = computed(() =>
    resolveActualFormulaInputs(
      numericFields.value,
      effCtx(effIgnoreFactor.value),
      {},
      effBuffDelta.value,
    ),
  )

  // ── 裝備變更 ──
  const equipmentCombatFamSources = computed<EquipmentFamSources>(() => ({
    base: parseFamSources(str('famFinalSources')),
    old: parseFamSources(str('eqOldFamFinalSources')),
    new: parseFamSources(str('eqNewFamFinalSources')),
  }))
  const equipmentActualFamSources = computed<EquipmentFamSources>(() => ({
    base: parseFamSources(str('effFamFinalSources')),
    old: parseFamSources(str('eqOldFamFinalSources')),
    new: parseFamSources(str('eqNewFamFinalSources')),
  }))
  const equipmentDelta = computed(() =>
    getEquipmentDelta(numericFields.value, selectedJob.value, equipmentCombatFamSources.value),
  )
  const equipmentChangedPower = computed(() => computePower(false, equipmentDelta.value))
  const equipmentActualGain = computed<number | null>(() => {
    const baseOutput = computeEffOutput(true)
    if (!baseOutput || baseOutput <= 0 || !isFinite(baseOutput)) return null
    const changedOutput = computeEffOutput(
      true,
      getEquipmentActualDelta(
        numericFields.value,
        selectedJob.value,
        equipmentActualFamSources.value,
      ),
    )
    if (!isFinite(changedOutput)) return null
    return ((changedOutput - baseOutput) / baseOutput) * 100
  })

  // ── 欄位操作 ──
  function setField(id: string, value: string | boolean): void {
    const def = fieldDefById[id]
    if (!def) return
    fields[id] = value
    persistField(id, value)
    slots.saveField(id, value)
    if (id === 'weaponSet') handleWeaponChange(true)
  }

  /** weaponSet 連動：回填卷軸/星力預設、同步創世終傷勾選 */
  function handleWeaponChange(shouldResetDefaults: boolean): void {
    const db = isZeroJob.value ? zeroWeaponDatabase : weaponDatabase
    let setKey = str('weaponSet')
    if (!db[setKey as WeaponSetKey]) {
      setKey = 'fortune'
      fields.weaponSet = setKey
      persistField('weaponSet', setKey)
      slots.saveField('weaponSet', setKey)
    }
    const setData = db[setKey as WeaponSetKey]
    if (shouldResetDefaults) {
      fields.scrollAtk = String(setData.defaultScroll)
      persistField('scrollAtk', fields.scrollAtk)
      slots.saveField('scrollAtk', fields.scrollAtk)
      if (setData.hideSubFields) {
        fields.starCount = '22'
        persistField('starCount', '22')
        slots.saveField('starCount', '22')
      }
    }
    syncGenesisFinalFromWeaponSet()
  }

  function syncGenesisFinalFromWeaponSet(): void {
    const setKey = str('weaponSet')
    const shouldApply = setKey === 'fortune' || setKey === 'genesis'
    fields.genesisFinalCheck = shouldApply
    persistField('genesisFinalCheck', shouldApply)
    slots.saveField('genesisFinalCheck', shouldApply)
  }

  // ── 職業切換 ──
  function selectJobByName(jobName: string, options: { category?: string } = {}): void {
    const job = getJobByName(jobName) || getDefaultJobByCategory(options.category || 'normal')
    selectedJob.value = job.category
    selectedJobName.value = job.name
    effSelectedJob.value = job.category
    mapleCombatStorage.setItem('selectedJob', job.category)
    mapleCombatStorage.setItem('selectedJobName', job.name)
    mapleCombatStorage.setItem('effSelectedJob', job.category)
    slots.saveSharedJob({
      selectedJob: job.category,
      selectedJobName: job.name,
      effSelectedJob: job.category,
    })
    syncGenesisFinalFromWeaponSet()
  }

  // ── 跨模式複製 ──
  function copyMappedFields(fieldMap: Record<string, string>): void {
    Object.entries(fieldMap).forEach(([srcId, destId]) => {
      if (!(srcId in fields) || !(destId in fields)) return
      fields[destId] = fields[srcId]
      persistField(destId, fields[destId])
      slots.saveField(destId, fields[destId])
    })
  }

  function copyCombatDataToEff(): void {
    copyMappedFields(combatToEffFieldMap)
  }

  function copyEffDataToCombat(): void {
    const reversed = Object.fromEntries(
      Object.entries(combatToEffFieldMap).map(([combatId, effId]) => [effId, combatId]),
    )
    copyMappedFields(reversed)
  }

  // ── 匯出/匯入 ──
  function collectSaveData(): SaveDataV1 {
    slots.saveRuntimeSnapshot(
      fields,
      {
        selectedJob: selectedJob.value,
        selectedJobName: selectedJobName.value,
        effSelectedJob: effSelectedJob.value,
      },
      buffs.collectState(),
    )
    const values: Record<string, unknown> = {}
    fieldDefs.forEach((def) => {
      values[def.id] = fields[def.id]
    })
    return {
      app: 'maplecombat',
      version: 2,
      savedAt: new Date().toISOString(),
      selectedJob: selectedJob.value,
      selectedJobName: selectedJobName.value,
      effSelectedJob: effSelectedJob.value,
      values,
      buffState: buffs.collectState(),
      workspace: slots.exportWorkspace(),
    }
  }

  function applySaveData(raw: unknown): void {
    const saveData = normalizeSavedData(raw)

    if (saveData.workspace && slots.importWorkspace(saveData.workspace)) {
      applyWorkspaceSlot(slots.workspace.activeSlot)
      return
    }

    fieldDefs.forEach((def) => {
      if (!Object.prototype.hasOwnProperty.call(saveData.values, def.id)) {
        if (fieldsAddedAfterLegacySaveFormats.has(def.id)) {
          fields[def.id] = def.default
          persistField(def.id, def.default)
        }
        return
      }
      const value = saveData.values[def.id]
      if (def.kind === 'checkbox') {
        const checked = value === true || value === 'true'
        fields[def.id] = checked
        persistField(def.id, checked)
      } else if (def.kind === 'select') {
        if (!def.options || !def.options.includes(String(value))) return
        fields[def.id] = String(value)
        persistField(def.id, String(value))
      } else {
        fields[def.id] = String(value ?? '')
        persistField(def.id, fields[def.id])
      }
    })

    const job = saveData.selectedJob || 'normal'
    const savedJobByName = getJobByName(saveData.selectedJobName)
    const importJob = savedJobByName || getDefaultJobByCategory(job)
    selectJobByName(importJob.name)

    if (saveData.buffState) {
      buffs.applyState(saveData.buffState)
    }

    handleWeaponChange(false)
    slots.saveRuntimeSnapshot(
      fields,
      {
        selectedJob: selectedJob.value,
        selectedJobName: selectedJobName.value,
        effSelectedJob: effSelectedJob.value,
      },
      buffs.collectState(),
    )
  }

  function coerceWorkspaceField(id: string, value: string | boolean): string | boolean {
    const def = fieldDefById[id]
    if (!def) return value
    if (def.kind === 'checkbox') return value === true || value === 'true'
    if (def.kind === 'select' && def.options && !def.options.includes(String(value))) return def.default
    return String(value ?? '')
  }

  function applyWorkspaceSlot(slot: WorkspaceSlotId): void {
    const values = slots.snapshotValues(slot)
    fieldDefs.forEach((def) => {
      const value = coerceWorkspaceField(def.id, values[def.id] ?? slots.fieldDefault(def.id))
      fields[def.id] = value
      persistField(def.id, value)
    })

    const job =
      getJobByName(slots.workspace.shared.selectedJobName) ||
      getDefaultJobByCategory(slots.workspace.shared.selectedJob)
    selectedJob.value = job.category
    selectedJobName.value = job.name
    effSelectedJob.value = job.category
    mapleCombatStorage.setItem('selectedJob', job.category)
    mapleCombatStorage.setItem('selectedJobName', job.name)
    mapleCombatStorage.setItem('effSelectedJob', job.category)

    if (slot !== 'weighted') {
      const state = slots.workspace.states.find((entry) => entry.id === slot)
      if (state?.buffState) buffs.applyState(state.buffState)
      else {
        buffs.resetDefaults()
        buffs.applyState({ master: true, levels: {}, soulOrb: { value: 0, stat: 'percentStr' } })
      }
    }

    handleWeaponChange(false)
  }

  function activateWorkspaceSlot(slot: WorkspaceSlotId): void {
    slots.saveRuntimeSnapshot(
      fields,
      {
        selectedJob: selectedJob.value,
        selectedJobName: selectedJobName.value,
        effSelectedJob: effSelectedJob.value,
      },
      buffs.collectState(),
    )
    slots.setActiveSlot(slot)
    applyWorkspaceSlot(slot)
  }

  function reloadWorkspaceSlot(slot: WorkspaceSlotId = slots.workspace.activeSlot): void {
    applyWorkspaceSlot(slot)
  }

  slots.ensureInitialized(
    fields,
    {
      selectedJob: selectedJob.value,
      selectedJobName: selectedJobName.value,
      effSelectedJob: effSelectedJob.value,
    },
    buffs.collectState(),
  )
  applyWorkspaceSlot(slots.workspace.activeSlot)

  return {
    fields,
    selectedJob,
    selectedJobName,
    effSelectedJob,
    isZeroJob,
    isRuinFinalJob,
    includeSecondSub,
    statLabels,
    weaponCorrection,
    combatSoulOrbWeaponAtk,
    weaponSetData,
    numericFields,
    combatBuffDelta,
    effBuffDelta,
    effIgnoreFactor,
    powerNoBuff,
    powerWithBuff,
    effOutputNoBuff,
    effOutputWithBuff,
    combatPreviewNoBuff,
    combatPreviewWithBuff,
    effPreviewNoBuff,
    effPreviewWithBuff,
    equipmentDelta,
    equipmentChangedPower,
    equipmentActualGain,
    computePower,
    computeEffOutput,
    setField,
    selectJobByName,
    copyCombatDataToEff,
    copyEffDataToCombat,
    collectSaveData,
    applySaveData,
    activateWorkspaceSlot,
    reloadWorkspaceSlot,
    powerValue,
  }
})
