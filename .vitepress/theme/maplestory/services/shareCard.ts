import type { DashboardData, FinalStat } from '../types';
import { calculateHexaProgress } from './hexaProgress';

export const CHARACTER_CARD_WIDTH = 1200;
export const CHARACTER_CARD_HEIGHT = 900;
export const CHARACTER_CARD_EXPORT_SCALE = 1.2;
export const CHARACTER_CARD_BACKGROUND = '/maplestory/share-card/night-storybook.png';
export const CHARACTER_CARD_BRAND_LOGO = '/favicon.png?v=20260816-face-cutout';

const parseNumber = (value: unknown): number | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatMapleBigNumber = (value: string | number): string => {
  const parsed = parseNumber(value);
  if (parsed == null) return '-';
  const num = Math.trunc(parsed);
  if (num > 100000000) {
    const yi = Math.floor(num / 100000000);
    const wan = Math.floor((num % 100000000) / 10000);
    const rest = num % 10000;
    return `${yi}億 ${wan}萬 ${rest}`;
  }
  return num.toLocaleString();
};

const STAT_ALIASES = {
  combatPower: ['戰鬥力', 'Combat Power'],
  finalDamage: ['最終傷害', 'Final Damage'],
  bossDamage: ['BOSS怪物傷害', 'Boss Damage'],
  ignoreDefense: ['無視防禦率', 'Ignore Defense Rate'],
  criticalDamage: ['爆擊傷害', 'Critical Damage'],
} as const;

const findStat = (stats: FinalStat[] | undefined, names: readonly string[]): number | null => {
  const raw = stats?.find((stat) => names.some((name) => name === stat.stat_name))?.stat_value;
  const value = parseNumber(raw);
  return value != null && value > 0 ? value : null;
};

export interface CharacterShareCardViewModel {
  characterName: string;
  worldName: string;
  characterClass: string;
  level: number | null;
  combatPower: number | null;
  combatPowerLabel: string | null;
  combatStats: Array<{ label: string; value: string }>;
  hexaProgress: number | null;
  dataDate: string | null;
}

export const createCharacterShareCardViewModel = (data: DashboardData): CharacterShareCardViewModel => {
  const stats = data.stat?.final_stat;
  const combatPower = findStat(stats, STAT_ALIASES.combatPower);
  const secondaryStats = [
    { label: '最終傷害', value: findStat(stats, STAT_ALIASES.finalDamage) },
    { label: 'BOSS 傷害', value: findStat(stats, STAT_ALIASES.bossDamage) },
    { label: '無視防禦', value: findStat(stats, STAT_ALIASES.ignoreDefense) },
    { label: '爆擊傷害', value: findStat(stats, STAT_ALIASES.criticalDamage) },
  ];
  const level = parseNumber(data.basic?.character_level);
  const hasHexaCores = Boolean(data.hexaMatrix?.character_hexa_core_equipment?.length);
  const hexaProgress = hasHexaCores
    ? calculateHexaProgress(data.hexaMatrix, { JANUS: true, HECATE: true }).percent
    : null;

  return {
    characterName: data.basic?.character_name || '未知角色',
    worldName: data.basic?.world_name || '',
    characterClass: data.basic?.character_class || '',
    level: level != null && level > 0 ? Math.trunc(level) : null,
    combatPower,
    combatPowerLabel: combatPower == null ? null : formatMapleBigNumber(combatPower),
    combatStats: secondaryStats
      .filter((item): item is { label: string; value: number } => item.value != null)
      .map((item) => ({ label: item.label, value: `${item.value.toLocaleString('zh-TW')}%` })),
    hexaProgress: hexaProgress != null && Number.isFinite(hexaProgress)
      ? Math.max(0, Math.min(100, hexaProgress))
      : null,
    dataDate: typeof data.lastUpdated === 'string' && data.lastUpdated.trim()
      ? data.lastUpdated.trim().slice(0, 10)
      : null,
  };
};

export const buildCharacterShareUrl = (characterName: string): string => {
  if (typeof window === 'undefined') {
    return `https://holybear.tw/maplestory#${characterName}`;
  }
  return `${window.location.origin}${window.location.pathname}#${characterName}`;
};

export const sanitizeCharacterCardFilename = (characterName: string): string => {
  const safeName = characterName
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim();
  return `holybear-${safeName || 'character'}-card.png`;
};
