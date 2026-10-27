import type { GrowthHistoryEvent } from './growthTypes';

const positiveInteger = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export const formatDojangTime = (value: unknown) => {
  const seconds = positiveInteger(value);
  if (seconds === null) return null;
  return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
};

export const formatDojangRecord = (floorValue: unknown, timeValue: unknown) => {
  const floor = positiveInteger(floorValue);
  const time = formatDojangTime(timeValue);
  if (floor === null || time === null) return null;
  return `${floor}樓 ${time}`;
};

export const formatGrowthEventValue = (
  event: GrowthHistoryEvent,
  side: 'before' | 'after',
) => {
  const value = side === 'before' ? event.from : event.to;
  if (!value) return '無';
  if (event.type === 'liberation') {
    return ({
      '0': '未完成',
      '1': '創世',
      '2': '命運一階',
      false: '未完成',
      true: '已完成',
    } as Record<string, string>)[value] || value;
  }
  if (event.type !== 'dojang') return value;

  const details = event.dojang;
  if (details) {
    const record = side === 'before'
      ? formatDojangRecord(details.beforeFloor, details.beforeTime)
      : formatDojangRecord(details.afterFloor, details.afterTime);
    if (record) return record;
  }

  const legacySeconds = /^(\d+)秒$/.exec(value);
  return legacySeconds ? formatDojangTime(legacySeconds[1]) || value : value;
};

export type WeaponLiberationStage =
  | 'unliberated'
  | 'genesis'
  | 'destiny_phase_1'
  | 'destiny_phase_2'
  | 'unknown';

export interface WeaponLiberationItemInput {
  item_equipment_part?: string | null;
  item_equipment_slot?: string | null;
  item_name?: string | null;
  item_level?: number | string | null;
  starforce?: string | number | null;
  scroll_upgrade?: string | number | null;
  scroll_upgradable_count?: string | number | null;
  scroll_upgradeable_count?: string | number | null;
  item_base_option?: {
    base_equipment_level?: number | string | null;
  } | null;
  item_etc_option?: {
    attack_power?: string | number | null;
    magic_power?: string | number | null;
  } | null;
}

export interface CharacterBasicLiberationInput {
  liberation_quest_clear?: string | null;
  liberation_quest_clear_flag?: string | null;
}

export interface CharacterEquipmentLiberationInput {
  item_equipment?: WeaponLiberationItemInput[] | null;
  item_equipment_preset_1?: WeaponLiberationItemInput[] | null;
  item_equipment_preset_2?: WeaponLiberationItemInput[] | null;
  item_equipment_preset_3?: WeaponLiberationItemInput[] | null;
}

const isWeaponEquipmentSlot = (
  item: WeaponLiberationItemInput | null | undefined,
  slotType?: string,
) => {
  if (!item) return false;
  const slot = String(item.item_equipment_slot || '').trim();
  const part = String(item.item_equipment_part || '').trim();
  return slotType === 'Weapon' || slot === '武器' || part === '武器';
};

const resolveWeaponBaseLevel = (item: WeaponLiberationItemInput) => {
  const raw = item.item_base_option?.base_equipment_level ?? item.item_level;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/**
 * 透過 `/character/item-equipment` 欄位辨識命運武器第二階段：
 * - 必須是武器欄位且名稱以「命運」開頭（若提供裝備等級則須為 Lv.250）
 * - 卷軸強化次數 `scroll_upgrade === 9`，且剩餘可強化次數為 `0`
 * - 卷軸加成 `item_etc_option` 的攻擊力或魔法攻擊力為 `81`（9 次 15% 咒文強化，每次 +9）
 * - 不要求 24／25 星：剛完成命運二階或復原後的 22 星命運二階武器同樣可被正確辨識
 */
export const isDestinyWeaponPhase2 = (
  item: WeaponLiberationItemInput | null | undefined,
  slotType?: string,
): boolean => {
  if (!item || !isWeaponEquipmentSlot(item, slotType)) return false;
  const itemName = String(item.item_name || '').trim();
  if (!itemName.startsWith('命運')) return false;

  const baseLevel = resolveWeaponBaseLevel(item);
  if (baseLevel !== null && baseLevel !== 250) return false;

  const scrollUpgrade = Number(item.scroll_upgrade);
  if (scrollUpgrade !== 9) return false;

  const rawUpgradable = item.scroll_upgradable_count ?? item.scroll_upgradeable_count;
  if (rawUpgradable !== undefined && rawUpgradable !== null && String(rawUpgradable).trim() !== '') {
    if (Number(rawUpgradable) !== 0) return false;
  }

  const etcAttack = Number(item.item_etc_option?.attack_power ?? 0);
  const etcMagic = Number(item.item_etc_option?.magic_power ?? 0);
  return etcAttack === 81 || etcMagic === 81;
};

export const detectWeaponItemLiberationStage = (
  item: WeaponLiberationItemInput | null | undefined,
  slotType?: string,
): 'genesis' | 'destiny_phase_1' | 'destiny_phase_2' | null => {
  if (!item || !isWeaponEquipmentSlot(item, slotType)) return null;
  const itemName = String(item.item_name || '').trim();
  if (!itemName || itemName.includes('創世的胸章')) return null;

  if (isDestinyWeaponPhase2(item, slotType)) {
    return 'destiny_phase_2';
  }

  const baseLevel = resolveWeaponBaseLevel(item);
  if (itemName.startsWith('命運')) {
    if (baseLevel !== null && baseLevel !== 250) return null;
    return 'destiny_phase_1';
  }

  if (itemName.startsWith('創世')) {
    if (baseLevel !== null && baseLevel !== 200) return null;
    return 'genesis';
  }

  return null;
};

const STAGE_PRIORITY: Record<'genesis' | 'destiny_phase_1' | 'destiny_phase_2', number> = {
  genesis: 1,
  destiny_phase_1: 2,
  destiny_phase_2: 3,
};

export interface CharacterLiberationDetails {
  /** NEXON `/character/basic` 原始回傳的 `liberation_quest_clear` 狀態值（保留原始值，絕不覆蓋） */
  rawLiberationStatus: string | null;
  /** 僅由 `/character/item-equipment` 裝備資料獨立判斷出的武器解放階段 */
  equipmentStage: 'genesis' | 'destiny_phase_1' | 'destiny_phase_2' | null;
  /** 綜合後的解放階段（以裝備階段補充官方狀態，但不將未證實的 `3` 直接當作命運二階代碼） */
  stage: WeaponLiberationStage;
  /** 供前端顯示的解放階段文字 */
  label: string;
}

export const resolveEquipmentWeaponLiberationStage = (
  equipment?: CharacterEquipmentLiberationInput | null,
): 'genesis' | 'destiny_phase_1' | 'destiny_phase_2' | null => {
  let highestEquipmentStage: 'genesis' | 'destiny_phase_1' | 'destiny_phase_2' | null = null;
  const equipmentLists = [
    equipment?.item_equipment,
    equipment?.item_equipment_preset_1,
    equipment?.item_equipment_preset_2,
    equipment?.item_equipment_preset_3,
  ];
  for (const list of equipmentLists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const detected = detectWeaponItemLiberationStage(item);
      if (
        detected &&
        (!highestEquipmentStage || STAGE_PRIORITY[detected] > STAGE_PRIORITY[highestEquipmentStage])
      ) {
        highestEquipmentStage = detected;
      }
    }
  }
  return highestEquipmentStage;
};

export const resolveCharacterLiberationStage = (
  basic?: CharacterBasicLiberationInput | null,
  equipment?: CharacterEquipmentLiberationInput | null,
): WeaponLiberationStage => {
  const highestEquipmentStage = resolveEquipmentWeaponLiberationStage(equipment);
  const rawClear = String(
    basic?.liberation_quest_clear ?? basic?.liberation_quest_clear_flag ?? '',
  ).trim();

  // 命運二階僅依據裝備資料獨立判定，不把尚未由官方文件證實語意的 `liberation_quest_clear = "3"` 直接當成二階代碼
  if (highestEquipmentStage === 'destiny_phase_2') {
    return 'destiny_phase_2';
  }
  if (highestEquipmentStage === 'destiny_phase_1' || rawClear === '2') {
    return 'destiny_phase_1';
  }
  if (highestEquipmentStage === 'genesis' || rawClear === '1' || rawClear === 'true') {
    return 'genesis';
  }
  if (rawClear === '0' || rawClear === 'false') {
    return 'unliberated';
  }
  return 'unknown';
};

export const formatWeaponLiberationStage = (
  stage: WeaponLiberationStage | null | undefined,
): string | null => {
  switch (stage) {
    case 'unliberated':
      return '未解放';
    case 'genesis':
      return '創世解放';
    case 'destiny_phase_1':
      return '命運一階';
    case 'destiny_phase_2':
      return '命運二階';
    default:
      return null;
  }
};

export const formatCharacterLiberationStage = (
  basic?: CharacterBasicLiberationInput | null,
  equipment?: CharacterEquipmentLiberationInput | null,
): string => {
  const stage = resolveCharacterLiberationStage(basic, equipment);
  const formatted = formatWeaponLiberationStage(stage);
  if (formatted) return formatted;
  const rawClear = String(
    basic?.liberation_quest_clear ?? basic?.liberation_quest_clear_flag ?? '',
  ).trim();
  return rawClear || '未解放';
};

export const normalizeCharacterBasic = <T extends CharacterBasicLiberationInput>(
  basic: T,
): T & { liberation_quest_clear?: string; liberation_quest_clear_flag?: string } => {
  if (!basic || typeof basic !== 'object') return basic;
  const rawLiberation = basic.liberation_quest_clear;
  const rawFlag = basic.liberation_quest_clear_flag;
  const normalizedClear = rawLiberation != null
    ? String(rawLiberation)
    : rawFlag != null
      ? String(rawFlag)
      : undefined;
  return {
    ...basic,
    ...(normalizedClear !== undefined
      ? {
          liberation_quest_clear: normalizedClear,
          liberation_quest_clear_flag: rawFlag ?? normalizedClear,
        }
      : {}),
  };
};

export const resolveCharacterLiberationDetails = (
  basic?: CharacterBasicLiberationInput | null,
  equipment?: CharacterEquipmentLiberationInput | null,
): CharacterLiberationDetails => {
  const rawClear = String(
    basic?.liberation_quest_clear ?? basic?.liberation_quest_clear_flag ?? '',
  ).trim();
  const rawLiberationStatus = rawClear || null;
  const equipmentStage = resolveEquipmentWeaponLiberationStage(equipment);
  const stage = resolveCharacterLiberationStage(basic, equipment);
  const label = formatCharacterLiberationStage(basic, equipment);
  return {
    rawLiberationStatus,
    equipmentStage,
    stage,
    label,
  };
};
