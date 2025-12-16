import React, { useState, useEffect } from 'react';
import { DashboardData } from '../types';
import { Zap, Star, Crown, Layers, PawPrint, Hexagon, Sword } from 'lucide-react';

interface CharacterDetailsProps {
  data: DashboardData;
}

// 修改後的標題元件：支援內嵌預設按鈕 (1, 2, 3)，且移除了下方分隔線
const SectionHeader: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  presetState?: {
    current: number;
    setCurrent: (n: number) => void;
    active?: number;
  }
}> = ({ icon, title, presetState }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <div className="text-yellow-500">{icon}</div>
      <h3 className="text-lg font-bold text-slate-200">{title}</h3>
    </div>
    
    {/* 緊湊型預設按鈕 (只顯示 1, 2, 3) */}
    {presetState && (
      <div className="flex gap-1">
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
            {/* 綠點：標示遊戲內實際生效的預設 */}
            {presetState.active === num && (
               <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 border-2 border-slate-900 rounded-full"></span>
            )}
          </button>
        ))}
      </div>
    )}
  </div>
);

// --- Link Skill Data Logic ---
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
  '精靈的祝福': (lv) => ({ '經驗值獲得量': lv === 1 ? 10 : 15 }),
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
  icon?: string; 
  name: string; 
  level: number; 
  sub?: string; 
  borderColor?: string;
  textColor?: string;
}> = ({ icon, name, level, sub, borderColor = 'border-slate-700', textColor = 'text-blue-400' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className={`bg-slate-900 p-2 rounded-lg border ${borderColor} flex flex-col items-center text-center relative group cursor-pointer select-none`}
      onClick={() => setIsOpen(!isOpen)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {icon ? (
          <img src={icon} alt={name} className="w-8 h-8 mb-1 rounded z-10 object-contain" />
      ) : (
          <div className="w-8 h-8 mb-1 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-600 z-10">?</div>
      )}
      
      <div className="text-xs text-slate-300 leading-tight z-10 truncate w-full px-1">{name}</div>
      <div className={`text-xs font-bold ${textColor} z-10`}>
        Lv.{level} {sub && <span className="text-[9px] text-slate-500">({sub})</span>}
      </div>

      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#1a1d24] border border-slate-600 rounded-lg shadow-2xl p-3 z-50 
                      ${isOpen ? 'block' : 'hidden group-hover:block'} animate-in fade-in zoom-in-95 duration-200 pointer-events-none`}>
         <div className="flex flex-col items-center">
            {icon && <img src={icon} className="w-10 h-10 mb-2 bg-slate-800 rounded p-1" />}
            <div className="text-sm font-bold text-white mb-1 break-words w-full leading-tight">{name}</div>
            <div className={`text-xs font-bold ${textColor}`}>Lv.{level}</div>
         </div>
      </div>
    </div>
  );
};

const CharacterDetails: React.FC<CharacterDetailsProps> = ({ data }) => {
  const { 
    union, unionArtifact, symbolEquipment, petEquipment, setEffect, 
    vMatrix, hexaMatrix, hexaMatrixStat, dojo, linkSkill, 
    skill0, skill1, skill2, skill3, skill4, skillHyper, skill5, skill6,
    hyperStat 
  } = data;

  const findSkillIcon = (name: string) => {
      if (!name) return undefined;
      const cleanName = name.replace(/ Node$/, '').split('/')[0].trim();
      const searchIn = (skills?: any) => {
          if (!skills) return undefined;
          let found = skills.character_skill.find((s: any) => s.skill_name === cleanName);
          if (!found) found = skills.character_skill.find((s: any) => cleanName.includes(s.skill_name) || s.skill_name.includes(cleanName));
          return found?.skill_icon;
      };
      return searchIn(skill6) || searchIn(skill5) || searchIn(skillHyper) || 
             searchIn(skill4) || searchIn(skill3) || searchIn(skill2) || 
             searchIn(skill1) || searchIn(skill0);
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
    const isPercent = name.toLowerCase().includes('boss') || name.includes('無視') || name.includes('防禦') || 
                      name.includes('爆擊傷害') || name.includes('Critical') || 
                      name === '傷害' || name === 'Damage';
    return isPercent ? `+${val.toFixed(2)}%` : `+${val}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      
      {/* 連結技能 & 極限屬性 (左右並排) */}
      <LinkSkillSection linkSkill={linkSkill} />
      <HyperStatSection hyperStat={hyperStat} />

      {/* Union & Artifact */}
      <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner">
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
               <div className="grid grid-cols-2 gap-2">
                 {unionArtifact.union_artifact_crystal.map((crystal, idx) => (
                   <div key={idx} className="bg-slate-900/50 p-2 rounded border border-slate-700 text-xs">
                     <div className="text-purple-300 font-bold mb-1">{crystal.name} Lv.{crystal.level}</div>
                     <div className="text-slate-500">{crystal.crystal_option_name_1}</div>
                     <div className="text-slate-500">{crystal.crystal_option_name_2}</div>
                     <div className="text-slate-500">{crystal.crystal_option_name_3}</div>
                   </div>
                 ))}
               </div>

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
                       if (name.includes('經驗值')) return '經驗值獲得量';
                       if (name.includes('Buff') || name.includes('加持')) return 'Buff 持續時間';
                       if (name.includes('道具') || name.includes('掉落')) return '道具掉落率';
                       if (name.includes('楓幣')) return '楓幣獲得量';
                       if (name.includes('傷害')) return '傷害';
                       return name.replace(/[0-9.+\-%]/g, '').replace(/增加/g, '').trim();
                   };

                   return (
                       <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 mt-2">
                           <h4 className="text-xs font-bold text-purple-300 mb-2 flex items-center gap-2">
                               <Star className="w-3 h-3 text-purple-400" /> 神器效果總和
                           </h4>
                           <div className="grid grid-cols-2 gap-2">
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
      <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner">
        <SectionHeader icon={<Hexagon />} title="符文 & 力量" />
        {symbolEquipment && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {symbolEquipment.symbol.map((sym, idx) => (
              <ItemWithTooltip 
                key={idx}
                icon={sym.symbol_icon}
                name={sym.symbol_name}
                level={sym.symbol_level}
              />
            ))}
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-4">
           <div className="bg-slate-800/50 p-3 rounded text-center">
              <div className="text-xs text-slate-400">神秘力量 (ARC)</div>
              <div className="text-xl font-bold text-blue-400">
                {data.stat.final_stat.find(s => s.stat_name === '神秘力量' || s.stat_name === 'Arcane Power')?.stat_value || 0}
              </div>
           </div>
           <div className="bg-slate-800/50 p-3 rounded text-center">
              <div className="text-xs text-slate-400">真實力量 (AUT)</div>
              <div className="text-xl font-bold text-orange-400">
                {data.stat.final_stat.find(s => s.stat_name === '真實之力' || s.stat_name === 'Authentic Force')?.stat_value || 0}
              </div>
           </div>
        </div>
      </div>

      {/* Pets */}
      <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner">
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
                    {petAuto && (
                      <div className="flex gap-1 mt-1">
                        {petAuto.skill_1_icon && <img src={petAuto.skill_1_icon} title={petAuto.skill_1} className="w-4 h-4" />}
                        {petAuto.skill_2_icon && <img src={petAuto.skill_2_icon} title={petAuto.skill_2} className="w-4 h-4" />}
                      </div>
                    )}
                  </div>
                  {petEquip && (
                    <div className="relative group/equip shrink-0">
                      <img src={petEquip.item_icon} alt={petEquip.item_name} className="w-8 h-8 bg-slate-800 rounded p-0.5 border border-slate-600 cursor-help" />
                      <div className="absolute bottom-full right-0 mb-2 w-64 bg-[#1a1d24] border border-slate-600 rounded-lg shadow-2xl p-0 z-50 hidden group-hover/equip:block overflow-hidden">
                        <div className="bg-[#15171c] p-2 border-b border-slate-700">
                           <div className="text-xs font-bold text-white text-center">{petEquip.item_name}</div>
                        </div>
                        <div className="p-3 flex gap-3 items-start">
                           <img src={petEquip.item_icon} className="w-10 h-10 bg-[#121418] rounded p-1" />
                           <div className="text-[10px] text-slate-300 leading-relaxed">
                              {petEquip.item_description || '無說明'}
                              {petEquip.item_option && Array.isArray(petEquip.item_option) && (
                                <div className="mt-2 pt-2 border-t border-slate-700">
                                  {petEquip.item_option.map((opt: any, i: number) => (
                                    <div key={i} className="text-white">{opt.option_type}: +{opt.option_value}</div>
                                  ))}
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
           <div className="text-slate-500 text-sm text-center py-4">無寵物資料</div>
        )}
      </div>

      {/* Dojo */}
      <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner">
           <SectionHeader icon={<Sword />} title="武陵道場" />
           {dojo ? (
             <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                   <span className="text-slate-400 text-sm">最高樓層</span>
                   <span className="text-xl font-bold text-red-400">{dojo.dojang_best_floor}F</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                   <span className="text-slate-400 text-sm">通關時間</span>
                   <span className="text-lg font-bold text-slate-200">{Math.floor(dojo.dojang_best_time / 60)}分 {dojo.dojang_best_time % 60}秒</span>
                </div>
                <div className="text-right text-xs text-slate-500 mt-1">
                   紀錄日期: {dojo.date_dojang_record ? dojo.date_dojang_record.split('T')[0] : '-'}
                </div>
             </div>
           ) : (
             <div className="text-slate-500 text-sm text-center py-10">無武陵道場紀錄</div>
           )}
      </div>

      {/* Set Effects */}
      <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner">
        <SectionHeader icon={<Crown />} title="套裝效果" />
        <div className="space-y-3">
          {setEffect?.set_effect.map((set, idx) => (
            <div key={idx} className="bg-slate-900/50 p-3 rounded border border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-green-400">{set.set_name}</span>
                <span className="text-xs bg-green-900/30 text-green-300 px-2 py-0.5 rounded-full">
                  {set.total_set_count} 套裝
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                  {set.set_effect_info.map((info, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-slate-500 w-8 shrink-0">{info.set_count}件:</span>
                      <span>{info.set_option}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills (V/Hexa) */}
      <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner">
        <SectionHeader icon={<Zap />} title="核心技能 (V/Hexa)" />
        {hexaMatrix && hexaMatrix.character_hexa_core_equipment && hexaMatrix.character_hexa_core_equipment.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
                <h4 className="text-sm font-bold text-purple-400">HEXA 矩陣</h4>
                {(() => {
                    const totalLevel = hexaMatrix.character_hexa_core_equipment.reduce((acc, curr) => acc + curr.hexa_core_level, 0);
                    const maxLevel = hexaMatrix.character_hexa_core_equipment.length * 30;
                    const progress = maxLevel > 0 ? (totalLevel / maxLevel) * 100 : 0;
                    return (
                        <div className="text-right">
                            <div className="text-xs text-purple-300 font-mono">
                                進度: {progress.toFixed(1)}% <span className="text-slate-500">({totalLevel}/{maxLevel})</span>
                            </div>
                        </div>
                    );
                })()}
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {hexaMatrix.character_hexa_core_equipment.map((core, idx) => {
                const icon = findSkillIcon(core.hexa_core_name);
                return (
                   <ItemWithTooltip 
                      key={idx}
                      icon={icon}
                      name={core.hexa_core_name}
                      level={core.hexa_core_level}
                      borderColor="border-purple-900/30"
                      textColor="text-purple-400"
                   />
                );
              })}
            </div>
          </div>
        )}

        {vMatrix && vMatrix.character_v_core_equipment && (
          <div>
            <h4 className="text-sm font-bold text-blue-400 mb-2">V 矩陣</h4>
            <div className="grid grid-cols-4 gap-2">
               {vMatrix.character_v_core_equipment
                 .sort((a, b) => b.slot_level - a.slot_level)
                 .map((core, idx) => {
                 const icon = findSkillIcon(core.v_core_name);
                 return (
                   <ItemWithTooltip 
                      key={idx}
                      icon={icon}
                      name={core.v_core_name}
                      level={core.v_core_level}
                      sub={core.slot_level.toString()}
                      textColor="text-blue-400"
                   />
                 );
               })}
            </div>
          </div>
        )}
      </div>

      {/* HEXA Stats */}
      {hexaMatrixStat && (
        <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner lg:col-span-2">
            <SectionHeader icon={<Hexagon />} title="HEXA 屬性" />
            
            {(() => {
                const totals: Record<string, number> = {};
                const cores = [
                    hexaMatrixStat.character_hexa_stat_core?.[0],
                    hexaMatrixStat.character_hexa_stat_core_2?.[0],
                    hexaMatrixStat.character_hexa_stat_core_3?.[0]
                ].filter(Boolean);

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
                        <h4 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400" /> 屬性總和
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {Object.entries(totals).map(([name, val], idx) => {
                                const isPercent = name.toLowerCase().includes('boss') || name.includes('無視') || name.includes('防禦') || 
                                                  name.includes('爆擊傷害') || name.includes('Critical') || 
                                                  name === '傷害' || name === 'Damage';
                                return (
                                    <div key={name} className="bg-slate-900/50 px-3 py-2 rounded border border-purple-500/20 flex justify-between items-center">
                                        <span className="text-xs text-slate-300">{name.replace(/boss/gi, 'BOSS')}</span>
                                        <span className="text-sm font-bold text-green-400 font-mono">
                                            +{isPercent ? val.toFixed(2) + '%' : val}
                                        </span>
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
                            <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-bl font-bold">
                                階級 {stat.stat_grade}
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                                    <Hexagon className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-purple-300">HEXA 屬性核心 {coreIndex + 1}</div>
                                    <div className="text-xs text-slate-500">欄位 {stat.slot_id}</div>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-slate-300 font-bold">MAIN STAT</span>
                                        <span className="text-xs font-bold text-purple-400">Lv.{stat.main_stat_level}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-white">{stat.main_stat_name.replace(/boss/gi, 'BOSS')}</span>
                                        <span className="text-sm text-green-400 font-mono">{getHexaStatValue(stat.main_stat_name, stat.main_stat_level, true)}</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-800 mt-1 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500" style={{ width: `${(stat.main_stat_level / 10) * 100}%` }}></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] text-slate-400 font-bold">ADDITIONAL STAT</span>
                                            <span className="text-xs font-bold text-blue-400">Lv.{stat.sub_stat_level_1}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-200">{stat.sub_stat_name_1.replace(/boss/gi, 'BOSS')}</span>
                                            <span className="text-xs text-green-400 font-mono">{getHexaStatValue(stat.sub_stat_name_1, stat.sub_stat_level_1)}</span>
                                        </div>
                                        <div className="w-full h-1 bg-slate-800 mt-1 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: `${(stat.sub_stat_level_1 / 10) * 100}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] text-slate-400 font-bold">ADDITIONAL STAT</span>
                                            <span className="text-xs font-bold text-blue-400">Lv.{stat.sub_stat_level_2}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-200">{stat.sub_stat_name_2.replace(/boss/gi, 'BOSS')}</span>
                                            <span className="text-xs text-green-400 font-mono">{getHexaStatValue(stat.sub_stat_name_2, stat.sub_stat_level_2)}</span>
                                        </div>
                                        <div className="w-full h-1 bg-slate-800 mt-1 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: `${(stat.sub_stat_level_2 / 10) * 100}%` }}></div>
                                        </div>
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

// --- Link Skill Section ---
const LinkSkillSection = ({ linkSkill }: { linkSkill: any }) => {
  const activePresetNo = parseInt(linkSkill.preset_no || '1');
  const [selectedPreset, setSelectedPreset] = useState(activePresetNo || 1);

  useEffect(() => setSelectedPreset(activePresetNo || 1), [linkSkill]);

  const getPresetSkills = () => {
    // 連結技能比較特別，API 有給 "character_link_skill" (當前) 和 "preset_1~3"
    // 如果選 1, 2, 3，就拿對應的。
    // 因為這區塊只有 1,2,3 按鈕，我們直接映射
    return linkSkill[`character_link_skill_preset_${selectedPreset}`] || [];
  };
  
  const ownedSkill = linkSkill.character_owned_link_skill;
  const currentSkills = getPresetSkills();

  // Calculate Link Skill Totals for current preset
  const totals: Record<string, number> = {};
  const addStat = (name: string, val: number) => {
    totals[name] = (totals[name] || 0) + val;
  };

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
              { regex: /經驗值.*?(\d+)%?/, name: '經驗值獲得量' },
              { regex: /狀態異常抗性\s*(?:\+|:)?\s*(\d+)/, name: '狀態異常抗性' },
              { regex: /(\d+)%?\s*傷害/, name: '傷害', exclude: ['Boss', 'BOSS', '爆擊', '受到'] },
              { regex: /傷害\s*(?:\+|:)?\s*(\d+)%?/, name: '傷害', exclude: ['Boss', 'BOSS', '爆擊', '受到'] },
          ];

          patterns.forEach(p => {
              if (p.exclude && p.exclude.some(ex => desc.toLowerCase().includes(ex.toLowerCase()))) return;
              const match = desc.match(p.regex);
              if (match) {
                  addStat(p.name, parseInt(match[1], 10));
                  matched = true;
              }
          });

          if (desc.includes('STR') && desc.includes('DEX') && desc.match(/\+(\d+)/)) {
              const match = desc.match(/\+(\d+)/);
              if (match) {
                  addStat('全屬性', parseInt(match[1], 10));
                  matched = true;
              }
          }
      }

      if (!matched && LINK_SKILL_DATA[skill.skill_name]) {
          const stats = LINK_SKILL_DATA[skill.skill_name](skill.skill_level);
          Object.entries(stats).forEach(([key, val]) => addStat(key, val));
      }
  });

  return (
    <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner lg:col-span-2">
      <SectionHeader 
        icon={<Zap />} 
        title="連結技能 (Link Skills)" 
        presetState={{
          current: selectedPreset,
          setCurrent: setSelectedPreset,
          active: activePresetNo
        }}
      />
      
      {Object.keys(totals).length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-bold text-yellow-300 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" /> 連結技能總和 (估算)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(totals).map(([name, val], idx) => {
                    const isPercent = ['BOSS 傷害', '無視防禦率', '爆擊率', '爆擊傷害', '最大HP', '最大MP', '經驗值獲得量', '傷害'].includes(name);
                    return (
                        <div key={idx} className="bg-slate-900/50 px-3 py-2 rounded border border-yellow-500/20 flex justify-between items-center">
                            <span className="text-xs text-slate-300">{name}</span>
                            <span className="text-sm font-bold text-green-400 font-mono">
                                +{isPercent ? val + '%' : val}
                            </span>
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
                  <div className="absolute top-0 right-0 bg-yellow-600/80 text-white text-[10px] px-2 py-0.5 rounded-bl font-bold backdrop-blur-sm">
                      Lv.{ownedSkill.skill_level}
                  </div>
                  <img src={ownedSkill.skill_icon} alt={ownedSkill.skill_name} className="w-10 h-10 rounded bg-slate-800 p-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                  <div className="mb-1 pr-8 flex items-center gap-2">
                      <span className="font-bold text-yellow-200 text-sm truncate block">{ownedSkill.skill_name}</span>
                      <span className="text-[10px] bg-yellow-900/50 text-yellow-400 px-1 rounded border border-yellow-700/50">Own</span>
                  </div>
                  <div className="text-xs leading-tight">
                      {ownedSkill.skill_effect && (
                          <p className="text-green-400 mb-1 line-clamp-2" title={ownedSkill.skill_effect}>
                              {ownedSkill.skill_effect.replace(/\\n/g, ' ')}
                          </p>
                      )}
                      <p className="text-slate-400 line-clamp-2" title={ownedSkill.skill_description}>
                          {ownedSkill.skill_description.replace(/\\n/g, ' ')}
                      </p>
                  </div>
                  </div>
              </div>
          )}
          {currentSkills.map((skill: any, idx: number) => (
            <div key={idx} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex gap-3 items-start relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-yellow-600/80 text-white text-[10px] px-2 py-0.5 rounded-bl font-bold backdrop-blur-sm">
                  Lv.{skill.skill_level}
              </div>
              <img src={skill.skill_icon} alt={skill.skill_name} className="w-10 h-10 rounded bg-slate-800 p-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="mb-1 pr-8">
                  <span className="font-bold text-slate-200 text-sm truncate block">{skill.skill_name}</span>
                </div>
                <div className="text-xs leading-tight">
                  {skill.skill_effect && (
                      <p className="text-green-400 mb-1 line-clamp-2" title={skill.skill_effect}>
                          {skill.skill_effect.replace(/\\n/g, ' ')}
                      </p>
                  )}
                  <p className="text-slate-400 line-clamp-2" title={skill.skill_description}>
                      {skill.skill_description.replace(/\\n/g, ' ')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-slate-500 text-sm text-center py-4">無連結技能資料</div>
      )}
    </div>
  );
};

// --- Hyper Stat Section ---
const HyperStatSection = ({ hyperStat }: { hyperStat: any }) => {
  const activePresetNo = parseInt(hyperStat.preset_no || '1');
  const [selectedPreset, setSelectedPreset] = useState(activePresetNo || 1);

  useEffect(() => setSelectedPreset(activePresetNo || 1), [hyperStat]);

  const getPresetStats = () => {
    return hyperStat[`hyper_stat_preset_${selectedPreset}`] || [];
  };

  const getRemainPoints = () => {
    return hyperStat[`hyper_stat_preset_${selectedPreset}_remain_point`] || 0;
  };

  const activeStats = getPresetStats()
    .filter((stat: any) => stat.stat_level > 0)
    .sort((a: any, b: any) => b.stat_level - a.stat_level);

  return (
    <div className="bg-[#161b22] border border-slate-800 rounded-xl p-6 shadow-inner lg:col-span-2">
      <SectionHeader 
        icon={<Zap />} 
        title="極限屬性 (Hyper Stats)" 
        presetState={{
          current: selectedPreset,
          setCurrent: setSelectedPreset,
          active: activePresetNo
        }}
      />
      <div className="flex justify-between items-center mb-4 px-1">
         <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
            剩餘點數: <span className="text-indigo-400 font-mono font-bold">{getRemainPoints()}</span>
         </span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-4">
        {activeStats.map((stat: any, idx: number) => (
          <div key={idx} className="flex justify-between items-center bg-[#0d1117] px-3 py-2 rounded text-sm border border-slate-700/50 hover:border-indigo-500/50 transition-colors">
            <span className="text-slate-300">{stat.stat_type}</span>
            <span className="font-bold text-indigo-400 font-mono">Lv.{stat.stat_level}</span>
          </div>
        ))}
        {activeStats.length === 0 && (
           <div className="col-span-full text-center text-slate-500 py-6 bg-[#0d1117] rounded-lg border border-slate-800 border-dashed text-sm">
             此預設未配置屬性
           </div>
        )}
      </div>
    </div>
  );
};

export default CharacterDetails;