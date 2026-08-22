import { computed, type WritableComputedRef } from 'vue'
import { useCharacterStore } from '@maplecombat/stores/character'

// 角色輸入欄位長度限制
const mainStatInputIds = new Set([
  'baseMain',
  'percentMain',
  'noApplyMain',
  'skillBaseMain',
  'skillPercentMain',
  'effBaseMain',
  'effPercentMain',
  'effNoApplyMain',
])
const critDmgInputIds = new Set(['critDmg', 'skillCritDmg', 'effCritDmg'])
const unrestrictedLengthInputIds = new Set(['adjXenonPowerCoefficient', 'adjDAPowerCoefficient'])

export function enforceCharacterInputLength(id: string, value: string, isDA: boolean): string {
  if (unrestrictedLengthInputIds.has(id)) return value
  const isMainField = mainStatInputIds.has(id)
  const isCritDmgField = critDmgInputIds.has(id)
  const maxLength = (isDA && isMainField) || isCritDmgField ? 6 : 5
  return value.length > maxLength ? value.slice(0, maxLength) : value
}

export function clampEquipmentIgnoreDefense(id: string, value: string): string {
  if (id !== 'eqOldIgnoreDefense' && id !== 'eqNewIgnoreDefense') return value
  if (value === '') return value
  const num = Number(value)
  if (!Number.isFinite(num)) return value
  if (num < 0) return '0'
  if (id === 'eqOldIgnoreDefense' && num >= 100) return '99.999'
  if (id === 'eqNewIgnoreDefense' && num > 100) return '100'
  return value
}

/** 欄位 v-model 綁定（寫入時套用輸入限制並持久化） */
export function useStringField(id: string, restrict = false): WritableComputedRef<string> {
  const store = useCharacterStore()
  return computed({
    get: () => String(store.fields[id] ?? ''),
    set: (raw: string) => {
      let value = raw
      if (restrict) value = enforceCharacterInputLength(id, value, store.selectedJob === 'da')
      value = clampEquipmentIgnoreDefense(id, value)
      store.setField(id, value)
    },
  })
}

export function useCheckboxField(id: string): WritableComputedRef<boolean> {
  const store = useCharacterStore()
  return computed({
    get: () => store.fields[id] === true,
    set: (value: boolean) => store.setField(id, value),
  })
}
