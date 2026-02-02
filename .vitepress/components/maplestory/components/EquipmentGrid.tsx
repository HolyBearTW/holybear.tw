import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { EquipmentItem, CharacterEquipment, CharacterSetEffect } from '../types';
import EquipmentTooltip from './EquipmentTooltip';
import PresetSwitcher from './PresetSwitcher';

import { CharacterAndroidEquipment } from '../types';

interface EquipmentGridProps {
  equipment: CharacterEquipment;
  setEffect?: CharacterSetEffect;
  characterImage?: string;
  androidEquipment?: CharacterAndroidEquipment;
}

// Visual Layout Definition
// 'L' = Left Column, 'R' = Right Column, 'C' = Center (Character), 'B' = Bottom
const SLOT_DEFINITIONS: Record<string, { label: string, match: string[] }> = {
  // Rings
  'Ring1': { label: '戒1', match: ['ring1', 'ring 1', 'ring i', '戒指1'] },
  'Ring2': { label: '戒2', match: ['ring2', 'ring 2', 'ring ii', '戒指2'] },
  'Ring3': { label: '戒3', match: ['ring3', 'ring 3', 'ring iii', '戒指3'] },
  'Ring4': { label: '戒4', match: ['ring4', 'ring 4', 'ring iv', '戒指4'] },
  
  // Accessories (Left)
  'Pocket': { label: '口袋', match: ['pocketitem', 'pocket', '口袋道具'] },
  'Pendant': { label: '墜1', match: ['pendant', 'pendant1', '墜飾', '墜飾1', '項鍊', '項鍊1'] },
  'Pendant2': { label: '墜2', match: ['pendant2', '墜飾2', '項鍊2'] },
  'Belt': { label: '腰帶', match: ['belt', '腰帶'] },
  
  // Armor/Accessories (Right)
  'Hat': { label: '帽子', match: ['hat', 'cap', '帽子'] },
  'Face': { label: '臉飾', match: ['faceaccessory', 'face', '臉飾', '臉部裝飾'] },
  'Eye': { label: '眼飾', match: ['eyeaccessory', 'eye', '眼飾', '眼部裝飾'] },
  'Top': { label: '上衣', match: ['top', 'overall', '上衣', '套服'] },
  'Bottom': { label: '褲子', match: ['bottom', '褲子', '下褲', '褲/裙'] },
  'Shoes': { label: '鞋子', match: ['shoes', 'shoe', '鞋子'] },
  'Earrings': { label: '耳環', match: ['earrings', 'earring', '耳環'] },
  'Shoulder': { label: '肩膀', match: ['shoulder', 'shoulderdecoration', '肩膀', '肩飾', '肩膀裝飾'] },
  'Gloves': { label: '手套', match: ['gloves', 'glove', '手套'] },
  'Cape': { label: '披風', match: ['cape', '披風'] },
  
  // Bottom/Misc
  'Emblem': { label: '徽章', match: ['emblem', '能源', '徽章'] },
  'Badge': { label: '胸章', match: ['badge', '胸章'] },
  'Medal': { label: '勳章', match: ['medal', '勳章'] },
  'Android': { label: '機器', match: ['android', '機器人'] },
  'Heart': { label: '心臟', match: ['mechanicalheart', 'heart', '機械心臟', '心臟', '機器心臟'] },
  'Weapon': { label: '武器', match: ['weapon', '武器'] },
  'Secondary': { label: '副武', match: ['secondary', 'subweapon', 'shield', 'katara', '副武器', '盾牌', '輔助武器'] },
};

const Slot: React.FC<{ slotKey: string; item?: EquipmentItem; tooltipSide?: 'left' | 'right'; mobileDir?: 'up' | 'down'; setEffect?: CharacterSetEffect; characterJob?: string }> = ({ slotKey, item, tooltipSide = 'left', mobileDir = 'down', setEffect, characterJob }) => {
  const def = SLOT_DEFINITIONS[slotKey];
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // 用於偵測點擊外部
  const [adjustStyle, setAdjustStyle] = useState<React.CSSProperties>({}); // 防止超出螢幕

  // 點擊外部關閉視窗 (Click Outside Listener)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    // 只在開啟時監聽
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 智慧定位：確保 Tooltip 不會超出左右邊界 (透過 left 修正中心點，保留 transform 動畫)
  useLayoutEffect(() => {
    if (isOpen && tooltipRef.current) {
        const tooltipEl = tooltipRef.current;
        const parentEl = tooltipEl.parentElement;
        
        if (parentEl) {
            const parentRect = parentEl.getBoundingClientRect();
            const tooltipWidth = tooltipEl.getBoundingClientRect().width; // 或使用 offsetWidth
            
            const vw = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
            const padding = 10; 

            // 計算目前的邊界 (假設它是置中的)
            const parentCenter = parentRect.left + parentRect.width / 2;
            const currentLeft = parentCenter - tooltipWidth / 2;
            const currentRight = parentCenter + tooltipWidth / 2;

            let shiftX = 0;

            if (currentLeft < padding) {
                // 左側超出：需要向右移
                shiftX = padding - currentLeft;
            } 
            else if (currentRight > vw - padding) {
                // 右側超出：需要向左移 (數值為負)
                shiftX = (vw - padding) - currentRight;
            } 

            if (shiftX !== 0) {
                // 原本是 left-1/2 (50%)，我們加上偏移量
                setAdjustStyle({ left: `calc(50% + ${shiftX}px)` });
            } else {
                setAdjustStyle({});
            }
        }
    }
  }, [isOpen]);
  
  // Special handling: If slotKey is not defined (e.g. spacer), return empty
  if (!def) return <div className="w-10 h-10 sm:w-12 sm:h-12 invisible flex-shrink-0" />;

  let borderColor = 'border-slate-800';
  let bgColor = 'bg-[#1a1d24]';
  let glow = '';

  if (item) {
    const grade = item.potential_option_grade ? item.potential_option_grade.toLowerCase() : '';
    
    if (grade.includes('legendary') || grade.includes('傳說')) { 
        borderColor = 'border-green-500'; 
        glow = 'shadow-[0_0_10px_-2px_rgba(34,197,94,0.3)]'; 
    }
    else if (grade.includes('unique') || grade.includes('罕見')) { 
        borderColor = 'border-yellow-500'; 
    }
    else if (grade.includes('epic') || grade.includes('稀有')) { 
        borderColor = 'border-purple-500'; 
    }
    else if (grade.includes('rare') || grade.includes('特殊')) { 
        borderColor = 'border-blue-500'; 
    }
    else { 
        borderColor = 'border-slate-600'; 
    }
  }

  const desktopPositionClass = tooltipSide === 'left'
    ? 'md:right-full md:mr-1 md:left-auto'
    : 'md:left-full md:ml-1 md:right-auto';

  // Mobile position logic
  const mobilePositionClass = mobileDir === 'up'
    ? 'bottom-full mb-2 md:bottom-auto md:mb-0'
    : 'top-full mt-2 md:mt-0'; // 'down'

  return (
    <div 
      ref={containerRef}
      className={`relative z-0 group ${isOpen ? 'z-[100]' : 'hover:z-50'}`} // Fix: High Z-Index on toggle
      onClick={() => setIsOpen(!isOpen)}
    >
      {/* FIXED: 
          1. 移除 h-full (避免被父容器高度影響導致變扁)
          2. 加入 flex-shrink-0 (防止在 flex 容器中被擠壓)
      */}
      <div className={`w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 ${bgColor} border-2 ${borderColor} rounded-md flex items-center justify-center relative overflow-hidden transition-all ${glow}`}>
        {item ? (
          <>
            <img src={item.item_icon} alt={item.item_name} className="w-8 h-8 sm:w-9 sm:h-9 object-contain z-10 m-auto" />
            {/* Tiny Grade Indicator (Corner) */}
             {(item.potential_option_grade?.includes('Legendary') || item.potential_option_grade?.includes('傳說')) && <div className="absolute inset-0 bg-green-500/10 animate-pulse z-0" />}
            {/* Starforce */}
            {parseInt(item.starforce || '0') > 0 && (
                <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[9px] font-bold px-1 rounded-bl leading-none z-20 shadow-sm border-l border-b border-yellow-600">
                    {item.starforce}
                </div>
            )}
          </>
        ) : (
          <span className="text-[10px] text-slate-700 select-none font-medium">{def?.label}</span>
        )}
      </div>
      {item && (
        <div 
            ref={tooltipRef}
            style={adjustStyle}
            className={`absolute left-1/2 -translate-x-1/2 z-[200] w-[300px] max-w-[90vw]
                        ${isOpen ? 'block' : 'hidden group-hover:block'} animate-in fade-in zoom-in-95 duration-200 shadow-2xl rounded-xl
                        ${mobilePositionClass}
                        md:absolute md:top-0 ${desktopPositionClass} md:translate-y-0 md:translate-x-0 md:w-[300px] md:zoom-in-100 md:max-h-none md:overflow-visible`}
        >
           <EquipmentTooltip item={item} setEffect={setEffect} characterJob={characterJob} slotType={slotKey} />
        </div>
      )}
    </div>
  );
};

const EquipmentGrid: React.FC<EquipmentGridProps> = ({ equipment, setEffect, characterImage, androidEquipment }) => {
  // 防呆：如果 equipment 資料還沒進來，直接回傳 null
  if (!equipment) {
    return null; 
  }
  const characterJob = equipment.character_class;

  // Normalize string for comparison
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');

  // 1. 取得當前生效預設，預設為 1
  const activePresetNo = parseInt(equipment.preset_no || '1');
  
  // 2. UI 狀態：當前選擇的預設 (1, 2, 3)
  const [selectedPreset, setSelectedPreset] = useState<number>(activePresetNo);

  // 3. 當資料更新時，重置回生效預設
  useEffect(() => {
    if (equipment.preset_no) {
      setSelectedPreset(parseInt(equipment.preset_no));
    }
  }, [equipment]);

  // 4. 根據選擇取得該預設的資料列表
  const getDisplayItems = () => {
    const key = `item_equipment_preset_${selectedPreset}`;
    // 因為 TypeScript index signature 問題，這裡用 any 強制轉型
    return (equipment as any)[key] || [];
  };

  const displayItems = getDisplayItems();

  const findItem = (slotKey: string) => {
    const def = SLOT_DEFINITIONS[slotKey];
    if (!def) return undefined;
    
    // Pendant2 只做精確比對
    if (slotKey === 'Pendant2' || slotKey === 'Pendant') {
        // 只比對 slot
        return displayItems.find((item: EquipmentItem) => {
          const slot = normalize(item.item_equipment_slot);
          return def.match.includes(slot);
        });
    }
    
    // 其他欄位：先精確比對，再模糊 fallback
    const exact = displayItems.find((item: EquipmentItem) => {
      const slot = normalize(item.item_equipment_slot);
      const part = normalize(item.item_equipment_part);
      return def.match.includes(slot) || def.match.includes(part);
    });
    if (exact) return exact;
    
    const fuzzy = displayItems.find((item: EquipmentItem) => {
      const slot = normalize(item.item_equipment_slot);
      const part = normalize(item.item_equipment_part);
      return def.match.some(m => slot === normalize(m) || part === normalize(m));
    });
    if (fuzzy) return fuzzy;
    
    if (slotKey === 'Android' && androidEquipment && androidEquipment.android_name) {
      return {
        item_equipment_part: 'android',
        item_equipment_slot: 'android',
        item_name: androidEquipment.android_name,
        item_icon: androidEquipment.android_icon,
        item_description: androidEquipment.android_description,
        item_shape_name: '',
        item_shape_icon: '',
        item_gender: '',
        item_total_option: {} as any,
        item_base_option: {} as any,
        item_add_option: {} as any,
        item_etc_option: {} as any,
        item_starforce_option: {} as any,
        potential_option_grade: '',
        additional_potential_option_grade: '',
        potential_option_1: '',
        potential_option_2: '',
        potential_option_3: '',
        additional_potential_option_1: '',
        additional_potential_option_2: '',
        additional_potential_option_3: '',
        starforce: '',
        scroll_upgrade: '',
        starforce_scroll_flag: '',
        item_level: 0,
        special_ring_level: 0,
        date_expire: '',
      };
    }
    return undefined;
  };

  const unmatchedItems = displayItems.filter((item: EquipmentItem) => {
    const slot = normalize(item.item_equipment_slot);
    const part = normalize(item.item_equipment_part);
    return !Object.values(SLOT_DEFINITIONS).some(def => 
        def.match.some(m => slot === normalize(m) || part === normalize(m))
    );
  });

  return (
    <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner relative">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
         <span className="w-2 h-2 rounded-full bg-indigo-500"></span> 裝備 (Equipment)
      </h3>

      {/* 加入預設切換器 */}
      <PresetSwitcher 
        currentPreset={selectedPreset}
        onPresetChange={setSelectedPreset}
        activePresetNo={activePresetNo}
        label="裝備預設"
        showBase={false}
      />

      <div className="flex justify-center gap-6 mt-4">
      
      {/* Debug: Unmatched Items - 顯示未匹配的裝備以便除錯 */}
      {unmatchedItems.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/90 text-[10px] text-red-300 p-2 max-h-24 overflow-y-auto z-[60] font-mono rounded-b-xl border-t border-red-900/50">
            <p className="font-bold text-red-500 mb-1">Debug: 未匹配裝備</p>
            {unmatchedItems.map((item: any, i: number) => (
                <div key={i} className="border-b border-white/10 py-0.5">
                    {item.item_name} | Slot: [{item.item_equipment_slot}] | Part: [{item.item_equipment_part}]
                </div>
            ))}
        </div>
      )}
      {/* Left Columns (Accessories) */}
      <div className="flex gap-2">
        <div className="flex flex-col gap-2">
          {['Ring4', 'Ring3', 'Ring2', 'Ring1', 'Belt', 'Pocket'].map((key, idx) => <Slot key={key} slotKey={key} item={findItem(key)} tooltipSide="right" mobileDir={idx < 3 ? 'down' : 'up'} setEffect={setEffect} characterJob={characterJob} />)}
        </div>
        <div className="flex flex-col gap-2">
           {['Face', 'Eye', 'Earrings', 'Pendant2', 'Pendant'].map((key, idx) => <Slot key={key} slotKey={key} item={findItem(key)} tooltipSide="right" mobileDir={idx < 2 ? 'down' : 'up'} setEffect={setEffect} characterJob={characterJob} />)}
        </div>
      </div>

      {/* Center Character */}
      <div className="w-32 flex flex-col items-center justify-center relative">
         <div className="absolute inset-0 bg-slate-800/20 rounded-full blur-xl transform scale-75 translate-y-4"></div>
         {characterImage ? (
             <img src={characterImage} alt="Character" className="relative z-10 drop-shadow-2xl scale-125 transform translate-y-[-10px]" />
         ) : (
             <div className="w-24 h-24 rounded-full bg-slate-800/50" />
         )}
         <div className="flex gap-2 mt-8">
            <Slot slotKey="Weapon" item={findItem('Weapon')} tooltipSide="right" mobileDir="up" setEffect={setEffect} characterJob={characterJob} />
            <Slot slotKey="Secondary" item={findItem('Secondary')} tooltipSide="right" mobileDir="up" setEffect={setEffect} characterJob={characterJob} />
            <Slot slotKey="Emblem" item={findItem('Emblem')} tooltipSide="left" mobileDir="up" setEffect={setEffect} characterJob={characterJob} />
         </div>
      </div>

      {/* Right Columns (Armor) */}
      <div className="flex gap-2">
          <div className="flex flex-col gap-2">
            {['Hat', 'Top', 'Bottom', 'Shoulder'].map((key, idx) => <Slot key={key} slotKey={key} item={findItem(key)} tooltipSide="left" mobileDir={idx < 2 ? 'down' : 'up'} setEffect={setEffect} characterJob={characterJob} />)}
            <Slot slotKey="Android" item={findItem('Android')} tooltipSide="left" mobileDir="up" setEffect={setEffect} characterJob={characterJob} />
          </div>
          <div className="flex flex-col gap-2">
            {['Cape', 'Gloves', 'Shoes', 'Medal', 'Heart', 'Badge'].map((key, idx) => <Slot key={key} slotKey={key} item={findItem(key)} tooltipSide="left" mobileDir={idx < 3 ? 'down' : 'up'} setEffect={setEffect} characterJob={characterJob} />)}
          </div>
      </div>
      </div>

    </div>
  );
};

export default EquipmentGrid;
