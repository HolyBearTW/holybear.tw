import React from 'react';
import { EquipmentItem, ItemOption } from '../types';
import { Star } from 'lucide-react';

interface EquipmentTooltipProps {
  item: EquipmentItem;
}

const StatLine: React.FC<{ label: string; base: string; add: string; etc: string; star: string; total: string }> = ({ label, base, add, etc, star, total }) => {
  if (total === '0' || !total) return null;

  const baseVal = parseInt(base || '0');
  const addVal = parseInt(add || '0'); // Flame (Green)
  const etcVal = parseInt(etc || '0'); // Scroll
  const starVal = parseInt(star || '0'); // Starforce
  const blueVal = etcVal + starVal; // Combined for blue text

  // Calculate breakdown string: (Base + Flame + Scroll/Star)
  const hasBreakdown = addVal > 0 || blueVal > 0;
  
  return (
    <div className="flex items-center text-[11px] leading-tight mb-1">
      <span className="text-slate-300 w-24 shrink-0 font-medium">{label}:</span>
      <div className="flex-1">
        <span className="text-white">+{total}</span>
        {hasBreakdown && (
          <span className="text-xs ml-1">
            (
            <span className="text-white">{baseVal}</span>
            {addVal > 0 && <span className="text-green-400"> + {addVal}</span>}
            {blueVal > 0 && <span className="text-blue-400"> + {blueVal}</span>}
            )
          </span>
        )}
      </div>
    </div>
  );
};

const EquipmentTooltip: React.FC<EquipmentTooltipProps> = ({ item }) => {
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
  const stars = [];
  for(let i=0; i<sfCount; i++) {
      stars.push(i);
  }

  return (
    <div className={`w-[300px] bg-[#1a1d24]/95 backdrop-blur-md border-2 ${potInfo.border} rounded-lg shadow-2xl overflow-hidden z-50 text-left pointer-events-none relative`}>
      {/* Header / Stars */}
      <div className="p-3 border-b border-slate-600/50 text-center relative bg-[#15171c]/50">
        {sfCount > 0 && (
          <div className="flex flex-wrap justify-center gap-0.5 mb-2 px-2">
             {stars.map((_, i) => (
                <Star key={i} className={`w-2.5 h-2.5 fill-yellow-400 text-yellow-500 ${i !== 0 && i % 5 === 0 ? 'ml-1' : ''}`} />
             ))}
          </div>
        )}
        <h3 className={`text-base font-bold text-white relative z-10`}>
           {item.item_name} {sfCount > 0 ? `(+${sfCount})` : ''}
        </h3>
        {item.potential_option_grade && potInfo.label && (
          <p className="text-[10px] text-slate-400 mt-0.5">({potInfo.label}等級道具)</p>
        )}
      </div>

      {/* Main Image */}
      <div className="p-4 flex justify-center border-b border-slate-600/50 bg-[#121418]/50 relative">
         <div className="relative z-10">
            <img src={item.item_icon} alt={item.item_name} className="w-16 h-16 object-contain scale-110 drop-shadow-lg" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-black/50 blur-sm rounded-[50%]" />
         </div>
      </div>

      {/* Stats Section */}
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
           <StatLine label="BOSS 傷害" base={item.item_base_option.boss_damage} add={item.item_add_option.boss_damage} etc={item.item_etc_option.boss_damage} star="0" total={item.item_total_option.boss_damage} />
           <StatLine label="無視防禦率" base={item.item_base_option.ignore_monster_armor} add={item.item_add_option.ignore_monster_armor} etc={item.item_etc_option.ignore_monster_armor} star="0" total={item.item_total_option.ignore_monster_armor} />
           <StatLine label="全屬性%" base={item.item_base_option.all_stat} add={item.item_add_option.all_stat} etc={item.item_etc_option.all_stat} star="0" total={item.item_total_option.all_stat} />
         </div>
      </div>

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
      
      {/* Footer */}
      {item.item_description && (
        <div className="bg-[#121418]/50 p-2 text-[11px] text-slate-400 text-center relative z-10 border-t border-slate-700 leading-relaxed">
          {item.item_description}
        </div>
      )}
    </div>
  );
};

export default EquipmentTooltip;
