import React from 'react';
import { EquipmentItem } from '../types';
import { Star } from 'lucide-react';

interface ItemCardProps {
  item: EquipmentItem;
}

const getPotColor = (grade: string) => {
  switch (grade) {
    case 'Legendary': return 'border-green-500 text-green-400';
    case 'Unique': return 'border-yellow-500 text-yellow-400';
    case 'Epic': return 'border-purple-500 text-purple-400';
    case 'Rare': return 'border-blue-500 text-blue-400';
    default: return 'border-slate-600 text-slate-400';
  }
};

const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const potColorClass = getPotColor(item.potential_option_grade);
  const hasPot = item.potential_option_grade !== null;

  return (
    <div className="group relative bg-slate-800/50 border border-slate-700 rounded-lg p-3 hover:bg-slate-800 transition-all hover:shadow-lg hover:-translate-y-1">
      {/* Tooltip-ish Hover State (Simplified for mobile) */}
      <div className="flex gap-3">
        <div className="relative shrink-0">
          <div className={`w-12 h-12 rounded-md bg-slate-900 border-2 flex items-center justify-center ${hasPot ? potColorClass.split(' ')[0] : 'border-slate-700'}`}>
            <img src={item.item_icon} alt={item.item_name} className="w-8 h-8 object-contain" />
          </div>
          {item.starforce !== "0" && (
             <div className="absolute -top-2 -right-2 bg-yellow-900/90 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center border border-yellow-700">
               <Star className="w-2 h-2 mr-0.5 fill-current" /> {item.starforce}
             </div>
          )}
        </div>
        
        <div className="overflow-hidden">
          <h4 className={`text-sm font-bold truncate ${hasPot ? potColorClass.split(' ')[1] : 'text-slate-200'}`}>
            {item.item_name}
            {item.special_ring_level > 0 && <span className="text-xs ml-1 text-orange-400">Lv.{item.special_ring_level}</span>}
          </h4>
          <p className="text-xs text-slate-500 truncate">{item.item_equipment_slot}</p>
          
          <div className="mt-1 space-y-0.5">
             {item.potential_option_1 && (
               <p className="text-[10px] text-slate-300 truncate">• {item.potential_option_1}</p>
             )}
              {item.potential_option_2 && (
               <p className="text-[10px] text-slate-300 truncate">• {item.potential_option_2}</p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
