import type { DashboardData, EquipmentItem } from '../types';

/**
 * 維護提醒：遊戲公式、職業係數或海外版校正改動時，需重新對照 MapleCombat
 * 的最新 release/commit、更新這份版本資訊，並重跑 npm run check:maple-calculator。
 * VERIFIED_AT 代表人工核對公式的日期，不可用一般網站部署日期自動覆蓋。
 */
export const CALCULATOR_FORMULA_META = {
  source: 'MapleCombat',
  sourceVersion: '1.2.1',
  sourceCommit: 'e6037dc89d8810beadb091859d530cc34cdf50a2',
  sourceUpdatedAt: '2026-08-09',
  verifiedAt: '2026-08-23',
} as const;

export type CalculatorJobCategory = 'normal' | 'xenon' | 'da' | 'dual';

export interface CalculatorAdjustment {
  mainFlat: number;
  mainPercent: number;
  subFlat: number;
  subPercent: number;
  secondSubFlat: number;
  secondSubPercent: number;
  attackFlat: number;
  attackPercent: number;
  damage: number;
  bossDamage: number;
  criticalDamage: number;
  familiarFinalDamage: number;
  finalDamage: number;
}

export interface CalculatorProfile {
  characterName: string;
  jobName: string;
  category: CalculatorJobCategory;
  mainStat: string;
  subStat: string;
  secondSubStat?: string;
  currentCombatPower: number;
  main: number;
  baseHp: number;
  sub: number;
  secondSub: number;
  mainPercent: number;
  subPercent: number;
  secondSubPercent: number;
  attack: number;
  attackPercent: number;
  damage: number;
  bossDamage: number;
  criticalDamage: number;
  finalDamage: number;
  familiarFinalDamageSources: number[];
  familiarFinalDamageEquivalent: number;
  ignoreDefense: number;
  usesMagic: boolean;
  confidence: 'high' | 'formula';
}

export interface CalculatorResult {
  currentPower: number;
  projectedPower: number;
  difference: number;
  percentChange: number;
  rawRatio: number;
}

export interface EquipmentContribution {
  key: string;
  label: string;
  icon: string;
  slot: string;
  mainFlat: number;
  mainPercent: number;
  subFlat: number;
  subPercent: number;
  secondSubFlat: number;
  secondSubPercent: number;
  allStatFlat: number;
  allStatPercent: number;
  attackFlat: number;
  attackPercent: number;
  damage: number;
  bossDamage: number;
  criticalDamage: number;
  ignoreDefense: number;
}

export const EMPTY_ADJUSTMENT: CalculatorAdjustment = {
  mainFlat: 0,
  mainPercent: 0,
  subFlat: 0,
  subPercent: 0,
  secondSubFlat: 0,
  secondSubPercent: 0,
  attackFlat: 0,
  attackPercent: 0,
  damage: 0,
  bossDamage: 0,
  criticalDamage: 0,
  familiarFinalDamage: 0,
  finalDamage: 0,
};

const JOB_STATS: Array<{ names: string[]; main: string; sub: string; second?: string }> = [
  { names: ['英雄', '聖騎士', '黑騎士', '拳霸', '重砲指揮官', '聖魂劍士', '閃雷悍將', '米哈逸', '狂狼勇士', '隱月', '爆拳槍神', '惡魔殺手', '凱撒', '阿戴爾', '亞克', '蓮', '神之子', '劍豪'], main: 'STR', sub: 'DEX' },
  { names: ['大魔導士（冰、雷）', '大魔導士（火、毒）', '主教', '烈焰巫師', '龍魔導士', '夜光', '煉獄巫師', '伊利恩', '菈菈', '凱內西斯', '陰陽師', '琳恩'], main: 'INT', sub: 'LUK' },
  { names: ['箭神', '神射手', '開拓者', '槍神', '破風使者', '精靈遊俠', '狂豹獵人', '機甲戰神', '凱殷', '天使破壞者', '墨玄'], main: 'DEX', sub: 'STR' },
  { names: ['夜使者', '暗夜行者', '幻影俠盜', '卡莉', '虎影'], main: 'LUK', sub: 'DEX' },
  { names: ['暗影神偷', '影武者', '卡蒂娜'], main: 'LUK', sub: 'STR', second: 'DEX' },
  { names: ['惡魔復仇者'], main: 'HP', sub: 'STR' },
  { names: ['傑諾'], main: 'STR', sub: 'DEX', second: 'LUK' },
];

const MAGIC_JOBS = new Set([
  '大魔導士（冰、雷）', '大魔導士（火、毒）', '主教', '烈焰巫師', '龍魔導士', '夜光',
  '煉獄巫師', '伊利恩', '菈菈', '凱內西斯', '陰陽師', '琳恩',
]);

const numberValue = (value: unknown): number => {
  const parsed = Number(String(value ?? '').replace(/,/g, '').replace(/%/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

/** 與 MapleCombat percentFloor.ts 相同：百分比套用後一律向下取整。 */
export const floorPercentApplied = (base: number, percent: number): number =>
  Math.floor((base * (100 + percent)) / 100);

/** 與 MapleCombat familiar.ts 相同：來源降冪後逐條以 float32 加到同一倍率。 */
export const familiarMultiplierFromSources = (sources: number[]): number =>
  [...sources]
    .sort((left, right) => right - left)
    .reduce((total, value) => Math.fround(total + Math.fround(value / 100)), 1);

const statValue = (data: DashboardData, ...names: string[]): number => {
  const found = data.stat?.final_stat?.find((stat) => names.includes(stat.stat_name));
  return numberValue(found?.stat_value);
};

const getActiveFamiliarFinalDamageSources = (data: DashboardData): number[] => {
  const familiar = data.familiar;
  const familiarList = familiar?.familiar_list || familiar?.familiar_info || [];
  const activeSlotIds = new Set(
    (familiar?.familiar_link_slot || [])
      .filter((slot) => String(slot.active_flag).toLowerCase() === 'true')
      .map((slot) => String(slot.slot_id || ''))
      .filter(Boolean),
  );
  return familiarList
    .filter((card) => (
      String(card.summoned_flag).toLowerCase() === 'true'
      || activeSlotIds.has(String(card.slot_id || ''))
    ))
    .flatMap((card) => card.option || [])
    .filter((option) => /最終傷害|終傷|Final Damage/i.test(`${option.option_name || ''} ${option.option_value || ''}`))
    .map((option) => {
      const match = `${option.option_value || ''} ${option.option_name || ''}`.match(/-?\d+(?:\.\d+)?/);
      return match ? numberValue(match[0]) : 0;
    })
    .filter((value) => value !== 0);
};

const activeEquipment = (data: DashboardData): EquipmentItem[] => {
  const preset = Number(data.equipment?.preset_no || 0);
  const presetItems = preset >= 1 && preset <= 3
    ? data.equipment?.[`item_equipment_preset_${preset}` as keyof typeof data.equipment]
    : undefined;
  return (Array.isArray(presetItems) ? presetItems : data.equipment?.item_equipment) || [];
};

const potentialLines = (item: EquipmentItem): string[] => [
  item.potential_option_1,
  item.potential_option_2,
  item.potential_option_3,
  item.additional_potential_option_1,
  item.additional_potential_option_2,
  item.additional_potential_option_3,
].filter(Boolean);

const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sumPotential = (
  items: EquipmentItem[],
  keywords: string[],
  includeAllStat = false,
  excludes: RegExp[] = [],
): { flat: number; percent: number } => {
  let flat = 0;
  let percent = 0;
  const keywordPattern = keywords.map(escaped).join('|');
  const matcher = new RegExp(`(?:${keywordPattern})\\s*:?\\s*\\+?\\s*(\\d+(?:\\.\\d+)?)\\s*(%)?`, 'i');
  const allStatMatcher = /(?:所有屬性|全屬性|All Stats?)\s*:?\s*\+?\s*(\d+(?:\.\d+)?)\s*(%)?/i;

  items.forEach((item) => potentialLines(item).forEach((line) => {
    if (excludes.some((pattern) => pattern.test(line))) return;
    const isMagicLine = /魔法|magic/i.test(line);
    const targetsMagic = keywords.some((keyword) => /魔法|magic/i.test(keyword));
    let match = line.match(matcher);
    if (match && isMagicLine && !targetsMagic) match = null;
    if (!match && includeAllStat) match = line.match(allStatMatcher);
    if (!match) return;
    const value = numberValue(match[1]);
    if (match[2]) percent += value;
    else flat += value;
  }));

  return { flat, percent };
};

const statKeywords = (stat: string): string[] => {
  if (stat === 'HP') return ['最大HP', 'Max HP', 'HP'];
  return [stat];
};

const getJobInfo = (jobName: string) => {
  const found = JOB_STATS.find((entry) => entry.names.includes(jobName));
  const fallback = found || { names: [], main: 'STR', sub: 'DEX' };
  let category: CalculatorJobCategory = 'normal';
  if (jobName === '傑諾') category = 'xenon';
  else if (jobName === '惡魔復仇者') category = 'da';
  else if (fallback.second) category = 'dual';
  return { ...fallback, category };
};

export function createCalculatorProfile(data: DashboardData): CalculatorProfile {
  const jobName = data.basic.character_class;
  const job = getJobInfo(jobName);
  const items = activeEquipment(data);
  const usesMagic = MAGIC_JOBS.has(jobName);
  const attackNames = usesMagic ? ['魔法攻擊力', 'Magic Power'] : ['攻擊力', 'Attack Power'];
  const mainPotential = sumPotential(items, statKeywords(job.main), job.main !== 'HP');
  const subPotential = sumPotential(items, statKeywords(job.sub), job.sub !== 'HP');
  const secondPotential = job.second
    ? sumPotential(items, statKeywords(job.second), job.second !== 'HP')
    : { flat: 0, percent: 0 };
  const attackPotential = sumPotential(items, attackNames);
  const flameAllStatPercent = items.reduce(
    (total, item) => total + numberValue(item.item_total_option?.all_stat),
    0,
  );
  const currentCombatPower = statValue(data, '戰鬥力', 'Combat Power');
  const familiarFinalDamageSources = getActiveFamiliarFinalDamageSources(data);
  // 萌獸終傷屬同一系統內加法；依遊戲運算順序逐條以 float32 累加，不可彼此相乘。
  const familiarFinalMultiplier = familiarMultiplierFromSources(familiarFinalDamageSources);
  const familiarFinalDamageEquivalent = (familiarFinalMultiplier - 1) * 100;

  return {
    characterName: data.basic.character_name,
    jobName,
    category: job.category,
    mainStat: job.main,
    subStat: job.sub,
    secondSubStat: job.second,
    currentCombatPower,
    main: statValue(data, job.main),
    baseHp: statValue(data, 'AP配點HP', 'AP HP'),
    sub: statValue(data, job.sub),
    secondSub: job.second ? statValue(data, job.second) : 0,
    mainPercent: mainPotential.percent + (job.main === 'HP' ? 0 : flameAllStatPercent),
    subPercent: subPotential.percent + (job.sub === 'HP' ? 0 : flameAllStatPercent),
    secondSubPercent: secondPotential.percent + (!job.second || job.second === 'HP' ? 0 : flameAllStatPercent),
    attack: statValue(data, ...attackNames),
    attackPercent: attackPotential.percent,
    damage: statValue(data, '傷害', 'Damage'),
    bossDamage: statValue(data, 'BOSS怪物傷害', 'Boss Damage'),
    criticalDamage: statValue(data, '爆擊傷害', 'Critical Damage'),
    finalDamage: statValue(data, '最終傷害', 'Final Damage'),
    familiarFinalDamageSources,
    familiarFinalDamageEquivalent,
    ignoreDefense: statValue(data, '無視防禦率', 'Ignore Defense Rate'),
    usesMagic,
    confidence: currentCombatPower > 0 ? 'formula' : 'high',
  };
}

function projectPanelStat(
  current: number,
  knownPercent: number,
  flatDelta: number,
  percentDelta: number,
): number {
  const knownMultiplier = Math.max(0.01, 1 + knownPercent / 100);
  const estimatedBase = Math.floor(Math.max(0, current) / knownMultiplier);
  const noApplyRemainder = Math.max(0, current - Math.floor(estimatedBase * knownMultiplier));
  return Math.max(
    0,
    floorPercentApplied(Math.max(0, estimatedBase + flatDelta), knownPercent + percentDelta)
      + noApplyRemainder,
  );
}

function combatFormula(profile: CalculatorProfile, adjustment: CalculatorAdjustment): number {
  const main = projectPanelStat(profile.main, profile.mainPercent, adjustment.mainFlat, adjustment.mainPercent);
  const sub = projectPanelStat(profile.sub, profile.subPercent, adjustment.subFlat, adjustment.subPercent);
  const second = projectPanelStat(
    profile.secondSub,
    profile.secondSubPercent,
    adjustment.secondSubFlat,
    adjustment.secondSubPercent,
  );
  const attack = projectPanelStat(
    profile.attack,
    profile.attackPercent,
    adjustment.attackFlat,
    adjustment.attackPercent,
  );
  const damageMultiplier = Math.max(0, 1 + (
    profile.damage + adjustment.damage + profile.bossDamage + adjustment.bossDamage
  ) / 100);
  const criticalMultiplier = Math.max(0, 1.35 + (
    profile.criticalDamage + adjustment.criticalDamage
  ) / 100);
  const currentFamiliarMultiplier = familiarMultiplierFromSources(profile.familiarFinalDamageSources);
  const projectedFamiliarMultiplier = Math.max(
    0,
    Math.fround(currentFamiliarMultiplier + Math.fround(adjustment.familiarFinalDamage / 100)),
  );
  const familiarChangeFactor = currentFamiliarMultiplier > 0
    ? projectedFamiliarMultiplier / currentFamiliarMultiplier
    : 1;
  const finalMultiplier = Math.max(0, 1 + profile.finalDamage / 100)
    * familiarChangeFactor
    * Math.max(0, 1 + adjustment.finalDamage / 100);
  const shared = attack * damageMultiplier * criticalMultiplier * finalMultiplier / 100;

  if (profile.category === 'xenon') {
    return 2.975 * (main + sub + second) * shared;
  }
  if (profile.category === 'da') {
    const baseHp = Math.max(0, profile.baseHp);
    const equivalentMain = baseHp / 3.5 + ((main - baseHp) / 3.5) * 0.8;
    return 0.75 * (equivalentMain + sub + second) * shared;
  }
  return (4 * main + sub + second) * shared;
}

export function calculateProjection(
  profile: CalculatorProfile,
  adjustment: CalculatorAdjustment,
): CalculatorResult {
  const baselineRaw = combatFormula(profile, EMPTY_ADJUSTMENT);
  const projectedRaw = combatFormula(profile, adjustment);
  const rawRatio = baselineRaw > 0 ? projectedRaw / baselineRaw : 1;
  // 快速模擬只負責比較「這次差值」造成的相對變化，因此以官方面板戰力
  // 作為目前基準，再套用公式前後倍率。完整 MapleCombat 計算機仍維持
  // 從欄位獨立計算，用來檢查公式與資料缺口，兩者不可混為同一種用途。
  const currentPower = Math.max(
    0,
    Math.round(profile.currentCombatPower > 0 ? profile.currentCombatPower : baselineRaw),
  );
  const projectedPower = Math.max(0, Math.round(currentPower * rawRatio));
  const difference = projectedPower - currentPower;
  const percentChange = currentPower > 0 ? difference / currentPower * 100 : 0;
  return { currentPower, projectedPower, difference, percentChange, rawRatio };
}

const itemOptionNumber = (item: EquipmentItem, key: string): number =>
  numberValue((item.item_total_option as unknown as Record<string, string>)?.[key]);

const ignoreDefensePotentialSources = (item: EquipmentItem): number[] =>
  potentialLines(item).flatMap((line) => {
    const match = line.match(
      /(?:無視怪物防禦率|Ignore(?:d)? Monster Defense|Ignore Defense)[^\d]*(\d+(?:\.\d+)?)\s*%/i,
    );
    return match ? [numberValue(match[1])] : [];
  });

const combineIgnoreDefense = (sources: number[]): number => {
  const residual = sources.reduce(
    (remaining, value) => remaining * (1 - Math.min(100, Math.max(0, value)) / 100),
    1,
  );
  return Math.round((1 - residual) * 100 * 1000) / 1000;
};

export function getEquipmentContributions(data: DashboardData): EquipmentContribution[] {
  const profile = createCalculatorProfile(data);
  const attackKey = profile.usesMagic ? 'magic_power' : 'attack_power';
  const attackKeywords = profile.usesMagic
    ? ['魔法攻擊力', 'Magic Power']
    : ['攻擊力', 'Attack Power'];

  return activeEquipment(data).map((item, index) => {
    // 換裝頁有獨立「全屬／全屬%」欄位，不能像整體面板拆分時一樣
    // 把全屬潛能重複折進每一個主副屬欄位。
    const mainPotential = sumPotential([item], statKeywords(profile.mainStat));
    const subPotential = sumPotential([item], statKeywords(profile.subStat));
    const secondPotential = profile.secondSubStat
      ? sumPotential([item], statKeywords(profile.secondSubStat))
      : { flat: 0, percent: 0 };
    const allStatPotential = sumPotential([item], ['所有屬性', '全屬性', 'All Stat', 'All Stats']);
    const attackPotential = sumPotential([item], attackKeywords);
    const damagePotential = sumPotential([item], ['傷害', 'Damage'], false, [/Boss|BOSS|首領|爆擊|Critical/i]);
    const bossPotential = sumPotential([item], ['攻擊Boss怪物時傷害', '攻擊BOSS怪物時傷害', 'BOSS', 'Boss', '首領']);
    const criticalPotential = sumPotential([item], ['爆擊傷害', 'Critical Damage']);

    const ignoreDefenseSources = [
      itemOptionNumber(item, 'ignore_monster_armor'),
      ...ignoreDefensePotentialSources(item),
    ].filter((value) => value > 0);
    return {
      key: `${item.item_equipment_slot}-${index}`,
      label: `${item.item_equipment_slot}・${item.item_name}`,
      icon: item.item_icon,
      slot: item.item_equipment_slot,
      mainFlat: itemOptionNumber(item, profile.mainStat.toLowerCase()) + mainPotential.flat,
      mainPercent: mainPotential.percent,
      subFlat: itemOptionNumber(item, profile.subStat.toLowerCase()) + subPotential.flat,
      subPercent: subPotential.percent,
      secondSubFlat: profile.secondSubStat
        ? itemOptionNumber(item, profile.secondSubStat.toLowerCase()) + secondPotential.flat
        : 0,
      secondSubPercent: secondPotential.percent,
      allStatFlat: allStatPotential.flat,
      allStatPercent: itemOptionNumber(item, 'all_stat') + allStatPotential.percent,
      attackFlat: itemOptionNumber(item, attackKey) + attackPotential.flat,
      attackPercent: attackPotential.percent,
      damage: itemOptionNumber(item, 'damage') + damagePotential.percent,
      bossDamage: itemOptionNumber(item, 'boss_damage') + bossPotential.percent,
      criticalDamage: criticalPotential.percent,
      ignoreDefense: combineIgnoreDefense(ignoreDefenseSources),
    };
  });
}

export function equipmentReplacementAdjustment(
  current: EquipmentContribution,
  replacement: EquipmentContribution,
): CalculatorAdjustment {
  return {
    mainFlat: replacement.mainFlat - current.mainFlat,
    mainPercent: replacement.mainPercent - current.mainPercent,
    subFlat: replacement.subFlat - current.subFlat,
    subPercent: replacement.subPercent - current.subPercent,
    secondSubFlat: replacement.secondSubFlat - current.secondSubFlat,
    secondSubPercent: replacement.secondSubPercent - current.secondSubPercent,
    attackFlat: replacement.attackFlat - current.attackFlat,
    attackPercent: replacement.attackPercent - current.attackPercent,
    damage: replacement.damage - current.damage,
    bossDamage: replacement.bossDamage - current.bossDamage,
    criticalDamage: replacement.criticalDamage - current.criticalDamage,
    familiarFinalDamage: 0,
    finalDamage: 0,
  };
}

export function calculateMetricEfficiencies(profile: CalculatorProfile) {
  const metrics: Array<{ key: keyof CalculatorAdjustment; label: string; amount: number }> = [
    { key: 'mainFlat', label: `${profile.mainStat} +100`, amount: 100 },
    { key: 'mainPercent', label: `${profile.mainStat} +1%`, amount: 1 },
    { key: 'attackFlat', label: `${profile.usesMagic ? '魔攻' : '攻擊'} +10`, amount: 10 },
    { key: 'attackPercent', label: `${profile.usesMagic ? '魔攻' : '攻擊'} +1%`, amount: 1 },
    { key: 'damage', label: '傷害 +1%', amount: 1 },
    { key: 'bossDamage', label: 'BOSS 傷害 +1%', amount: 1 },
    { key: 'criticalDamage', label: '爆擊傷害 +1%', amount: 1 },
    { key: 'finalDamage', label: '最終傷害 +1%', amount: 1 },
  ];

  return metrics.map((metric) => {
    const adjustment = { ...EMPTY_ADJUSTMENT, [metric.key]: metric.amount };
    return { ...metric, ...calculateProjection(profile, adjustment) };
  }).sort((a, b) => b.percentChange - a.percentChange);
}
