export const DEFAULT_BOSS_DEFENSE_PERCENT = 380;

/**
 * 與實戰戰力計算機共用的防禦率修正公式。
 * 防禦修正 = 1 - 怪物防禦率 × (1 - 無視防禦率)。
 */
export function calculateDefenseMultiplier(
  ignoreDefensePercent: number,
  monsterDefensePercent = DEFAULT_BOSS_DEFENSE_PERCENT,
): number {
  const ignoreDefense = Math.max(0, Math.min(1, ignoreDefensePercent / 100));
  const monsterDefense = Math.max(0, monsterDefensePercent) / 100;
  return 1 - monsterDefense * (1 - ignoreDefense);
}
