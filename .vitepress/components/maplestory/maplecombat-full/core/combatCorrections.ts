import type { JobCategory } from './types'

export const COMBAT_CORRECTION_KEYS = ['mentor', 'empress', 'genesis'] as const
export type CombatCorrectionKey = (typeof COMBAT_CORRECTION_KEYS)[number]

export interface CombatCorrectionState {
  mentor: boolean
  empress: boolean
  genesis: boolean
}

export const DEFAULT_COMBAT_CORRECTIONS: Readonly<CombatCorrectionState> = {
  mentor: true,
  empress: true,
  genesis: true,
}

export function defaultCombatCorrections(): CombatCorrectionState {
  return { ...DEFAULT_COMBAT_CORRECTIONS }
}

export function normalizeCombatCorrections(value: unknown): CombatCorrectionState {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    mentor: typeof raw.mentor === 'boolean' ? raw.mentor : true,
    empress: typeof raw.empress === 'boolean' ? raw.empress : true,
    genesis: typeof raw.genesis === 'boolean' ? raw.genesis : true,
  }
}

export function applicableCombatCorrectionKeys(
  job: JobCategory,
  weaponSet: string,
): CombatCorrectionKey[] {
  if (job !== 'overseas') return ['mentor']
  return weaponSet === 'genesis' ? ['mentor', 'empress', 'genesis'] : ['mentor', 'empress']
}
