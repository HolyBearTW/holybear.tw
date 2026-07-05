import { EquipmentItem } from './types';

export type PotentialGrade = 'rare' | 'epic' | 'unique' | 'legendary';
export type PotentialInferenceMode = 'main' | 'additional';

export interface PotentialInferenceDebugInfo {
  equipmentKey: string | null;
  label: string;
  value: number | null;
  thresholds: PotentialThreshold | null;
  inferred: PotentialGrade | null;
  result: PotentialGrade | null;
}

interface PotentialThreshold {
  min?: number;
  rare?: number;
  epic?: number;
  unique?: number;
  legendary?: number;
}

interface PotentialRule {
  aliases: string[];
  thresholds: PotentialThreshold;
}

const GRADE_ORDER: PotentialGrade[] = ['rare', 'epic', 'unique', 'legendary'];
const USER_PERCENT_THRESHOLDS: PotentialThreshold = { min: 2, rare: 3, epic: 6, unique: 9, legendary: 12 };
const THREE_WEAPON_PERCENT_THRESHOLDS: PotentialThreshold = { min: 3, rare: 6, epic: 9, unique: 12, legendary: 15 };

const EQUIPMENT_ALIASES: Record<string, string[]> = {
  weapon: ['weapon', '武器'],
  hat: ['hat', '帽子'],
  outfit: ['outfit', 'overall', 'longcoat', '套服', '全身鎧甲', '套裝', '服裝'],
  top: ['top', '上衣'],
  bottom: ['bottom', '下衣', '褲', '褲子', '裙'],
  gloves: ['gloves', '手套'],
  shoes: ['shoes', '鞋子', '鞋'],
  shoulder: ['shoulder', '肩膀', '肩飾'],
  belt: ['belt', '腰帶'],
  cape: ['cape', '披風'],
  earrings: ['earrings', '耳環'],
  necklace: ['necklace', 'pendant', '墜飾', '項鍊'],
  ring: ['ring', '戒指'],
  heart: ['heart', 'hearts', '心臟'],
  pocket: ['pocket', '口袋'],
  secondary: ['secondary', 'subweapon', 'sub weapon', 'shield', 'katara', '副武', '副武器', '輔助武器', '盾牌'],
  emblem: ['emblem', '能源', '徽章'],
};

const SHARED_ACCESSORY_RULES: PotentialRule[] = [
  { aliases: ['STR%', 'DEX%', 'INT%', 'LUK%'], thresholds: USER_PERCENT_THRESHOLDS },
  { aliases: ['全屬性%'], thresholds: { min: 1, rare: 2, epic: 4, unique: 6, legendary: 9 } },
  { aliases: ['STR', 'DEX', 'INT', 'LUK'], thresholds: { min: 6, rare: 14, epic: 18, unique: 30, legendary: 42 } },
  { aliases: ['物理攻擊力', '攻擊力'], thresholds: { min: 6, rare: 11.5, epic: 14, unique: 40, legendary: 70 } },
  { aliases: ['魔法攻擊力'], thresholds: { min: 6, rare: 11.5, epic: 14, unique: 40, legendary: 70 } },
  { aliases: ['物理攻擊力%', '攻擊力%'], thresholds: USER_PERCENT_THRESHOLDS },
  { aliases: ['魔法攻擊力%'], thresholds: USER_PERCENT_THRESHOLDS },
  { aliases: ['物理傷害%', '物理傷害增加%'], thresholds: { rare: 0.2, epic: 0.4, unique: 0.7, legendary: 1.4 } },
  { aliases: ['魔法傷害%', '魔法傷害增加%'], thresholds: { rare: 0.2, epic: 0.4, unique: 0.7, legendary: 1.4 } },
  { aliases: ['BOSS攻擊時傷害增加%', 'BOSS傷害%', 'BOSS傷害'], thresholds: { rare: 0.3, epic: 0.7, unique: 1.2, legendary: 2.3 } },
  { aliases: ['爆擊率%', '爆擊機率%'], thresholds: { rare: 0.1, epic: 0.2, unique: 0.4, legendary: 0.7 } },
  { aliases: ['命中值%', '命中率%'], thresholds: { rare: 0.1, epic: 0.2, unique: 0.4, legendary: 0.8 } },
  { aliases: ['最大HP', 'MaxHP'], thresholds: { rare: 58, epic: 116, unique: 203, legendary: 406 } },
  { aliases: ['最大MP', 'MaxMP'], thresholds: { rare: 50, epic: 100, unique: 175, legendary: 350 } },
  { aliases: ['最大HP%', 'MaxHP%'], thresholds: { min: 1, rare: 2, epic: 4, unique: 7, legendary: 10 } },
  { aliases: ['最大MP%', 'MaxMP%'], thresholds: { min: 1, rare: 2, epic: 4, unique: 7, legendary: 10 } },
  { aliases: ['經驗值獲得量%', '經驗值%'], thresholds: { rare: 0.1, epic: 0.2, unique: 0.6, legendary: 1.2 } },
  { aliases: ['道具掉落率%', '掉寶率%'], thresholds: { rare: 0.3, epic: 0.5, unique: 1.1, legendary: 2.3 } },
  { aliases: ['楓幣獲得量%', '楓幣掉落率%', '楓幣%'], thresholds: { rare: 0.1, epic: 0.2, unique: 0.6, legendary: 1.2 } },
  { aliases: ['移動速度%', '速度%'], thresholds: { rare: 0.4, epic: 0.7, unique: 1.3, legendary: 2.6 } },
];

const POTENTIAL_RULES: Record<string, PotentialRule[]> = {
  weapon: [
    { aliases: ['物理攻擊力', '攻擊力'], thresholds: { min: 40, rare: 60, epic: 140, unique: 300, legendary: 420 } },
    { aliases: ['魔法攻擊力'], thresholds: { min: 40, rare: 60, epic: 140, unique: 300, legendary: 420 } },
    { aliases: ['物理攻擊力%', '攻擊力%'], thresholds: THREE_WEAPON_PERCENT_THRESHOLDS },
    { aliases: ['魔法攻擊力%'], thresholds: THREE_WEAPON_PERCENT_THRESHOLDS },
    { aliases: ['攻擊BOSS怪物時傷害%', '攻擊BOSS怪物時傷害增加%', 'BOSS攻擊時傷害增加%', 'BOSS傷害%', 'BOSS傷害'], thresholds: { min: 15, rare: 20, epic: 30, unique: 34, legendary: 35 } },
    { aliases: ['爆擊攻擊', '爆擊傷害值'], thresholds: { min: 23, rare: 34, epic: 80, unique: 171, legendary: 239 } },
    { aliases: ['爆擊傷害%'], thresholds: { min: 0.9, rare: 1.4, epic: 3.2, unique: 6.8, legendary: 9.5 } },
    { aliases: ['命中值%', '命中率%'], thresholds: { min: 0.2, rare: 0.3, epic: 0.8, unique: 1.7, legendary: 2.3 } },
    { aliases: ['最大HP'], thresholds: { min: 116, rare: 174, epic: 406, unique: 870, legendary: 1218 } },
    { aliases: ['最大MP'], thresholds: { min: 100, rare: 150, epic: 350, unique: 750, legendary: 1050 } },
    { aliases: ['最大HP%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['最大MP%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['經驗值獲得量%', '經驗值%'], thresholds: { min: 0.1, rare: 0.2, epic: 0.6, unique: 1.2, legendary: 1.8 } },
    { aliases: ['道具掉落率%', '掉寶率%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.3, legendary: 3.2 } },
    { aliases: ['楓幣獲得量%', '楓幣%'], thresholds: { min: 0.1, rare: 0.2, epic: 0.6, unique: 1.2, legendary: 1.8 } },
  ],
  hat: [
    { aliases: ['物理攻擊力%', '攻擊力%'], thresholds: USER_PERCENT_THRESHOLDS },
    { aliases: ['魔法攻擊力%'], thresholds: USER_PERCENT_THRESHOLDS },
    { aliases: ['爆擊傷害抗性%', '爆擊傷害減少%'], thresholds: { rare: 0.4, epic: 0.8, unique: 1.8, legendary: 2.5 } },
    { aliases: ['迴避值', '迴避'], thresholds: { rare: 6, epic: 14, unique: 30, legendary: 44 } },
    { aliases: ['命中值%', '命中率%'], thresholds: { rare: 0.3, epic: 0.8, unique: 1.7, legendary: 2.3 } },
    { aliases: ['最大HP'], thresholds: { rare: 174, epic: 406, unique: 870, legendary: 1218 } },
    { aliases: ['最大MP'], thresholds: { rare: 150, epic: 350, unique: 750, legendary: 1000 } },
    { aliases: ['最大HP%'], thresholds: { rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['最大MP%'], thresholds: { rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['楓幣獲得量%', '楓幣%'], thresholds: { rare: 0.2, epic: 0.6, unique: 1.2, legendary: 1.8 } },
  ],
  outfit: [
    { aliases: ['STR%', 'DEX%', 'INT%', 'LUK%'], thresholds: USER_PERCENT_THRESHOLDS },
    { aliases: ['全屬性%'], thresholds: { min: 1, rare: 1, epic: 3, unique: 4, legendary: 6 } },
    { aliases: ['物理防禦力%', '防禦力%'], thresholds: { rare: 0.6, epic: 1.3, unique: 2.9, legendary: 4.0 } },
    { aliases: ['魔法防禦力%', '魔防%'], thresholds: { rare: 0.6, epic: 1.3, unique: 2.9, legendary: 4.0 } },
    { aliases: ['爆擊傷害抗性%', '爆擊傷害減少%'], thresholds: { rare: 0.4, epic: 0.8, unique: 1.8, legendary: 2.5 } },
    { aliases: ['命中值%', '命中率%'], thresholds: { rare: 0.3, epic: 0.8, unique: 1.7, legendary: 2.3 } },
    { aliases: ['最大HP'], thresholds: { min: 116, rare: 174, epic: 406, unique: 870, legendary: 1218 } },
    { aliases: ['最大MP'], thresholds: { min: 100, rare: 150, epic: 350, unique: 750, legendary: 1000 } },
    { aliases: ['最大HP%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['最大MP%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['STR', 'DEX', 'INT', 'LUK'], thresholds: { min: 6, rare: 10, epic: 18, unique: 30, legendary: 42 } },
    { aliases: ['物理攻擊力', '攻擊力'], thresholds: { min: 6, rare: 11, epic: 21, unique: 42, legendary: 630 } },
    { aliases: ['魔法攻擊力'], thresholds: { min: 6, rare: 11, epic: 21, unique: 42, legendary: 630 } },
  ],
  top: [],
  bottom: [],
  gloves: [
    { aliases: ['STR%', 'DEX%', 'INT%', 'LUK%'], thresholds: USER_PERCENT_THRESHOLDS },
    { aliases: ['全屬性%'], thresholds: { min: 1, rare: 1, epic: 2, unique: 3, legendary: 4 } },
    { aliases: ['物理傷害%', '物理傷害增加%'], thresholds: { min: 0.4, rare: 0.6, epic: 1.4, unique: 2.9, legendary: 4.1 } },
    { aliases: ['魔法傷害%', '魔法傷害增加%'], thresholds: { min: 0.4, rare: 0.6, epic: 1.4, unique: 2.9, legendary: 4.1 } },
    { aliases: ['爆擊攻擊', '爆擊傷害值'], thresholds: { min: 23, rare: 34, epic: 80, unique: 171, legendary: 239 } },
    { aliases: ['爆擊傷害%'], thresholds: { min: 0.6, rare: 0.9, epic: 2.1, unique: 4.5, legendary: 6.3 } },
    { aliases: ['命中值%', '命中率%'], thresholds: { min: 0.2, rare: 0.3, epic: 0.8, unique: 1.7, legendary: 2.3 } },
    { aliases: ['最大HP', 'MaxHP'], thresholds: { min: 116, rare: 174, epic: 406, unique: 870, legendary: 1218 } },
    { aliases: ['最大MP', 'MaxMP'], thresholds: { min: 100, rare: 150, epic: 350, unique: 750, legendary: 1000 } },
    { aliases: ['最大HP%', 'MaxHP%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['最大MP%', 'MaxMP%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['經驗值獲得量%', '經驗值%'], thresholds: { min: 0.2, rare: 0.2, epic: 0.6, unique: 1.2, legendary: 1.8 } },
    { aliases: ['道具掉落率%', '掉寶率%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.3, legendary: 3.2 } },
  ],
  shoes: [
    { aliases: ['STR%', 'DEX%', 'INT%', 'LUK%'], thresholds: { min: 2, rare: 3, epic: 6, unique: 9, legendary: 12 } },
    { aliases: ['全屬性%'], thresholds: { min: 1, rare: 1, epic: 2, unique: 3, legendary: 4 } },
    { aliases: ['物理防禦力', '防禦力'], thresholds: { min: 60, rare: 90, epic: 210, unique: 450, legendary: 630 } },
    { aliases: ['魔法防禦力', '魔防'], thresholds: { min: 60, rare: 90, epic: 210, unique: 450, legendary: 630 } },
    { aliases: ['命中值%', '命中率%'], thresholds: { min: 0.2, rare: 0.3, epic: 0.8, unique: 1.7, legendary: 2.3 } },
    { aliases: ['最大HP', 'MaxHP'], thresholds: { min: 116, rare: 174, epic: 406, unique: 870, legendary: 1218 } },
    { aliases: ['最大MP', 'MaxMP'], thresholds: { min: 100, rare: 150, epic: 350, unique: 750, legendary: 1000 } },
    { aliases: ['最大HP%', 'MaxHP%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['最大MP%', 'MaxMP%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['移動速度%', '速度%'], thresholds: { min: 0.6, rare: 1.2, epic: 3.0, unique: 6.0, legendary: 9.0 } },
    { aliases: ['物理攻擊力', '攻擊力'], thresholds: { min: 6, rare: 10, epic: 23, unique: 50, legendary: 70 } },
    { aliases: ['魔法攻擊力'], thresholds: { min: 6, rare: 10, epic: 23, unique: 50, legendary: 70 } },
  ],
  shoulder: [
    { aliases: ['STR%', 'DEX%', 'INT%', 'LUK%'], thresholds: { min: 2, rare: 3, epic: 6, unique: 9, legendary: 12 } },
    { aliases: ['全屬性%'], thresholds: { min: 1, rare: 1, epic: 2, unique: 3, legendary: 4 } },
    { aliases: ['物理防禦力', '防禦力'], thresholds: { min: 60, rare: 90, epic: 210, unique: 450, legendary: 630 } },
    { aliases: ['魔法防禦力', '魔防'], thresholds: { min: 60, rare: 90, epic: 210, unique: 450, legendary: 630 } },
    { aliases: ['BOSS防禦率%', 'BOSS防禦%'], thresholds: { min: 0.4, rare: 0.6, epic: 1.4, unique: 3.0, legendary: 4.2 } },
    { aliases: ['命中值%', '命中率%'], thresholds: { min: 0.2, rare: 0.3, epic: 0.8, unique: 1.7, legendary: 2.3 } },
    { aliases: ['最大HP'], thresholds: { min: 116, rare: 174, epic: 406, unique: 870, legendary: 1218 } },
    { aliases: ['最大MP'], thresholds: { min: 100, rare: 150, epic: 350, unique: 750, legendary: 1000 } },
    { aliases: ['最大HP%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['最大MP%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['經驗值獲得量%', '經驗值%'], thresholds: { min: 0.1, rare: 0.2, epic: 0.6, unique: 1.2, legendary: 1.8 } },
    { aliases: ['物理傷害%', '物理傷害增加%'], thresholds: { min: 0.4, rare: 0.6, epic: 1.4, unique: 2.9, legendary: 4.1 } },
    { aliases: ['魔法傷害%', '魔法傷害增加%'], thresholds: { min: 0.4, rare: 0.6, epic: 1.4, unique: 2.9, legendary: 4.1 } },
  ],
  belt: [
    { aliases: ['STR%', 'DEX%', 'INT%', 'LUK%'], thresholds: { min: 2, rare: 3, epic: 6, unique: 9, legendary: 12 } },
    { aliases: ['全屬性%'], thresholds: { min: 1, rare: 1, epic: 2, unique: 3, legendary: 4 } },
    { aliases: ['物理攻擊力%', '攻擊力%'], thresholds: USER_PERCENT_THRESHOLDS },
    { aliases: ['魔法攻擊力%'], thresholds: USER_PERCENT_THRESHOLDS },
    { aliases: ['物理傷害抗性%', '物理傷害減少%'], thresholds: { min: 0.4, rare: 0.6, epic: 1.4, unique: 3.0, legendary: 4.2 } },
    { aliases: ['魔法傷害抗性%', '魔法傷害減少%'], thresholds: { min: 0.4, rare: 0.6, epic: 1.4, unique: 3.0, legendary: 4.2 } },
    { aliases: ['命中值%', '命中率%'], thresholds: { min: 0.2, rare: 0.3, epic: 0.8, unique: 1.7, legendary: 2.3 } },
    { aliases: ['最大HP', 'MaxHP'], thresholds: { min: 116, rare: 174, epic: 406, unique: 870, legendary: 1218 } },
    { aliases: ['最大MP', 'MaxMP'], thresholds: { min: 100, rare: 150, epic: 350, unique: 750, legendary: 1000 } },
    { aliases: ['最大HP%', 'MaxHP%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['最大MP%', 'MaxMP%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['道具掉落率%', '掉寶率%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.3, legendary: 3.2 } },
  ],
  cape: [
    { aliases: ['STR%', 'DEX%', 'INT%', 'LUK%'], thresholds: { min: 2, rare: 3, epic: 6, unique: 9, legendary: 12 } },
    { aliases: ['全屬性%'], thresholds: { min: 1, rare: 1, epic: 2, unique: 3, legendary: 4 } },
    { aliases: ['物理防禦力%', '防禦力%'], thresholds: { min: 0.4, rare: 0.6, epic: 1.3, unique: 2.9, legendary: 4.0 } },
    { aliases: ['魔法防禦力%', '魔防%'], thresholds: { min: 0.4, rare: 0.6, epic: 1.3, unique: 2.9, legendary: 4.0 } },
    { aliases: ['命中值%', '命中率%'], thresholds: { min: 0.2, rare: 0.3, epic: 0.8, unique: 1.7, legendary: 2.3 } },
    { aliases: ['最大HP', 'MaxHP'], thresholds: { min: 116, rare: 174, epic: 406, unique: 870, legendary: 1218 } },
    { aliases: ['最大MP', 'MaxMP'], thresholds: { min: 100, rare: 150, epic: 350, unique: 750, legendary: 1000 } },
    { aliases: ['最大HP%', 'MaxHP%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['最大MP%', 'MaxMP%'], thresholds: { min: 0.3, rare: 0.5, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['移動速度%', '速度%'], thresholds: { min: 0.7, rare: 1.1, epic: 2.6, unique: 5.5, legendary: 7.7 } },
    { aliases: ['楓幣獲得量%', '楓幣%'], thresholds: { min: 0.2, rare: 0.2, epic: 0.6, unique: 1.2, legendary: 1.8 } },
    { aliases: ['物理攻擊力%', '攻擊力%'], thresholds: USER_PERCENT_THRESHOLDS },
    { aliases: ['魔法攻擊力%'], thresholds: USER_PERCENT_THRESHOLDS },
  ],
  earrings: [...SHARED_ACCESSORY_RULES],
  necklace: [...SHARED_ACCESSORY_RULES, { aliases: ['BOSS攻擊時傷害增加%', 'BOSS傷害%', 'BOSS傷害'], thresholds: { rare: 0.7, epic: 1.2, unique: 2.3, legendary: 5.0 } }, { aliases: ['爆擊率%', '爆擊機率%'], thresholds: { rare: 0.2, epic: 0.4, unique: 0.7, legendary: 1.5 } }, { aliases: ['移動速度%', '速度%'], thresholds: { rare: 0.7, epic: 1.3, unique: 2.6, legendary: 5.5 } }],
  ring: [
    { aliases: ['STR%', 'DEX%', 'INT%', 'LUK%'], thresholds: { min: 2, rare: 3, epic: 6, unique: 9, legendary: 12 } },
    { aliases: ['全屬性%'], thresholds: { rare: 1, epic: 2, unique: 3, legendary: 4 } },
    { aliases: ['物理攻擊力', '攻擊力'], thresholds: { rare: 40, epic: 70, unique: 140 } },
    { aliases: ['魔法攻擊力'], thresholds: { rare: 40, epic: 70, unique: 140 } },
    { aliases: ['爆擊攻擊', '爆擊傷害值'], thresholds: { rare: 23, epic: 40, unique: 80 } },
    { aliases: ['爆擊傷害%'], thresholds: { rare: 0.9, epic: 1.6, unique: 3.2 } },
    { aliases: ['BOSS防禦率%', 'BOSS防禦%'], thresholds: { rare: 0.4, epic: 0.7, unique: 1.4 } },
    { aliases: ['命中值%', '命中率%'], thresholds: { rare: 0.2, epic: 0.4, unique: 0.8 } },
    { aliases: ['迴避值%', '迴避率%'], thresholds: { rare: 0.2, epic: 0.4, unique: 0.8 } },
    { aliases: ['最大HP'], thresholds: { rare: 116, epic: 203, unique: 406 } },
    { aliases: ['最大MP'], thresholds: { rare: 100, epic: 175, unique: 350 } },
    { aliases: ['最大HP%'], thresholds: { rare: 0.3, epic: 0.6, unique: 1.1 } },
    { aliases: ['最大MP%'], thresholds: { rare: 0.3, epic: 0.6, unique: 1.1 } },
    { aliases: ['經驗值獲得量%', '經驗值%'], thresholds: { rare: 0.2, epic: 0.6, unique: 1.2 } },
    { aliases: ['道具掉落率%', '掉寶率%'], thresholds: { rare: 0.5, epic: 1.1, unique: 2.3 } },
    { aliases: ['楓幣獲得量%', '楓幣%'], thresholds: { rare: 0.2, epic: 0.6, unique: 1.2 } },
  ],
  heart: [
    { aliases: ['STR%', 'DEX%', 'INT%', 'LUK%'], thresholds: { min: 2, rare: 3, epic: 6, unique: 9, legendary: 12 } },
    { aliases: ['全屬性%'], thresholds: { min: 1, rare: 1, epic: 2, unique: 3, legendary: 4 } },
    { aliases: ['爆擊攻擊', '爆擊傷害值'], thresholds: { min: 29, rare: 40, epic: 80, unique: 171, legendary: 239 } },
    { aliases: ['爆擊傷害%'], thresholds: { min: 0.8, rare: 1.1, epic: 2.1, unique: 4.5, legendary: 6.3 } },
    { aliases: ['物理防禦力%', '防禦力%'], thresholds: { min: 0.5, rare: 0.7, epic: 1.3, unique: 2.9, legendary: 4.0 } },
    { aliases: ['魔法防禦力%', '魔防%'], thresholds: { min: 0.5, rare: 0.7, epic: 1.3, unique: 2.9, legendary: 4.0 } },
    { aliases: ['爆擊抗性', '爆擊抵抗'], thresholds: { min: 6, rare: 8, epic: 16, unique: 35, legendary: 48 } },
    { aliases: ['爆擊傷害抗性%', '爆擊傷害減少%'], thresholds: { min: 0.3, rare: 0.4, epic: 0.8, unique: 1.8, legendary: 2.5 } },
    { aliases: ['最大HP', 'MaxHP'], thresholds: { min: 145, rare: 203, epic: 406, unique: 870, legendary: 1218 } },
    { aliases: ['最大MP', 'MaxMP'], thresholds: { min: 125, rare: 175, epic: 350, unique: 750, legendary: 1050 } },
    { aliases: ['最大HP%', 'MaxHP%'], thresholds: { min: 0.4, rare: 0.6, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['最大MP%', 'MaxMP%'], thresholds: { min: 0.4, rare: 0.6, epic: 1.1, unique: 2.4, legendary: 3.4 } },
    { aliases: ['HP恢復', 'HP回復'], thresholds: { min: 7, rare: 9, epic: 18, unique: 39, legendary: 55 } },
    { aliases: ['MP恢復', 'MP回復'], thresholds: { min: 7, rare: 9, epic: 18, unique: 39, legendary: 55 } },
    { aliases: ['物理攻擊力%', '攻擊力%'], thresholds: USER_PERCENT_THRESHOLDS },
    { aliases: ['魔法攻擊力%'], thresholds: USER_PERCENT_THRESHOLDS },
    { aliases: ['STR%', 'DEX%', 'INT%', 'LUK%'], thresholds: { min: 2, rare: 3, epic: 6, unique: 9, legendary: 12 } },
    { aliases: ['全屬性%'], thresholds: { rare: 1, epic: 2, unique: 3, legendary: 4 } },
    { aliases: ['物理攻擊力%', '攻擊力%'], thresholds: USER_PERCENT_THRESHOLDS },
    { aliases: ['魔法攻擊力%'], thresholds: USER_PERCENT_THRESHOLDS },
    { aliases: ['物理傷害減少%', '物理傷害抗性%'], thresholds: { rare: 0.4, epic: 0.8, unique: 1.6 } },
    { aliases: ['魔法傷害減少%', '魔法傷害抗性%'], thresholds: { rare: 0.4, epic: 0.8, unique: 1.6 } },
    { aliases: ['爆擊減少', '爆擊傷害減少'], thresholds: { rare: 5, epic: 8, unique: 16 } },
    { aliases: ['命中值%', '命中率%'], thresholds: { rare: 0.2, epic: 0.5, unique: 1.0 } },
    { aliases: ['最大HP%'], thresholds: { rare: 0.3, epic: 0.6, unique: 1.1 } },
    { aliases: ['最大MP%'], thresholds: { rare: 0.3, epic: 0.6, unique: 1.1 } },
    { aliases: ['HP恢復', 'HP回復'], thresholds: { rare: 5, epic: 9, unique: 18 } },
    { aliases: ['MP恢復', 'MP回復'], thresholds: { rare: 5, epic: 9, unique: 18 } },
    { aliases: ['移動速度%', '速度%'], thresholds: { rare: 0.7, epic: 1.3, unique: 2.6 } },
  ],
  secondary: [
    { aliases: ['STR%', 'DEX%', 'INT%', 'LUK%'], thresholds: { min: 2, rare: 3, epic: 6, unique: 9, legendary: 12 } },
    { aliases: ['全屬性%'], thresholds: { min: 1, rare: 1, epic: 3, unique: 4, legendary: 6 } },
    { aliases: ['物理攻擊力%', '攻擊力%'], thresholds: THREE_WEAPON_PERCENT_THRESHOLDS },
    { aliases: ['魔法攻擊力%'], thresholds: THREE_WEAPON_PERCENT_THRESHOLDS },
    { aliases: ['攻擊BOSS怪物時傷害%', '攻擊BOSS怪物時傷害增加%', 'BOSS攻擊時傷害增加%', 'BOSS傷害%', 'BOSS傷害'], thresholds: { min: 3, rare: 6, epic: 9, unique: 12, legendary: 15 } },
    { aliases: ['無視怪物防禦率%', '無視怪物防禦%', '無視防禦率%', '無視防禦%'], thresholds: { min: 3, rare: 6, epic: 9, unique: 12, legendary: 15 } },
  ],
  emblem: [
    { aliases: ['STR%', 'DEX%', 'INT%', 'LUK%'], thresholds: { min: 2, rare: 3, epic: 6, unique: 9, legendary: 12 } },
    { aliases: ['全屬性%'], thresholds: { min: 1, rare: 2, epic: 3, unique: 4, legendary: 6 } },
    { aliases: ['物理攻擊力%', '攻擊力%'], thresholds: THREE_WEAPON_PERCENT_THRESHOLDS },
    { aliases: ['魔法攻擊力%'], thresholds: THREE_WEAPON_PERCENT_THRESHOLDS },
    { aliases: ['攻擊BOSS怪物時傷害%', '攻擊BOSS怪物時傷害增加%', 'BOSS攻擊時傷害增加%', 'BOSS傷害%', 'BOSS傷害'], thresholds: { min: 3, rare: 6, epic: 9, unique: 12, legendary: 15 } },
    { aliases: ['無視怪物防禦率%', '無視怪物防禦%', '無視防禦率%', '無視防禦%'], thresholds: { min: 3, rare: 6, epic: 9, unique: 12, legendary: 15 } },
  ],
};

POTENTIAL_RULES.top = POTENTIAL_RULES.outfit;
POTENTIAL_RULES.bottom = POTENTIAL_RULES.outfit;

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const normalizeEquipmentKey = (item: EquipmentItem): string | null => {
  const source = `${item.item_equipment_part || ''} ${item.item_equipment_slot || ''}`.toLowerCase();

  if (source.includes('能源')) {
    return 'secondary';
  }

  for (const [key, aliases] of Object.entries(EQUIPMENT_ALIASES)) {
    if (aliases.some((alias) => source.includes(alias.toLowerCase()))) {
      return key;
    }
  }

  return null;
};

const normalizePotentialText = (text: string) => {
  const compact = normalizeWhitespace(text)
    .replace(/^[:：\-+\s]+/, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/所有屬性/g, '全屬性')
    .replace(/Boss/gi, 'BOSS')
    .replace(/\s+/g, ' ')
    .trim();

  if (compact.includes('以角色等級為準每9級')) {
    return { label: compact, value: null };
  }

  const numberMatch = compact.match(/[-+]?\d+(?:\.\d+)?/);
  const value = numberMatch ? Number(numberMatch[0]) : null;
  const label = compact
    .replace(/[-+]?\d+(?:\.\d+)?/g, '')
    .replace(/[%％]/g, '%')
    .replace(/[：:]/g, '')
    .replace(/\+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { label, value };
};

const normalizeRuleAlias = (value: string) => value
  .replace(/[%％]/g, '%')
  .replace(/所有屬性/g, '全屬性')
  .replace(/Boss/gi, 'BOSS')
  .replace(/[：:]/g, '')
  .replace(/\+/g, '')
  .replace(/\s+/g, '')
  .trim()
  .toLowerCase();

const isBoundarySafePartialMatch = (label: string, alias: string) => {
  if (!label || !alias) return false;
  if (label === alias) return true;

  const labelIndex = label.indexOf(alias);
  if (labelIndex >= 0) {
    const nextChar = label[labelIndex + alias.length] || '';
    if (!nextChar || nextChar === '%' || /[^a-z]/i.test(nextChar)) {
      return true;
    }
  }

  const aliasIndex = alias.indexOf(label);
  if (aliasIndex >= 0) {
    const nextChar = alias[aliasIndex + label.length] || '';
    if (!nextChar || nextChar === '%' || /[^a-z]/i.test(nextChar)) {
      return true;
    }
  }

  return false;
};

const findRule = (equipmentKey: string | null, label: string): PotentialRule | null => {
  const equipmentRules = equipmentKey ? POTENTIAL_RULES[equipmentKey] || [] : [];
  const sharedRules = SHARED_ACCESSORY_RULES;

  const normalizedLabel = normalizeRuleAlias(label);
  const exactEquipmentMatch = equipmentRules.find((rule) => rule.aliases.some((alias) => normalizeRuleAlias(alias) === normalizedLabel));
  if (exactEquipmentMatch) {
    return exactEquipmentMatch;
  }

  const exactSharedMatch = sharedRules.find((rule) => rule.aliases.some((alias) => normalizeRuleAlias(alias) === normalizedLabel));
  if (exactSharedMatch) {
    return exactSharedMatch;
  }

  for (const rule of equipmentRules) {
    if (rule.aliases.some((alias) => {
      const normalizedAlias = normalizeRuleAlias(alias);
      return isBoundarySafePartialMatch(normalizedLabel, normalizedAlias);
    })) {
      return rule;
    }
  }

  for (const rule of sharedRules) {
    if (rule.aliases.some((alias) => {
      const normalizedAlias = normalizeRuleAlias(alias);
      return isBoundarySafePartialMatch(normalizedLabel, normalizedAlias);
    })) {
      return rule;
    }
  }

  return null;
};

const getAdditionalWeaponRule = (label: string): PotentialRule | null => {
  const normalizedLabel = normalizeRuleAlias(label);
  const weaponAdditionalRules: PotentialRule[] = [
    { aliases: ['物理攻擊力%', '攻擊力%'], thresholds: THREE_WEAPON_PERCENT_THRESHOLDS },
    { aliases: ['魔法攻擊力%'], thresholds: THREE_WEAPON_PERCENT_THRESHOLDS },
    { aliases: ['攻擊BOSS怪物時傷害%', '攻擊BOSS怪物時傷害增加%', 'BOSS攻擊時傷害增加%', 'BOSS傷害%', 'BOSS傷害'], thresholds: { min: 3, rare: 6, epic: 9, unique: 12, legendary: 15 } },
    { aliases: ['無視防禦率%', '無視防禦%'], thresholds: { min: 3, rare: 6, epic: 9, unique: 12, legendary: 15 } },
  ];

  const exactMatch = weaponAdditionalRules.find((candidate) => candidate.aliases.some((alias) => normalizeRuleAlias(alias) === normalizedLabel));
  if (exactMatch) {
    return exactMatch;
  }

  for (const candidate of weaponAdditionalRules) {
    if (candidate.aliases.some((alias) => isBoundarySafePartialMatch(normalizedLabel, normalizeRuleAlias(alias)))) {
      return candidate;
    }
  }

  return null;
};

const normalizeGrade = (grade?: string): PotentialGrade | null => {
  const normalized = String(grade || '').toLowerCase();
  if (normalized.includes('legendary') || normalized.includes('傳說')) return 'legendary';
  if (normalized.includes('unique') || normalized.includes('罕見')) return 'unique';
  if (normalized.includes('epic') || normalized.includes('稀有')) return 'epic';
  if (normalized.includes('rare') || normalized.includes('特殊')) return 'rare';
  return null;
};

const isCritPotentialLabel = (label: string) => {
  const normalized = normalizeRuleAlias(label);
  return normalized.includes(normalizeRuleAlias('爆擊傷害%'))
    || normalized.includes(normalizeRuleAlias('爆擊攻擊'))
    || normalized.includes(normalizeRuleAlias('爆擊傷害值'));
};

const shouldBypassConservativePercentCap = (label: string) => {
  const normalized = normalizeRuleAlias(label);
  return [
    'str%',
    'dex%',
    'int%',
    'luk%',
    '物理攻擊力%',
    '攻擊力%',
    '魔法攻擊力%',
  ].some((candidate) => normalized === normalizeRuleAlias(candidate));
};

const isFlatMainStatLabel = (label: string) => {
  const normalized = normalizeRuleAlias(label);
  return ['str', 'dex', 'int', 'luk'].some((candidate) => normalized === normalizeRuleAlias(candidate));
};

const isFlatAttackLabel = (label: string) => {
  const normalized = normalizeRuleAlias(label);
  return ['物理攻擊力', '攻擊力', '魔法攻擊力'].some((candidate) => normalized === normalizeRuleAlias(candidate));
};

const inferForcedSpecialPotentialGrade = (
  label: string,
  value: number,
): PotentialGrade | null => {
  const normalized = normalizeRuleAlias(label);

  if (normalized.includes(normalizeRuleAlias('可使用')) && normalized.includes(normalizeRuleAlias('技能'))) {
    if (normalized.includes(normalizeRuleAlias('會心'))) {
      return 'legendary';
    }
    return 'rare';
  }

  if (normalized.includes(normalizeRuleAlias('以角色等級為準每9級'))) {
    return 'unique';
  }

  if (normalized.includes(normalizeRuleAlias('爆擊傷害%')) && !Number.isNaN(value) && value >= 8) {
    return 'legendary';
  }

  return null;
};

const inferForcedUserPercentGrade = (
  item: EquipmentItem,
  label: string,
  value: number,
  mode: PotentialInferenceMode,
): PotentialGrade | null => {
  if (!shouldBypassConservativePercentCap(label) || Number.isNaN(value)) {
    return null;
  }

  if (mode === 'additional') {
    const itemLevel = item.item_base_option?.base_equipment_level || item.item_level || 0;
    const thresholdOffset = itemLevel >= 160 ? 1 : 0;

    if (value >= 11 + thresholdOffset) return 'legendary';
    if (value >= 8 + thresholdOffset) return 'unique';
    if (value >= 3 + thresholdOffset) return 'epic';
    if (value >= 1) return 'rare';
    return null;
  }

  if (value >= 12) return 'legendary';
  if (value >= 9) return 'unique';
  if (value >= 4) return 'epic';
  if (value >= 2) return 'rare';
  return null;
};

const inferForcedAdditionalFlatMainStatGrade = (
  label: string,
  value: number,
  mode: PotentialInferenceMode,
): PotentialGrade | null => {
  if (mode !== 'additional' || !isFlatMainStatLabel(label) || Number.isNaN(value)) {
    return null;
  }

  if (value >= 18) return 'legendary';
  if (value >= 16) return 'unique';
  if (value >= 14) return 'epic';
  return null;
};

const inferForcedAdditionalFlatAttackGrade = (
  item: EquipmentItem,
  label: string,
  value: number,
  mode: PotentialInferenceMode,
): PotentialGrade | null => {
  if (mode !== 'additional' || !isFlatAttackLabel(label) || Number.isNaN(value)) {
    return null;
  }

  const itemLevel = item.item_base_option?.base_equipment_level || item.item_level || 0;
  const thresholdOffset = itemLevel > 0 && itemLevel <= 150 ? 1 : 0;

  if (value >= 14 - thresholdOffset) return 'legendary';
  if (value >= 13 - thresholdOffset) return 'unique';
  if (value >= 12 - thresholdOffset) return 'epic';
  if (value >= 1) return 'rare';
  return null;
};

const getEffectiveMaxGrade = (
  item: EquipmentItem,
  maxGrade: PotentialGrade,
  lineIndex: number,
  currentLabel: string,
): PotentialGrade => {
  if (lineIndex === 0) return maxGrade;

  const equipmentKey = normalizeEquipmentKey(item);
  if (equipmentKey !== 'gloves') return maxGrade;

  const firstLine = String(item.potential_option_1 || '');
  const firstLineLabel = normalizePotentialText(firstLine).label;
  if (!firstLineLabel || !isCritPotentialLabel(firstLineLabel)) return maxGrade;

  if (isCritPotentialLabel(currentLabel)) return maxGrade;

  return clampGrade('unique', maxGrade);
};

export const explainPotentialLineGrade = (
  item: EquipmentItem,
  lineText: string,
  overallGrade?: string,
  lineIndex = 0,
  mode: PotentialInferenceMode = 'main',
): PotentialInferenceDebugInfo => {
  const maxGrade = normalizeGrade(overallGrade);
  const { label, value } = normalizePotentialText(lineText);
  const forcedSpecialPotentialGrade = label ? inferForcedSpecialPotentialGrade(label, value ?? Number.NaN) : null;
  const effectiveMaxGrade = maxGrade && label ? getEffectiveMaxGrade(item, maxGrade, lineIndex, label) : maxGrade;
  const fallbackGrade = effectiveMaxGrade ? getFallbackSubLineGrade(effectiveMaxGrade) : null;
  const equipmentKey = normalizeEquipmentKey(item);
  const rule = mode === 'additional' && equipmentKey === 'weapon'
    ? (getAdditionalWeaponRule(label) || findRule(equipmentKey, label))
    : findRule(equipmentKey, label);
  const inferred = value === null || Number.isNaN(value) || !rule
    ? null
    : inferGradeFromThresholds(value, rule.thresholds, lineIndex);

  const result = !effectiveMaxGrade
    ? null
    : (forcedSpecialPotentialGrade
      ? forcedSpecialPotentialGrade
      : (!inferred
      ? (lineIndex === 0 ? effectiveMaxGrade : fallbackGrade)
      : (
        lineIndex === 0
          ? clampGrade(inferred, effectiveMaxGrade)
          : (shouldUseAdditionalSubLineCap(lineIndex, mode)
            ? getMoreConservativeGrade(clampGrade(inferred, effectiveMaxGrade), fallbackGrade || effectiveMaxGrade)
            : clampGrade(inferred, effectiveMaxGrade)
          )
      )));

  return {
    equipmentKey,
    label,
    value,
    thresholds: rule?.thresholds || null,
    inferred,
    result,
  };
};

const clampGrade = (grade: PotentialGrade, maxGrade: PotentialGrade): PotentialGrade => {
  const gradeIndex = GRADE_ORDER.indexOf(grade);
  const maxIndex = GRADE_ORDER.indexOf(maxGrade);
  return GRADE_ORDER[Math.min(gradeIndex, maxIndex)];
};

const getFallbackSubLineGrade = (overallGrade: PotentialGrade): PotentialGrade => {
  const gradeIndex = GRADE_ORDER.indexOf(overallGrade);
  if (gradeIndex <= 0) return overallGrade;
  return GRADE_ORDER[gradeIndex - 1];
};

const getMoreConservativeGrade = (grade: PotentialGrade, capGrade: PotentialGrade): PotentialGrade => {
  const gradeIndex = GRADE_ORDER.indexOf(grade);
  const capIndex = GRADE_ORDER.indexOf(capGrade);
  return GRADE_ORDER[Math.min(gradeIndex, capIndex)];
};

const shouldUseAdditionalSubLineCap = (lineIndex: number, mode: PotentialInferenceMode) => (
  mode === 'additional' && lineIndex > 0
);

const shouldUseConservativeSubLineCap = (equipmentKey: string | null) => (
  equipmentKey !== 'weapon' && equipmentKey !== 'secondary' && equipmentKey !== 'emblem'
);

const inferGradeFromThresholds = (value: number, thresholds: PotentialThreshold, lineIndex: number): PotentialGrade | null => {
  const min = thresholds.min;
  const rare = thresholds.rare;
  const epic = thresholds.epic;
  const unique = thresholds.unique;
  const legendary = thresholds.legendary;

  if (lineIndex === 0) {
    if (typeof legendary === 'number' && value >= legendary) return 'legendary';
    if (typeof unique === 'number' && value >= unique) return 'unique';
    if (typeof epic === 'number' && value >= epic) return 'epic';
    if (typeof rare === 'number' && value >= rare) return 'rare';
    return null;
  }

  if (typeof min === 'number') {
    if (typeof rare === 'number' && value >= min && value <= rare) return 'rare';
    if (typeof epic === 'number' && value > (typeof rare === 'number' ? rare : min) && value <= epic) return 'epic';
    if (typeof unique === 'number' && value > (typeof epic === 'number' ? epic : (typeof rare === 'number' ? rare : min)) && value <= unique) return 'unique';
    if (typeof legendary === 'number' && value > (typeof unique === 'number' ? unique : (typeof epic === 'number' ? epic : min))) return 'legendary';
  }

  if (typeof rare === 'number' && value <= rare) return 'rare';
  if (typeof epic === 'number' && value <= epic) return 'epic';
  if (typeof unique === 'number' && value <= unique) return 'unique';
  if (typeof legendary === 'number' && value <= legendary) return 'legendary';
  return null;
};

const shouldDebugPotentialInference = (item: EquipmentItem) => {
  if (typeof window === 'undefined') return false;
  const targetName = (window as typeof window & { __MAPLE_DEBUG_POTENTIAL_ITEM__?: string }).__MAPLE_DEBUG_POTENTIAL_ITEM__;
  return Boolean(targetName) && String(item.item_name || '').includes(String(targetName));
};

export const inferPotentialLineGrade = (
  item: EquipmentItem,
  lineText: string,
  overallGrade?: string,
  lineIndex = 0,
  mode: PotentialInferenceMode = 'main',
): PotentialGrade | null => {
  const maxGrade = normalizeGrade(overallGrade);
  const fallbackGrade = maxGrade ? getFallbackSubLineGrade(maxGrade) : null;
  if (!lineText || !maxGrade) {
    if (shouldDebugPotentialInference(item)) {
      console.debug('[potentialInference] early-return:maxGrade', {
        itemName: item.item_name,
        lineText,
        overallGrade,
        lineIndex,
        maxGrade,
      });
    }
    return lineIndex === 0 ? maxGrade : fallbackGrade;
  }

  const { label, value } = normalizePotentialText(lineText);
  const effectiveMaxGrade = label ? getEffectiveMaxGrade(item, maxGrade, lineIndex, label) : maxGrade;
  const effectiveFallbackGrade = effectiveMaxGrade ? getFallbackSubLineGrade(effectiveMaxGrade) : null;
  const forcedSpecialPotentialGrade = label ? inferForcedSpecialPotentialGrade(label, value ?? Number.NaN) : null;
  if (forcedSpecialPotentialGrade) {
    return forcedSpecialPotentialGrade;
  }

  if (!label || value === null || Number.isNaN(value)) {
    if (shouldDebugPotentialInference(item)) {
      console.debug('[potentialInference] invalid-normalized-text', {
        itemName: item.item_name,
        lineText,
        overallGrade,
        lineIndex,
        label,
        value,
      });
    }
    return lineIndex === 0 ? maxGrade : effectiveFallbackGrade;
  }

  const forcedPercentGrade = inferForcedUserPercentGrade(item, label, value, mode);
  if (forcedPercentGrade) {
    return mode === 'additional'
      ? forcedPercentGrade
      : clampGrade(forcedPercentGrade, effectiveMaxGrade);
  }

  const forcedAdditionalFlatMainStatGrade = inferForcedAdditionalFlatMainStatGrade(label, value, mode);
  if (forcedAdditionalFlatMainStatGrade) {
    return forcedAdditionalFlatMainStatGrade;
  }

  const forcedAdditionalFlatAttackGrade = inferForcedAdditionalFlatAttackGrade(item, label, value, mode);
  if (forcedAdditionalFlatAttackGrade) {
    return forcedAdditionalFlatAttackGrade;
  }

  const equipmentKey = normalizeEquipmentKey(item);
  const rule = mode === 'additional' && equipmentKey === 'weapon'
    ? (getAdditionalWeaponRule(label) || findRule(equipmentKey, label))
    : findRule(equipmentKey, label);
  if (!rule) {
    if (shouldDebugPotentialInference(item)) {
      console.debug('[potentialInference] rule-not-found', {
        itemName: item.item_name,
        equipmentPart: item.item_equipment_part,
        equipmentSlot: item.item_equipment_slot,
        equipmentKey,
        lineText,
        lineIndex,
        label,
        value,
      });
    }
    return lineIndex === 0 ? maxGrade : effectiveFallbackGrade;
  }

  const inferred = inferGradeFromThresholds(value, rule.thresholds, lineIndex);
  if (!inferred) {
    if (shouldDebugPotentialInference(item)) {
      console.debug('[potentialInference] threshold-not-matched', {
        itemName: item.item_name,
        equipmentKey,
        lineText,
        lineIndex,
        label,
        value,
        thresholds: rule.thresholds,
      });
    }
    return lineIndex === 0 ? maxGrade : effectiveFallbackGrade;
  }

  if (shouldDebugPotentialInference(item)) {
    console.debug('[potentialInference] matched', {
      itemName: item.item_name,
      equipmentPart: item.item_equipment_part,
      equipmentSlot: item.item_equipment_slot,
      equipmentKey,
      lineText,
      lineIndex,
      label,
      value,
      inferred,
      maxGrade,
      effectiveMaxGrade,
      result: lineIndex === 0
        ? clampGrade(inferred, effectiveMaxGrade)
        : (shouldUseAdditionalSubLineCap(lineIndex, mode)
          ? getMoreConservativeGrade(clampGrade(inferred, effectiveMaxGrade), effectiveFallbackGrade || effectiveMaxGrade)
          : (
          shouldUseConservativeSubLineCap(equipmentKey) && !shouldBypassConservativePercentCap(label)
            ? getMoreConservativeGrade(clampGrade(inferred, effectiveMaxGrade), effectiveFallbackGrade || effectiveMaxGrade)
            : clampGrade(inferred, effectiveMaxGrade)
        )),
    });
  }

  if (lineIndex === 0) {
    return clampGrade(inferred, effectiveMaxGrade);
  }

  return shouldUseAdditionalSubLineCap(lineIndex, mode)
    ? getMoreConservativeGrade(clampGrade(inferred, effectiveMaxGrade), effectiveFallbackGrade || effectiveMaxGrade)
    : shouldUseConservativeSubLineCap(equipmentKey) && !shouldBypassConservativePercentCap(label)
    ? getMoreConservativeGrade(clampGrade(inferred, effectiveMaxGrade), effectiveFallbackGrade || effectiveMaxGrade)
    : clampGrade(inferred, effectiveMaxGrade);
};