import React, { useState, useEffect } from 'react';
import { DashboardData } from '../types';
import { Zap, Star, Crown, Layers, PawPrint, Hexagon, Sword, Info, CheckSquare, Square } from 'lucide-react';
import ExpTrendChart from './ExpTrendChart';

interface CharacterDetailsProps {
  data: DashboardData;
  apiKey: string;
}

// 神器水晶圖片對應表
const artifactCrystalImages = [
  '/image/theme/artifact/Artifact1.png', // 菇菇寶貝
  '/image/theme/artifact/Artifact2.png', // 綠水靈
  '/image/theme/artifact/Artifact3.png', // 刺菇菇
  '/image/theme/artifact/Artifact4.png', // 木妖
  '/image/theme/artifact/Artifact5.png', // 石巨人
  '/image/theme/artifact/Artifact6.png', // 巴洛古
  '/image/theme/artifact/Artifact7.png', // 殘暴炎魔
  '/image/theme/artifact/Artifact8.png', // 粉豆
];

// --- 六轉核心設定檔 ---
const HEXA_SETTINGS = {
  SKILL: {
    key: 'SKILL',
    quantity: 1, 
    keywords: ['skill', '技能'],
    costs: [0, 30, 35, 40, 45, 50, 55, 60, 65, 200, 80, 90, 100, 110, 120, 130, 140, 150, 160, 350, 170, 180, 190, 200, 210, 220, 230, 240, 250, 500],
    erdaCosts: [0, 1, 1, 1, 2, 2, 2, 3, 3, 10, 3, 3, 4, 4, 4, 4, 4, 4, 5, 15, 5, 5, 5, 5, 5, 6, 6, 6, 7, 20]
  },
  MASTERY: {
    key: 'MASTERY',
    quantity: 4, 
    keywords: ['mastery', '精通'],
    costs: [50, 15, 18, 20, 23, 25, 28, 30, 33, 100, 40, 45, 50, 55, 60, 65, 70, 75, 80, 175, 85, 90, 95, 100, 105, 110, 115, 120, 125, 250],
    erdaCosts: [3, 1, 1, 1, 1, 1, 1, 2, 2, 5, 2, 2, 2, 2, 2, 2, 2, 2, 3, 8, 3, 3, 3, 3, 3, 3, 3, 3, 4, 10]
  },
  ENHANCEMENT: {
    key: 'ENHANCEMENT',
    quantity: 4, 
    keywords: ['enhancement', '強化'],
    costs: [75, 23, 27, 30, 34, 38, 42, 45, 49, 150, 60, 68, 75, 83, 90, 98, 105, 113, 120, 263, 128, 135, 143, 150, 158, 165, 173, 180, 188, 375],
    erdaCosts: [4, 1, 1, 1, 2, 2, 2, 3, 3, 8, 3, 3, 3, 3, 3, 3, 3, 3, 4, 12, 4, 4, 4, 4, 5, 5, 5, 6, 15]
  },
  COMMON: {
    key: 'COMMON',
    quantity: 1, 
    keywords: ['common', '共用'],
    costs: [125, 38, 44, 50, 57, 63, 69, 75, 82, 300, 110, 124, 138, 152, 165, 179, 193, 207, 220, 525, 234, 248, 262, 275, 289, 303, 317, 330, 344, 750],
    erdaCosts: [7, 2, 2, 2, 3, 3, 3, 5, 5, 14, 5, 5, 6, 6, 6, 6, 6, 6, 7, 17, 7, 7, 7, 7, 9, 9, 9, 10, 20]
  }
};

const calculateHexaProgress = (hexaMatrix: any, includeJanus: boolean) => {
  if (!hexaMatrix || !hexaMatrix.character_hexa_core_equipment) {
    return { 
      current: 0, total: 1, percent: 0, currentErda: 0, remainingFragments: 0, remainingErda: 0, hasJanus: false
    };
  }

  let totalFragmentsUsed = 0;
  let totalErdaUsed = 0;
  let grandTotalFragments = 0;
  let grandTotalErda = 0;
  let hasJanus = false;

  Object.values(HEXA_SETTINGS).forEach(setting => {
    if (!includeJanus && setting.key === 'COMMON') return;
    const costPerCore = setting.costs.reduce((a, b) => a + b, 0);
    const erdaPerCore = setting.erdaCosts.reduce((a, b) => a + b, 0);
    grandTotalFragments += costPerCore * setting.quantity;
    grandTotalErda += erdaPerCore * setting.quantity;
  });

  hexaMatrix.character_hexa_core_equipment.forEach((core: any) => {
    const level = parseInt(core.hexa_core_level, 10);
    const type = (core.hexa_core_type || '').toLowerCase();
    
    if (HEXA_SETTINGS.COMMON.keywords.some(k => type.includes(k))) hasJanus = true;

    let targetSetting = null;
    if (HEXA_SETTINGS.SKILL.keywords.some(k => type.includes(k))) targetSetting = HEXA_SETTINGS.SKILL;
    else if (HEXA_SETTINGS.MASTERY.keywords.some(k => type.includes(k))) targetSetting = HEXA_SETTINGS.MASTERY;
    else if (HEXA_SETTINGS.ENHANCEMENT.keywords.some(k => type.includes(k))) targetSetting = HEXA_SETTINGS.ENHANCEMENT;
    else if (HEXA_SETTINGS.COMMON.keywords.some(k => type.includes(k))) targetSetting = HEXA_SETTINGS.COMMON;

    if (targetSetting && (includeJanus || targetSetting.key !== 'COMMON')) {
      for (let i = 0; i < level; i++) {
        totalFragmentsUsed += targetSetting.costs[i] || 0;
        totalErdaUsed += targetSetting.erdaCosts[i] || 0;
      }
    }
  });

  return {
    current: totalFragmentsUsed,
    total: grandTotalFragments,
    percent: grandTotalFragments === 0 ? 0 : (totalFragmentsUsed / grandTotalFragments) * 100,
    currentErda: totalErdaUsed,
    remainingFragments: grandTotalFragments - totalFragmentsUsed,
    remainingErda: grandTotalErda - totalErdaUsed,
    hasJanus: hasJanus
  };
};

const SectionHeader: React.FC<{ 
  icon: React.ReactNode;
  title: string;
  presetState?: { current: number; setCurrent: (n: number) => void; active?: number; }
}> = ({ icon, title, presetState }) => (
  <div className="flex items-center gap-2 mb-4">
    <span className="text-yellow-500 flex-shrink-0">{icon}</span>
    <h3 className="text-lg font-bold text-slate-200 flex-shrink-0">{title}</h3>
    {presetState && (
      <div className="ml-2 flex gap-1">
        {[1, 2, 3].map((num) => (
          <button
            key={num}
            onClick={() => presetState.setCurrent(num)}
            className={`
              w-6 h-6 text-xs rounded font-bold transition-all flex items-center justify-center relative
              ${presetState.current === num 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'}
            `}
            title={`預設 ${num}`}
          >
            {num}
            {presetState.active === num && (
               <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 border-2 border-slate-900 rounded-full"></span>
            )}
          </button>
        ))}
      </div>
    )}
  </div>
);

const LINK_SKILL_DATA: Record<string, (lv: number) => Record<string, number>> = {
  '狂暴鬥氣': (lv) => ({ '傷害': lv * 5 }),
  '惡魔之怒': (lv) => ({ 'BOSS 傷害': lv === 1 ? 10 : 15 }),
  '滲透': (lv) => ({ '無視防禦率': lv === 1 ? 10 : 15 }),
  '判斷': (lv) => ({ '爆擊傷害': lv * 2 }),
  '紫扇傳授': (lv) => ({ '傷害': lv * 5 }),
  '氣魄': (lv) => ({ '全屬性': lv === 1 ? 15 : 25, '攻擊力': lv === 1 ? 10 : 15, '魔法攻擊力': lv === 1 ? 10 : 15 }),
  '精靈集中': (lv) => ({ 'BOSS 傷害': lv === 1 ? 4 : 7, '爆擊率': lv === 1 ? 4 : 7, '最大HP': lv === 1 ? 3 : 4, '最大MP': lv === 1 ? 3 : 4 }),
  '混合邏輯': (lv) => ({ '全屬性': lv === 1 ? 5 : 10 }),
  '致命的本能': (lv) => ({ '爆擊率': lv === 1 ? 10 : 15 }),
  '精靈的祝福': (lv) => ({ '獲得經驗值': lv === 1 ? 10 : 15 }),
  '自然之友': (lv) => ({ '傷害': lv === 1 ? 3 : 5 }),
  '自信': (lv) => ({ '無視防禦率': lv === 1 ? 5 : 10 }),
  '自信心': (lv) => ({ '無視防禦率': lv === 1 ? 5 : 10 }),
  '鋼鐵之牆': (lv) => ({ '最大HP': lv === 1 ? 5 : 10 }),
  '光之守護': (lv) => ({ '攻擊力': lv === 1 ? 10 : 15, '魔法攻擊力': lv === 1 ? 10 : 15 }),
  '海盜祝福': (lv) => ({ '全屬性': lv === 6 ? 70 : lv * 10, '最大HP': lv === 6 ? 15 : lv * 2, '最大MP': lv === 6 ? 15 : lv * 2 }),
  '西格諾斯祝福': (lv) => ({ '攻擊力': lv === 10 ? 25 : lv * 2, '魔法攻擊力': lv === 10 ? 25 : lv * 2, '狀態異常抗性': lv === 10 ? 15 : lv }),
  '鋼鐵之志': (lv) => ({ '最大HP': lv === 1 ? 10 : 15 }),
};

const CONDITIONAL_SKILLS = [
    '靈魂契約', '實戰的知識', '盜賊的狡詐', '集中狂攻', '商人的手段', 
    '戰鬥的流動', '無我', '貴族的修養', '事前準備', '天賦', 
    '守護者', '自由的精神', '亞蘭的祝福', '艾凡的祝福', '光之守護'
];

const ItemWithTooltip: React.FC<{ 
  icon?: string; name: string; level: number; sub?: string; borderColor?: string; textColor?: string;
}> = ({ icon, name, level, sub, borderColor = 'border-slate-700', textColor = 'text-blue-400' }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div 
      className={`bg-slate-900 p-2 rounded-lg border ${borderColor} flex flex-col items-center text-center relative group cursor-pointer select-none`}
      onClick={() => setIsOpen(!isOpen)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {icon ? <img src={icon} alt={name} className="w-8 h-8 mb-1 rounded z-10 object-contain" /> : <div className="w-8 h-8 mb-1 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-600 z-10">?</div>}
      <div className="text-xs text-slate-300 leading-tight z-10 truncate w-full px-1">{name}</div>
      <div className={`text-xs font-bold ${textColor} z-10`}>Lv.{level} {sub && <span className="text-[9px] text-slate-500">({sub})</span>}</div>
      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#1a1d24] border border-slate-600 rounded-lg shadow-2xl p-3 z-50 ${isOpen ? 'block' : 'hidden group-hover:block'} animate-in fade-in zoom-in-95 duration-200 pointer-events-none`}>
         <div className="flex flex-col items-center">
            {icon && <img src={icon} className="w-10 h-10 mb-2 bg-slate-800 rounded p-1" />}
            <div className="text-sm font-bold text-white mb-1 break-words w-full leading-tight">{name}</div>
            <div className={`text-xs font-bold ${textColor}`}>Lv.{level}</div>
         </div>
      </div>
    </div>
  );
};

const CharacterDetails: React.FC<CharacterDetailsProps> = ({ data, apiKey }) => {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  useEffect(() => {
    if (!data?.basic?.character_name || !apiKey) return;
    setHistoryLoading(true);
    import('../services/nexonService').then(({ fetchWeeklyHistory }) => {
      fetchWeeklyHistory(data.basic.character_name, apiKey)
        .then(history => setHistoryData(history || []))
        .catch(err => console.error('History fetch failed', err))
        .finally(() => setHistoryLoading(false));
    });
  }, [data?.basic?.character_name, apiKey]);

  // 邏輯保留：Android 裝備變數 (目前未在下方 JSX 中使用)
  const presetNo = data.equipment?.preset_no || 1;
  const androidEquipment = data.androidEquipment?.[`android_preset_${presetNo}`] || data.androidEquipment?.android_preset_1;

  const { union, unionArtifact, symbolEquipment, petEquipment, setEffect, vMatrix, hexaMatrix, hexaMatrixStat, dojo, linkSkill, skill0, skill1, skill2, skill3, skill4, skillHyper, skill5, skill6, hyperStat } = data;
  const [includeJanus, setIncludeJanus] = useState(true);

  const findSkillIcon = (name: string) => {
      if (!name) return undefined;
      const cleanName = name.replace(/ Node$/, '').split('/')[0].trim();
      const searchIn = (skills?: any) => {
          if (!skills) return undefined;
          let found = skills.character_skill.find((s: any) => s.skill_name === cleanName);
          if (!found) found = skills.character_skill.find((s: any) => cleanName.includes(s.skill_name) || s.skill_name.includes(cleanName));
          return found?.skill_icon;
      };
      return searchIn(skill6) || searchIn(skill5) || searchIn(skillHyper) || searchIn(skill4) || searchIn(skill3) || searchIn(skill2) || searchIn(skill1) || searchIn(skill0);
  };

  const calculateHexaStatValue = (name: string, level: number, isMain: boolean = false): number => {
    if (level === 0) return 0;
    let units = level;
    if (isMain && level <= 10) {
        const curve = [0, 1, 2, 3, 4, 6, 8, 10, 13, 16, 20];
        units = curve[level] || level;
    }
    let unitValue = 0;
    if (['STR', 'DEX', 'INT', 'LUK'].some(s => name.includes(s)) || name.includes('主要屬性')) unitValue = 100;
    else if (name.toLowerCase().includes('boss') || name.includes('無視') || name.includes('防禦')) unitValue = 1;
    else if (name.includes('爆擊傷害') || name.includes('Critical Damage')) unitValue = 0.35;
    else if (name === '傷害' || name === 'Damage') unitValue = 0.75;
    else if (name.includes('攻擊力') || name.includes('Attack') || name.includes('魔法') || name.includes('魔力')) unitValue = 5;
    return units * unitValue;
  };

  const getHexaStatValue = (name: string, level: number, isMain: boolean = false) => {
    const val = calculateHexaStatValue(name, level, isMain);
    if (val === 0 && level > 0) return `Lv.${level}`;
    if (val === 0) return '';
    const isPercent = name.toLowerCase().includes('boss') || name.includes('無視') || name.includes('防禦') || name.includes('爆擊傷害') || name.includes('Critical') || name === '傷害' || name === 'Damage';
    return isPercent ? `+${val.toFixed(2)}%` : `+${val}`;
  };

  return (
    // FIX: 最外層容器設定 - 手機版強制 flex-col (單欄垂直)，電腦版 lg 轉為 grid (雙欄)
    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 mt-6">

      {/* 近7天經驗值趨勢 + 極限屬性區塊 */}
      {/* w-full: 確保在 flex-col 下佔滿寬度。 lg:col-span-2: 電腦版佔滿兩格 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full lg:col-span-2">
        <div className="bg-[#161b22] p-6 rounded-xl min-w-0 h-full">
          <SectionHeader icon={<Star className="w-5 h-5 text-green-400" />} title="近7天經驗值趨勢" />
          <ExpTrendChart key={historyData.length} historyData={historyData} loading={historyLoading} />
        </div>
        <div className="bg-[#161b22] p-6 rounded-xl min-w-0 h-full">
          <HyperStatSection hyperStat={hyperStat} />
        </div>
      </div>

      {/* 連結技能 - w-full 確保不被擠壓 */}
      <div className="w-full lg:col-span-2 min-w-0">
        <LinkSkillSection linkSkill={linkSkill} />
      </div>

      {/* Union & Artifact */}
      <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner w-full min-w-0">
        <SectionHeader icon={<Layers />} title="聯盟 & 神器" />
        <div className="space-y-4">
          {union && (
            <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg">
              <span className="text-slate-400">聯盟等級</span>
              <div className="text-right">
                <div className="text-xl font-bold text-yellow-400">{union.union_level}</div>
                <div className="text-xs text-slate-500">{union.union_grade}</div>
              </div>
            </div>
          )}
           
          {unionArtifact && (
            <div className="space-y-2">
               <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-slate-400">神器等級</span>
                  <span className="text-xl font-bold text-purple-400">
                    {unionArtifact?.union_artifact_level ?? unionArtifact?.level ?? union?.union_artifact_level ?? '-'}
                  </span>
               </div>
               
               {/* FIX: 神器水晶列表 - 手機版單欄 (grid-cols-1)，sm 以上雙欄 */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                 {unionArtifact.union_artifact_crystal.map((crystal, idx) => (
                           <div key={idx} className="bg-slate-900/50 p-2 rounded border border-slate-700 text-xs flex flex-row items-center min-h-[90px]">
                             <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center">
                               <img src={artifactCrystalImages[idx]} alt={crystal.name} className="w-16 h-16 object-contain rounded bg-slate-800 border border-purple-400/40" />
                             </div>
                             <div className="flex-1 ml-2">
                               <div className="text-purple-300 font-bold mb-1">{crystal.name} Lv.{crystal.level}</div>
                               <div className="text-slate-500">{crystal.crystal_option_name_1}</div>
                               <div className="text-slate-500">{crystal.crystal_option_name_2}</div>
                               <div className="text-slate-500">{crystal.crystal_option_name_3}</div>
                             </div>
                           </div>
                 ))}
               </div>
               
               {/* 神器效果統計 */}
               {(() => {
                   const effects = unionArtifact.union_artifact_effect;
                   if (!effects || effects.length === 0) return null;
                   
                   const getStatValue = (name: string, lv: number) => {
                       if (name.match(/(?:Boss|BOSS).*傷害/i) || name === '傷害' || name === 'Damage') return lv <= 5 ? lv : 5 + (lv - 5) * 2;
                       if (name.includes('無視') || name.includes('Ignore') || name.includes('加持') || name.includes('Buff') || name.includes('爆擊率') || name.includes('Crit Rate')) return lv * 2;
                       if (name.includes('爆擊傷害') || name.includes('Crit Damage')) return lv * 0.4;
                       if (name.includes('攻擊力') || name.includes('Attack') || name.includes('魔法')) return lv * 3;
                       if (name.includes('全屬性') || name.includes('All Stat')) return lv <= 5 ? lv * 10 : 50 + (lv - 5) * 20;
                       if (name.includes('經驗值') || name.includes('Experience')) return lv <= 8 ? lv : 8 + (lv - 8) * 2;
                       return 0;
                   };
                   
                   const getCleanName = (name: string) => {
                       if (name.includes('全屬性')) return '全屬性';
                       if (name.match(/(?:Boss|BOSS).*傷害/i)) return 'BOSS 傷害';
                       if (name.includes('無視') && name.includes('防禦')) return '無視防禦率';
                       if (name.includes('爆擊傷害')) return '爆擊傷害';
                       if (name.includes('爆擊率') || name.includes('爆擊機率')) return '爆擊率';
                       if ((name.includes('攻擊力') || name.includes('Attack')) && (name.includes('魔力') || name.includes('Magic'))) return '攻擊力 & 魔力';
                       if (name.includes('攻擊力') || name.includes('Attack')) return '攻擊力';
                       if (name.includes('魔力') || name.includes('Magic')) return '魔法攻擊力';
                       if (name.includes('經驗值')) return '獲得經驗值';
                       if (name.includes('Buff') || name.includes('加持')) return 'Buff 持續時間';
                       if (name.includes('道具') || name.includes('掉落')) return '道具掉落率';
                       if (name.includes('楓幣')) return '楓幣獲得量';
                       if (name.includes('傷害')) return '傷害';
                       return name.replace(/[0-9.+\-%]/g, '').replace(/增加/g, '').trim();
                   };

                   return (
                       <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 mt-2">
                           <h4 className="text-xs font-bold text-purple-300 mb-2 flex items-center gap-2"><Star className="w-3 h-3 text-purple-400" /> 神器效果總和</h4>
                           
                           {/* FIX: 效果列表 - 手機版單欄，避免文字重疊 */}
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                               {effects.map((eff, idx) => {
                                   const val = getStatValue(eff.name, eff.level);
                                   if (val === 0) return null;
                                   const isPercent = !eff.name.includes('攻擊力') && !eff.name.includes('Attack') && !eff.name.includes('全屬性') && !eff.name.includes('All Stat');
                                   return (
                                       <div key={idx} className="flex justify-between items-center text-xs">
                                           <span className="text-slate-400">{getCleanName(eff.name)}</span>
                                           <span className="text-green-400 font-mono">+{isPercent ? val.toFixed(1).replace(/\.0$/, '') + '%' : val}</span>
                                       </div>
                                   );
                               })}
                           </div>
                       </div>
                   );
               })()}
            </div>
          )}
        </div>
      </div>

      {/* Symbols */}
      <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner w-full min-w-0">
        <SectionHeader icon={<Hexagon />} title="符文 & 力量" />
        {symbolEquipment && (
          // FIX: 符文列表 - 手機版 3 欄，sm 以上 4 欄
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {symbolEquipment.symbol.map((sym, idx) => (
              <ItemWithTooltip key={idx} icon={sym.symbol_icon} name={sym.symbol_name} level={sym.symbol_level} />
            ))}
          </div>
        )}
        {symbolEquipment && (() => {
          const parseApiNumber = (val: string | undefined | null): number => {
            if (!val) return 0;
            const cleanVal = String(val).replace(/[^0-9.-]/g, '');
            const num = Number(cleanVal);
            return isNaN(num) ? 0 : num;
          };
          const symbols = symbolEquipment.symbol || [];
          let arcData = { force: 0, stat: 0 };
          let autData = { force: 0, stat: 0 };
          let rates = { drop: 0, meso: 0, exp: 0 };
          symbols.forEach(sym => {
            const force = parseApiNumber(sym.symbol_force);
            const name = sym.symbol_name || '';
            const currentStatTotal = parseApiNumber(sym.symbol_str) + parseApiNumber(sym.symbol_dex) + parseApiNumber(sym.symbol_int) + parseApiNumber(sym.symbol_luk) + parseApiNumber(sym.symbol_hp);
            rates.drop += parseApiNumber(sym.symbol_drop_ratestring || sym.symbol_drop_rate);
            rates.meso += parseApiNumber(sym.symbol_meso_ratestring || sym.symbol_meso_rate);
            rates.exp += parseApiNumber(sym.symbol_exp_ratestring || sym.symbol_exp_rate);
            if (name.includes('神秘') || name.includes('祕法') || name.includes('Arcane')) {
              arcData.force += force;
              arcData.stat += currentStatTotal;
            } else if (name.includes('真實') || name.includes('異常') || name.includes('Authentic')) { 
              autData.force += force;
              autData.stat += currentStatTotal;
            }
          });
          const finalArcStat = data?.stat?.final_stat?.find((s: any) => s.stat_name === '神秘力量' || s.stat_name === 'Arcane Power');
          const finalAutStat = data?.stat?.final_stat?.find((s: any) => s.stat_name === '真實之力' || s.stat_name === 'Authentic Force');
          const finalArcValue = parseApiNumber(finalArcStat?.stat_value);
          const finalAutValue = parseApiNumber(finalAutStat?.stat_value);
          const arcDiff = Math.max(0, finalArcValue - arcData.force);
          const autDiff = Math.max(0, finalAutValue - autData.force);
          const hasRates = rates.drop > 0 || rates.meso > 0 || rates.exp > 0;

          return (
            <div className="bg-[#161b22] p-4 rounded-xl border border-slate-800 shadow-inner mt-4">
              <h4 className="text-xs font-bold text-slate-300 mb-4 flex items-center gap-2"><Hexagon className="w-4 h-4 text-slate-400" /> 符文詳細統計</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 flex flex-col justify-start min-h-[100px]">
                  <div className="text-purple-300 font-bold text-sm mb-3 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>ARC (神秘力量)</div>
                  <div className="flex justify-between items-end mb-2"><span className="text-slate-400 text-xs">力量總和</span><div className="flex items-baseline gap-1"><span className="text-2xl font-bold text-white font-mono">{arcData.force.toLocaleString()}</span>{arcDiff > 0 && <span className="text-xs font-bold text-green-400 font-mono" title={`來自公會技能/極限屬性/稱號: +${arcDiff}`}>+{arcDiff}</span>}</div></div>
                  <div className="flex justify-between items-end border-t border-purple-500/20 pt-2 mt-auto"><span className="text-slate-500 text-xs">屬性加成</span><span className="text-sm font-bold text-purple-400 font-mono">+{arcData.stat.toLocaleString()}</span></div>
                </div>
                <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4 flex flex-col justify-start min-h-[100px]">
                  <div className="text-cyan-300 font-bold text-sm mb-3 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>AUT (真實力量)</div>
                  <div className="flex justify-between items-end mb-2"><span className="text-slate-400 text-xs">力量總和</span><div className="flex items-baseline gap-1"><span className="text-2xl font-bold text-white font-mono">{autData.force.toLocaleString()}</span>{autDiff > 0 && <span className="text-xs font-bold text-green-400 font-mono" title={`來自公會技能/極限屬性/稱號: +${autDiff}`}>+{autDiff}</span>}</div></div>
                  <div className="flex justify-between items-end"><span className="text-slate-500 text-xs">屬性加成</span><span className="text-sm font-bold text-cyan-400 font-mono">+{autData.stat.toLocaleString()}</span></div>
                  {hasRates && (
                    <div className="mt-3 pt-2 border-t border-cyan-500/30 flex flex-col gap-1">
                      {rates.drop > 0 && <div className="flex justify-between items-center"><span className="text-slate-400 text-xs">道具掉落率</span><span className="font-mono text-sm font-bold text-green-400">+{rates.drop}%</span></div>}
                      {rates.meso > 0 && <div className="flex justify-between items-center"><span className="text-slate-400 text-xs">楓幣獲得量</span><span className="font-mono text-sm font-bold text-green-400">+{rates.meso}%</span></div>}
                      {rates.exp > 0 && <div className="flex justify-between items-center"><span className="text-slate-400 text-xs">經驗值獲得量</span><span className="font-mono text-sm font-bold text-yellow-400">+{rates.exp}%</span></div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Pets */}
      <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner w-full min-w-0">
        <SectionHeader icon={<PawPrint />} title="寵物資訊" />
        {petEquipment ? (
          <div className="space-y-3">
            {[1, 2, 3].map(num => {
              const petName = petEquipment[`pet_${num}_name` as keyof typeof petEquipment] as string;
              const petNick = petEquipment[`pet_${num}_nickname` as keyof typeof petEquipment] as string;
              const petIcon = petEquipment[`pet_${num}_icon` as keyof typeof petEquipment] as string;
              const petAuto = petEquipment[`pet_${num}_auto_skill` as keyof typeof petEquipment] as any;
              const petEquip = petEquipment[`pet_${num}_equipment` as keyof typeof petEquipment] as any;
              if (!petName) return null;
              return (
                <div key={num} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex items-center gap-3">
                  <img src={petIcon} alt={petName} className="w-10 h-10 object-contain bg-slate-800 rounded-full p-1 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-200 text-sm truncate">{petNick || petName}</div>
                    {petAuto && <div className="flex gap-1 mt-1">{petAuto.skill_1_icon && <img src={petAuto.skill_1_icon} className="w-4 h-4" />}{petAuto.skill_2_icon && <img src={petAuto.skill_2_icon} className="w-4 h-4" />}</div>}
                  </div>
                  {petEquip && (
                    <div className="relative group/equip shrink-0"><img src={petEquip.item_icon} className="w-8 h-8 bg-slate-800 rounded p-0.5 border border-slate-600" /></div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (<div className="text-slate-500 text-sm text-center py-4">無寵物資料</div>)}
      </div>

      {/* Dojo */}
      <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner w-full min-w-0">
           <SectionHeader icon={<Sword />} title="武陵道場" />
           {dojo ? (
             <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700"><span className="text-slate-400 text-sm">最高樓層</span><span className="text-xl font-bold text-red-400">{dojo.dojang_best_floor}F</span></div>
                <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700"><span className="text-slate-400 text-sm">通關時間</span><span className="text-lg font-bold text-slate-200">{Math.floor(dojo.dojang_best_time / 60)}分 {dojo.dojang_best_time % 60}秒</span></div>
                <div className="text-right text-xs text-slate-500 mt-1">紀錄日期: {dojo.date_dojang_record ? dojo.date_dojang_record.split('T')[0] : '-'}</div>
             </div>
           ) : (<div className="text-slate-500 text-sm text-center py-10">無武陵道場紀錄</div>)}
      </div>

      {/* Set Effects */}
      <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner w-full min-w-0">
        <SectionHeader icon={<Crown />} title="套裝效果" />
        <div className="space-y-3">
          {setEffect?.set_effect.map((set, idx) => (
            <div key={idx} className="bg-slate-900/50 p-3 rounded border border-slate-700">
              <div className="flex justify-between items-center mb-2"><span className="font-bold text-green-400">{set.set_name}</span><span className="text-xs bg-green-900/30 text-green-300 px-2 py-0.5 rounded-full">{set.total_set_count} 套裝</span></div>
              <div className="text-xs text-slate-400 space-y-1">{set.set_effect_info.map((info, i) => (<div key={i} className="flex gap-2"><span className="text-slate-500 w-8 shrink-0">{info.set_count}件:</span><span>{info.set_option}</span></div>))}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills (V/Hexa) */}
      <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner w-full min-w-0">
        {hexaMatrix && hexaMatrix.character_hexa_core_equipment && hexaMatrix.character_hexa_core_equipment.length > 0 && (
          <div className="mb-6">
            {(() => {
                const progress = calculateHexaProgress(hexaMatrix, includeJanus);
                return (
                    <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-4 gap-4">
                        <div>
                            <SectionHeader icon={<Zap />} title="核心技能 (V/Hexa)" />
                            <div className="flex items-center gap-3 mt-1">
                              <h4 className="text-sm font-bold text-purple-400">HEXA 矩陣</h4>
                              <button onClick={() => setIncludeJanus(!includeJanus)} className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 transition-all ${includeJanus ? 'bg-purple-900/40 text-purple-300 border-purple-700/50 hover:bg-purple-900/60' : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700 hover:text-slate-400'}`}>
                                {includeJanus ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                                {includeJanus ? '計算靈魂亞努斯' : '排除靈魂亞努斯'}
                              </button>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-400 font-mono mb-1">技能進度: <span className="text-white font-bold">{progress.percent.toFixed(1)}%</span> <span className="text-slate-500">({progress.current.toLocaleString()} / {progress.total.toLocaleString()} 碎片)</span></div>
                            <div className="w-full md:w-80 h-1.5 bg-slate-800 rounded-full overflow-hidden ml-auto mb-1.5 border border-slate-700"><div className="h-full bg-gradient-to-r from-purple-600 via-pink-500 to-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.6)]" style={{ width: `${Math.min(progress.percent, 100)}%` }} /></div>
                            <div className="text-[10px] text-slate-400 font-mono bg-slate-900/50 inline-block px-2 py-1 rounded border border-slate-800"><span className="text-slate-500 mr-1">距離滿級還需:</span><span className="text-purple-400 font-bold">{progress.remainingFragments.toLocaleString()}</span> 碎片 / <span className="text-blue-400 font-bold ml-1">{progress.remainingErda.toLocaleString()}</span> 靈魂艾爾達</div>
                        </div>
                    </div>
                );
            })()}
            {/* FIX: 核心技能列表 - 手機版 3 欄，sm 以上 4 欄 */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {hexaMatrix.character_hexa_core_equipment.map((core, idx) => (
                   <ItemWithTooltip key={idx} icon={findSkillIcon(core.hexa_core_name)} name={core.hexa_core_name} level={core.hexa_core_level} borderColor="border-purple-900/30" textColor="text-purple-400" />
              ))}
            </div>
          </div>
        )}
        {(!hexaMatrix || !hexaMatrix.character_hexa_core_equipment || hexaMatrix.character_hexa_core_equipment.length === 0) && <SectionHeader icon={<Zap />} title="核心技能 (V/Hexa)" />}
        {vMatrix && vMatrix.character_v_core_equipment && (
          <div className="mt-6">
            <h4 className="text-sm font-bold text-blue-400 mb-2">V 矩陣</h4>
            {/* FIX: V 矩陣 - 手機版 3 欄，sm 以上 4 欄 */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
               {vMatrix.character_v_core_equipment.sort((a, b) => b.slot_level - a.slot_level).map((core, idx) => (
                   <ItemWithTooltip key={idx} icon={findSkillIcon(core.v_core_name)} name={core.v_core_name} level={core.v_core_level} sub={core.slot_level.toString()} textColor="text-blue-400" />
               ))}
            </div>
          </div>
        )}
      </div>

      {/* HEXA Stats - w-full + min-w-0 */}
      {hexaMatrixStat && (
        <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner w-full lg:col-span-2 min-w-0">
            <SectionHeader icon={<Hexagon />} title="HEXA 屬性" />
            {(() => {
                const totals: Record<string, number> = {};
                const cores = [hexaMatrixStat.character_hexa_stat_core?.[0], hexaMatrixStat.character_hexa_stat_core_2?.[0], hexaMatrixStat.character_hexa_stat_core_3?.[0]].filter(Boolean);
                cores.forEach(core => {
                    if (!core) return;
                    const addStat = (name: string, level: number, isMain: boolean = false) => {
                        if (!name || level === 0) return;
                        const val = calculateHexaStatValue(name, level, isMain);
                        totals[name] = (totals[name] || 0) + val;
                    };
                    addStat(core.main_stat_name, core.main_stat_level, true);
                    addStat(core.sub_stat_name_1, core.sub_stat_level_1);
                    addStat(core.sub_stat_name_2, core.sub_stat_level_2);
                });
                if (Object.keys(totals).length === 0) return null;
                return (
                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-6">
                        <h4 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> 屬性總和</h4>
                        {/* FIX: Hexa 屬性總和 - 手機版單欄 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {Object.entries(totals).map(([name, val], idx) => {
                                const isPercent = name.toLowerCase().includes('boss') || name.includes('無視') || name.includes('防禦') || name.includes('爆擊傷害') || name.includes('Critical') || name === '傷害' || name === 'Damage';
                                return (
                                    <div key={name} className="bg-slate-900/50 px-3 py-2 rounded border border-purple-500/20 flex justify-between items-center">
                                        <span className="text-xs text-slate-300">{name.replace(/boss/gi, 'BOSS')}</span>
                                        <span className="text-sm font-bold text-green-400 font-mono">+{isPercent ? val.toFixed(2) + '%' : val}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((coreIndex) => {
                    let stat = undefined;
                    if (coreIndex === 0 && hexaMatrixStat.character_hexa_stat_core && hexaMatrixStat.character_hexa_stat_core.length > 0) stat = hexaMatrixStat.character_hexa_stat_core[0];
                    else if (coreIndex === 1 && hexaMatrixStat.character_hexa_stat_core_2 && hexaMatrixStat.character_hexa_stat_core_2.length > 0) stat = hexaMatrixStat.character_hexa_stat_core_2[0];
                    else if (coreIndex === 2 && hexaMatrixStat.character_hexa_stat_core_3 && hexaMatrixStat.character_hexa_stat_core_3.length > 0) stat = hexaMatrixStat.character_hexa_stat_core_3[0];
                    
                    if (!stat) {
                        return (
                            <div key={coreIndex} className="bg-slate-900/30 p-4 rounded-lg border border-slate-800/50 flex flex-col items-center justify-center min-h-[200px] opacity-50">
                                <Hexagon className="w-8 h-8 text-slate-700 mb-2" />
                                <div className="text-sm font-bold text-slate-600">HEXA 屬性核心 {coreIndex + 1}</div>
                                <div className="text-xs text-slate-700">未解鎖或無資料</div>
                            </div>
                        );
                    }
                    return (
                        <div key={coreIndex} className="bg-slate-900/80 p-4 rounded-lg border border-purple-500/30 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-bl font-bold">階級 {stat.stat_grade}</div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]"><Hexagon className="w-6 h-6 text-purple-400" /></div>
                                <div><div className="text-sm font-bold text-purple-300">HEXA 屬性核心 {coreIndex + 1}</div><div className="text-xs text-slate-500">欄位 {stat.slot_id}</div></div>
                            </div>
                            <div className="space-y-2">
                                <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                                    <div className="flex justify-between items-center mb-1"><span className="text-xs text-slate-300 font-bold">MAIN STAT</span><span className="text-xs font-bold text-purple-400">Lv.{stat.main_stat_level}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-sm text-white">{stat.main_stat_name.replace(/boss/gi, 'BOSS')}</span><span className="text-sm text-green-400 font-mono">{getHexaStatValue(stat.main_stat_name, stat.main_stat_level, true)}</span></div>
                                    <div className="w-full h-1 bg-slate-800 mt-1 rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{ width: `${(stat.main_stat_level / 10) * 100}%` }}></div></div>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                                        <div className="flex justify-between items-center mb-1"><span className="text-[10px] text-slate-400 font-bold">ADDITIONAL STAT</span><span className="text-xs font-bold text-blue-400">Lv.{stat.sub_stat_level_1}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-xs text-slate-200">{stat.sub_stat_name_1.replace(/boss/gi, 'BOSS')}</span><span className="text-xs text-green-400 font-mono">{getHexaStatValue(stat.sub_stat_name_1, stat.sub_stat_level_1)}</span></div>
                                        <div className="w-full h-1 bg-slate-800 mt-1 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${(stat.sub_stat_level_1 / 10) * 100}%` }}></div></div>
                                    </div>
                                    <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                                        <div className="flex justify-between items-center mb-1"><span className="text-[10px] text-slate-400 font-bold">ADDITIONAL STAT</span><span className="text-xs font-bold text-blue-400">Lv.{stat.sub_stat_level_2}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-xs text-slate-200">{stat.sub_stat_name_2.replace(/boss/gi, 'BOSS')}</span><span className="text-xs text-green-400 font-mono">{getHexaStatValue(stat.sub_stat_name_2, stat.sub_stat_level_2)}</span></div>
                                        <div className="w-full h-1 bg-slate-800 mt-1 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${(stat.sub_stat_level_2 / 10) * 100}%` }}></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}
    </div>
  );
};

// --- Link Skill Section (強制 w-full + min-w-0) ---
const LinkSkillSection = ({ linkSkill }: { linkSkill: any }) => {
  const activePresetNo = parseInt(linkSkill.preset_no || '1');
  const [selectedPreset, setSelectedPreset] = useState(activePresetNo || 1);
  useEffect(() => setSelectedPreset(activePresetNo || 1), [linkSkill]);
  const getPresetSkills = () => { return linkSkill[`character_link_skill_preset_${selectedPreset}`] || []; };
  const ownedSkill = linkSkill.character_owned_link_skill;
  const currentSkills = getPresetSkills();
  const totals: Record<string, number> = {};
  const addStat = (name: string, val: number) => { totals[name] = (totals[name] || 0) + val; };
  const skillsToCalculate = [...currentSkills];
  if (ownedSkill) skillsToCalculate.unshift(ownedSkill);
  skillsToCalculate.forEach(skill => {
      if (CONDITIONAL_SKILLS.includes(skill.skill_name)) return;
      if (skill.skill_name === '連續擊殺優勢' || skill.skill_name === '連續擊殺優勢（狂狼勇士）') return;
      let matched = false;
      const desc = skill.skill_effect || skill.skill_description;
      if (desc) {
          const patterns = [
              { regex: /(?:Boss|BOSS).*(?:傷害|攻擊力)[^0-9]*(\d+)%?/i, name: 'BOSS 傷害' },
              { regex: /無視.*防禦率\s*(?:\+|:)?\s*(\d+)%?/, name: '無視防禦率' },
              { regex: /(\d+)%?\s*爆擊(?:機)?率/, name: '爆擊率' },
              { regex: /爆擊(?:機)?率\s*(?:\+|:)?\s*(\d+)%?/, name: '爆擊率' },
              { regex: /(\d+)%?\s*爆擊傷害/, name: '爆擊傷害' },
              { regex: /爆擊傷害\s*(?:\+|:)?\s*(\d+)%?/, name: '爆擊傷害' },
              { regex: /最大(?:增加)?\s*HP\s*(?:\+|:)?\s*(\d+)%/, name: '最大HP' },
              { regex: /最大(?:增加)?\s*MP\s*(?:\+|:)?\s*(\d+)%/, name: '最大MP' },
              { regex: /(?:全屬性|所有屬性)\s*(?:\+|:)?\s*(\d+)/, name: '全屬性' },
              { regex: /魔法攻擊力\s*(?:\+|:)?\s*(\d+)/, name: '魔法攻擊力' },
              { regex: /攻擊力\s*(?:\+|:)?\s*(\d+)/, name: '攻擊力', exclude: ['Boss', 'BOSS', '魔法'] },
              { regex: /經驗值.*?(\d+)%?/, name: '獲得經驗值' },
              { regex: /狀態異常抗性\s*(?:\+|:)?\s*(\d+)/, name: '狀態異常抗性' },
              { regex: /(\d+)%?\s*傷害/, name: '傷害', exclude: ['Boss', 'BOSS', '爆擊', '受到'] },
              { regex: /傷害\s*(?:\+|:)?\s*(\d+)%?/, name: '傷害', exclude: ['Boss', 'BOSS', '爆擊', '受到'] },
          ];
          patterns.forEach(p => {
              if (p.exclude && p.exclude.some(ex => desc.toLowerCase().includes(ex.toLowerCase()))) return;
              const match = desc.match(p.regex);
              if (match) { addStat(p.name, parseInt(match[1], 10)); matched = true; }
          });
          if (desc.includes('STR') && desc.includes('DEX') && desc.match(/\+(\d+)/)) {
              const match = desc.match(/\+(\d+)/);
              if (match) { addStat('全屬性', parseInt(match[1], 10)); matched = true; }
          }
      }
      if (!matched && LINK_SKILL_DATA[skill.skill_name]) {
          const stats = LINK_SKILL_DATA[skill.skill_name](skill.skill_level);
          Object.entries(stats).forEach(([key, val]) => addStat(key, val));
      }
  });

  return (
    // FIX: 連結技能區塊 - 手機版強制 min-w-0
    <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner w-full min-w-0 h-full">
      <SectionHeader icon={<Zap />} title="連結技能 (Link Skills)" presetState={{ current: selectedPreset, setCurrent: setSelectedPreset, active: activePresetNo }} />
      {Object.keys(totals).length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-bold text-yellow-300 mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> 連結技能總和 (估算)</h4>
            {/* FIX: 連結技能總和 - 手機版單欄 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(totals).map(([name, val], idx) => {
                    const isPercent = ['BOSS 傷害', '無視防禦率', '爆擊率', '爆擊傷害', '最大HP', '最大MP', '獲得經驗值', '傷害'].includes(name);
                    return (
                        <div key={idx} className="bg-slate-900/50 px-3 py-2 rounded border border-yellow-500/20 flex justify-between items-center">
                            <span className="text-xs text-slate-300">{name}</span>
                            <span className="text-sm font-bold text-green-400 font-mono">+{isPercent ? val + '%' : val}</span>
                        </div>
                    );
                })}
            </div>
            <div className="mt-2 text-[10px] text-slate-500 text-right">* 數值為文字分析估算，可能包含部分誤差或未列入特殊效果</div>
        </div>
      )}
      {((currentSkills && currentSkills.length > 0) || ownedSkill) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ownedSkill && (
              <div className="bg-slate-900/50 p-3 rounded-lg border border-yellow-500/50 flex gap-3 items-start relative overflow-hidden group">
                  <div className="absolute top-0 right-0 bg-yellow-600/80 text-white text-[10px] px-2 py-0.5 rounded-bl font-bold backdrop-blur-sm">Lv.{ownedSkill.skill_level}</div>
                  <img src={ownedSkill.skill_icon} alt={ownedSkill.skill_name} className="w-10 h-10 rounded bg-slate-800 p-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                  <div className="mb-1 pr-8 flex items-center gap-2">
                      <span className="font-bold text-yellow-200 text-sm truncate block">{ownedSkill.skill_name}</span>
                      <span className="text-[10px] bg-yellow-900/50 text-yellow-400 px-1 rounded border border-yellow-700/50">Own</span>
                  </div>
                  <div className="text-xs leading-tight">
                      {ownedSkill.skill_effect && <p className="text-green-400 mb-1 line-clamp-2" title={ownedSkill.skill_effect}>{ownedSkill.skill_effect.replace(/\\n/g, ' ')}</p>}
                      <p className="text-slate-400 line-clamp-2" title={ownedSkill.skill_description}>{ownedSkill.skill_description.replace(/\\n/g, ' ')}</p>
                  </div>
                  </div>
              </div>
          )}
          {currentSkills.map((skill: any, idx: number) => (
            <div key={idx} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex gap-3 items-start relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-yellow-600/80 text-white text-[10px] px-2 py-0.5 rounded-bl font-bold backdrop-blur-sm">Lv.{skill.skill_level}</div>
              <img src={skill.skill_icon} alt={skill.skill_name} className="w-10 h-10 rounded bg-slate-800 p-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="mb-1 pr-8"><span className="font-bold text-slate-200 text-sm truncate block">{skill.skill_name}</span></div>
                <div className="text-xs leading-tight">
                  {skill.skill_effect && <p className="text-green-400 mb-1 line-clamp-2" title={skill.skill_effect}>{skill.skill_effect.replace(/\\n/g, ' ')}</p>}
                  <p className="text-slate-400 line-clamp-2" title={skill.skill_description}>{skill.skill_description.replace(/\\n/g, ' ')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (<div className="text-slate-500 text-sm text-center py-4">無連結技能資料</div>)}
    </div>
  );
};

// --- Hyper Stat Section (強制 w-full) ---
const HyperStatSection = ({ hyperStat }: { hyperStat: any }) => {
  const activePresetNo = parseInt(hyperStat.preset_no || '1');
  const [selectedPreset, setSelectedPreset] = useState(activePresetNo || 1);
  useEffect(() => setSelectedPreset(activePresetNo || 1), [hyperStat]);
  const getPresetStats = () => { return hyperStat[`hyper_stat_preset_${selectedPreset}`] || []; };
  const getRemainPoints = () => { return hyperStat[`hyper_stat_preset_${selectedPreset}_remain_point`] || 0; };
  const activeStats = getPresetStats().filter((stat: any) => stat.stat_level > 0).sort((a: any, b: any) => b.stat_level - a.stat_level);
  const hyperStatValueTable: Record<string, (lv: number) => string | number> = {
    'STR': lv => lv <= 5 ? lv * 30 : 150 + (lv - 5) * 35,
    'DEX': lv => lv <= 5 ? lv * 30 : 150 + (lv - 5) * 35,
    'INT': lv => lv <= 5 ? lv * 30 : 150 + (lv - 5) * 35,
    'LUK': lv => lv <= 5 ? lv * 30 : 150 + (lv - 5) * 35,
    'HP': lv => lv <= 5 ? lv * 250 : 1250 + (lv - 5) * 275,
    'MP': lv => lv <= 5 ? lv * 250 : 1250 + (lv - 5) * 275,
    '全屬性': lv => lv <= 5 ? lv * 10 : 50 + (lv - 5) * 20,
    '攻擊力': lv => lv <= 5 ? lv * 3 : 15 + (lv - 5) * 4,
    '魔法攻擊力': lv => lv <= 5 ? lv * 3 : 15 + (lv - 5) * 4,
    '爆擊率': lv => lv <= 5 ? lv * 1 : 5 + (lv - 5) * 2,
    '爆擊傷害': lv => lv <= 5 ? lv * 1 : 5 + (lv - 5) * 2,
    '無視防禦率': lv => lv <= 5 ? lv * 3 : 15 + (lv - 5) * 4,
    'BOSS傷害': lv => lv <= 5 ? lv * 3 : 15 + (lv - 5) * 4,
    '傷害': lv => lv <= 5 ? lv * 3 : 15 + (lv - 5) * 4,
    '獲得經驗值': lv => lv * 0.5,
  };
  const getHyperStatValue = (type: string, lv: number) => {
    const key = Object.keys(hyperStatValueTable).find(k => type.includes(k));
    if (!key) return '';
    const val = hyperStatValueTable[key](lv);
    if (["爆擊率","爆擊傷害","無視防禦率","BOSS傷害","傷害","全屬性","獲得經驗值"].some(k=>type.includes(k))) return `+${val}%`;
    return `+${val}`;
  };

  return (
    <>
      <SectionHeader icon={<CheckSquare />} title="極限屬性 (Hyper Stats)" presetState={{ current: selectedPreset, setCurrent: setSelectedPreset, active: activePresetNo }} />
      <div className="flex justify-between items-center mb-4 px-1"><span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">剩餘點數: <span className="text-indigo-400 font-mono font-bold">{getRemainPoints()}</span></span></div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-4">
        {activeStats.map((stat: any, idx: number) => (
          <div key={idx} className="flex justify-between items-center bg-[#0d1117] px-3 py-2 rounded text-sm border border-slate-700/50 hover:border-indigo-500/50 transition-colors">
            <span className="text-slate-300 whitespace-nowrap">{stat.stat_type}<span className="font-bold text-green-400 font-mono ml-1">{getHyperStatValue(stat.stat_type, stat.stat_level)}</span></span>
            <span className="font-bold text-indigo-400 font-mono whitespace-nowrap">Lv.{stat.stat_level}</span>
          </div>
        ))}
        {activeStats.length === 0 && <div className="col-span-full text-center text-slate-500 py-6 bg-[#0d1117] rounded-lg border border-slate-800 border-dashed text-sm">此預設未配置屬性</div>}
      </div>
    </>
  );
};

export default CharacterDetails;
