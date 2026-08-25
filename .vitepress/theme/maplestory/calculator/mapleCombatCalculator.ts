import type { DashboardData, EquipmentItem } from '../types';
import tmsRadarReference from '../data/tmsRadarReference.json';

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
  equipmentAttackPercent: number;
  familiarAttackPercent: number;
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

export interface RadarEquivalentAxis {
  key: 'main' | 'attack' | 'attackPercent' | 'bossTotal' | 'criticalDamage' | 'ignoreDefense';
  label: string;
  rawValue: number;
  rawUnit: string;
  equivalentMain: number;
  detail: string;
}

export interface RadarEquivalentProfile {
  axes: RadarEquivalentAxis[];
  overallEquivalentMain: number;
  referenceMax: number;
  referenceSampleSize: number;
  referenceTotalSize: number;
  referenceGeneratedAt: string;
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

const getActiveFamiliarOptions = (data: DashboardData) => {
  const familiar = data.familiar;
  const familiarList = familiar?.familiar_list || familiar?.familiar_info || [];
  const activeSlotIds = new Set(
    (familiar?.familiar_link_slot || [])
      .filter((slot) => String(slot.active_flag).toLowerCase() === 'true')
      .map((slot) => String(slot.slot_id || ''))
      .filter(Boolean),
  );
  return familiarList.flatMap((card) => {
    const summoned = String(card.summoned_flag).toLowerCase() === 'true';
    const bonded = !summoned && activeSlotIds.has(String(card.slot_id || ''));
    if (!summoned && !bonded) return [];
    return (card.option || []).map((option) => ({ card, option, bonded }));
  });
};

const familiarBondValue = (
  rawValue: number,
  grade: unknown,
  specialFlag: unknown,
  kind: 'attackPercent' | 'finalDamage',
): number => {
  const isSpecial = String(specialFlag).toLowerCase() === 'true';
  const gradeText = String(grade || '');
  const isLegendary = /傳說|legend/i.test(gradeText)
    || (kind === 'attackPercent' ? rawValue > 8 : rawValue > 12);
  if (kind === 'attackPercent') return isLegendary ? (isSpecial ? 5 : 4) : (isSpecial ? 3 : 2);
  return isLegendary ? (isSpecial ? 2.5 : 2) : (isSpecial ? 1.5 : 1);
};

const getActiveFamiliarFinalDamageSources = (data: DashboardData): number[] =>
  getActiveFamiliarOptions(data)
    .filter(({ option }) => /最終傷害|終傷|Final Damage/i.test(`${option.option_name || ''} ${option.option_value || ''}`))
    .map(({ card, option, bonded }) => {
      const match = `${option.option_value || ''} ${option.option_name || ''}`.match(/-?\d+(?:\.\d+)?/);
      const rawValue = match ? numberValue(match[0]) : 0;
      return bonded
        ? familiarBondValue(rawValue, card.familiar_grade, card.familiar_special_flag, 'finalDamage')
        : rawValue;
    })
    .filter((value) => value !== 0);

const getActiveFamiliarAttackPercent = (data: DashboardData, usesMagic: boolean): number =>
  getActiveFamiliarOptions(data).reduce((total, { card, option, bonded }) => {
    const text = `${option.option_name || ''} ${option.option_value || ''}`;
    if (!/%/.test(text)) return total;
    const bothTypes = /攻擊力\s*(?:[／/]|及|和|與)\s*(?:魔法攻擊力|魔力)|物理.*魔法.*攻擊力|ATT.*Magic/i.test(text);
    const magicOnly = /魔法攻擊力|魔力|Magic\s*(?:ATT|Attack)/i.test(text) && !bothTypes;
    const physicalOnly = /物理攻擊力|攻擊力|Attack Power|\bATT\b/i.test(text) && !magicOnly && !bothTypes;
    if (!(bothTypes || (usesMagic ? magicOnly : physicalOnly))) return total;
    const match = text.match(/-?\d+(?:\.\d+)?/);
    const rawValue = match ? numberValue(match[0]) : 0;
    return total + (bonded
      ? familiarBondValue(rawValue, card.familiar_grade, card.familiar_special_flag, 'attackPercent')
      : rawValue);
  }, 0);

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
  const familiarAttackPercent = getActiveFamiliarAttackPercent(data, usesMagic);
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
    equipmentAttackPercent: attackPotential.percent,
    familiarAttackPercent,
    attackPercent: attackPotential.percent + familiarAttackPercent,
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

/**
 * 台版能力雷達：依目前 MapleCombat 戰力公式的各乘區邊際貢獻，
 * 統一換算成「等價主屬」尺度。這是本站透明換算，不是 MapleScouter 私有公式。
 */
export function calculateRadarEquivalentProfile(profile: CalculatorProfile): RadarEquivalentProfile {
  const daPrimaryEquivalent = profile.baseHp / 3.5
    + ((profile.main - profile.baseHp) / 3.5) * 0.8;
  const overallEquivalentMain = Math.max(0, profile.category === 'xenon'
    ? profile.main + profile.sub + profile.secondSub
    : profile.category === 'da'
      ? daPrimaryEquivalent + profile.sub + profile.secondSub
      : (4 * profile.main + profile.sub + profile.secondSub) / 4);
  const mainEquivalent = Math.max(0, profile.category === 'da' ? daPrimaryEquivalent : profile.main);
  const bossTotal = Math.max(0, profile.damage + profile.bossDamage);
  const attackPercent = Math.max(0, profile.attackPercent);
  const criticalDamage = Math.max(0, profile.criticalDamage);
  const attackBaseShare = 100 / Math.max(100, 100 + attackPercent);
  // 與 combatMath.ts 的 380% BOSS 防禦公式保持一致；此檔需維持可被獨立公式檢查器載入。
  const defenseMultiplier = Math.max(0, Math.min(1, 1 - 3.8 * (1 - Math.min(100, Math.max(0, profile.ignoreDefense)) / 100)));
  const share = (value: number, base: number) => value > 0
    ? overallEquivalentMain * value / Math.max(0.000001, base + value)
    : 0;
  const jobKey = profile.jobName.replace(/[（）(),、\s]/g, '');
  const reference = tmsRadarReference.jobs[jobKey as keyof typeof tmsRadarReference.jobs];
  const percentileRank = (values: number[], value: number): number => {
    if (!values.length || value <= values[0]) return 0;
    if (value >= values[values.length - 1]) return 1;
    let upper = 1;
    while (upper < values.length && values[upper] < value) upper += 1;
    const lower = upper - 1;
    const span = Math.max(0.000001, values[upper] - values[lower]);
    return (lower + (value - values[lower]) / span) / (values.length - 1);
  };
  const quantile = (values: number[], percentile: number): number => {
    if (!values.length) return 0;
    const position = Math.max(0, Math.min(1, percentile)) * (values.length - 1);
    const lower = Math.floor(position);
    const upper = Math.min(values.length - 1, Math.ceil(position));
    return values[lower] + (values[upper] - values[lower]) * (position - lower);
  };
  const referenceEquivalent = (
    axis: 'effectiveMain' | 'attack' | 'attackPercent' | 'bossTotal' | 'criticalDamage' | 'ignoreDefense',
    rawValue: number,
    fallback: number,
  ) => reference
    ? quantile(reference.effectiveMain, percentileRank(reference[axis], rawValue))
    : fallback;
  const mappedOverallEquivalentMain = reference
    ? quantile(reference.effectiveMain, percentileRank(reference.combatPower, profile.currentCombatPower))
    : overallEquivalentMain;

  return {
    overallEquivalentMain: mappedOverallEquivalentMain,
    referenceMax: tmsRadarReference.referenceMax,
    referenceSampleSize: reference?.sampleSize || 0,
    referenceTotalSize: tmsRadarReference.sourceCount,
    referenceGeneratedAt: tmsRadarReference.generatedAt,
    axes: [
      {
        key: 'main', label: '主屬', rawValue: profile.main, rawUnit: '', equivalentMain: referenceEquivalent('effectiveMain', overallEquivalentMain, mainEquivalent),
        detail: profile.category === 'da' ? '依惡魔復仇者 HP 係數換算' : `${profile.mainStat} 公式貢獻`,
      },
      {
        key: 'attack', label: profile.usesMagic ? '魔法攻擊' : '攻擊力', rawValue: profile.attack, rawUnit: '',
        equivalentMain: referenceEquivalent('attack', profile.attack, profile.attack > 0 ? overallEquivalentMain * attackBaseShare : 0),
        detail: '依台版同職業攻魔分位換算',
      },
      {
        key: 'attackPercent', label: '攻魔%', rawValue: attackPercent, rawUnit: '%',
        equivalentMain: referenceEquivalent('attackPercent', attackPercent, share(attackPercent, 100)),
        detail: `三武攻魔 ${profile.equipmentAttackPercent || 0}%｜萌獸攻魔 ${profile.familiarAttackPercent || 0}%${profile.familiarFinalDamageEquivalent > 0
          ? `｜萌獸終傷 ${profile.familiarFinalDamageEquivalent.toFixed(1)}%（另計）`
          : ''}`,
      },
      {
        key: 'bossTotal', label: 'Boss總傷', rawValue: bossTotal, rawUnit: '%',
        equivalentMain: referenceEquivalent('bossTotal', bossTotal, share(bossTotal, 100)), detail: `傷害 ${profile.damage}%＋Boss ${profile.bossDamage}%`,
      },
      {
        key: 'criticalDamage', label: '爆傷', rawValue: criticalDamage, rawUnit: '%',
        equivalentMain: referenceEquivalent('criticalDamage', criticalDamage, share(criticalDamage, 135)), detail: '依台版同職業爆傷分位換算',
      },
      {
        key: 'ignoreDefense', label: '無視', rawValue: profile.ignoreDefense, rawUnit: '%',
        equivalentMain: referenceEquivalent('ignoreDefense', profile.ignoreDefense, overallEquivalentMain * defenseMultiplier),
        detail: `台版同職業分位；380% 防禦有效輸出 ${(defenseMultiplier * 100).toFixed(1)}%`,
      },
    ].map((axis) => ({ ...axis, equivalentMain: Math.max(0, axis.equivalentMain) })),
  };
}

export function createRadarEquivalentProfile(data: DashboardData): RadarEquivalentProfile {
  return calculateRadarEquivalentProfile(createCalculatorProfile(data));
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
