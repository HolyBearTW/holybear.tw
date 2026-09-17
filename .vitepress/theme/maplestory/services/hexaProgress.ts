import type { CharacterHexaMatrix } from '../types';

const HEXA_SETTINGS = {
  SKILL: {
    key: 'SKILL', quantity: 2, keywords: ['skill', '技能'],
    costs: [0, 30, 35, 40, 45, 50, 55, 60, 65, 200, 80, 90, 100, 110, 120, 130, 140, 150, 160, 350, 170, 180, 190, 200, 210, 220, 230, 240, 250, 500],
    erdaCosts: [0, 1, 1, 1, 2, 2, 2, 3, 3, 10, 3, 3, 4, 4, 4, 4, 4, 4, 5, 15, 5, 5, 5, 5, 5, 6, 6, 6, 7, 20],
  },
  MASTERY: {
    key: 'MASTERY', quantity: 4, keywords: ['mastery', '精通'],
    costs: [50, 15, 18, 20, 23, 25, 28, 30, 33, 100, 40, 45, 50, 55, 60, 65, 70, 75, 80, 175, 85, 90, 95, 100, 105, 110, 115, 120, 125, 250],
    erdaCosts: [3, 1, 1, 1, 1, 1, 1, 2, 2, 5, 2, 2, 2, 2, 2, 2, 2, 2, 3, 8, 3, 3, 3, 3, 3, 3, 3, 3, 4, 10],
  },
  ENHANCEMENT: {
    key: 'ENHANCEMENT', quantity: 4, keywords: ['enhancement', '強化'],
    costs: [75, 23, 27, 30, 34, 38, 42, 45, 49, 150, 60, 68, 75, 83, 90, 98, 105, 113, 120, 263, 128, 135, 143, 150, 158, 165, 173, 180, 188, 375],
    erdaCosts: [4, 1, 1, 1, 2, 2, 2, 3, 3, 8, 3, 3, 3, 3, 3, 3, 3, 3, 4, 12, 4, 4, 4, 4, 4, 5, 5, 5, 6, 15],
  },
  COMMON: {
    key: 'COMMON', quantity: 1, keywords: ['common', '共用'],
    costs: [125, 38, 44, 50, 57, 63, 69, 75, 82, 300, 110, 124, 138, 152, 165, 179, 193, 207, 220, 525, 234, 248, 262, 275, 289, 303, 317, 330, 344, 750],
    erdaCosts: [7, 2, 2, 2, 3, 3, 3, 5, 5, 14, 5, 5, 6, 6, 6, 6, 6, 6, 7, 17, 7, 7, 7, 7, 7, 9, 9, 9, 10, 20],
  },
  COMMON_3: {
    key: 'COMMON_3', quantity: 1, keywords: [],
    costs: [90, 25, 30, 35, 40, 45, 50, 55, 60, 180, 73, 81, 90, 98, 107, 115, 124, 132, 141, 315, 151, 160, 170, 179, 189, 198, 208, 217, 227, 450],
    erdaCosts: [4, 1, 1, 1, 2, 2, 2, 3, 3, 9, 3, 3, 3, 3, 4, 4, 4, 4, 4, 14, 4, 5, 5, 5, 5, 5, 5, 5, 6, 18],
  },
} as const;

const HEXA_COMMON_SKILLS = [
  { key: 'JANUS', matcher: /雅努斯|janus/ },
  { key: 'HECATE', matcher: /赫卡忒|hecate/ },
] as const;

const getHexaCommonSkillKey = (name: string) => {
  const normalized = (name || '').toLowerCase();
  return HEXA_COMMON_SKILLS.find((skill) => skill.matcher.test(normalized))?.key ?? null;
};

export interface HexaProgress {
  current: number;
  total: number;
  percent: number;
  currentErda: number;
  remainingFragments: number;
  remainingErda: number;
  hasJanus: boolean;
  hasHecate: boolean;
}

export const calculateHexaProgress = (
  hexaMatrix: CharacterHexaMatrix | undefined,
  commonSkillFlags: Record<string, boolean>,
): HexaProgress => {
  if (!hexaMatrix?.character_hexa_core_equipment) {
    return { current: 0, total: 1, percent: 0, currentErda: 0, remainingFragments: 0, remainingErda: 0, hasJanus: false, hasHecate: false };
  }

  let totalFragmentsUsed = 0;
  let totalErdaUsed = 0;
  let grandTotalFragments = 0;
  let grandTotalErda = 0;
  let hasJanus = false;
  let hasHecate = false;
  const enabledCommonCount = Object.values(commonSkillFlags).filter(Boolean).length;

  Object.values(HEXA_SETTINGS).forEach((setting) => {
    if (setting.key === 'COMMON') {
      if (enabledCommonCount === 0) return;
      grandTotalFragments += setting.costs.reduce((a, b) => a + b, 0) * enabledCommonCount;
      grandTotalErda += setting.erdaCosts.reduce((a, b) => a + b, 0) * enabledCommonCount;
      return;
    }
    grandTotalFragments += setting.costs.reduce((a, b) => a + b, 0) * setting.quantity;
    grandTotalErda += setting.erdaCosts.reduce((a, b) => a + b, 0) * setting.quantity;
  });

  hexaMatrix.character_hexa_core_equipment.forEach((core) => {
    const level = Number.parseInt(String(core.hexa_core_level), 10);
    const type = (core.hexa_core_type || '').toLowerCase();
    const commonSkillKey = getHexaCommonSkillKey(core.hexa_core_name || '');
    if (commonSkillKey === 'JANUS') hasJanus = true;
    if (commonSkillKey === 'HECATE') hasHecate = true;

    let targetSetting: (typeof HEXA_SETTINGS)[keyof typeof HEXA_SETTINGS] | null = null;
    if (HEXA_SETTINGS.SKILL.keywords.some((keyword) => type.includes(keyword))) targetSetting = HEXA_SETTINGS.SKILL;
    else if (HEXA_SETTINGS.MASTERY.keywords.some((keyword) => type.includes(keyword))) targetSetting = HEXA_SETTINGS.MASTERY;
    else if (HEXA_SETTINGS.ENHANCEMENT.keywords.some((keyword) => type.includes(keyword))) targetSetting = HEXA_SETTINGS.ENHANCEMENT;
    else if (HEXA_SETTINGS.COMMON.keywords.some((keyword) => type.includes(keyword))) {
      targetSetting = commonSkillKey ? HEXA_SETTINGS.COMMON : HEXA_SETTINGS.COMMON_3;
    }

    const shouldInclude = targetSetting && (
      targetSetting.key !== 'COMMON'
      || (commonSkillKey && commonSkillFlags[commonSkillKey])
    );
    if (!targetSetting || !shouldInclude || !Number.isFinite(level)) return;

    for (let index = 0; index < level; index += 1) {
      totalFragmentsUsed += targetSetting.costs[index] || 0;
      totalErdaUsed += targetSetting.erdaCosts[index] || 0;
    }
  });

  return {
    current: totalFragmentsUsed,
    total: grandTotalFragments,
    percent: grandTotalFragments === 0 ? 0 : (totalFragmentsUsed / grandTotalFragments) * 100,
    currentErda: totalErdaUsed,
    remainingFragments: grandTotalFragments - totalFragmentsUsed,
    remainingErda: grandTotalErda - totalErdaUsed,
    hasJanus,
    hasHecate,
  };
};
