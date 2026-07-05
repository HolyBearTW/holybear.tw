import { explainPotentialLineGrade, inferPotentialLineGrade } from './.vitepress/components/maplestory/potentialInference.ts';

const item = {
  item_name: '創世長劍',
  item_equipment_part: '武器',
  item_equipment_slot: '武器',
};

const lines = [
  '物理攻擊力 +10%',
  '攻擊Boss怪物時傷害 +35%',
  '攻擊Boss怪物時傷害 +40%',
];

const additionalLines = [
  '攻擊Boss怪物時傷害 +18%',
  '攻擊Boss怪物時傷害 +12%',
  'DEX +10%',
];

for (const [index, line] of lines.entries()) {
  console.log(line, inferPotentialLineGrade(item, line, '傳說', index, 'main'));
  console.log(explainPotentialLineGrade(item, line, '傳說', index, 'main'));
}

for (const [index, line] of additionalLines.entries()) {
  console.log(line, inferPotentialLineGrade(item, line, '傳說', index, 'additional'));
  console.log(explainPotentialLineGrade(item, line, '傳說', index, 'additional'));
}

const percentCases = [
  {
    name: '耳環 攻擊力%',
    item: { item_name: '測試耳環', item_equipment_part: '耳環', item_equipment_slot: '耳環' },
    line: '物理攻擊力 +10%',
    grade: '罕見',
    index: 1,
    mode: 'main',
  },
  {
    name: '帽子 攻擊力%',
    item: { item_name: '測試帽子', item_equipment_part: '帽子', item_equipment_slot: '帽子' },
    line: '物理攻擊力 +10%',
    grade: '罕見',
    index: 1,
    mode: 'main',
  },
  {
    name: '腰帶 攻擊力%',
    item: { item_name: '測試腰帶', item_equipment_part: '腰帶', item_equipment_slot: '腰帶' },
    line: '物理攻擊力 +10%',
    grade: '罕見',
    index: 1,
    mode: 'main',
  },
  {
    name: '披風 攻擊力%',
    item: { item_name: '測試披風', item_equipment_part: '披風', item_equipment_slot: '披風' },
    line: '物理攻擊力 +10%',
    grade: '罕見',
    index: 1,
    mode: 'main',
  },
  {
    name: '心臟 攻擊力%',
    item: { item_name: '測試心臟', item_equipment_part: '心臟', item_equipment_slot: '心臟' },
    line: '物理攻擊力 +10%',
    grade: '罕見',
    index: 1,
    mode: 'main',
  },
  {
    name: '副武 攻擊力%',
    item: { item_name: '測試副武', item_equipment_part: '副武器', item_equipment_slot: '副武器' },
    line: '物理攻擊力 +10%',
    grade: '罕見',
    index: 1,
    mode: 'main',
  },
  {
    name: '能源 攻擊力%',
    item: { item_name: '測試能源', item_equipment_part: '能源', item_equipment_slot: '能源' },
    line: '物理攻擊力 +10%',
    grade: '罕見',
    index: 1,
    mode: 'main',
  },
  {
    name: '能源 BOSS傷害 12%',
    item: { item_name: '測試能源', item_equipment_part: '能源', item_equipment_slot: '能源' },
    line: '攻擊Boss怪物時傷害 +12%',
    grade: '罕見',
    index: 1,
    mode: 'main',
  },
  {
    name: '能源 無視防禦 12%',
    item: { item_name: '測試能源', item_equipment_part: '能源', item_equipment_slot: '能源' },
    line: '無視怪物防禦率 +12%',
    grade: '罕見',
    index: 1,
    mode: 'main',
  },
  {
    name: '能源 INT 9%',
    item: { item_name: '測試能源', item_equipment_part: '能源', item_equipment_slot: '能源' },
    line: 'INT +9%',
    grade: '罕見',
    index: 1,
    mode: 'main',
  },
];

percentCases.forEach(({ name, item, line, grade, index, mode }) => {
  console.log(`CASE:${name}`, inferPotentialLineGrade(item, line, grade, index, mode));
  console.log(explainPotentialLineGrade(item, line, grade, index, mode));
});

const additionalItem = {
  item_name: '測試手套',
  item_equipment_part: '手套',
  item_equipment_slot: '手套',
  item_level: 150,
  item_base_option: {
    base_equipment_level: 150,
  },
};

const additionalPercentLines = [
  'STR +2%',
  'STR +3%',
  'STR +5%',
  'STR +7%',
];

for (const [index, line] of additionalPercentLines.entries()) {
  console.log(`ADDITIONAL:${line}`, inferPotentialLineGrade(additionalItem, line, '傳說', index, 'additional'));
  console.log(explainPotentialLineGrade(additionalItem, line, '傳說', index, 'additional'));
}

const highLevelAdditionalItem = {
  item_name: '測試高等手套',
  item_equipment_part: '手套',
  item_equipment_slot: '手套',
  item_level: 160,
  item_base_option: {
    base_equipment_level: 160,
  },
};

const highLevelAdditionalPercentLines = [
  'STR +2%',
  'STR +4%',
  'STR +5%',
  'STR +6%',
  'STR +8%',
  'INT +8%',
  '全屬性 +5%',
];

for (const [index, line] of highLevelAdditionalPercentLines.entries()) {
  console.log(`HIGH_LEVEL_ADDITIONAL:${line}`, inferPotentialLineGrade(highLevelAdditionalItem, line, '傳說', index, 'additional'));
  console.log(explainPotentialLineGrade(highLevelAdditionalItem, line, '傳說', index, 'additional'));
}

const additionalFlatMainStatLines = [
  'STR +14',
  'STR +15',
  'STR +16',
  'STR +17',
  'STR +18',
];

for (const [index, line] of additionalFlatMainStatLines.entries()) {
  console.log(`ADDITIONAL_FLAT_MAIN_STAT:${line}`, inferPotentialLineGrade(additionalItem, line, '傳說', index, 'additional'));
  console.log(explainPotentialLineGrade(additionalItem, line, '傳說', index, 'additional'));
}

const additionalFlatAttackLines = [
  '物理攻擊力 +11',
  '物理攻擊力 +12',
  '物理攻擊力 +13',
  '物理攻擊力 +14',
  '物理攻擊力 +15',
  '物理攻擊力 +16',
  '魔法攻擊力 +11',
  '魔法攻擊力 +12',
  '魔法攻擊力 +13',
  '魔法攻擊力 +14',
  '魔法攻擊力 +15',
  '魔法攻擊力 +16',
];

for (const [index, line] of additionalFlatAttackLines.entries()) {
  console.log(`ADDITIONAL_FLAT_ATTACK:${line}`, inferPotentialLineGrade(highLevelAdditionalItem, line, '傳說', index, 'additional'));
  console.log(explainPotentialLineGrade(highLevelAdditionalItem, line, '傳說', index, 'additional'));
}

const lowLevelAdditionalFlatAttackItem = {
  item_name: '測試低等披風',
  item_equipment_part: '披風',
  item_equipment_slot: '披風',
  item_level: 150,
  item_base_option: {
    base_equipment_level: 150,
  },
};

const lowLevelAdditionalFlatAttackLines = [
  '物理攻擊力 +10',
  '物理攻擊力 +11',
  '物理攻擊力 +12',
  '物理攻擊力 +13',
];

for (const [index, line] of lowLevelAdditionalFlatAttackLines.entries()) {
  console.log(`LOW_LEVEL_ADDITIONAL_FLAT_ATTACK:${line}`, inferPotentialLineGrade(lowLevelAdditionalFlatAttackItem, line, '傳說', index, 'additional'));
  console.log(explainPotentialLineGrade(lowLevelAdditionalFlatAttackItem, line, '傳說', index, 'additional'));
}

const forcedSpecialLines = [
  '可使用實用的最終極速技能',
  '可使用實用的會心之眼技能',
  '爆擊傷害 +8%',
  '爆擊傷害 +9%',
];

for (const [index, line] of forcedSpecialLines.entries()) {
  console.log(`FORCED_SPECIAL:${line}`, inferPotentialLineGrade(additionalItem, line, '稀有', index, 'additional'));
  console.log(explainPotentialLineGrade(additionalItem, line, '稀有', index, 'additional'));
}

const focusedAdditionalPercentCases = [
  'INT +9%',
  '物理攻擊力 +9%',
];

for (const [index, line] of focusedAdditionalPercentCases.entries()) {
  console.log(`FOCUSED_ADDITIONAL_PERCENT:${line}`, inferPotentialLineGrade(additionalItem, line, '傳說', index, 'additional'));
  console.log(explainPotentialLineGrade(additionalItem, line, '傳說', index, 'additional'));
}

const levelScalingPotentialLine = '以角色等級為準每9級增加STR';
console.log(`LEVEL_SCALING:${levelScalingPotentialLine}`, inferPotentialLineGrade(additionalItem, levelScalingPotentialLine, '稀有', 1, 'additional'));
console.log(explainPotentialLineGrade(additionalItem, levelScalingPotentialLine, '稀有', 1, 'additional'));

const screenshotLevelScalingLine = '以角色等級為準每9級LUK +1';
console.log(`SCREENSHOT_LEVEL_SCALING:${screenshotLevelScalingLine}`, inferPotentialLineGrade(additionalItem, screenshotLevelScalingLine, '稀有', 1, 'additional'));
console.log(explainPotentialLineGrade(additionalItem, screenshotLevelScalingLine, '稀有', 1, 'additional'));
