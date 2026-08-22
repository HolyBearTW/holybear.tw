/** 遊戲百分比取整：先以整數比例相乘，最後除以 100 並向下取整。 */
export function floorPercentOf(base: number, percent: number): number {
  return Math.floor((base * percent) / 100)
}

/** 對 base 套用增減百分比後向下取整。 */
export function floorPercentApplied(base: number, percent: number): number {
  return floorPercentOf(base, 100 + percent)
}
