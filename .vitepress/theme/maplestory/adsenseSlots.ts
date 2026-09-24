// The same responsive Display unit can serve multiple positions. Replace
// individual values with new slot IDs later to compare each position's stats.
export const MAPLESTORY_AD_SLOTS = {
  left: '3761574546',
  right: '3761574546',
  belowTicker: '3761574546',
  pageBottom: '3761574546',
} as const

// Match the maximum width used by the MapleStory search and result containers.
export const MAPLE_SIDE_AD_LAYOUT = {
  contentMaxWidth: 1600,
  gap: 10,
  minSideWidth: 126,
  maxSideWidth: 300,
} as const
