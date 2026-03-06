import React from 'react';
import { EquipmentItem, ItemOption, CharacterSetEffect } from '../types';
import { Star } from 'lucide-react';

interface EquipmentTooltipProps {
  item: EquipmentItem;
  setEffect?: CharacterSetEffect;
  characterJob?: string;
  slotType?: string;
  showSetEffect?: boolean;
}

const StatLine: React.FC<{ label: string; base: string; add: string; etc: string; star: string; total: string; isPercent?: boolean }> = ({ label, base, add, etc, star, total, isPercent }) => {
  if (total === '0' || !total) return null;

  const baseVal = parseInt(base || '0');
  const addVal = parseInt(add || '0'); // Flame (Green)
  const etcVal = parseInt(etc || '0'); // Scroll
  const starVal = parseInt(star || '0'); // Starforce
  const blueVal = etcVal + starVal; // Combined for blue text

  // Calculate breakdown string: (Base + Flame + Scroll/Star)
  const hasBreakdown = addVal > 0 || blueVal > 0;
  const suffix = isPercent ? '%' : '';
  
  return (
    <div className="flex items-center text-[11px] leading-tight mb-1">
      <span className="text-slate-300 w-24 shrink-0 font-medium">{label}:</span>
      <div className="flex-1">
        <span className="text-white">+{total}{suffix}</span>
        {hasBreakdown && (
          <span className="text-xs ml-1">
            (
            <span className="text-white">{baseVal}{suffix}</span>
            {addVal > 0 && <span className="text-green-400"> + {addVal}{suffix}</span>}
            {blueVal > 0 && <span className="text-blue-400"> + {blueVal}{suffix}</span>}
            )
          </span>
        )}
      </div>
    </div>
  );
};

const formatDescription = (desc: string) => {
  if (!desc) return '';
  let res = desc;
  
  // 原因說明：
  // 這是因為 Nexon API 返回的原始資料中，某些特定字串（如「功能」）出現了編碼錯誤或使用了特殊的控制字元。
  // 這些字元在轉碼 UTF-8 時變成了「弁」開頭的亂碼序列。
  // 這種情況常見於遊戲內的部分固定說明文字。
  
  // 1. 針對常見的 "道具專用功能" 亂碼進行通用修復
  // 捕捉: "道具專用" + (亂碼) + "Lv."
  // 目的: 修復如 "道具專用弁□ALv.300" -> "道具專用功能，Lv.300"
  res = res.replace(/道具專用[^\x00-\xff]{1,5}[A-Za-z]?Lv\./g, '道具專用功能，Lv.');

  // 2. 針對「弁」字開頭的亂碼進行廣泛替換
  // 已知模式: 弁A, 弁□A, 弁?A
  // 將其替換為 "功能，"
  res = res.replace(/弁.{1,2}A/g, '功能，');
  
  // 3. 殘餘處理: 如果只有 "弁" 加上非 ASCII 字元
  res = res.replace(/弁[^\x00-\xff]/g, '功能');

  // 4. 針對其他已知缺字/亂碼模式進行修復 (基於用回報)
  res = res
    .replace(/□使/g, '即使')
    .replace(/極□相似/g, '極為相似')
    .replace(/按□後/g, '按鈕後')
    .replace(/功能C/g, '功能。')
    .replace(/才能□動/g, '才能啟動');
  
  // 5. 清理可能的顏色標籤 (如 #cOrange#) 如果有的話
  // res = res.replace(/#[a-zA-Z]+#/g, ''); 

  return res;
};

const EquipmentTooltip: React.FC<EquipmentTooltipProps> = ({ item, setEffect, characterJob, slotType, showSetEffect }) => {
  const getPotGradeInfo = (grade: string) => {
    const g = grade ? grade.toLowerCase() : '';
    if (g.includes('legendary') || g.includes('傳說')) return { color: 'text-green-400', border: 'border-green-500', label: '傳說', char: 'L' };
    if (g.includes('unique') || g.includes('罕見')) return { color: 'text-yellow-400', border: 'border-yellow-500', label: '罕見', char: 'U' };
    if (g.includes('epic') || g.includes('稀有')) return { color: 'text-purple-400', border: 'border-purple-500', label: '稀有', char: 'E' };
    if (g.includes('rare') || g.includes('特殊')) return { color: 'text-blue-400', border: 'border-blue-500', label: '特殊', char: 'R' };
    return { color: 'text-white', border: 'border-slate-600', label: '', char: '-' };
  };

  const potInfo = getPotGradeInfo(item.potential_option_grade);
  const addPotInfo = getPotGradeInfo(item.additional_potential_option_grade);

  // Starforce display logic
  const sfCount = parseInt(item.starforce || '0');
  const scrollCount = parseInt(item.scroll_upgrade || '0');
  
  // Logic: 
  // If Genesis/Eternal/Zero weapon -> Old simple style (no max limit check, just render filled)
  // Else -> New grid style (Top 15, Bottom 15, empty slots shown)
  const isSpecialWeapon = (item.item_name.includes('創世') || item.item_name.includes('命運')); // Includes some Zero weapons for safety
  
  // Calculate max stars
  let maxStars = 30; // Default max to 30 as per user request
  // Use base_equipment_level as fallback for item_level
  const itemLevel = item.item_base_option?.base_equipment_level || item.item_level || 0;
  const level = parseInt(String(itemLevel), 10);
  
  if (level > 0) {
      if (level >= 138) maxStars = 30; // UPDATED to 30
      else if (level >= 128) maxStars = 20;
      else if (level >= 118) maxStars = 15;
      else if (level >= 108) maxStars = 10;
      else if (level >= 95) maxStars = 8;
      else maxStars = 5;
  }

  // If actual stars exceed max (e.g. data error or superior assumption wrong), extend max
  if (sfCount > maxStars) maxStars = sfCount;

  // Improved Job Detection Logic
  const getJobDisplay = () => {
    const name = String(item.item_name || '');

    // 1. Explicit Job Keywords (Specific Mappings + General Keywords)
    // Priority: Specific Mappings > General Keywords
    if (name.includes('小偷') || name.includes('鷹眼暗殺者') || name.includes('高貴的暗殺者') || name.includes('黃蜘蛛暗殺者') || name.includes('月讀命') || name.includes('雷本魂') || name.includes('塔蘭特萊卡翁')) return '盜賊';
    if (name.includes('魔導士') || name.includes('黃蜘蛛敦威治') || name.includes('天鈿女') || name.includes('龍尾巴') || name.includes('塔蘭特赫密士')) return '法師';
    if (name.includes('鷹眼漫遊者') || name.includes('高貴的漫遊者') || name.includes('黃蜘蛛漫遊者') || name.includes('須佐之男') || name.includes('俠客圖斯') || name.includes('塔蘭特亞泰爾')) return '海盜';
    if (name.includes('黃蜘蛛守護者') || name.includes('大山積神') || name.includes('帕爾困') || name.includes('塔蘭特喀戎星')) return '弓箭手';
    if (name.includes('黃蜘蛛戰士') || name.includes('天照') || name.includes('獅子心形') || name.includes('塔蘭特海亞蒂絲')) return '劍士';

    // General Keywords
    if (name.includes('劍士') || name.includes('戰士')) return '劍士';
    if (name.includes('法師')) return '法師';
    if (name.includes('弓箭手') || name.includes('弓手')) return '弓箭手';
    if (name.includes('盜賊')) return '盜賊';
    if (name.includes('海盜')) return '海盜';

    // 2. High Level Weapon/Secondary/Emblem Logic (Level >= 30)
    // If no specific job keyword found above, check if it's W/S/E and use characterJob
    const slotLower = (item.item_equipment_slot || '').toLowerCase();
    const partLower = (item.item_equipment_part || '').toLowerCase();
    
    const isWeapon = slotLower.includes('weapon') || partLower.includes('武器');
    const isEmblem = slotLower.includes('emblem') || partLower.includes('能源') || partLower.includes('徽章');
    const isSecondary = 
        slotLower.includes('secondary') || slotLower.includes('subweapon') || 
        slotLower.includes('shield') || slotLower.includes('katara') || 
        partLower.includes('副武器') || partLower.includes('輔助武器') || partLower.includes('盾牌') ||
        ['orb', 'book', 'fan', 'card', 'soul', 'controller', 'mass', 'essence', 'whistle', 'ballast', 'warp', 'relic', 'jewel', 'document', 'arrow'].some(k => slotLower.includes(k));

    // Trust the Grid: If slotType is provided (Weapon, Secondary, Emblem), treat as such
    const isGridTarget = slotType === 'Weapon' || slotType === 'Secondary' || slotType === 'Emblem';

    if ((isGridTarget || isWeapon || isSecondary || isEmblem) && level >= 30 && characterJob) {
        return characterJob;
    }

    // 3. Default
    return '共用';
  };

  // Set Effect Logic
  // Sort: Prioritize Eternal (永恆) to ensure Lucky Items (Genesis/Destiny) match it first
  // This addresses the user request to let Eternal logic take precedence for "Genesis"(創世) and "Destiny"(命運) items.
  const sortedSets = setEffect?.set_effect ? [...setEffect.set_effect].sort((a, b) => {
      const isEternalA = a.set_name.includes('永恆');
      const isEternalB = b.set_name.includes('永恆');
      return (isEternalA === isEternalB) ? 0 : (isEternalA ? -1 : 1);
  }) : [];

  const matchedSet = sortedSets.find(s => {
      const setName = s.set_name;
      const itemName = item.item_name;

      // 1. Smart Name Matching (Auto-detect)
      // Removes "Set", "Effect" AND Job Names from the Set Name to find the core series name.
      // Example: "神秘之影盜賊套裝" -> Remove "套裝", "盜賊" -> Core: "神秘之影"
      // Item: "神秘之影手套" -> Contains "神秘之影" -> MATCH!
      let coreName = setName
          .replace(/套裝|套組|效果/g, '') // Remove generics
          // Remove Job Classes (Commonly appear in set names but not always in item names)
          .replace(/劍士|戰士|法師|魔導士|弓箭手|弓手|盜賊|刺客|海盜|通用/g, '') 
          .trim();
      
      // If the core name is too short (e.g. just 1 char left), it's risky to match. Default to 2 chars.
      if (coreName.length >= 2 && itemName.includes(coreName)) return true;

      // 2. Fallback Dictionaries for sets with completely different item names
      
      // Root Abyss (深淵) - Set name: "深淵xxx", Item names: "Highness", etc.
      if (setName.includes('深淵') || setName.includes('露塔必思') || setName.includes('根源')) {
          if (['6型', '7型', '黃蜘蛛', '鷹眼', '高貴的暗殺者', '高貴的漫遊者', '高貴的守護者', '夫尼爾', '創世', '命運'].some(k => itemName.includes(k))) return true;
      }

      // 航海師 - Set name: "航海師xxx", etc.
      if (setName.includes('航海師')) {
          if (['8型', '航海師', '創世', '命運'].some(k => itemName.includes(k))) return true;
      }

      // 神祕冥界 - Set name: "神祕xxx", etc.
      if (setName.includes('神祕冥界') || setName.includes('冥界幽靈')) {
          if (['神祕冥界', '冥界幽靈', '9型', '創世', '命運'].some(k => itemName.includes(k))) return true;
      }

      //永恆, etc.
      if (setName.includes('永恆')) {
          if (itemName.includes('永恆火焰戒指') || itemName.includes('永恆勇士') || itemName.includes('創世的胸章')) return false;
          if (['永恆', '創世', '命運'].some(k => itemName.includes(k))) return true;
      }

      //七曜, etc.
      if (setName.includes('七曜')) {
          if (['七曜', '七日的胸章', '七日怪物公園看守者'].some(k => itemName.includes(k))) return true;
      }

      // Pitch Boss (漆黑BOSS)
      if (setName.includes('漆黑BOSS')) {
          const keywords = [
             '米特拉的憤怒', '創世的胸章', '夢幻的腰帶', '巨大的恐怖', '苦痛的根源', 
             '全面控制', '黑心', '魔導書', '指揮官力量', '口紅控制器', '魔力的眼罩'
          ];
          if (keywords.some(k => itemName.includes(k))) return true;
      }

      // 光輝Boss套裝
      if (setName.includes('光輝Boss')) {
          const keywords = [
             '根源的耳語', '死亡之誓', '不朽的遺產'
          ];
          if (keywords.some(k => itemName.includes(k))) return true;
      }

      // Dawn Boss (黎明BOSS)
      if (setName.includes('黎明的BOSS')) {
          const keywords = ['暮光', '破曉', '星耀', '黎明守護者天使'];
          if (keywords.some(k => itemName.includes(k))) return true;
      }

      // Boss Accessory (首領飾品)
      if (setName.includes('首領飾品')) {
           const keywords = [
             '凝聚力量', '水中信紙', '銀花戒指', '高貴的伊菲亞',
             '金花草腰帶', '水晶溫杜斯', '支配者', '粉紅聖杯',
             '戴雅希杜斯', '拉圖斯標誌', '黑豆標記', '梅克奈特墜飾', '地獄火耳環',
             '金花草腰帶', '闇黑龍王', '皇家暗黑合金', '永生之石', '殘暴炎魔的腰帶', '守護者天使戒指'
           ];
           if (keywords.some(k => itemName.includes(k))) return true;
      }
      
      // [圖騰] 死後世界的的痕跡
      // 若該套組為 "死後世界的的痕跡"，且道具名稱包含 "的痕跡"，則視為匹配
      if (setName.includes('死後世界的的痕跡') || setName.includes('死後世界的痕跡')) {
          if (itemName.includes('的痕跡')) return true;
      }
      
      return false;
  });

  const renderStars = () => {
      if (sfCount === 0) return null;

      const is25Star = sfCount >= 25; // 25星特效

      // Grid Style (Grid)
      const row1Max = 15;
      const row2Max = 30; // Max allowed display is 30
      
      return (
        <div className="flex flex-col items-center gap-1 mb-2 px-2 relative">
             {/* 25星閃耀特效 (25 Star Special Effect - Ultra) */}
             {is25Star && (
                <div className="absolute inset-0 z-0 text-yellow-300 select-none pointer-events-none">
                  {/* 背景強烈發光 (High Light Glow) */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-yellow-500/30 blur-xl rounded-full animate-pulse"></div>
                  
                  {/* 動態符號星星群 (Dynamic Symbols) - 收斂範圍至框內 */}
                  <span className="absolute -top-3 -left-2 text-xl animate-bounce drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" style={{ animationDuration: '1.2s' }}>★</span>
                  <span className="absolute -top-5 left-1/2 text-xs text-yellow-100 animate-ping" style={{ animationDuration: '2.5s' }}>✦</span>
                  <span className="absolute -top-2 -right-3 text-lg animate-bounce delay-100 drop-shadow-[0_0_8px_gold]" style={{ animationDuration: '1.5s' }}>★</span>
                  
                  <span className="absolute top-1/2 -left-5 text-sm animate-pulse delay-75 text-white drop-shadow-md">☆</span>
                  <span className="absolute top-1/3 -right-6 text-lg animate-bounce delay-300 text-yellow-200 drop-shadow-[0_0_6px_orange]">★</span>
                  
                  <span className="absolute -bottom-3 left-0 text-xs animate-ping delay-500 text-white">✦</span>
                  <span className="absolute -bottom-1 -right-2 text-base animate-pulse delay-200 drop-shadow-lg">☆</span>
                  <span className="absolute top-0 right-1/3 text-[8px] animate-ping delay-700 text-white">✦</span>
                </div>
             )}
            <div className={`flex justify-center gap-0.5 relative z-10 ${is25Star ? 'drop-shadow-[0_0_12px_rgba(255,215,0,0.8)]' : ''}`}>
                {(() => {
                    const rowStars = [];
                    // Limit logic:
                    // Special Weapon: EXACTLY sfCount (so no empty stars)
                    // Normal Weapon: maxStars (shows empty stars up to max)
                    const limit = isSpecialWeapon ? sfCount : maxStars;

                    for (let i = 0; i < row1Max; i++) {
                        if (i >= limit) break;
                        const isFilled = i < sfCount;
                        const isGap = i > 0 && i % 5 === 0;
                        rowStars.push(
                           <div key={i} className={`${isGap ? 'ml-3' : ''}`}>
                             <Star 
                                className={`w-3 h-3 ${isFilled ? 'fill-yellow-400 text-yellow-500 drop-shadow-[0_0_2px_rgba(250,204,21,0.6)]' : 'text-slate-600'}`} 
                                fill={isFilled ? "currentColor" : "none"}
                                strokeWidth={isFilled ? 0 : 1.5}
                             />
                           </div>
                        );
                    }
                    return rowStars;
                })()}
            </div>
            {(() => {
                const limit = isSpecialWeapon ? sfCount : maxStars;
                if (limit <= row1Max) return null;

                const rowStars = [];
                for (let i = row1Max; i < row2Max; i++) {
                    if (i >= limit) break;
                    const isFilled = i < sfCount;
                    const isGap = i > row1Max && (i - row1Max) % 5 === 0;
                    rowStars.push(
                        <div key={i} className={`${isGap ? 'ml-3' : ''}`}>
                             <Star 
                                className={`w-3 h-3 ${isFilled ? 'fill-yellow-400 text-yellow-500 drop-shadow-[0_0_2px_rgba(250,204,21,0.6)]' : 'text-slate-600'}`} 
                                fill={isFilled ? "currentColor" : "none"}
                                strokeWidth={isFilled ? 0 : 1.5}
                             />
                        </div>
                    );
                }
                return (
                    <div className="flex justify-center gap-0.5">
                        {rowStars}
                    </div>
                );
            })()}
        </div>
      );
  };
  
  return (
    <div className={`w-full bg-[#1a1d24]/95 backdrop-blur-md border-2 ${potInfo.border} rounded-lg shadow-2xl overflow-hidden z-50 text-left pointer-events-none relative`}>
      {/* Header / Stars */}
      <div className="p-3 border-b border-slate-600/50 text-center relative bg-[#15171c]/50">
        {renderStars()}
        <h3 className={`text-base font-bold text-white relative z-10`}>
           {item.item_name}
           {item.special_ring_level > 0 && <span className="text-orange-400 ml-1">Lv.{item.special_ring_level}</span>}
           {scrollCount > 0 ? ` (+${scrollCount})` : ''}
        </h3>
        {item.potential_option_grade && potInfo.label && (
          <p className="text-[10px] text-slate-400 mt-0.5">({potInfo.label}等級道具)</p>
        )}
      </div>

      {/* Main Image */}
      <div className="p-4 flex justify-center border-b border-slate-600/50 bg-[#121418]/50 relative">
         <div className="relative z-10">
            <img 
               src={item.item_icon} 
               alt={item.item_name} 
               className="w-16 h-16 object-contain scale-110 drop-shadow-lg" 
            />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-black/50 blur-sm rounded-[50%]" />
         </div>
      </div>

      {/* Basic Info (Job & Level) - Inferred */}
      <div className={`p-3 ${slotType === 'Puzzle' ? '' : 'border-b border-slate-600/50'} relative z-10 space-y-1`}>
          <div className="flex items-center text-[11px] leading-tight">
             <span className="text-slate-400 w-24 shrink-0 font-medium text-left">裝備分類</span>
             <span className="text-white">
                {['馴服的怪物', '馬鞍', '怪物裝備'].includes(item.item_equipment_part) || ['馴服的怪物', '馬鞍', '怪物裝備'].includes(item.item_equipment_slot) 
                  ? '圖騰' 
                  : ['puzzle', 'Puzzle'].includes(item.item_equipment_part) || ['puzzle', 'Puzzle'].includes(item.item_equipment_slot)
                  ? '拼圖'
                  : ['android', 'Android'].includes(item.item_equipment_part) || ['android', 'Android'].includes(item.item_equipment_slot)
                  ? '機器人'
                  : item.item_name.includes('寶玉') && (['墜飾'].includes(item.item_equipment_part) || ['墜飾'].includes(item.item_equipment_slot))
                  ? '寶玉'
                  : item.item_equipment_part || item.item_equipment_slot || '未知'}
             </span>
          </div>
          <div className="flex items-center text-[11px] leading-tight">
             <span className="text-slate-400 w-24 shrink-0 font-medium text-left">裝備職業</span>
             <span className="text-white">
                {getJobDisplay()}
             </span>
          </div>
          <div className="flex items-center text-[11px] leading-tight">
             <span className="text-slate-400 w-24 shrink-0 font-medium text-left">要求等級</span>
             <span className="text-white">Lv. {itemLevel}</span>
          </div>
          {/* Set Effect Summary Line */}
           {matchedSet && (
              <div className="flex items-center text-[11px] leading-tight text-green-400">
                  <span className="text-slate-400 w-24 shrink-0 font-medium text-left text-green-400">套組效果</span>
                  <span>{matchedSet.set_name} ({matchedSet.total_set_count})</span>
              </div>
           )}
      </div>

      {/* Stats Section */}
      {slotType !== 'Puzzle' && (
      <div className="p-3 space-y-1 border-b border-slate-600/50 relative z-10 bg-transparent">
         {/* Categories */}
         <div className="space-y-0.5">
           <StatLine label="STR" base={item.item_base_option.str} add={item.item_add_option.str} etc={item.item_etc_option.str} star={item.item_starforce_option.str} total={item.item_total_option.str} />
           <StatLine label="DEX" base={item.item_base_option.dex} add={item.item_add_option.dex} etc={item.item_etc_option.dex} star={item.item_starforce_option.dex} total={item.item_total_option.dex} />
           <StatLine label="INT" base={item.item_base_option.int} add={item.item_add_option.int} etc={item.item_etc_option.int} star={item.item_starforce_option.int} total={item.item_total_option.int} />
           <StatLine label="LUK" base={item.item_base_option.luk} add={item.item_add_option.luk} etc={item.item_etc_option.luk} star={item.item_starforce_option.luk} total={item.item_total_option.luk} />
           
           <StatLine label="最大 HP" base={item.item_base_option.max_hp} add={item.item_add_option.max_hp} etc={item.item_etc_option.max_hp} star={item.item_starforce_option.max_hp} total={item.item_total_option.max_hp} />
           <StatLine label="最大 MP" base={item.item_base_option.max_mp} add={item.item_add_option.max_mp} etc={item.item_etc_option.max_mp} star={item.item_starforce_option.max_mp} total={item.item_total_option.max_mp} />
           <StatLine label="攻擊力" base={item.item_base_option.attack_power} add={item.item_add_option.attack_power} etc={item.item_etc_option.attack_power} star={item.item_starforce_option.attack_power} total={item.item_total_option.attack_power} />
           <StatLine label="魔法攻擊力" base={item.item_base_option.magic_power} add={item.item_add_option.magic_power} etc={item.item_etc_option.magic_power} star={item.item_starforce_option.magic_power} total={item.item_total_option.magic_power} />
           <StatLine label="BOSS 傷害" base={item.item_base_option.boss_damage} add={item.item_add_option.boss_damage} etc={item.item_etc_option.boss_damage} star="0" total={item.item_total_option.boss_damage} isPercent />
           <StatLine label="無視防禦率" base={item.item_base_option.ignore_monster_armor} add={item.item_add_option.ignore_monster_armor} etc={item.item_etc_option.ignore_monster_armor} star="0" total={item.item_total_option.ignore_monster_armor} isPercent />
           <StatLine label="全屬性%" base={item.item_base_option.all_stat} add={item.item_add_option.all_stat} etc={item.item_etc_option.all_stat} star="0" total={item.item_total_option.all_stat} isPercent />
           
           {((item.scroll_upgradable_count || (item as any).scroll_upgradeable_count) !== undefined && String((item.scroll_upgradable_count || (item as any).scroll_upgradeable_count)) !== '0') && (
             <div className="flex items-center text-[11px] leading-tight mb-1">
               <span className="text-slate-300 w-24 shrink-0 font-medium">可使用卷軸數:</span>
               <span className="text-white">{(item.scroll_upgradable_count || (item as any).scroll_upgradeable_count)}</span>
             </div>
           )}
           {item.cuttable_count !== undefined && String(item.cuttable_count) !== '255' && String(item.cuttable_count) !== '-1' && String(item.cuttable_count) !== '0' && 
             (item.item_name.includes('永恆') && (item.item_name.includes('斗篷') || item.item_name.includes('手套') || item.item_name.includes('鞋'))) && (
             <div className="flex items-center text-[11px] leading-tight mb-1">
               <span className="text-yellow-400 w-auto shrink-0 font-medium">白金神奇剪刀可使用次數 {item.cuttable_count}次</span>
             </div>
           )}
         </div>
      </div>
      )}

      {/* Potentials */}
      {item.potential_option_grade && (
        <div className="p-3 border-b border-slate-600/50 relative z-10">
           <div className={`flex items-center gap-1.5 text-xs font-bold mb-1 ${potInfo.color}`}>
              <div className={`w-5 h-5 rounded border ${potInfo.border} flex items-center justify-center text-[10px] bg-slate-800`}>
                  {potInfo.char}
              </div>
              <span>{potInfo.label}潛能屬性</span>
           </div>
           <div className="text-xs space-y-0.5 text-white pl-1">
              {item.potential_option_1 && <p>{item.potential_option_1}</p>}
              {item.potential_option_2 && <p>{item.potential_option_2}</p>}
              {item.potential_option_3 && <p>{item.potential_option_3}</p>}
           </div>
        </div>
      )}

      {/* Additional Potentials */}
      {item.additional_potential_option_grade && (
        <div className="p-3 relative z-10">
           <div className={`flex items-center gap-1.5 text-xs font-bold mb-1 ${addPotInfo.color}`}>
              <div className={`w-5 h-5 rounded border ${addPotInfo.border} flex items-center justify-center text-[10px] bg-slate-800`}>
                  {addPotInfo.char}
              </div>
              <span>{addPotInfo.label}附加潛能</span>
           </div>
           <div className="text-xs space-y-0.5 text-white pl-1">
              {item.additional_potential_option_1 && <p>{item.additional_potential_option_1}</p>}
              {item.additional_potential_option_2 && <p>{item.additional_potential_option_2}</p>}
              {item.additional_potential_option_3 && <p>{item.additional_potential_option_3}</p>}
           </div>
        </div>
      )}

      {/* Soul Weapon */}
      {item.soul_name && (
        <div className={`p-3 relative z-10 ${item.additional_potential_option_grade ? 'border-t border-slate-600/50' : ''}`}>
           <div className="flex items-center gap-1.5 text-xs font-bold mb-1 text-red-400">
              <div className="w-5 h-5 rounded border border-red-500 flex items-center justify-center text-[10px] bg-slate-800">
                  魂
              </div>
              <span>靈魂寶珠</span>
           </div>
           <div className="text-xs space-y-0.5 text-white pl-1">
              <p className="font-bold text-red-400">{item.soul_name}</p>
              {item.soul_option && <p>{item.soul_option}</p>}
           </div>
        </div>
      )}
      
      {/* Set Effect Details (Full List) */}
      {showSetEffect && matchedSet && matchedSet.set_effect_info && (
        <div className="p-3 border-t border-slate-600/50 relative z-10 transition-all duration-300">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold text-green-400">{matchedSet.set_name}</h4>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                   {matchedSet.total_set_count}件效果生效中
                </span>
            </div>
            <div className="space-y-2">
                {matchedSet.set_effect_info.map((opt, idx) => {
                    // Check if this tier is active
                    // API returns active effects in set_effect_info. 
                    // Usually we display all potential effects here for a "Tooltip", but the API only gives what is ACTIVE.
                    // If we only have active ones, we just display them.
                    // Ideally a tooltip shows ALL tiers (grayed out if inactive), but we lack data for inactive tiers from this specific API response if it only returns active ones.
                    // However, `set_effect` typically returns the set info struct which MIGHT contain all info if parsed from a static DB, but here it seems to come from API.
                    // Assuming set_effect_info contains what the user has.
                    
                    // Wait, if set_effect_info ONLY contains active effects (e.g. 2, 3, 4 sets), we can just list them.
                    const isActive = true; 
                    return (
                        <div key={idx} className={`${isActive ? 'text-white' : 'text-slate-500'} text-xs`}>
                            <p className="font-bold mb-0.5 text-orange-300">{opt.set_count}套裝效果</p>
                            <div className="pl-1 leading-relaxed whitespace-pre-wrap text-[11px] text-slate-300">
                                {opt.set_option}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {/* Footer */}
      {item.item_description && (
        <div className="bg-[#121418]/50 p-2 text-xs text-slate-400 text-left relative z-10 border-t border-slate-700 leading-relaxed whitespace-pre-wrap break-words">
          {formatDescription(item.item_description)}
        </div>
      )}
    </div>
  );
};

export default EquipmentTooltip;
