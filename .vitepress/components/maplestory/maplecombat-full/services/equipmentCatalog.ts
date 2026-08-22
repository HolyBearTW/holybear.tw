import { computed, ref } from 'vue'
import type { DashboardData } from '../../types'
import {
  getEquipmentContributions,
  type EquipmentContribution,
} from '../../calculator/mapleCombatCalculator'
import { mapleCombatStorage } from './storage'

const SELECTED_EQUIPMENT_KEY = 'holybearSelectedEquipmentKey'
const equipmentItems = ref<EquipmentContribution[]>([])
const selectedKey = ref('')

const equipmentFieldSuffixes = [
  'BaseMain',
  'PercentMain',
  'NoApplyMain',
  'BaseSub',
  'PercentSub',
  'NoApplySub',
  'BaseSubtwo',
  'PercentSubtwo',
  'NoApplySubtwo',
  'AllStat',
  'AllStatPercent',
  'Atk',
  'PercentAtk',
  'Dmg',
  'BossDmg',
  'CritDmg',
  'FamFinal',
  'FamFinalSources',
  'IgnoreDefense',
] as const

export const equipmentOptions = computed(() =>
  equipmentItems.value.map((item) => ({ value: item.key, label: item.label })),
)

export const selectedEquipmentKey = computed({
  get: () => selectedKey.value,
  set: (value: string) => {
    if (!equipmentItems.value.some((item) => item.key === value)) return
    selectedKey.value = value
    mapleCombatStorage.setItem(SELECTED_EQUIPMENT_KEY, value)
  },
})

export const selectedEquipment = computed(
  () => equipmentItems.value.find((item) => item.key === selectedKey.value) || null,
)

export function equipmentContributionToFields(
  item: EquipmentContribution | null | undefined,
  side: 'old' | 'new',
): Record<string, string> {
  const prefix = side === 'old' ? 'eqOld' : 'eqNew'
  if (!item) {
    return Object.fromEntries(equipmentFieldSuffixes.map((suffix) => [`${prefix}${suffix}`, '']))
  }
  const values: Record<(typeof equipmentFieldSuffixes)[number], string> = {
    BaseMain: String(item.mainFlat),
    PercentMain: String(item.mainPercent),
    NoApplyMain: '0',
    BaseSub: String(item.subFlat),
    PercentSub: String(item.subPercent),
    NoApplySub: '0',
    BaseSubtwo: String(item.secondSubFlat),
    PercentSubtwo: String(item.secondSubPercent),
    NoApplySubtwo: '0',
    AllStat: String(item.allStatFlat),
    AllStatPercent: String(item.allStatPercent),
    Atk: String(item.attackFlat),
    PercentAtk: String(item.attackPercent),
    Dmg: String(item.damage),
    BossDmg: String(item.bossDamage),
    CritDmg: String(item.criticalDamage),
    FamFinal: '0',
    FamFinalSources: '',
    IgnoreDefense: String(item.ignoreDefense),
  }
  return Object.fromEntries(
    equipmentFieldSuffixes.map((suffix) => [`${prefix}${suffix}`, values[suffix]]),
  )
}

export function configureEquipmentCatalog(data: DashboardData): void {
  equipmentItems.value = getEquipmentContributions(data)
  const stored = mapleCombatStorage.getItem(SELECTED_EQUIPMENT_KEY) || ''
  const fallback =
    equipmentItems.value.find((item) => item.slot === '武器') || equipmentItems.value[0]
  selectedKey.value = equipmentItems.value.some((item) => item.key === stored)
    ? stored
    : fallback?.key || ''
  if (selectedKey.value) mapleCombatStorage.setItem(SELECTED_EQUIPMENT_KEY, selectedKey.value)
}

export function currentEquipmentOldFields(): Record<string, string> {
  return equipmentContributionToFields(selectedEquipment.value, 'old')
}

export function currentEquipmentNewFields(): Record<string, string> {
  return equipmentContributionToFields(selectedEquipment.value, 'new')
}

export function applySelectedEquipment(
  setField: (id: string, value: string | boolean) => void,
): void {
  ;[currentEquipmentOldFields(), currentEquipmentNewFields()].forEach((fields) => {
    Object.entries(fields).forEach(([id, value]) => setField(id, value))
  })
}
