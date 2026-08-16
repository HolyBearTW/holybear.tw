import { useState, useEffect } from 'react';
import { DashboardData } from '../types';

export const useCharacterStats = (data: DashboardData | null) => {
  const [showDetailStats, setShowDetailStats] = useState(false);
  const [abilityPreset, setAbilityPreset] = useState(1);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (data?.ability?.preset_no) {
      setAbilityPreset(parseInt(data.ability.preset_no));
    }
  }, [data]);

  const getStatVal = (name: string): string => {
    const map: Record<string, string> = {
      'Combat Power': '戰鬥力',
      'Final Damage': '最終傷害',
      'Boss Damage': 'BOSS怪物傷害',
      'Ignore Defense Rate': '無視防禦率',
      'Critical Damage': '爆擊傷害',
      'Star Force': '星力',
      'Arcane Power': '神秘力量',
      'Authentic Force': '真實之力',
      'Attack Power': '攻擊力',
      'Magic Power': '魔法攻擊力',
      'Item Drop Rate': '道具掉落率',
      'Meso Drop Rate': '楓幣獲得量'
    };
    
    const found = data?.stat.final_stat.find(s => 
       s.stat_name === name || s.stat_name === map[name]
    );
    return found ? found.stat_value : '0';
  };

  const formatNumber = (val: string) => parseInt(val.replace(/,/g, '')).toLocaleString();
  
  const formatBigNumber = (val: string) => {
     const num = parseInt(val.replace(/,/g, ''));
     if (num > 100000000) {
        const yi = Math.floor(num / 100000000);
        const wan = Math.floor((num % 100000000) / 10000);
        const rest = num % 10000;
        return `${yi}億 ${wan}萬 ${rest}`;
     }
     return num.toLocaleString();
  };

  const getAbilityStyle = (grade: string) => {
    const g = grade.toLowerCase();
    if (g.includes('legendary') || g.includes('傳說')) return 'maple-ability maple-ability-legendary border-green-500 bg-green-950/40 text-green-400';
    if (g.includes('unique') || g.includes('罕見')) return 'maple-ability maple-ability-unique border-yellow-500 bg-yellow-950/40 text-yellow-400';
    if (g.includes('epic') || g.includes('稀有')) return 'maple-ability maple-ability-epic border-purple-500 bg-purple-950/40 text-purple-400';
    if (g.includes('rare') || g.includes('特殊')) return 'maple-ability maple-ability-rare border-blue-500 bg-blue-950/40 text-blue-400';
    return 'maple-ability maple-ability-normal border-slate-700 bg-slate-800 text-slate-300';
  };

  const focusStatKeys = [
    '戰鬥力', '最終傷害', 'BOSS怪物傷害', '無視防禦率', '爆擊傷害', 
    '攻擊力', '魔法攻擊力', '星力', '神秘力量', '真實之力',
    '傷害', '一般怪物傷害'
  ];

  const detailedStats = [
    { label: '戰鬥力', key: '戰鬥力', format: formatBigNumber },
    { label: '最低屬性攻擊力', key: '最低屬性攻擊力', format: formatNumber },
    { label: '最高屬性攻擊力', key: '最高屬性攻擊力', format: formatNumber },
    { label: '傷害', key: '傷害', suffix: '%' },
    { label: 'BOSS 傷害', key: 'BOSS怪物傷害', suffix: '%' },
    { label: '最終傷害', key: '最終傷害', suffix: '%' },
    { label: '無視防禦率', key: '無視防禦率', suffix: '%' },
    { label: '爆擊機率', key: '爆擊機率', suffix: '%' },
    { label: '爆擊傷害', key: '爆擊傷害', suffix: '%' },
    { label: '狀態異常耐性', key: '狀態異常耐性' },
    { label: '格擋', key: '格擋' },
    { label: '防禦力', key: '防禦力', format: formatNumber },
    { label: '移動速度', key: '移動速度', suffix: '%' },
    { label: '跳躍力', key: '跳躍力', suffix: '%' },
    { label: '星力', key: '星力' },
    { label: '神秘力量 (ARC)', key: '神秘力量' },
    { label: '真實之力 (AUT)', key: '真實之力' },
    { label: 'STR', key: 'STR', format: formatNumber },
    { label: 'DEX', key: 'DEX', format: formatNumber },
    { label: 'INT', key: 'INT', format: formatNumber },
    { label: 'LUK', key: 'LUK', format: formatNumber },
    { label: 'HP', key: 'HP', format: formatNumber },
    { label: 'MP', key: 'MP', format: formatNumber },
    { label: 'AP STR', key: 'AP配點STR', format: formatNumber },
    { label: 'AP DEX', key: 'AP配點DEX', format: formatNumber },
    { label: 'AP INT', key: 'AP配點INT', format: formatNumber },
    { label: 'AP LUK', key: 'AP配點LUK', format: formatNumber },
    { label: 'AP HP', key: 'AP配點HP', format: formatNumber },
    { label: 'AP MP', key: 'AP配點MP', format: formatNumber },
    { label: '道具掉落率', key: '道具掉落率', suffix: '%' },
    { label: '楓幣獲得量', key: '楓幣獲得量', suffix: '%' },
    { label: 'Buff 持續時間', key: 'Buff持續時間', suffix: '%' },
    { label: '攻擊速度', key: '攻擊速度' },
    { label: '一般怪物傷害', key: '一般怪物傷害', suffix: '%' },
    { label: '冷卻時間減少(秒)', key: '冷卻時間減少(秒)' },
    { label: '冷卻時間減少(%)', key: '冷卻時間減少(％)', suffix: '%' },
    { label: '未套用冷卻時間', key: '未套用冷卻時間' },
    { label: '無視屬性耐性', key: '無視屬性耐性', suffix: '%' },
    { label: '狀態異常追加傷害', key: '狀態異常追加傷害', suffix: '%' },
    { label: '武器熟練度', key: '武器熟練度', suffix: '%' },
    { label: '獲得額外經驗值', key: '獲得額外經驗值', suffix: '%' },
    { label: '攻擊力', key: '攻擊力', format: formatNumber },
    { label: '魔法攻擊力', key: '魔法攻擊力', format: formatNumber },
    { label: '召喚獸持續時間', key: '召喚獸持續時間增加', suffix: '%' },
  ].filter(stat => !focusStatKeys.includes(stat.key));

  const getAbilityData = () => {
    if (!data?.ability) return [];
    const presetKey = `ability_preset_${abilityPreset}`;
    const presetData = (data.ability as any)[presetKey];
    
    if (presetData && presetData.ability_info) {
        return presetData.ability_info;
    }
    
    if (data.ability.preset_no && parseInt(data.ability.preset_no) === abilityPreset) {
        return data.ability.ability_info;
    }

    return [];
  };

  const currentAbilityInfo = getAbilityData();

  return {
    showDetailStats, setShowDetailStats,
    abilityPreset, setAbilityPreset,
    showShareModal, setShowShareModal,
    getStatVal,
    detailedStats,
    getAbilityStyle,
    currentAbilityInfo
  };
};
