export function toNumber(value: unknown): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

/** 戰鬥力以 億/萬 分組顯示（去掉群組前導 0：2億798萬7441） */
export function formatPower(num: number): string {
  if (num <= 0 || isNaN(num) || !isFinite(num)) return '0'
  const yi = Math.floor(num / 100000000)
  const wan = Math.floor((num % 100000000) / 10000)
  const remaining = Math.floor(num % 10000)

  let result = ''
  if (yi > 0) result += yi + '億'
  if (wan > 0) result += wan + '萬'
  if (remaining > 0 || (yi === 0 && wan === 0)) {
    result += remaining
  }
  return result
}

export function formatPercentChange(before: number, after: number): string {
  if (!before || before <= 0) return '0%'
  const change = ((after - before) / before) * 100
  const sign = change > 0 ? '+' : ''
  return `${sign}${change.toFixed(3)}%`
}

/** 倍率以指定小數位格式化（字級自適應會視寬度由 3 位逐步減到 1 位） */
export function formatPercentDecimals(value: number, decimals: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function formatActualPercentChange(change: number | null): string {
  if (change == null || !Number.isFinite(change)) return '-'
  const sign = change > 0 ? '+' : ''
  return `${sign}${change.toFixed(3)}%`
}

/** 確保非負百分比帶 + 號（含無變化的 +0.000%） */
export function ensureSignedPercent(text: string): string {
  return /^[0-9]/.test(text) ? `+${text}` : text
}

export function formatEfficiencyEquivalent(value: number, suffix = '', decimals = 3): string {
  if (!isFinite(value)) return '-'
  const absValue = Math.abs(value)
  if (absValue > 0 && absValue < 0.001) {
    return value < 0 ? `>-0.001${suffix}` : `<0.001${suffix}`
  }
  return `${value.toFixed(decimals)}${suffix}`
}

export function formatEfficiencyUnitInput(value: number): string {
  if (!isFinite(value)) return '1'
  return Number(value.toFixed(3)).toString()
}
