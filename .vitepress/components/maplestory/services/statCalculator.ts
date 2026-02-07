import { DashboardData, EquipmentItem, ItemOption, CharacterHexaMatrixStat } from '../types';

interface BreakdownItem {
  label: string;
  value: string;
}

interface BreakdownSection {
  title?: string;
  items: BreakdownItem[];
  summary?: string; 
}

export interface StatBreakdown {
  sections: BreakdownSection[];
}

const LINK_SKILL_DATA: Record<string, (lv: number) => Record<string, number>> = {
  '狂暴鬥氣': (lv) => ({ '傷害': lv * 5 }),
  '惡魔之怒': (lv) => ({ 'BOSS 傷害': lv === 1 ? 10 : 15 }),
  '滲透': (lv) => ({ '無視防禦率': lv === 1 ? 10 : 15 }),
  '判斷': (lv) => ({ '爆擊傷害': lv * 2 }),
  '紫扇傳授': (lv) => ({ '傷害': lv * 5 }),
  '氣魄': (lv) => ({ '全屬性': lv === 1 ? 15 : 25, '攻擊力': lv === 1 ? 10 : 15, '魔法攻擊力': lv === 1 ? 10 : 15 }),
  '精靈集中': (lv) => ({ 'BOSS 傷害': lv === 1 ? 4 : 7, '爆擊率': lv === 1 ? 4 : 7, '最大HP': lv === 1 ? 3 : 4, '最大MP': lv === 1 ? 3 : 4 }),
  '合成邏輯': (lv) => ({ '全屬性': lv === 1 ? 5 : 10 }),
  '致命本能': (lv) => ({ '爆擊率': lv === 1 ? 10 : 15 }),
  '精靈的祝福': (lv) => ({ '獲得經驗值': lv === 1 ? 10 : 15 }),
  '大自然夥伴': (lv) => ({ '傷害': lv === 1 ? 3 : 5 }),
  '自信心': (lv) => ({ '無視防禦率': lv === 1 ? 5 : 10 }),
  '鋼鐵意志': (lv) => ({ '最大HP': lv === 1 ? 5 : 10 }),
  '光之守護': (lv) => ({ '攻擊力': lv === 1 ? 10 : 15, '魔法攻擊力': lv === 1 ? 10 : 15 }),
  '海盜的祝福': (lv) => ({ '全屬性': lv === 6 ? 70 : lv * 10, '最大HP': lv === 6 ? 15 : lv * 2, '最大MP': lv === 6 ? 15 : lv * 2 }),
  '西格諾斯祝福': (lv) => ({ '攻擊力': lv === 10 ? 25 : lv * 2, '魔法攻擊力': lv === 10 ? 25 : lv * 2, '狀態異常抗性': lv === 10 ? 15 : lv }),
};

const CONDITIONAL_SKILLS = [
    '靈魂契約', '實戰的知識', '小偷的狡詐', '集中狂攻', 
    '戰鬥的流動', '無我', '貴族', '事前準備', '天賦', 
    '不屈的信念', '自由精神', '連續擊殺優勢', '輪之堅持', '光之守護',
    '蒼刃傳授', '紫扇傳授'
];

const parseValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val);
  // 移除所有非數字字符 (但保留小數點，如果有)
  const match = str.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
};

// HEXA 數值查表 (簡化版，精確值需參考 Wiki)
const getHexaLookup = (type: 'MAIN' | 'ATT' | 'BOSS' | 'IED' | 'DMG' | 'CRIT_DMG', level: number): number => {
    if (level === 0) return 0;
    
    // Main Stat: Lv1=450, Lv10=1350, Lv20=2350
    if (type === 'MAIN') {
        if (level >= 20) return 2350;
        if (level >= 10) return 1350 + (level - 10) * 100;
        return 450 + (level - 1) * 100;
    }
    // Attack: Lv1=15, Lv10=45, Lv20=79 (約略)
    if (type === 'ATT') {
        return 15 + (level - 1) * 3.3; 
    }
    // Boss Dmg: Lv1=1%, Lv10=10%, Lv20=20%
    if (type === 'BOSS') return level;
    // IED: Lv1=1%, Lv10=10%, Lv20=20%
    if (type === 'IED') return level;
    // Dmg: Lv1=0.75%...
    if (type === 'DMG') return level * 0.75;
    // Crit Dmg: Lv1=0.35%...
    if (type === 'CRIT_DMG') return level * 0.35;

    return 0;
};

// 計算符文 (Symbol) 給予的屬性
// API 實際返回結構與 Interface 一致，通常是 symbol_str 等
const sumSymbols = (symbols: any[], statKey: string): number => {
    if (!symbols || symbols.length === 0) return 0;
    let sum = 0;
    const keyLower = `symbol_${statKey.toLowerCase()}`;
    
    symbols.forEach(s => {
        // 確保 key 存在且有值
        if (s[keyLower] !== undefined) {
             sum += parseValue(s[keyLower]);
        }
    });
    return sum;
};

const getKeywords = (statKey: string): string[] => {
    const map: Record<string, string[]> = {
        'STR': ['STR', '力量'],
        'DEX': ['DEX', '敏捷'],
        'INT': ['INT', '智力'],
        'LUK': ['LUK', '幸運'],
        'HP': ['MaxHP', 'HP'],
        'MP': ['MaxMP', 'MP', '魔力'],
        '攻擊力': ['攻擊力', 'Attack Power', 'ATT'],
        '魔法攻擊力': ['魔法攻擊力', 'Magic Power', 'Magic ATT'],
        // 增強關鍵字匹配，包含長字串 (因為 Regex 匹配是貪婪或順序匹配)
        'BOSS怪物傷害': ['攻擊Boss怪物時傷害', '攻擊BOSS怪物時傷害', 'BOSS', 'Boss', '首領'],
        '無視防禦率': ['無視怪物防禦率', '無視', 'Ignore'],
        '爆擊傷害': ['爆擊傷害', 'Critical Damage'],
        '傷害': ['傷害', 'Damage']
    };
    return map[statKey] || [statKey];
};

/**
 * 通用 Regex 構建器
 * 解決: 攻擊力誤判魔法攻擊力、傷害誤判BOSS傷害
 */
const createStatRegex = (keywords: string[], isPercent: boolean): RegExp => {
    const keywordPattern = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    if (isPercent) {
        return new RegExp(`(${keywordPattern})\\s*:?\\s*\\+?\\s*(\\d+(\\.\\d+)?)\\s*%`, 'i');
    } else {
        return new RegExp(`(${keywordPattern})\\s*:?\\s*\\+?\\s*(\\d+(\\.\\d+)?)`, 'i');
    }
};

/**
 * 通用潛能加總 (支援中文/英文關鍵字)
 */
const sumPotentialCustom = (
  items: EquipmentItem[], 
  statKey: string, 
  includeAllStat: boolean = false
): { flat: number, percent: number } => {
  let flat = 0;
  let percent = 0;
  
  const keywords = getKeywords(statKey);
  const regex = createStatRegex(keywords, false);
  const allStatRegex = /(所有屬性|全屬性|All Stat|All Stats)\s*:?\s*\+?\s*(\d+)\s*%/i;

  items.forEach(item => {
    const opts = [
      item.potential_option_1, item.potential_option_2, item.potential_option_3,
      item.additional_potential_option_1, item.additional_potential_option_2, item.additional_potential_option_3
    ];

    opts.forEach(opt => {
      if (!opt) return;
      let matched = false;
      
      const match = opt.match(regex);
      if (match) {
        const val = parseFloat(match[2]);
        
        const isMagicOpt = opt.includes('魔法') || opt.toLowerCase().includes('magic');
        const isTargetMagic = keywords.some(k => k.includes('魔法') || k.toLowerCase().includes('magic'));
        
        if (isMagicOpt && !isTargetMagic) {
             // Skip
        } else {
             if (opt.includes('%')) percent += val;
             else flat += val;
             matched = true;
        }
      }

      if (!matched && includeAllStat) {
          const asMatch = opt.match(allStatRegex);
          if (asMatch) {
              percent += parseFloat(asMatch[2]);
          }
      }
    });
  });

  return { flat, percent };
};

const sumHyperStat = (hyperStat: any, statKey: string): number => {
    if (!hyperStat?.hyper_stat_preset_1) return 0;
    const keywords = getKeywords(statKey);
    let sum = 0;
    
    // 使用當前 preset
    const currentPresetNo = hyperStat.use_preset_no || '1';
    const currentPreset = hyperStat[`hyper_stat_preset_${currentPresetNo}`] || hyperStat.hyper_stat_preset_1;
    
    if (Array.isArray(currentPreset)) {
        currentPreset.forEach((stat: any) => {
            if (stat.stat_increase) {
                // stat_increase 範例: "力量 +30" 或 "STR +30"
                for (const k of keywords) {
                    if (stat.stat_increase.includes(k)) {
                         const match = stat.stat_increase.match(/(\d+(\.\d+)?)/); 
                         if (match) sum += parseFloat(match[1]);
                         break;
                    }
                }
            }
        });
    }
    return sum;
};

const sumAbility = (ability: any, statKey: string): number => {
    if (!ability?.ability_info) return 0;
    const keywords = getKeywords(statKey);
    let sum = 0;
    
    // API 通常返回 array, 遍歷檢查
    ability.ability_info.forEach((a: any) => {
        if (a.ability_value) {
            const valLower = a.ability_value.toLowerCase();
            for (const k of keywords) {
                if (valLower.includes(k.toLowerCase())) {
                    const match = a.ability_value.match(/(\d+(\.\d+)?)/);
                    if (match) sum += parseFloat(match[1]);
                    break;
                }
            }
        }
    });
    return sum;
};

const getUnionStatValue = (unionRaider: any, statKey: string): number => {
    if (!unionRaider) return 0;
    const keywords = getKeywords(statKey);
    let sum = 0;

    // 1. 攻擊隊員效果 (Raider Stat)
    // 2. 佔領效果 (Occupied Stat)
    const allLines = [
        ...(unionRaider.union_raider_stat || []),
        ...(unionRaider.union_occupied_stat || [])
    ];

    allLines.forEach((line: string) => {
        for (const k of keywords) {
             if (line.includes(k)) {
                 if (statKey === '攻擊力' && (line.includes('魔法') || line.includes('Magic'))) continue;
                 if (statKey === '傷害' && (line.includes('BOSS') || line.includes('Boss'))) continue;
                 
                 const match = line.match(/(\d+(\.\d+)?)/);
                 if (match) {
                     sum += parseFloat(match[1]);
                     break; 
                 }
             }
        }
    });
    return sum;
};

const sumLinkSkills = (linkSkill: any, statKey: string): number => {
    if (!linkSkill) return 0;
    
    // 取得正確的 Preset 技能列表
    const activePresetNo = linkSkill.preset_no ? parseInt(linkSkill.preset_no) : 1;
    const skills = linkSkill[`character_link_skill_preset_${activePresetNo}`] || linkSkill.character_link_skill || [];
    
    // 合併: 連結技能預設 + 擁有技能 (自帶傳授)
    const skillsToCalculate = [...skills];
    if (linkSkill.character_owned_link_skill) {
        skillsToCalculate.push(linkSkill.character_owned_link_skill);
    }
    
    let sum = 0;
    const mainStats = ['STR', 'DEX', 'INT', 'LUK'];
    const isMainStat = mainStats.includes(statKey);

    skillsToCalculate.forEach((skill: any) => {
        // 排除條件技能與連殺優勢
        if (CONDITIONAL_SKILLS.includes(skill.skill_name)) return;
        if (skill.skill_name === '連續擊殺優勢' || skill.skill_name === '連續擊殺優勢（狂狼勇士）') return;

        let matched = false;
        
        // 策略 1: Regex 解析 (為了與 CharacterDetails 邏輯一致)
        const desc = skill.skill_effect || skill.skill_description || "";
        if (desc) {
             const patterns = [
                { regex: /(?:Boss|BOSS).*(?:傷害|攻擊力)[^0-9]*(\d+)%?/i, name: 'BOSS怪物傷害' }, // 統一 key 為 BOSS怪物傷害
                { regex: /無視.*防禦率\s*(?:\+|:)?\s*(\d+)%?/, name: '無視防禦率' },
                { regex: /(\d+)%?\s*爆擊(?:機)?率/, name: '爆擊率' },
                { regex: /爆擊(?:機)?率\s*(?:\+|:)?\s*(\d+)%?/, name: '爆擊率' },
                { regex: /(\d+)%?\s*爆擊傷害/, name: '爆擊傷害' },
                { regex: /爆擊傷害\s*(?:\+|:)?\s*(\d+)%?/, name: '爆擊傷害' },
                { regex: /最大(?:增加)?\s*HP\s*(?:\+|:)?\s*(\d+)%/, name: 'HP' }, // 統一 key
                { regex: /最大(?:增加)?\s*MP\s*(?:\+|:)?\s*(\d+)%/, name: 'MP' }, // 統一 key
                { regex: /(?:全屬性|所有屬性)\s*(?:\+|:)?\s*(\d+)/, name: '全屬性' }, 
                { regex: /魔法攻擊力\s*(?:\+|:)?\s*(\d+)/, name: '魔法攻擊力' },
                { regex: /攻擊力\s*(?:\+|:)?\s*(\d+)/, name: '攻擊力', exclude: ['Boss', 'BOSS', '魔法'] },
                { regex: /經驗值.*?(\d+)%?/, name: '獲得經驗值' },
                { regex: /狀態異常抗性\s*(?:\+|:)?\s*(\d+)/, name: '狀態異常抗性' },
                { regex: /(\d+)%?\s*傷害/, name: '傷害', exclude: ['Boss', 'BOSS', '爆擊', '受到'] },
                { regex: /傷害\s*(?:\+|:)?\s*(\d+)%?/, name: '傷害', exclude: ['Boss', 'BOSS', '爆擊', '受到'] },
             ];
             
             // 輔助函式：檢查 statKey 變體映射
             // 因為 statCalculator 傳入的 statKey 可能是 'Boss Damage'，我們需要轉成 regex 的 name
             const mapToRegexName = (key: string): string => {
                 if (key === 'Boss Damage' || key === 'BOSS怪物傷害') return 'BOSS怪物傷害';
                 if (key === 'HP' || key === 'MaxHP') return 'HP';
                 if (key === 'MP' || key === 'MaxMP') return 'MP';
                 return key; 
             }
             
             const targetName = mapToRegexName(statKey);

             patterns.forEach(p => {
                 // 檢查是否符合當前目標屬性
                 // 情況 A: 直接命中 (e.g. 找 無視防禦率)
                 const isDirectMatch = p.name === targetName;
                 // 情況 B: 全屬性 -> 如果目標是主屬性 (STR/DEX...)
                 const isAllStatMatch = p.name === '全屬性' && isMainStat;
                 
                 if (!isDirectMatch && !isAllStatMatch) return;

                 if (p.exclude && p.exclude.some(ex => desc.toLowerCase().includes(ex.toLowerCase()))) return;
                 
                 const match = desc.match(p.regex);
                 if (match) {
                     sum += parseFloat(match[1]);
                     matched = true;
                 }
             });
        }

        // 策略 2: 查表補完 (Fallback / Accuracy)
        if (!matched && LINK_SKILL_DATA[skill.skill_name]) {
             const stats = LINK_SKILL_DATA[skill.skill_name](skill.skill_level);
             
             // 需處理中英文 key 映射
             // statKey 可能為 'Boss Damage' 但 table 裡是 'BOSS 傷害'
             // 但我們這裡簡單處理主要用到的
             
             // 遍歷 table 的所有屬性，看是否對應 statKey
             Object.entries(stats).forEach(([k, val]) => {
                 let isHit = false;
                 if (k === statKey) isHit = true;
                 // 映射檢查
                 if (statKey === 'BOSS怪物傷害' || statKey === 'Boss Damage') {
                     if (k === 'BOSS 傷害' || k === 'BOSS怪物傷害') isHit = true;
                 }
                 if (statKey === '無視防禦率' || statKey === 'Ignore Defense Rate') {
                     if (k === '無視防禦率') isHit = true;
                 }
                 if (statKey === '爆擊傷害' || statKey === 'Critical Damage') {
                     if (k === '爆擊傷害') isHit = true;
                 }
                 if (statKey === '攻擊力' || statKey === 'Attack Power') {
                     if (k === '攻擊力') isHit = true;
                 }
                 if (statKey === '魔法攻擊力' || statKey === 'Magic Power') {
                     if (k === '魔法攻擊力') isHit = true;
                 }
                 if (statKey === 'HP' && k === '最大HP') isHit = true;
                 if (statKey === 'MP' && k === '最大MP') isHit = true;

                 // 全屬性處理
                 if (isMainStat && k === '全屬性') isHit = true;
                 
                 if (isHit) {
                     sum += val;
                     matched = true;
                  }
             });
        }
    });

    return sum;
};


const sumUnionArtifact = (artifact: any, statKey: string): number => {
    if (!artifact?.union_artifact_effect) return 0;
    let sum = 0;
    
    // Formula from CharacterDetails.tsx
    const getStatValue = (name: string, lv: number) => {
       if (name.match(/(?:Boss|BOSS).*傷害/i) || name === '傷害' || name === 'Damage') return lv <= 5 ? lv : 5 + (lv - 5) * 2;
       if (name.includes('無視') || name.includes('Ignore') || name.includes('加持') || name.includes('Buff') || name.includes('爆擊率') || name.includes('Crit Rate')) return lv * 2;
       if (name.includes('爆擊傷害') || name.includes('Crit Damage')) return lv * 0.4;
       if (name.includes('攻擊力') || name.includes('Attack') || name.includes('魔法')) return lv * 3;
       if (name.includes('全屬性') || name.includes('All Stat')) return lv <= 5 ? lv * 10 : 50 + (lv - 5) * 20;
       if (name.includes('經驗值') || name.includes('Experience')) return lv <= 8 ? lv : 8 + (lv - 8) * 2;
       return 0;
    };

    const isMainStat = ['STR', 'DEX', 'INT', 'LUK'].includes(statKey);

    artifact.union_artifact_effect.forEach((eff: any) => {
        if (eff.name) {
             const name = eff.name;
             const val = getStatValue(name, eff.level);
             
             // Check match
             let matched = false;
             if (statKey === 'BOSS怪物傷害' || statKey === 'Boss Damage') {
                 if (name.match(/(?:Boss|BOSS).*傷害/i)) matched = true;
             }
             else if (statKey === '無視防禦率' || statKey === 'Ignore Defense Rate') {
                 if (name.includes('無視')) matched = true;
             }
             else if (statKey === '爆擊傷害' || statKey === 'Critical Damage') {
                 if (name.includes('爆擊傷害')) matched = true;
             }
             else if (statKey === '攻擊力' || statKey === 'Attack Power') {
                 if ((name.includes('攻擊力') || name.includes('Attack')) && !name.includes('魔法') && !name.includes('Magic')) matched = true;
             }
             else if (statKey === '魔法攻擊力' || statKey === 'Magic Power') {
                 if (name.includes('魔法') || (name.includes('魔力'))) matched = true;
             }
             else if (statKey === 'HP') {
                 // Artifact doesn't seem to have HP?
             }
             
             // Main Stat handling (All Stat)
             if (isMainStat && (name.includes('全屬性') || name.includes('All Stat'))) {
                 matched = true;
             }

             if (matched) sum += val;
        }
    });

    return sum;
};

const sumUnionChampion = (champion: any, statKey: string): number => {
    if (!champion?.champion_badge_total_info) return 0;
    const keywords = getKeywords(statKey);
    let sum = 0;
    
    const isMainStat = ['STR', 'DEX', 'INT', 'LUK'].includes(statKey);

    champion.champion_badge_total_info.forEach((badge: any) => {
        if (badge.stat) {
             const statStr = badge.stat.replace(/\n/g, ' ');
             let matched = false;
             
             // 策略: 寬鬆匹配關鍵字，再抓數字
             // 使用 for...of 迴圈以便在找到匹配後 break，避免重複計算 (例如 "攻擊Boss..." 同時匹配 "Boss")
             for (const k of keywords) {
                 if (statStr.includes(k)) {
                     // Exclusions
                     if (statKey === '攻擊力' && (statStr.includes('魔法') || statStr.includes('Magic'))) continue;
                     if (statKey === '傷害' && (statStr.includes('BOSS') || statStr.includes('Boss'))) continue;

                     // 尋找數值
                     const regex = new RegExp(`(?:${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}).*?(?:\\+|:)?\\s*(\\d+(?:\\.\\d+)?)`);
                     // 注意: 確保 k 被 escape，雖然 getKeywords 通常是安全的字母/中文
                     const match = statStr.match(regex);
                     
                     if (match) {
                        // 檢查數值後是否帶有 % (若此屬性通常為 % 則沒差，若為固定值則需過濾)
                        sum += parseFloat(match[1]);
                        matched = true;
                        break; // 找到後跳出關鍵字迴圈，處理下一個 badge
                     }
                 }
             }
             
             // 全屬性處理 (若尚未匹配主屬性)
             if (!matched && isMainStat && (statStr.includes('全屬性') || statStr.includes('所有屬性') || statStr.includes('All Stat'))) {
                 const match = statStr.match(/(?:全屬性|所有屬性|All Stat).*?(?:\+|:)?\s*(\d+(?:\\.\\d+)?)/);
                 if (match) sum += parseFloat(match[1]);
             }
        }
    });

    return sum;
};

// 嘗試計算自身技能 (被動/Buff) - 僅作估算
const sumSelfSkills = (data: DashboardData, statKey: string): number => {
    const keywords = getKeywords(statKey);
    let sum = 0;
    
    // 0轉到6轉 + Hyper
    const skillKeys = ['skill0', 'skill1', 'skill2', 'skill3', 'skill4', 'skillHyper', 'skill5', 'skill6'] as const;
    
    const ownedLinkName = data.linkSkill?.character_owned_link_skill?.skill_name;
    const isFlatStat = ['攻擊力', '魔法攻擊力', 'STR', 'DEX', 'INT', 'LUK', 'HP', 'MP'].includes(statKey);

    skillKeys.forEach(key => {
        const skillData = data[key];
        if (skillData && skillData.character_skill) {
            skillData.character_skill.forEach((skill: any) => {
                if (key === 'skill0' && ownedLinkName && skill.skill_name === ownedLinkName) return;

                const effect = skill.skill_effect || skill.skill_description || '';
                
                const isPassive = effect.includes('被動') || effect.includes('永久') || effect.includes('Passive') || effect.includes('Permanently');
                if (!isPassive) return;
                
                // 排除主動持續效果
                if (effect.includes('持續時間') || effect.includes('Duration')) return;

                const flatEffect = effect.replace(/\n/g, ' ');
                
                // for...of loop to avoid double counting
                for (const k of keywords) {
                    if (flatEffect.includes(k)) {
                         // Exclusions
                         if (statKey === '攻擊力' && (flatEffect.includes('魔法') || flatEffect.includes('Magic'))) continue;
                         if (statKey === '傷害' && (flatEffect.includes('BOSS') || flatEffect.includes('Boss'))) continue;
                         if (statKey === 'BOSS怪物傷害' && !flatEffect.includes('BOSS') && !flatEffect.includes('Boss')) continue;

                         const regex = new RegExp(`${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?(\\d+(?:\\.\\d+)?)`);
                         const match = flatEffect.match(regex);
                         
                         if (match) {
                             const val = parseFloat(match[1]);
                             const matchIndex = match.index! + match[0].length;
                             const nextChars = flatEffect.substring(matchIndex, matchIndex + 5); 
                             const hasPercent = nextChars.trim().startsWith('%');

                             if (isFlatStat) {
                                 if (!hasPercent) {
                                     sum += val;
                                     break; // 找到並計入後，跳出關鍵字迴圈
                                 }
                             } else {
                                 sum += val;
                                 break; // 找到並計入後，跳出關鍵字迴圈
                             }
                         }
                    }
                }
            });
        }
    });

    return sum;
};

// 解析 Set Effect 字串 (因為 API 返回的是 string 而非 object map)
const sumSetEffect = (setEffect: any, statKey: string): number => {
    if (!setEffect?.set_effect) return 0;
    const keywords = getKeywords(statKey);
    const regex = createStatRegex(keywords, false);

    // 檢查是否為主屬性，需額外加總全屬性
    const isMainStat = ['STR', 'DEX', 'INT', 'LUK'].includes(statKey);
    const allStatRegex = isMainStat 
        ? createStatRegex(['全屬性', '所有屬性', 'All Stat', 'All Stats'], false) 
        : null;

    let sum = 0;
    
    setEffect.set_effect.forEach((set: any) => {
        if (set.set_effect_info) {
             set.set_effect_info.forEach((info: any) => {
                  // info.set_option 可能以 \n 或 comma 分隔
                  const rawOption = info.set_option || '';
                  // 先嘗試以換行或逗號拆分
                  let parts = rawOption.split(/\n|\\n|,/);
                  
                  parts.forEach((line: string) => {
                      line = line.trim();
                      if(!line) return;
                      
                      let matched = false;
                      const match = line.match(regex);
                      if (match) {
                        const val = parseFloat(match[2]);
                        
                        const isMagicOpt = line.includes('魔法') || line.toLowerCase().includes('magic');
                        const isTargetMagic = keywords.some(k => k.includes('魔法') || k.toLowerCase().includes('magic'));
                        
                        if (isMagicOpt && !isTargetMagic) {
                             // Skip
                        } else {
                             sum += val;
                             matched = true;
                        }
                      }

                      // 額外檢查全屬性
                      if (!matched && allStatRegex) {
                          const asMatch = line.match(allStatRegex);
                          if (asMatch) {
                              sum += parseFloat(asMatch[2]);
                          }
                      }
                  });
             });
        }
    });
    return sum;
};

const estimateMainStat = (stat: any): string => {
    if (!stat?.final_stat) return 'STR';
    // 簡單判斷: 找出 STR, DEX, INT, LUK 中數值最高的
    const attrs = ['STR', 'DEX', 'INT', 'LUK'];
    let maxVal = -1;
    let maxKey = 'STR';
    
    attrs.forEach(key => {
        const item = stat.final_stat.find((s: any) => s.stat_name === key);
        if (item) {
            const v = parseFloat(item.stat_value.replace(/,/g, ''));
            if (v > maxVal) {
                maxVal = v;
                maxKey = key;
            }
        }
    });
    // Demon Avenger 特例 (HP 為主屬), Xenon (混雜), 這裡先做簡單最高值判定
    
    return maxKey;
};

const getHexaStatValue = (
    hexaStat: CharacterHexaMatrixStat | undefined, 
    typeCode: 'MAIN' | 'ATT' | 'BOSS' | 'IED' | 'DMG' | 'CRIT_DMG', 
    statKeyForKeywords: string,
    characterMainStat?: string
): { value: number, desc: string } => {
    if (!hexaStat) return { value: 0, desc: '' };
    
    const cores = [
        ...(hexaStat.character_hexa_stat_core || []),
        ...(hexaStat.character_hexa_stat_core_2 || []),
        ...(hexaStat.character_hexa_stat_core_3 || []), // 修正: 加入核心3
    ];

    let total = 0;
    const sources: string[] = [];
    const keywords = getKeywords(statKeyForKeywords);

    // 擴充匹配: 如果 statKey 符合該角色的主屬性，則也接受 "主屬性"/"Main Stat" 關鍵字
    const isChecksMainStat = characterMainStat && statKeyForKeywords === characterMainStat;
    const matchName = (name: string) => {
        if (!name) return false;
        const n = name.toLowerCase();
        // 1. 一般關鍵字匹配
        if (keywords.some(k => n.includes(k.toLowerCase()))) return true;
        // 2. 泛用主屬性字眼匹配 (僅當前查詢屬性 = 角色主屬性時)
        if (isChecksMainStat && (n.includes('主屬性') || n.includes('main stat'))) return true;
        
        return false;
    };

    cores.forEach((core, idx) => {
        if (matchName(core.main_stat_name)) {
             total += getHexaLookup(typeCode, core.main_stat_level);
        }
        if (matchName(core.sub_stat_name_1)) {
             total += getHexaLookup(typeCode, core.sub_stat_level_1); 
        }
        if (matchName(core.sub_stat_name_2)) {
             total += getHexaLookup(typeCode, core.sub_stat_level_2);
        }
    });

    return { value: total, desc: '' };
};

// 取得官方計算的總合 (從 data.stat.final_stat)
const getOfficialTotal = (data: DashboardData, statKey: string): number => {
    if (!data.stat?.final_stat) return 0;
    
    // 建立搜尋關鍵字清單
    const keywords = getKeywords(statKey);
    // 補充英文/中文常見對照，確保能對應到官方 API 的 key
    // App.tsx 中的 getStatVal 映射表:
    // 'Boss Damage' -> 'BOSS怪物傷害'
    // 'Ignore Defense Rate' -> '無視防禦率'
    // 'Critical Damage' -> '爆擊傷害'
    // 'Attack Power' -> '攻擊力'
    // 'Magic Power' -> '魔法攻擊力'
    
    const target = data.stat.final_stat.find(s => {
        // 直接比對完整名稱
        if (s.stat_name === statKey) return true;
        // 比對關鍵字 (例如 statKey='STR', s.stat_name='STR')
        if (keywords.includes(s.stat_name)) return true;
        
        // 特殊處理: 英文轉中文
        if (statKey === 'Boss Damage' && s.stat_name === 'BOSS怪物傷害') return true;
        if (statKey === 'Ignore Defense Rate' && s.stat_name === '無視防禦率') return true;
        if (statKey === 'Critical Damage' && s.stat_name === '爆擊傷害') return true;
        
        return false;
    });

    return target ? parseFloat(target.stat_value.replace(/,/g, '')) : 0;
};

const filterItems = (items: BreakdownItem[]): BreakdownItem[] => {
    return items.filter(i => {
        // 移除 "手套附加屬性"
        if (i.label === '手套附加屬性') return false;
        
        // 移除 0 或 0% 或 0.00%
        if (i.value === '0' || i.value === '0%' || i.value === '0.00%' || i.value === '0.0%') return false;
        
        return true;
    });
};

export const getStatBreakdown = (data: DashboardData | null, statKey: string): StatBreakdown | null => {
  if (!data || !data.equipment) return null;

  const { equipment, setEffect, hyperStat, ability, hexaMatrixStat, symbolEquipment, unionRaider, linkSkill } = data;
  const items = equipment.item_equipment || [];
  const symbols = symbolEquipment?.symbol || [];

  // 取得官方總值
  const officialTotal = getOfficialTotal(data, statKey);

  // ==========================================
  // 1. Attack Power / Magic Power
  // ==========================================
  const isAttack = statKey === '攻擊力' || statKey === 'Attack Power';
  const isMagic = statKey === '魔法攻擊力' || statKey === 'Magic Power';
  
  if (isAttack || isMagic) {
      const itemOptionKey = isMagic ? 'magic_power' : 'attack_power';
      const targetKey = isMagic ? '魔法攻擊力' : '攻擊力'; 
      
      let equipBase = 0;
      items.forEach(item => {
        if (item.item_total_option && item.item_total_option[itemOptionKey]) {
            equipBase += parseInt(item.item_total_option[itemOptionKey] as string, 10);
        }
      });
      
      const equipSet = sumSetEffect(setEffect, targetKey);
      const { flat: potFlat, percent: potPercent } = sumPotentialCustom(items, targetKey, false);

      const hyper = sumHyperStat(hyperStat, targetKey); 
      const abi = sumAbility(ability, targetKey);
      const hexa = getHexaStatValue(hexaMatrixStat, 'ATT', targetKey);
      const unionVal = getUnionStatValue(unionRaider, targetKey);
      const linkVal = sumLinkSkills(linkSkill, targetKey);
      const artifactVal = sumUnionArtifact(data.unionArtifact, targetKey);
      const championVal = sumUnionChampion(data.unionChampion, targetKey);
      const selfSkillVal = sumSelfSkills(data, targetKey);
      
      // 計算已知總和與差距
      const knownSum = equipBase + equipSet + potFlat + hyper + abi + hexa.value + unionVal + linkVal + artifactVal + championVal + selfSkillVal;
      const officialTotal = getOfficialTotal(data, statKey); // 需要先取
      const diff = officialTotal > 0 ? officialTotal - knownSum : 0;

      return {
          sections: [
              {
                  title: '數值來源 (不含職業被動)',
                  items: filterItems([
                      { label: '裝備總和 (含卷/星火)', value: equipBase.toLocaleString() },
                      { label: '套裝效果', value: equipSet.toLocaleString() },
                      { label: '潛能 (固定數值)', value: potFlat.toLocaleString() },
                      { label: '極限屬性', value: hyper.toLocaleString() },
                      { label: '能力 (Ability)', value: abi.toLocaleString() },
                      { label: 'HEXA 矩陣', value: hexa.value.toLocaleString() },
                      { label: '戰地聯盟', value: unionVal.toLocaleString() },
                      { label: '聯盟神器', value: artifactVal.toLocaleString() },
                      { label: '冠軍徽章', value: championVal.toLocaleString() },
                      { label: '傳授技能 (Link)', value: linkVal.toLocaleString() },
                      { label: '技能 (Passive/Buff)', value: selfSkillVal.toLocaleString() },
                      // 顯示未計算到的部分
                      ...(diff > 0 ? [{ label: '其他 (不明來源/公會/萌獸)', value: diff.toLocaleString() }] : [])
                  ])
              },
              {
                  title: '% 數值來源',
                  items: filterItems([
                      { label: '裝備潛能總計', value: `${potPercent}%` },
                  ]),
                  summary: (officialTotal > 0 
                     ? `遊戲內總和: ${officialTotal.toLocaleString()} (差距: ${diff.toLocaleString()})`
                     : `目前計算總和: ${knownSum.toLocaleString()}`) + '\n*可能有誤差僅供參考，數值以遊戲內為準'
              }
          ]
      };
  }

  // ==========================================
  // 2. Main Stats (STR, DEX, INT, LUK)
  // ==========================================
  const stats = ['STR', 'DEX', 'INT', 'LUK'];
  if (stats.includes(statKey)) {
      const keyLower = statKey.toLowerCase() as keyof ItemOption;
      
      let equipBase = 0;
      let flamePercent = 0; // 新增全屬條目統計

      items.forEach(item => {
          if (item.item_total_option) {
              if (item.item_total_option[keyLower]) {
                  equipBase += parseInt(item.item_total_option[keyLower] as string, 10);
              }
              // 檢查是否有全屬性% (Flame All Stat)
              if (item.item_total_option.all_stat) {
                  flamePercent += parseInt(item.item_total_option.all_stat as string, 10);
              }
          }
      });

      const symbolVal = sumSymbols(symbols, statKey);
      const equipSet = sumSetEffect(setEffect, statKey);
      
      const { flat: potFlat, percent: potPercent } = sumPotentialCustom(items, statKey, true);
      
      const hyper = sumHyperStat(hyperStat, statKey);
      const abi = sumAbility(ability, statKey);


      // 判斷該角色主屬性 (簡單取最大值)
      const mainStatKey = estimateMainStat(data.stat);
      const hexa = getHexaStatValue(hexaMatrixStat, 'MAIN', statKey, mainStatKey);
      const unionVal = getUnionStatValue(unionRaider, statKey);
      const linkVal = sumLinkSkills(linkSkill, statKey);
      const artifactVal = sumUnionArtifact(data.unionArtifact, statKey);
      const championVal = sumUnionChampion(data.unionChampion, statKey);
      const selfSkillVal = sumSelfSkills(data, statKey);

      // 計算已知總和與差距 (包含戰地)
      const knownSum = equipBase + symbolVal + equipSet + potFlat + hyper + abi + hexa.value + unionVal + linkVal + artifactVal + championVal + selfSkillVal;
      const officialTotal = getOfficialTotal(data, statKey); // 需要先取
      const diff = officialTotal > 0 ? officialTotal - knownSum : 0;

      return {
          sections: [
              {
                  title: `${statKey} 固定數值來源`,
                  items: filterItems([
                      { label: 'ARC/AUT 符文', value: symbolVal.toLocaleString() },
                      { label: '裝備基礎 (含星火)', value: equipBase.toLocaleString() },
                      { label: '套裝效果', value: equipSet.toLocaleString() },
                      { label: '潛能 (固定數值)', value: potFlat.toLocaleString() },
                      { label: '極限屬性', value: hyper.toLocaleString() },
                      { label: '能力', value: abi.toLocaleString() },
                      { label: 'HEXA 矩陣', value: hexa.value.toLocaleString() },
                      { label: '戰地聯盟', value: unionVal.toLocaleString() },
                      { label: '聯盟神器', value: artifactVal.toLocaleString() },
                      { label: '冠軍徽章', value: championVal.toLocaleString() },
                      { label: '傳授技能', value: linkVal.toLocaleString() },
                      { label: '技能', value: selfSkillVal.toLocaleString() },
                      // 顯示差值
                      ...(diff > 0 ? [{ label: '其他 (AP配點/公會/萌獸)', value: diff.toLocaleString() }] : [])
                  ]),
                  summary: (officialTotal > 0 
                     ? `遊戲內總和: ${officialTotal.toLocaleString()} (差距: ${diff.toLocaleString()})`
                     : '注意: 尚未包含角色升級配點 (AP)') + '\n*可能有誤差僅供參考，數值以遊戲內為準'
              },
              {
                  title: '% 加成來源',
                  items: filterItems([
                      { label: '裝備潛能 (含全屬)', value: `${potPercent}%` },
                      { label: '星火全屬性', value: `${flamePercent}%` }
                  ])
              }
          ]
      };
  }
  
  // ==========================================
  // 3. HP / MP
  // ==========================================
  if (statKey === 'HP' || statKey === 'MP') {
     const keyLower = (statKey === 'HP' ? 'max_hp' : 'max_mp') as keyof ItemOption;
     
     let equipBase = 0;
     items.forEach(item => {
        if (item.item_total_option && item.item_total_option[keyLower]) {
            equipBase += parseInt(item.item_total_option[keyLower] as string, 10);
        }
     });
     
     const symbolVal = sumSymbols(symbols, statKey);
     const equipSet = sumSetEffect(setEffect, statKey); // 使用 statKey = HP/MP 進行關鍵字匹配

     const { flat: potFlat, percent: potPercent } = sumPotentialCustom(items, statKey, false);
     
     const hyper = sumHyperStat(hyperStat, statKey);
     const abi = sumAbility(ability, statKey); // Add ability support for HP
     const unionVal = getUnionStatValue(unionRaider, statKey);
     const linkVal = sumLinkSkills(linkSkill, statKey);
     const artifactVal = sumUnionArtifact(data.unionArtifact, statKey);
     const championVal = sumUnionChampion(data.unionChampion, statKey);
     const selfSkillVal = sumSelfSkills(data, statKey);

     // 計算已知總和與差距 (HP/MP)
     // 注意: HP/MP 的 officialTotal 是最終值 (含 %), 而 knownSum 僅是固定值總和
     // 故這裡僅顯示 Official Total 供參考, 不計算差距以免誤導 (除非實作完整 HP 公式)
     const officialTotal = getOfficialTotal(data, statKey);
     
     return {
         sections: [
             {
                 title: `${statKey} 來源`,
                 items: filterItems([
                     { label: '符文 (Symbol)', value: symbolVal.toLocaleString() },
                     { label: '裝備基礎', value: equipBase.toLocaleString() },
                     { label: '套裝效果', value: equipSet.toLocaleString() },
                     { label: '潛能 (數值)', value: potFlat.toLocaleString() },
                     { label: '極限屬性', value: hyper.toLocaleString() },
                     { label: '能力', value: abi.toLocaleString() },
                     { label: '戰地聯盟', value: unionVal.toLocaleString() },
                     { label: '聯盟神器', value: artifactVal.toLocaleString() },
                     { label: '冠軍徽章', value: championVal.toLocaleString() },
                     { label: '傳授技能', value: linkVal.toLocaleString() },
                     { label: '技能', value: selfSkillVal.toLocaleString() },
                 ]),
                 summary: (officialTotal > 0 
                    ? `遊戲內總和 (含%加成): ${officialTotal.toLocaleString()}`
                    : `目前計算總和: ${knownSum.toLocaleString()}`) + '\n*可能有誤差僅供參考，數值以遊戲內為準'
             },
             {
                 title: '% 數值',
                 items: filterItems([{ label: '潛能 %', value: `${potPercent}%` }])
             }
         ]
     };
  }

  // ==========================================
  // 4. Boss Damage
  // ==========================================
  if (statKey === 'BOSS怪物傷害' || statKey === 'Boss Damage') {
       const targetKey = 'BOSS怪物傷害';
       let equipBase = 0;
       items.forEach(item => {
           if (item.item_total_option?.boss_damage) {
               equipBase += parseInt(item.item_total_option.boss_damage, 10);
           }
       });

       const { percent: potPercent } = sumPotentialCustom(items, targetKey, false);
       
       const setEff = sumSetEffect(setEffect, targetKey);
       const hyper = sumHyperStat(hyperStat, targetKey);
       const abi = sumAbility(ability, targetKey);
       // HEXA Stat 不需要判斷主屬性 (Boss傷不是 Flat Stat)
       const hexa = getHexaStatValue(hexaMatrixStat, 'BOSS', targetKey);
       const unionVal = getUnionStatValue(unionRaider, targetKey);
       const linkVal = sumLinkSkills(linkSkill, targetKey);
       const artifactVal = sumUnionArtifact(data.unionArtifact, targetKey);
       const championVal = sumUnionChampion(data.unionChampion, targetKey);
       const selfSkillVal = sumSelfSkills(data, targetKey);

       // Boss 傷害為加算，可計算差距
       const knownSum = equipBase + potPercent + setEff + hyper + abi + hexa.value + unionVal + linkVal + artifactVal + championVal + selfSkillVal;
       const officialTotal = getOfficialTotal(data, statKey);
       const diff = officialTotal > 0 ? officialTotal - knownSum : 0;
       
       return {
          sections: [{
              title: 'Boss 傷害來源',
              items: filterItems([
                  { label: '裝備/武器基礎', value: `${equipBase}%` },
                  { label: '裝備潛能', value: `${potPercent}%` }, 
                  { label: '套裝效果', value: `${setEff}%` },
                  { label: '極限屬性', value: `${hyper}%` },
                  { label: '能力', value: `${abi}%` },
                  { label: 'HEXA 矩陣', value: `${hexa.value.toFixed(2)}%` },
                  { label: '戰地聯盟', value: `${unionVal}%` },
                  { label: '聯盟神器', value: `${artifactVal}%` },
                  { label: '冠軍徽章', value: `${championVal}%` },
                  { label: '傳授技能', value: `${linkVal}%` },
                  { label: '技能', value: `${selfSkillVal}%` },
                  ...(diff > 0 ? [{ label: '其他 (被動/Buff/公會)', value: `${diff.toLocaleString()}%` }] : [])
              ]),
              summary: (officialTotal > 0 
                ? `遊戲內總和: ${officialTotal.toLocaleString()}% (差距: ${diff.toLocaleString()}%)`
                : `目前計算總和: ${knownSum.toLocaleString()}%`) + '\n*可能有誤差僅供參考，數值以遊戲內為準'
          }]
      };
  }
  
  // ==========================================
  // 5. IED
  // ==========================================
  if (statKey === '無視防禦率' || statKey === 'Ignore Defense Rate') {
       const targetKey = '無視防禦率';
       let equipBase = 0;
       items.forEach(item => {
           if (item.item_total_option?.ignore_monster_armor) {
               equipBase += parseInt(item.item_total_option.ignore_monster_armor, 10);
           }
       });

       const setEff = sumSetEffect(setEffect, targetKey);
       const hyper = sumHyperStat(hyperStat, targetKey);
       const abi = sumAbility(ability, targetKey);
       const hexa = getHexaStatValue(hexaMatrixStat, 'IED', targetKey);
       const unionVal = getUnionStatValue(unionRaider, targetKey);
       const linkVal = sumLinkSkills(linkSkill, targetKey);
       const artifactVal = sumUnionArtifact(data.unionArtifact, targetKey);
       const championVal = sumUnionChampion(data.unionChampion, targetKey);
       const selfSkillVal = sumSelfSkills(data, targetKey);

       const officialTotal = getOfficialTotal(data, statKey);
       
       return {
          sections: [{
              title: '無視防禦來源 (非加算)',
              items: filterItems([
                  { label: '裝備面板加總', value: `${equipBase}%` },
                  { label: '套裝效果', value: `${setEff}%` },
                  { label: '極限屬性', value: `${hyper}%` },
                  { label: '能力', value: `${abi}%` },
                  { label: 'HEXA 矩陣', value: `${hexa.value.toFixed(2)}%` },
                  { label: '戰地聯盟', value: `${unionVal}%` },
                  { label: '聯盟神器', value: `${artifactVal}%` },
                  { label: '冠軍徽章', value: `${championVal}%` },
                  { label: '傳授技能', value: `${linkVal}%` },
                  { label: '技能', value: `${selfSkillVal}%` },
              ]),
              summary: (officialTotal > 0 ? `遊戲內總和: ${officialTotal}% (無視算法非累加)` : `目前計算總和: 待實作`) + '\n*可能有誤差僅供參考，數值以遊戲內為準'
          }]
      };
  }

  // ==========================================
  // 6. Critical Damage
  // ==========================================
  if (statKey === '爆擊傷害' || statKey === 'Critical Damage') {
       const targetKey = '爆擊傷害';
       const { percent: potPercent } = sumPotentialCustom(items, targetKey, false);
       const hyper = sumHyperStat(hyperStat, targetKey);
       const abi = sumAbility(ability, targetKey);
       const hexa = getHexaStatValue(hexaMatrixStat, 'CRIT_DMG', targetKey);
       const setEff = sumSetEffect(setEffect, targetKey);
       const unionVal = getUnionStatValue(unionRaider, targetKey);
       const linkVal = sumLinkSkills(linkSkill, targetKey);
       const artifactVal = sumUnionArtifact(data.unionArtifact, targetKey);
       const championVal = sumUnionChampion(data.unionChampion, targetKey);
       const selfSkillVal = sumSelfSkills(data, targetKey);

       const knownSum = potPercent + hyper + abi + hexa.value + setEff + unionVal + linkVal + artifactVal + championVal + selfSkillVal;
       const officialTotal = getOfficialTotal(data, statKey);
       const diff = officialTotal > 0 ? officialTotal - knownSum : 0;
       
       return {
           sections: [{
               title: '爆擊傷害來源',
               items: filterItems([
                   { label: '裝備潛能', value: `${potPercent}%` },
                   { label: '套裝效果', value: `${setEff}%` },
                   { label: '極限屬性', value: `${hyper}%` },
                   { label: '能力', value: `${abi}%` },
                   { label: 'HEXA 矩陣', value: `${hexa.value.toFixed(2)}%` },
                   { label: '戰地聯盟', value: `${unionVal}%` },
                   { label: '聯盟神器', value: `${artifactVal}%` },
                   { label: '冠軍徽章', value: `${championVal}%` },
                   { label: '傳授技能', value: `${linkVal}%` },
                   { label: '技能', value: `${selfSkillVal}%` },
                   ...(diff > 0 ? [{ label: '其他 (被動/Buff)', value: `${diff.toLocaleString()}%` }] : [])
               ]),
               summary: (officialTotal > 0 
                 ? `遊戲內總和: ${officialTotal}% (差距: ${diff.toLocaleString()}%)`
                 : `目前計算總和: ${knownSum.toFixed(2)}%`) + '\n*可能有誤差僅供參考，數值以遊戲內為準'
           }]
       };
  }

  return null;
};
