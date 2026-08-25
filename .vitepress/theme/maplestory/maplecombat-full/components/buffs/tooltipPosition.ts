export interface TooltipRect {
  left: number
  right: number
  top: number
  bottom: number
}

export function resolveTooltipPlacement(
  anchor: TooltipRect,
  boundary: TooltipRect,
  tooltipHeight: number,
  gap: number,
): 'above' | 'below' {
  const spaceAbove = anchor.top - boundary.top - gap
  const spaceBelow = boundary.bottom - anchor.bottom - gap
  return tooltipHeight <= spaceAbove || spaceAbove >= spaceBelow ? 'above' : 'below'
}

export function resolveTooltipShift(tooltip: TooltipRect, boundary: TooltipRect): number {
  if (tooltip.left < boundary.left) return boundary.left - tooltip.left
  if (tooltip.right > boundary.right) return boundary.right - tooltip.right
  return 0
}
