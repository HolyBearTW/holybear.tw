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
      { slot_id: '1', summoned_flag: 'false', option: [{ option_name: '最終傷害', option_value: '+20%' }] },
      { slot_id: '2', summoned_flag: 'true', option: [{ option_name: '最終傷害', option_value: '+20%' }] },
      { slot_id: '3', summoned_flag: 'false', option: [{ option_name: '最終傷害', option_value: '+25%' }] },
    ],
    familiar_link_slot: [{ slot_id: '1', active_flag: 'true' }],
  },
});
if (familiarProfile.familiarFinalDamageSources.join(',') !== '20,20') {
  throw new Error(`萌獸召喚／啟用插槽判定失敗：${familiarProfile.familiarFinalDamageSources}`);
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
