export type BossDifficulty = '簡單' | '一般' | '普通' | '困難' | '混沌' | '極限';

export interface BossHealthRow {
  name: string;
  difficulty: BossDifficulty;
  hpTrillion: number;
  formula: string;
  crystalRewardHundredMillion?: number;
}

export interface BossDamageResult {
  elapsedSeconds: number;
  dpsTrillion: number;
  dpmTrillion: number;
  projectedDamageTrillion: number;
}

export interface EligibleBoss extends BossHealthRow {
  timeLimitSeconds: number;
  estimatedSeconds: number;
  marginPercent: number;
  capacityTrillion: number;
  combat: BossCombatMultiplier;
  adjustmentRatio: number;
}

export type BossForceType = 'arc' | 'aut' | null;

export interface BossPlayerContext { level: number; arc: number; aut: number }

export interface BossCombatRequirement {
  bossLevel: number;
  forceType: BossForceType;
  forceRequired: number | null;
}

export interface BossCombatMultiplier extends BossCombatRequirement {
  levelMultiplier: number;
  forceMultiplier: number;
  combinedMultiplier: number;
  requirementKnown: boolean;
  forceRequirementKnown: boolean;
}

export interface BossDamageAiSnapshot {
  measuredBoss: {
    name: string;
    difficulty: BossDifficulty;
    hpTrillion: number;
    totalSeconds: number;
    remainingSeconds: number;
    elapsedSeconds: number;
  };
  personal: {
    damageTrillion: number;
    dpsTrillion: number;
    dpmTrillion: number;
    neutralDpsTrillion: number;
  };
  team: {
    memberCount: number;
    damageTrillion: number;
    dpsTrillion: number;
  } | null;
  limits: {
    normalBossSeconds: number;
    blackMageSeconds: number;
  };
  apiCombat: BossPlayerContext;
  sourceCombat: BossCombatMultiplier;
  soloEligible: Array<{
    name: string;
    difficulty: BossDifficulty;
    estimatedSeconds: number;
    marginPercent: number;
    adjustmentRatio: number;
    combat: BossCombatMultiplier;
  }>;
  soloHighestByBoss: Record<string, {
    difficulty: BossDifficulty;
    estimatedSeconds: number;
    marginPercent: number;
    adjustmentRatio: number;
    combat: BossCombatMultiplier;
  }>;
  recordedAt: number | null;
}

const requirementKey = (name: string, difficulty: BossDifficulty) => `${name}|${difficulty}`;

// 多階段 BOSS 採用該難度最高的地圖需求，避免低估實戰所需輸出。
const BOSS_COMBAT_REQUIREMENTS: Record<string, BossCombatRequirement> = {
  [requirementKey('史烏', '普通')]: { bossLevel: 190, forceType: null, forceRequired: null },
  [requirementKey('史烏', '困難')]: { bossLevel: 210, forceType: null, forceRequired: null },
  [requirementKey('史烏', '極限')]: { bossLevel: 285, forceType: null, forceRequired: null },
  [requirementKey('戴米安', '普通')]: { bossLevel: 190, forceType: null, forceRequired: null },
  [requirementKey('戴米安', '困難')]: { bossLevel: 210, forceType: null, forceRequired: null },
  [requirementKey('守護天使綠水靈', '普通')]: { bossLevel: 220, forceType: null, forceRequired: null },
  [requirementKey('守護天使綠水靈', '混沌')]: { bossLevel: 250, forceType: null, forceRequired: null },
  [requirementKey('露希妲', '簡單')]: { bossLevel: 220, forceType: 'arc', forceRequired: 360 },
  [requirementKey('露希妲', '普通')]: { bossLevel: 230, forceType: 'arc', forceRequired: 360 },
  [requirementKey('露希妲', '困難')]: { bossLevel: 230, forceType: 'arc', forceRequired: 360 },
  [requirementKey('威爾', '簡單')]: { bossLevel: 235, forceType: 'arc', forceRequired: 560 },
  [requirementKey('威爾', '普通')]: { bossLevel: 250, forceType: 'arc', forceRequired: 760 },
  [requirementKey('威爾', '困難')]: { bossLevel: 250, forceType: 'arc', forceRequired: 760 },
  [requirementKey('戴斯克', '普通')]: { bossLevel: 255, forceType: 'arc', forceRequired: 730 },
  [requirementKey('戴斯克', '混沌')]: { bossLevel: 255, forceType: 'arc', forceRequired: 730 },
  [requirementKey('頓凱爾', '普通')]: { bossLevel: 265, forceType: 'arc', forceRequired: 850 },
  [requirementKey('頓凱爾', '困難')]: { bossLevel: 265, forceType: 'arc', forceRequired: 850 },
  [requirementKey('真希拉', '普通')]: { bossLevel: 250, forceType: 'arc', forceRequired: 820 },
  [requirementKey('真希拉', '困難')]: { bossLevel: 250, forceType: 'arc', forceRequired: 900 },
  [requirementKey('黑魔法師', '困難')]: { bossLevel: 275, forceType: 'arc', forceRequired: 1320 },
  [requirementKey('黑魔法師', '極限')]: { bossLevel: 280, forceType: 'arc', forceRequired: 1320 },
  [requirementKey('受選的賽蓮', '普通')]: { bossLevel: 260, forceType: 'aut', forceRequired: 200 },
  [requirementKey('受選的賽蓮', '困難')]: { bossLevel: 260, forceType: 'aut', forceRequired: 200 },
  [requirementKey('受選的賽蓮', '極限')]: { bossLevel: 260, forceType: 'aut', forceRequired: 200 },
  [requirementKey('監視者卡洛斯', '簡單')]: { bossLevel: 265, forceType: 'aut', forceRequired: 200 },
  [requirementKey('監視者卡洛斯', '普通')]: { bossLevel: 265, forceType: 'aut', forceRequired: 300 },
  [requirementKey('監視者卡洛斯', '混沌')]: { bossLevel: 265, forceType: 'aut', forceRequired: 330 },
  [requirementKey('監視者卡洛斯', '極限')]: { bossLevel: 265, forceType: 'aut', forceRequired: 440 },
  [requirementKey('最初的敵對者', '簡單')]: { bossLevel: 270, forceType: 'aut', forceRequired: 220 },
  [requirementKey('最初的敵對者', '普通')]: { bossLevel: 270, forceType: 'aut', forceRequired: 320 },
  [requirementKey('最初的敵對者', '困難')]: { bossLevel: 270, forceType: 'aut', forceRequired: 340 },
  [requirementKey('最初的敵對者', '極限')]: { bossLevel: 270, forceType: 'aut', forceRequired: 460 },
  [requirementKey('咖凌', '簡單')]: { bossLevel: 275, forceType: 'aut', forceRequired: 230 },
  [requirementKey('咖凌', '普通')]: { bossLevel: 275, forceType: 'aut', forceRequired: 330 },
  [requirementKey('咖凌', '困難')]: { bossLevel: 275, forceType: 'aut', forceRequired: 350 },
  [requirementKey('咖凌', '極限')]: { bossLevel: 275, forceType: 'aut', forceRequired: 480 },
  [requirementKey('燦爛的凶星', '普通')]: { bossLevel: 280, forceType: 'aut', forceRequired: 400 },
  [requirementKey('燦爛的凶星', '困難')]: { bossLevel: 280, forceType: 'aut', forceRequired: 550 },
  [requirementKey('林波', '普通')]: { bossLevel: 285, forceType: 'aut', forceRequired: 500 },
  [requirementKey('林波', '困難')]: { bossLevel: 285, forceType: 'aut', forceRequired: 500 },
  [requirementKey('巴德利斯', '普通')]: { bossLevel: 290, forceType: 'aut', forceRequired: 700 },
  [requirementKey('巴德利斯', '困難')]: { bossLevel: 290, forceType: 'aut', forceRequired: 700 },
  [requirementKey('尤比太', '普通')]: { bossLevel: 295, forceType: 'aut', forceRequired: 810 },
  [requirementKey('尤比太', '困難')]: { bossLevel: 295, forceType: 'aut', forceRequired: 810 },
};

const apiNumber = (value: unknown): number => {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

export function createBossPlayerContext(data: any): BossPlayerContext {
  const finalStats = Array.isArray(data?.stat?.final_stat) ? data.stat.final_stat : [];
  const symbols = Array.isArray(data?.symbolEquipment?.symbol) ? data.symbolEquipment.symbol : [];
  const finalValue = (names: string[]) => apiNumber(finalStats.find((stat: any) => names.includes(stat?.stat_name))?.stat_value);
  const symbolValue = (patterns: RegExp[]) => symbols.reduce((sum: number, symbol: any) => (
    patterns.some((pattern) => pattern.test(String(symbol?.symbol_name || ''))) ? sum + apiNumber(symbol?.symbol_force) : sum
  ), 0);
  return {
    level: Math.max(0, Math.floor(apiNumber(data?.basic?.character_level))),
    arc: finalValue(['神秘力量', 'Arcane Power']) || symbolValue([/神秘/, /祕法/i, /Arcane/i]),
    aut: finalValue(['真實之力', '真實力量', 'Authentic Force']) || symbolValue([/真實/, /異常/i, /Authentic/i]),
  };
}

export function getLevelDamageMultiplier(playerLevel: number, bossLevel: number): number {
  const difference = Math.floor(playerLevel) - Math.floor(bossLevel);
  if (difference >= 5) return 1.2;
  if (difference >= 0) return 1.1 + difference * 0.02;
  if (difference >= -4) return 1.1 + difference * 0.05;
  if (difference <= -40) return 0;
  return 1 + difference * 0.025;
}

export function getArcDamageMultiplier(playerArc: number, requiredArc: number): number {
  const ratio = requiredArc > 0 ? playerArc / requiredArc : 1;
  if (ratio >= 1.5) return 1.5;
  if (ratio >= 1.3) return 1.3;
  if (ratio >= 1.1) return 1.1;
  if (ratio >= 1) return 1;
  if (ratio >= 0.7) return 0.8;
  if (ratio >= 0.5) return 0.7;
  if (ratio >= 0.3) return 0.6;
  if (ratio >= 0.1) return 0.3;
  return 0.1;
}

export function getAutDamageMultiplier(playerAut: number, requiredAut: number): number {
  const difference = playerAut - requiredAut;
  return difference >= 0 ? Math.min(1.25, 1 + difference / 200) : Math.max(0.05, 1 + difference / 100);
}

export function getBossCombatMultiplier(row: BossHealthRow, player: BossPlayerContext): BossCombatMultiplier {
  const requirement = BOSS_COMBAT_REQUIREMENTS[requirementKey(row.name, row.difficulty)];
  if (!requirement) {
    // 目前清單最高 BOSS 為 Lv.295；角色達 Lv.300 時可確定所有未列力量需求的 BOSS 均吃滿 120% 等級增傷。
    const levelMultiplier = player.level >= 300 ? 1.2 : 1;
    return { bossLevel: 0, forceType: null, forceRequired: null, levelMultiplier, forceMultiplier: 1, combinedMultiplier: levelMultiplier, requirementKnown: false, forceRequirementKnown: true };
  }
  const levelMultiplier = getLevelDamageMultiplier(player.level, requirement.bossLevel);
  const hasNoForceRequirement = requirement.forceType === null;
  const forceRequirementKnown = hasNoForceRequirement || requirement.forceRequired !== null;
  const forceMultiplier = hasNoForceRequirement || !forceRequirementKnown ? 1 : requirement.forceType === 'arc'
    ? getArcDamageMultiplier(player.arc, requirement.forceRequired!)
    : getAutDamageMultiplier(player.aut, requirement.forceRequired!);
  return { ...requirement, levelMultiplier, forceMultiplier, combinedMultiplier: levelMultiplier * forceMultiplier, requirementKnown: true, forceRequirementKnown };
}

// 血量與原頁面 2026-08-25 回傳的 BOSS 傷害計算腳本一致，單位為兆。
export const BOSS_HEALTH_DATA: BossHealthRow[] = [
  { name: '巴德利斯', difficulty: '困難', hpTrillion: 20271, formula: '5345兆+5686兆+9240兆=2京271兆' },
  { name: '巴德利斯', difficulty: '普通', hpTrillion: 9364, formula: '2530兆+2550兆+4284兆=9364兆' },
  { name: '林波', difficulty: '困難', hpTrillion: 12553, formula: '1890兆×4+4993兆=1京2553兆' },
  { name: '林波', difficulty: '普通', hpTrillion: 6480, formula: '972兆×4+2592兆=6480兆' },
  { name: '燦爛的凶星', difficulty: '困難', hpTrillion: 14740, formula: '1京4740兆' },
  { name: '燦爛的凶星', difficulty: '普通', hpTrillion: 3288, formula: '3288兆' },
  { name: '咖凌', difficulty: '極限', hpTrillion: 54571, formula: '6063兆×3+6930兆+6930兆×3+8662兆=5京4571兆' },
  { name: '咖凌', difficulty: '困難', hpTrillion: 12091, formula: '920兆×3+1404兆+1827兆×3+2446兆=1京2091兆' },
  { name: '咖凌', difficulty: '普通', hpTrillion: 3926, formula: '400兆×3+468兆+512兆×3+722兆=3926兆' },
  { name: '咖凌', difficulty: '簡單', hpTrillion: 921, formula: '96兆×3+105兆+126兆×3+150兆=921兆' },
  { name: '尤比太', difficulty: '困難', hpTrillion: 49400, formula: '1京6499.6兆×2+1京6400.8兆=4京9400兆', crystalRewardHundredMillion: 51 },
  { name: '尤比太', difficulty: '普通', hpTrillion: 10266, formula: '3428兆8440億×2+3408兆3120億=1京266兆', crystalRewardHundredMillion: 17 },
  { name: '凱伊', difficulty: '困難', hpTrillion: 483, formula: '241.5兆×2=483兆' },
  { name: '凱伊', difficulty: '普通', hpTrillion: 126, formula: '63兆×2=126兆' },
  { name: '最初的敵對者', difficulty: '極限', hpTrillion: 25580, formula: '6355兆×2+1京2870兆=2京5580兆' },
  { name: '最初的敵對者', difficulty: '困難', hpTrillion: 10450, formula: '3135兆×2+4180兆=1京450兆' },
  { name: '最初的敵對者', difficulty: '普通', hpTrillion: 1650, formula: '495兆×2+660兆=1650兆' },
  { name: '最初的敵對者', difficulty: '簡單', hpTrillion: 570, formula: '171兆×2+228兆=570兆' },
  { name: '監視者卡洛斯', difficulty: '極限', hpTrillion: 21570, formula: '5970兆+1京5600兆=2京1570兆' },
  { name: '監視者卡洛斯', difficulty: '混沌', hpTrillion: 5120, formula: '1060兆+4060兆=5120兆' },
  { name: '監視者卡洛斯', difficulty: '普通', hpTrillion: 1056, formula: '336兆+720兆=1056兆' },
  { name: '監視者卡洛斯', difficulty: '簡單', hpTrillion: 357, formula: '94.5兆+262.5兆=357兆' },
  { name: '受選的賽蓮', difficulty: '極限', hpTrillion: 6480, formula: '1320兆+5160兆=6480兆' },
  { name: '受選的賽蓮', difficulty: '困難', hpTrillion: 483, formula: '126兆+357兆=483兆' },
  { name: '受選的賽蓮', difficulty: '普通', hpTrillion: 208, formula: '52.5兆+155.5兆=208兆' },
  { name: '黑魔法師', difficulty: '極限', hpTrillion: 4811, formula: '1180兆+1191兆+1285兆+1155兆=4811兆' },
  { name: '黑魔法師', difficulty: '困難', hpTrillion: 472.5, formula: '63兆+115.5兆+157.5兆+136.5兆=472.5兆' },
  { name: '頓凱爾', difficulty: '困難', hpTrillion: 157.5, formula: '157.5兆' },
  { name: '頓凱爾', difficulty: '普通', hpTrillion: 26, formula: '26兆' },
  { name: '瑪麗西亞', difficulty: '普通', hpTrillion: 178, formula: '70兆+56兆+24兆+28兆=178兆' },
  { name: '真希拉', difficulty: '困難', hpTrillion: 176, formula: '176兆' },
  { name: '真希拉', difficulty: '普通', hpTrillion: 88, formula: '88兆' },
  { name: '戴斯克', difficulty: '混沌', hpTrillion: 127.5, formula: '127.5兆' },
  { name: '戴斯克', difficulty: '普通', hpTrillion: 25.5, formula: '25.5兆' },
  { name: '威爾', difficulty: '困難', hpTrillion: 126, formula: '21兆+21兆+31.5兆+52.5兆=126兆' },
  { name: '威爾', difficulty: '普通', hpTrillion: 25.2, formula: '4.2兆+4.2兆+6.3兆+10.5兆=25.2兆' },
  { name: '威爾', difficulty: '簡單', hpTrillion: 16.8, formula: '2.8兆+2.8兆+4.2兆+7兆=16.8兆' },
  { name: '露希妲', difficulty: '困難', hpTrillion: 117.6079, formula: '50.8兆+54兆+12兆8079億=117兆6079億' },
  { name: '露希妲', difficulty: '普通', hpTrillion: 24, formula: '12兆+12兆=24兆' },
  { name: '露希妲', difficulty: '簡單', hpTrillion: 12, formula: '6兆+6兆=12兆' },
  { name: '守護天使綠水靈', difficulty: '混沌', hpTrillion: 115.5, formula: '115.5兆' },
  { name: '守護天使綠水靈', difficulty: '普通', hpTrillion: 5, formula: '5兆' },
  { name: '戴米安', difficulty: '困難', hpTrillion: 36, formula: '25.2兆+10.8兆=36兆' },
  { name: '戴米安', difficulty: '普通', hpTrillion: 1.2, formula: '8400億+3600億=1.2兆' },
  { name: '史烏', difficulty: '極限', hpTrillion: 1810, formula: '545兆+545兆+720兆=1810兆' },
  { name: '史烏', difficulty: '困難', hpTrillion: 33.5, formula: '10兆+10兆+13.5兆=33.5兆' },
  { name: '史烏', difficulty: '普通', hpTrillion: 1.57, formula: '4700億+4700億+6300億=1.57兆' },
  { name: '西格諾斯', difficulty: '普通', hpTrillion: 0.063, formula: '630億' },
  { name: '西格諾斯', difficulty: '簡單', hpTrillion: 0.0105, formula: '105億' },
  { name: '粉豆', difficulty: '混沌', hpTrillion: 0.0693, formula: '693億' },
  { name: '粉豆', difficulty: '普通', hpTrillion: 0.0021, formula: '21億' },
  { name: '濃姬', difficulty: '普通', hpTrillion: 0.5, formula: '5000億' },
  { name: '阿卡伊農', difficulty: '普通', hpTrillion: 0.0126, formula: '126億' },
  { name: '阿卡伊農', difficulty: '簡單', hpTrillion: 0.0021, formula: '21億' },
  { name: '暗黑龍王', difficulty: '混沌', hpTrillion: 0.0266, formula: '33億+33億+200億=266億' },
  { name: '暗黑龍王', difficulty: '普通', hpTrillion: 0.00275, formula: '3.3億+3.3億+20.9億=27.5億' },
  { name: '暗黑龍王', difficulty: '簡單', hpTrillion: 0.0010176, formula: '1億+1億+8.176億=10.176億' },
  { name: '凡雷恩', difficulty: '困難', hpTrillion: 0.0105, formula: '105億' },
  { name: '凡雷恩', difficulty: '普通', hpTrillion: 0.0063, formula: '63億' },
  { name: '凡雷恩', difficulty: '簡單', hpTrillion: 0.0007, formula: '7億' },
  { name: '貝倫', difficulty: '混沌', hpTrillion: 0.2, formula: '2000億' },
  { name: '貝倫', difficulty: '普通', hpTrillion: 0.00055, formula: '5.5億' },
  { name: '血腥皇后', difficulty: '混沌', hpTrillion: 0.14, formula: '1400億' },
  { name: '血腥皇后', difficulty: '普通', hpTrillion: 0.000315, formula: '3.15億' },
  { name: '斑斑', difficulty: '混沌', hpTrillion: 0.1008, formula: '1008億' },
  { name: '斑斑', difficulty: '普通', hpTrillion: 0.000315, formula: '3.15億' },
  { name: '比艾樂', difficulty: '混沌', hpTrillion: 0.08, formula: '800億' },
  { name: '比艾樂', difficulty: '普通', hpTrillion: 0.000315, formula: '3.15億' },
  { name: '拉圖斯', difficulty: '混沌', hpTrillion: 0.504, formula: '3780億+1260億=5040億' },
  { name: '拉圖斯', difficulty: '普通', hpTrillion: 0.0166, formula: '124.5億+41.5億=166億' },
  { name: '拉圖斯', difficulty: '簡單', hpTrillion: 0.0004, formula: '3億+1億=4億' },
  { name: '卡翁', difficulty: '普通', hpTrillion: 0.00168, formula: '16.8億' },
  { name: '森蘭丸', difficulty: '混沌', hpTrillion: 0.0105, formula: '105億' },
  { name: '森蘭丸', difficulty: '普通', hpTrillion: 0.001, formula: '10億' },
  { name: '希拉', difficulty: '困難', hpTrillion: 0.0168, formula: '168億' },
  { name: '希拉', difficulty: '普通', hpTrillion: 0.0005, formula: '5億' },
  { name: '梅格耐斯', difficulty: '困難', hpTrillion: 0.12, formula: '1200億' },
  { name: '梅格耐斯', difficulty: '普通', hpTrillion: 0.006, formula: '60億' },
  { name: '梅格耐斯', difficulty: '簡單', hpTrillion: 0.0004, formula: '4億' },
  { name: '殘暴炎魔', difficulty: '混沌', hpTrillion: 0.0945, formula: '840億+105億=945億' },
  { name: '殘暴炎魔', difficulty: '一般', hpTrillion: 0.0000077, formula: '700萬+70萬=770萬' },
  { name: '殘暴炎魔', difficulty: '簡單', hpTrillion: 0.000002404, formula: '220萬+20.4萬=240.4萬' },
];

export const BOSS_NAMES = [
  '尤比太',
  ...[...new Set(BOSS_HEALTH_DATA.map((row) => row.name))].filter((name) => name !== '尤比太'),
];

export function bossDamageStorageRoot(characterName: string): string {
  return `holybear_boss_damage_v1_${characterName || 'shared'}`;
}

export function calculateBossDamage(
  row: BossHealthRow,
  totalSeconds: number,
  remainingSeconds: number,
): BossDamageResult | null {
  const elapsedSeconds = totalSeconds - remainingSeconds;
  if (!Number.isFinite(totalSeconds) || !Number.isFinite(remainingSeconds) || totalSeconds <= 0 || remainingSeconds < 0 || elapsedSeconds <= 0) return null;
  const dpsTrillion = row.hpTrillion / elapsedSeconds;
  return {
    elapsedSeconds,
    dpsTrillion,
    dpmTrillion: dpsTrillion * 60,
    projectedDamageTrillion: dpsTrillion * totalSeconds,
  };
}

export function getEligibleBosses(
  teamDamageTrillion: number,
  sourceTotalSeconds: number,
  normalLimitSeconds: number,
  blackMageLimitSeconds: number,
  sourceRow?: BossHealthRow,
  player?: BossPlayerContext,
): EligibleBoss[] {
  if (!Number.isFinite(teamDamageTrillion) || teamDamageTrillion <= 0 || !Number.isFinite(sourceTotalSeconds) || sourceTotalSeconds <= 0) return [];
  const measuredTeamDps = teamDamageTrillion / sourceTotalSeconds;
  const sourceCombat = sourceRow && player ? getBossCombatMultiplier(sourceRow, player) : null;
  const sourceMultiplier = sourceCombat && sourceCombat.combinedMultiplier > 0 ? sourceCombat.combinedMultiplier : 1;
  const neutralTeamDps = measuredTeamDps / sourceMultiplier;
  return BOSS_HEALTH_DATA.map((row) => {
    const timeLimitSeconds = row.name === '黑魔法師' ? blackMageLimitSeconds : normalLimitSeconds;
    const combat = player ? getBossCombatMultiplier(row, player) : getBossCombatMultiplier(row, { level: 0, arc: 0, aut: 0 });
    // 無 ARC／AUT 場地需求的 BOSS 採實測基準，不額外套用力量倍率。
    const targetMultiplier = player ? combat.combinedMultiplier : sourceMultiplier;
    const teamDps = neutralTeamDps * targetMultiplier;
    const capacityTrillion = teamDps * timeLimitSeconds;
    return {
      ...row,
      timeLimitSeconds,
      capacityTrillion,
      estimatedSeconds: row.hpTrillion / teamDps,
      marginPercent: (capacityTrillion / row.hpTrillion - 1) * 100,
      combat,
      adjustmentRatio: targetMultiplier / sourceMultiplier,
    };
  }).filter((row) => row.hpTrillion <= row.capacityTrillion)
    .sort((left, right) => right.hpTrillion - left.hpTrillion);
}

export function formatBossNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('zh-TW', { maximumFractionDigits: value >= 1000 ? 2 : 3 });
}

export function formatBossHp(hpTrillion: number): string {
  if (hpTrillion >= 10000) return `${formatBossNumber(hpTrillion / 10000)} 京（${formatBossNumber(hpTrillion)}兆）`;
  if (hpTrillion >= 1) return `${formatBossNumber(hpTrillion)} 兆`;
  const hundredMillion = hpTrillion * 10000;
  if (hundredMillion >= 1) return `${formatBossNumber(hundredMillion)} 億`;
  return `${formatBossNumber(hpTrillion * 100000000)} 萬`;
}

export function formatBossTime(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}

export function readBossDamageAiSnapshot(characterName: string, player: BossPlayerContext = { level: 0, arc: 0, aut: 0 }): BossDamageAiSnapshot | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${bossDamageStorageRoot(characterName)}_auto`);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved?.measurementConfirmed !== true) return null;

    const totalSeconds = Math.max(0, Number(saved.total?.min || 0) * 60 + Math.min(59, Number(saved.total?.sec || 0)));
    const remainingSeconds = Math.max(0, Number(saved.remaining?.min || 0) * 60 + Math.min(59, Number(saved.remaining?.sec || 0)));
    const normalBossSeconds = Math.max(1, Number(saved.normalLimit?.min || 0) * 60 + Math.min(59, Number(saved.normalLimit?.sec || 0)));
    const blackMageSeconds = Math.max(1, Number(saved.blackMageMinutes || 60)) * 60;
    const row = BOSS_HEALTH_DATA.find((item) => item.name === saved.bossName && item.difficulty === saved.difficulty);
    if (!row) return null;
    const measured = calculateBossDamage(row, totalSeconds, remainingSeconds);
    if (!measured) return null;

    const personalDamage = saved.selfAuto === false
      ? Math.max(0, Number(saved.selfDamage) || 0)
      : measured.projectedDamageTrillion;
    if (!Number.isFinite(personalDamage) || personalDamage <= 0) return null;

    const teammates = Array.isArray(saved.teammates)
      ? saved.teammates.slice(0, 5).map((value: unknown) => Math.max(0, Number(value) || 0))
      : [];
    const teamDamage = personalDamage + teammates.reduce((sum: number, value: number) => sum + value, 0);
    const sourceCombat = getBossCombatMultiplier(row, player);
    const sourceMultiplier = sourceCombat.combinedMultiplier > 0 ? sourceCombat.combinedMultiplier : 1;
    const soloEligibleRows = getEligibleBosses(personalDamage, totalSeconds, normalBossSeconds, blackMageSeconds, row, player);
    const soloEligible = soloEligibleRows.map((item) => ({
      name: item.name,
      difficulty: item.difficulty,
      estimatedSeconds: item.estimatedSeconds,
      marginPercent: item.marginPercent,
      adjustmentRatio: item.adjustmentRatio,
      combat: item.combat,
    }));
    const soloHighestByBoss: BossDamageAiSnapshot['soloHighestByBoss'] = {};
    for (const item of soloEligible) {
      if (!soloHighestByBoss[item.name]) {
        soloHighestByBoss[item.name] = {
          difficulty: item.difficulty,
          estimatedSeconds: item.estimatedSeconds,
          marginPercent: item.marginPercent,
          adjustmentRatio: item.adjustmentRatio,
          combat: item.combat,
        };
      }
    }

    return {
      measuredBoss: {
        name: row.name,
        difficulty: row.difficulty,
        hpTrillion: row.hpTrillion,
        totalSeconds,
        remainingSeconds,
        elapsedSeconds: measured.elapsedSeconds,
      },
      personal: {
        damageTrillion: personalDamage,
        dpsTrillion: personalDamage / totalSeconds,
        dpmTrillion: personalDamage / totalSeconds * 60,
        neutralDpsTrillion: personalDamage / totalSeconds / sourceMultiplier,
      },
      team: teammates.length > 0 ? {
        memberCount: teammates.length + 1,
        damageTrillion: teamDamage,
        dpsTrillion: teamDamage / totalSeconds,
      } : null,
      limits: { normalBossSeconds, blackMageSeconds },
      apiCombat: player,
      sourceCombat,
      soloEligible,
      soloHighestByBoss,
      recordedAt: Number.isFinite(Number(saved.savedAt)) ? Number(saved.savedAt) : null,
    };
  } catch {
    return null;
  }
}
