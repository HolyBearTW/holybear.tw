// 數值換算（效率表）核心（DOM/渲染由元件處理）。
import type { FieldValues, JobCategory, JobStatLabels } from './types'

export interface EfficiencyMetric {
  key: string
  label: string
  /** 影響的實戰欄位 id（單欄位 metric 也統一為陣列） */
  fieldIds: string[]
  /** 基準單位輸入的 id（unit 值由 store 持有） */
  unitId: string
  unit: number
  suffix: string
}

export const EFFICIENCY_DEFAULT_EQUIVALENT_KEYS: ReadonlySet<string> = new Set([
  'baseMain',
  'percentMain',
  'allStatPercent',
  'atk',
  'percentAtk',
  'dmg',
  'critDmg',
])

export const EFFICIENCY_PANEL_DEFAULTS: readonly string[] = ['percentMain', 'atk', 'dmg']

export interface EfficiencyMetricsContext {
  effJob: JobCategory
  statLabels: JobStatLabels
  /** unitId -> 使用者輸入的基準值 */
  unitValues: Record<string, number>
}

/** 效率指標的純資料部分 */
export function buildEfficiencyMetrics(ctx: EfficiencyMetricsContext): EfficiencyMetric[] {
  const effJob = ctx.effJob
  const isDA = effJob === 'da'
  const statLabels = ctx.statLabels
  // 副屬性2 固定計入傑諾（第三屬）與雙副屬職業
  const includeSecondSub = effJob === 'xenon' || effJob === 'dual'
  // 全屬：惡魔復仇者只視為副屬；含副屬性2 的職業時同時加成副屬性2。
  const allStatFields = isDA
    ? ['effBaseSub']
    : includeSecondSub
      ? ['effBaseMain', 'effBaseSub', 'effBaseSubtwo']
      : ['effBaseMain', 'effBaseSub']
  const allStatPercentFields = isDA
    ? ['effPercentSub']
    : includeSecondSub
      ? ['effPercentMain', 'effPercentSub', 'effPercentSubtwo']
      : ['effPercentMain', 'effPercentSub']
  const mainLabel = statLabels.main
  const mainPercentLabel = `${statLabels.main}%`
  const mainNoApplyLabel = `未套用%${statLabels.main}`
  const subLabel = statLabels.sub
  const secondSubLabel = statLabels.secondSub || '副屬2'

  interface RawMetric {
    key: string
    label: string
    fieldId?: string
    fieldIds?: string[]
    unitId: string
    suffix?: string
  }
  const metrics: RawMetric[] = [
    { key: 'baseMain', label: mainLabel, fieldId: 'effBaseMain', unitId: 'effUnitBaseMain' },
    {
      key: 'percentMain',
      label: mainPercentLabel,
      fieldId: 'effPercentMain',
      unitId: 'effUnitPercentMain',
      suffix: '%',
    },
    {
      key: 'noApplyMain',
      label: mainNoApplyLabel,
      fieldId: 'effNoApplyMain',
      unitId: 'effUnitNoApplyMain',
    },
    { key: 'baseSub', label: subLabel, fieldId: 'effBaseSub', unitId: 'effUnitBaseSub' },
    {
      key: 'percentSub',
      label: `${subLabel}%`,
      fieldId: 'effPercentSub',
      unitId: 'effUnitPercentSub',
      suffix: '%',
    },
    {
      key: 'noApplySub',
      label: `未套用%${subLabel}`,
      fieldId: 'effNoApplySub',
      unitId: 'effUnitNoApplySub',
    },
    { key: 'allStat', label: '全屬', fieldIds: allStatFields, unitId: 'effUnitAllStat' },
    {
      key: 'allStatPercent',
      label: '全屬%',
      fieldIds: allStatPercentFields,
      unitId: 'effUnitAllStatPercent',
      suffix: '%',
    },
    { key: 'atk', label: '攻擊力', fieldId: 'effAtk', unitId: 'effUnitAtk' },
    {
      key: 'percentAtk',
      label: '攻擊力%',
      fieldId: 'effPercentAtk',
      unitId: 'effUnitPercentAtk',
      suffix: '%',
    },
    { key: 'dmg', label: '傷害', fieldId: 'effDmg', unitId: 'effUnitDmg', suffix: '%' },
    { key: 'bossDmg', label: 'B傷', fieldId: 'effBossDmg', unitId: 'effUnitBossDmg', suffix: '%' },
    { key: 'critDmg', label: '爆傷', fieldId: 'effCritDmg', unitId: 'effUnitCritDmg', suffix: '%' },
    {
      key: 'ignoreDefense',
      label: '無視防禦率',
      fieldId: 'effIgnoreDefense',
      unitId: 'effUnitIgnoreDefense',
      suffix: '%',
    },
  ]

  if (includeSecondSub) {
    metrics.splice(
      6,
      0,
      {
        key: 'baseSubtwo',
        label: secondSubLabel,
        fieldId: 'effBaseSubtwo',
        unitId: 'effUnitBaseSubtwo',
      },
      {
        key: 'percentSubtwo',
        label: `${secondSubLabel}%`,
        fieldId: 'effPercentSubtwo',
        unitId: 'effUnitPercentSubtwo',
        suffix: '%',
      },
      {
        key: 'noApplySubtwo',
        label: `未套用%${secondSubLabel}`,
        fieldId: 'effNoApplySubtwo',
        unitId: 'effUnitNoApplySubtwo',
      },
    )
  }

  return metrics.map((metric) => {
    const unitValue = ctx.unitValues[metric.unitId]
    return {
      key: metric.key,
      label: metric.label,
      fieldIds: metric.fieldIds || [metric.fieldId as string],
      unitId: metric.unitId,
      unit: Number.isFinite(unitValue) && (unitValue as number) > 0 ? (unitValue as number) : 1,
      suffix: metric.suffix || '',
    }
  })
}

/** 單一換算項目套到實戰公式的 delta（無視防禦率走乘法因子） */
export function getEfficiencyActualDelta(metric: EfficiencyMetric): FieldValues {
  const delta: FieldValues = {}
  if (metric.key === 'ignoreDefense') {
    delta.__eqIgnoreResidualFactor = Math.max(0, 1 - metric.unit / 100)
    return delta
  }
  metric.fieldIds.forEach((fieldId) => {
    delta[fieldId] = metric.unit
  })
  return delta
}

/** 顯示鍵集合：自訂優先，否則用預設常用鍵 */
export function getVisibleEquivalentKeys(
  metrics: EfficiencyMetric[],
  customKeysRaw: string,
): Set<string> {
  const availableKeys = new Set(metrics.map((metric) => metric.key))
  const customKeys = new Set(
    String(customKeysRaw || '')
      .split(',')
      .map((key) => key.trim())
      .filter((key) => availableKeys.has(key)),
  )
  return customKeys.size ? customKeys : new Set(EFFICIENCY_DEFAULT_EQUIVALENT_KEYS)
}

/** 行（被換算項）的可見集合：all 模式全顯示；common 模式用常用鍵或自訂鍵 */
export function getVisibleMetricKeys(
  metrics: EfficiencyMetric[],
  displayMode: 'common' | 'all',
  customKeysRaw: string,
): Set<string> {
  if (displayMode === 'all') return new Set(metrics.map((m) => m.key))

  const availableKeys = new Set(metrics.map((metric) => metric.key))
  let visibleKeys = new Set(
    metrics.filter((m) => EFFICIENCY_DEFAULT_EQUIVALENT_KEYS.has(m.key)).map((m) => m.key),
  )
  const customKeys = new Set(
    String(customKeysRaw || '')
      .split(',')
      .map((key) => key.trim())
      .filter((key) => availableKeys.has(key)),
  )
  if (customKeys.size) visibleKeys = customKeys

  return visibleKeys.size ? visibleKeys : new Set(metrics.map((m) => m.key))
}
