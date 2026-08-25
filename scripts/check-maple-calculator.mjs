const moduleUrl = process.env.MAPLE_CALCULATOR_MODULE_URL
  || 'http://localhost:5173/.vitepress/theme/maplestory/calculator/mapleCombatCalculator.ts';

const response = await fetch(moduleUrl);
if (!response.ok) throw new Error(`無法讀取計算機模組：HTTP ${response.status}`);
const source = await response.text();
const calculator = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const profile = {
  characterName: '公式測試角色',
  jobName: '英雄',
  category: 'normal',
  mainStat: 'STR',
  subStat: 'DEX',
  currentCombatPower: 100_000_000,
  main: 50_000,
  baseHp: 0,
  sub: 10_000,
  secondSub: 0,
  mainPercent: 300,
  subPercent: 100,
  secondSubPercent: 0,
  attack: 5_000,
  equipmentAttackPercent: 100,
  familiarAttackPercent: 0,
  attackPercent: 100,
  damage: 100,
  bossDamage: 400,
  criticalDamage: 100,
  finalDamage: 50,
  familiarFinalDamageSources: [20, 20, 2],
  familiarFinalDamageEquivalent: 42,
  ignoreDefense: 95,
  usesMagic: false,
  confidence: 'calibrated',
};

const baseline = calculator.calculateProjection(profile, { ...calculator.EMPTY_ADJUSTMENT });
if (baseline.projectedPower !== profile.currentCombatPower) {
  throw new Error(`官方戰力校準失敗：${baseline.projectedPower}`);
}

const radar = calculator.calculateRadarEquivalentProfile(profile);
const radarScores = Object.fromEntries(radar.axes.map((axis) => [axis.key, axis.equivalentMain]));
const expectedRadarScores = {
  main: 50_000,
  attack: 26_250,
  attackPercent: 26_250,
  bossTotal: 43_750,
  criticalDamage: 52_500 * 100 / 235,
  ignoreDefense: 52_500 * 0.81,
};
if (radar.overallEquivalentMain !== 52_500 || radar.axes.length !== 6) {
  throw new Error(`雷達圖整體等價換算失敗：${JSON.stringify(radar)}`);
}
for (const [key, expected] of Object.entries(expectedRadarScores)) {
  if (Math.abs(radarScores[key] - expected) > 1e-8) {
    throw new Error(`雷達圖 ${key} 等價換算失敗：${radarScores[key]}，預期 ${expected}`);
  }
}

const finalDamage = calculator.calculateProjection(profile, {
  ...calculator.EMPTY_ADJUSTMENT,
  finalDamage: 10,
});
if (finalDamage.projectedPower !== 110_000_000) {
  throw new Error(`最終傷害乘算失敗：${finalDamage.projectedPower}`);
}

const familiarDamage = calculator.calculateProjection(profile, {
  ...calculator.EMPTY_ADJUSTMENT,
  familiarFinalDamage: 20,
});
const currentFamiliarMultiplierForDelta = calculator.familiarMultiplierFromSources([20, 20, 2]);
const expectedFamiliarMultiplierWithDelta = Math.fround(
  currentFamiliarMultiplierForDelta + Math.fround(20 / 100),
);
const expectedFamiliarPower = Math.round(
  100_000_000 * (expectedFamiliarMultiplierWithDelta / currentFamiliarMultiplierForDelta),
);
if (familiarDamage.projectedPower !== expectedFamiliarPower) {
  throw new Error(`萌獸終傷加算差值失敗：${familiarDamage.projectedPower}`);
}

const negative = calculator.calculateProjection(profile, {
  ...calculator.EMPTY_ADJUSTMENT,
  attackFlat: -100_000,
});
if (negative.projectedPower < 0 || !Number.isFinite(negative.projectedPower)) {
  throw new Error(`負值保護失敗：${negative.projectedPower}`);
}

for (const fixture of [
  [725, 16, 841],
  [100, 13, 113],
  [25, 16, 29],
  [3450, 82, 6279],
]) {
  const [base, percent, expected] = fixture;
  const actual = calculator.floorPercentApplied(base, percent);
  if (actual !== expected) throw new Error(`百分比取整失敗：${base}, ${percent} => ${actual}`);
}

const familiarMultiplier = calculator.familiarMultiplierFromSources([20, 20, 2]);
let expectedFamiliarMultiplier = 1;
for (const source of [20, 20, 2]) {
  expectedFamiliarMultiplier = Math.fround(expectedFamiliarMultiplier + Math.fround(source / 100));
}
if (familiarMultiplier !== expectedFamiliarMultiplier) {
  throw new Error(`萌獸 float32 加法失敗：${familiarMultiplier}`);
}

const familiarProfile = calculator.createCalculatorProfile({
  basic: { character_name: '萌獸測試', character_class: '英雄' },
  stat: {
    final_stat: [
      { stat_name: '戰鬥力', stat_value: '100000000' },
      { stat_name: 'STR', stat_value: '50000' },
      { stat_name: 'DEX', stat_value: '10000' },
      { stat_name: '攻擊力', stat_value: '5000' },
      { stat_name: '傷害', stat_value: '100' },
      { stat_name: 'BOSS怪物傷害', stat_value: '400' },
      { stat_name: '爆擊傷害', stat_value: '100' },
      { stat_name: '最終傷害', stat_value: '50' },
    ],
  },
  equipment: { preset_no: 0, item_equipment: [] },
  familiar: {
    familiar_list: [
      { slot_id: '1', summoned_flag: 'false', familiar_grade: '傳說', familiar_special_flag: 'false', option: [{ option_name: '最終傷害', option_value: '+20%' }, { option_name: '物理攻擊力', option_value: '+14%' }] },
      { slot_id: '2', summoned_flag: 'true', familiar_grade: '傳說', familiar_special_flag: 'false', option: [{ option_name: '最終傷害', option_value: '+20%' }, { option_name: '攻擊力', option_value: '+14%' }] },
      { slot_id: '3', summoned_flag: 'false', option: [{ option_name: '最終傷害', option_value: '+25%' }, { option_name: '魔法攻擊力', option_value: '+25%' }] },
    ],
    familiar_link_slot: [{ slot_id: '1', active_flag: 'true' }],
  },
});
if (familiarProfile.familiarFinalDamageSources.join(',') !== '2,20') {
  throw new Error(`萌獸召喚／啟用插槽判定失敗：${familiarProfile.familiarFinalDamageSources}`);
}
if (familiarProfile.equipmentAttackPercent !== 0 || familiarProfile.familiarAttackPercent !== 18 || familiarProfile.attackPercent !== 18) {
  throw new Error(`萌獸攻魔% 判定失敗：${JSON.stringify({
    equipment: familiarProfile.equipmentAttackPercent,
    familiar: familiarProfile.familiarAttackPercent,
    total: familiarProfile.attackPercent,
  })}`);
}

const xenonProfile = {
  ...profile,
  jobName: '傑諾',
  category: 'xenon',
  main: 50_000,
  sub: 40_000,
  secondSub: 30_000,
  mainPercent: 0,
  subPercent: 0,
  secondSubPercent: 0,
};
const xenonResult = calculator.calculateProjection(xenonProfile, {
  ...calculator.EMPTY_ADJUSTMENT,
  mainFlat: 1_000,
});
if (xenonResult.projectedPower !== Math.round(100_000_000 * (121_000 / 120_000))) {
  throw new Error(`傑諾三屬公式失敗：${xenonResult.projectedPower}`);
}

const daProfile = {
  ...profile,
  jobName: '惡魔復仇者',
  category: 'da',
  main: 100_000,
  baseHp: 10_000,
  sub: 10_000,
  mainPercent: 0,
  subPercent: 0,
};
const daBaseEquivalent = 10_000 / 3.5 + ((100_000 - 10_000) / 3.5) * 0.8;
const daNewEquivalent = 10_000 / 3.5 + ((103_500 - 10_000) / 3.5) * 0.8;
const daResult = calculator.calculateProjection(daProfile, {
  ...calculator.EMPTY_ADJUSTMENT,
  mainFlat: 3_500,
});
const expectedDaPower = Math.round(
  100_000_000 * ((daNewEquivalent + 10_000) / (daBaseEquivalent + 10_000)),
);
if (daResult.projectedPower !== expectedDaPower) {
  throw new Error(`惡魔復仇者 HP 等值公式失敗：${daResult.projectedPower}`);
}

console.log(
  `Maple calculator checks passed (formula ${calculator.CALCULATOR_FORMULA_META.sourceVersion}, verified ${calculator.CALCULATOR_FORMULA_META.verifiedAt}).`,
);

const bossModuleUrl = process.env.MAPLE_BOSS_CALCULATOR_MODULE_URL
  || 'http://localhost:5173/.vitepress/theme/maplestory/calculator/bossDamageCalculator.ts';
const bossResponse = await fetch(bossModuleUrl);
if (!bossResponse.ok) throw new Error(`無法讀取 BOSS 計算機模組：HTTP ${bossResponse.status}`);
const bossSource = await bossResponse.text();
const bossCalculator = await import(`data:text/javascript;base64,${Buffer.from(bossSource).toString('base64')}`);

const sourceBoss = bossCalculator.BOSS_HEALTH_DATA.find(
  (row) => row.name === '最初的敵對者' && row.difficulty === '普通',
);
if (bossCalculator.BOSS_NAMES[0] !== '尤比太') {
  throw new Error(`BOSS 預設排序錯誤：${bossCalculator.BOSS_NAMES[0]}`);
}
const yupitaNormal = bossCalculator.BOSS_HEALTH_DATA.find((row) => row.name === '尤比太' && row.difficulty === '普通');
if (yupitaNormal?.hpTrillion !== 10266 || yupitaNormal?.crystalRewardHundredMillion !== 17) {
  throw new Error(`尤比太普通資料錯誤：${JSON.stringify(yupitaNormal)}`);
}
const yupitaCombat = bossCalculator.getBossCombatMultiplier(yupitaNormal, { level: 300, arc: 0, aut: 810 });
if (yupitaCombat.bossLevel !== 295 || yupitaCombat.forceRequired !== 810 || yupitaCombat.combinedMultiplier !== 1.2) {
  throw new Error(`尤比太等級／AUT 倍率錯誤：${JSON.stringify(yupitaCombat)}`);
}
const lotusNormal = bossCalculator.BOSS_HEALTH_DATA.find((row) => row.name === '史烏' && row.difficulty === '普通');
const lotusCombat = bossCalculator.getBossCombatMultiplier(lotusNormal, { level: 300, arc: 0, aut: 0 });
if (lotusCombat.bossLevel !== 190 || lotusCombat.levelMultiplier !== 1.2 || lotusCombat.forceMultiplier !== 1 || lotusCombat.combinedMultiplier !== 1.2) {
  throw new Error(`無 ARC／AUT BOSS 等級倍率錯誤：${JSON.stringify(lotusCombat)}`);
}
const bossResult = bossCalculator.calculateBossDamage(sourceBoss, 1800, 1264);
if (!bossResult || bossResult.elapsedSeconds !== 536) {
  throw new Error(`BOSS 實際戰鬥時間計算失敗：${bossResult?.elapsedSeconds}`);
}
const expectedDps = 1650 / 536;
if (Math.abs(bossResult.dpsTrillion - expectedDps) > 1e-12) {
  throw new Error(`BOSS DPS 反推失敗：${bossResult.dpsTrillion}`);
}
if (Math.abs(bossResult.projectedDamageTrillion - expectedDps * 1800) > 1e-9) {
  throw new Error(`BOSS 總時間傷害量計算失敗：${bossResult.projectedDamageTrillion}`);
}

const eligible = bossCalculator.getEligibleBosses(
  bossResult.projectedDamageTrillion,
  1800,
  1800,
  3600,
);
if (!eligible.some((row) => row.name === '最初的敵對者' && row.difficulty === '普通')) {
  throw new Error('BOSS 可擊破清單缺少來源 BOSS');
}
const blackMage = eligible.find((row) => row.name === '黑魔法師' && row.difficulty === '極限');
if (!blackMage || blackMage.timeLimitSeconds !== 3600) {
  throw new Error(`黑魔法師獨立時限失敗：${blackMage?.timeLimitSeconds}`);
}

const apiCombat = bossCalculator.createBossPlayerContext({
  basic: { character_level: 280 },
  stat: { final_stat: [
    { stat_name: '神秘力量', stat_value: '1,320' },
    { stat_name: '真實之力', stat_value: '350' },
  ] },
  symbolEquipment: { symbol: [] },
});
if (apiCombat.level !== 280 || apiCombat.arc !== 1320 || apiCombat.aut !== 350) {
  throw new Error(`BOSS API 等級／力量讀取失敗：${JSON.stringify(apiCombat)}`);
}
if (bossCalculator.getLevelDamageMultiplier(280, 280) !== 1.1
  || bossCalculator.getLevelDamageMultiplier(275, 280) !== 0.875
  || bossCalculator.getLevelDamageMultiplier(240, 280) !== 0) {
  throw new Error('BOSS 等級壓制倍率失敗');
}
if (bossCalculator.getArcDamageMultiplier(1320, 1320) !== 1
  || bossCalculator.getArcDamageMultiplier(1980, 1320) !== 1.5
  || bossCalculator.getAutDamageMultiplier(350, 320) !== 1.15
  || bossCalculator.getAutDamageMultiplier(220, 320) !== 0.05) {
  throw new Error('BOSS ARC／AUT 倍率失敗');
}
const sourceAdjusted = bossCalculator.getEligibleBosses(
  bossResult.projectedDamageTrillion,
  1800,
  1800,
  3600,
  sourceBoss,
  apiCombat,
);
const adjustedSourceBoss = sourceAdjusted.find((row) => row.name === '最初的敵對者' && row.difficulty === '普通');
if (!adjustedSourceBoss || Math.abs(adjustedSourceBoss.adjustmentRatio - 1) > 1e-12 || Math.abs(adjustedSourceBoss.estimatedSeconds - 536) > 1e-9) {
  throw new Error(`來源 BOSS 倍率被重複計算：${JSON.stringify(adjustedSourceBoss)}`);
}

const bossStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => bossStorage.get(key) ?? null,
  setItem: (key, value) => bossStorage.set(key, String(value)),
  removeItem: (key) => bossStorage.delete(key),
};
const aiStorageKey = `${bossCalculator.bossDamageStorageRoot('公式測試角色')}_auto`;
bossStorage.set(aiStorageKey, JSON.stringify({
  bossName: '最初的敵對者',
  difficulty: '普通',
  total: { min: '30', sec: '00' },
  remaining: { min: '21', sec: '04' },
  normalLimit: { min: '30', sec: '00' },
  blackMageMinutes: '60',
  selfAuto: true,
  selfDamage: '',
  teammates: ['100'],
  measurementConfirmed: true,
  savedAt: 1,
}));
const aiSnapshot = bossCalculator.readBossDamageAiSnapshot('公式測試角色', apiCombat);
if (!aiSnapshot || Math.abs(aiSnapshot.personal.dpsTrillion - expectedDps) > 1e-12) {
  throw new Error(`AI 未讀取 BOSS 實測 DPS：${aiSnapshot?.personal.dpsTrillion}`);
}
if (aiSnapshot.team?.memberCount !== 2 || aiSnapshot.team.damageTrillion <= aiSnapshot.personal.damageTrillion) {
  throw new Error('AI BOSS 快照未正確分離個人與隊伍輸出');
}
bossStorage.set(aiStorageKey, JSON.stringify({ ...JSON.parse(bossStorage.get(aiStorageKey)), measurementConfirmed: false }));
if (bossCalculator.readBossDamageAiSnapshot('公式測試角色', apiCombat) !== null) {
  throw new Error('AI 不應讀取尚未確認的 BOSS 預設資料');
}

console.log(`Boss damage calculator checks passed (${bossCalculator.BOSS_HEALTH_DATA.length} health rows).`);
