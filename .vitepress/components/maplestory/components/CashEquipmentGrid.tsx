import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { CharacterCashItemEquipment, CashItemEquipmentPreset, CharacterBeautyEquipment } from '../types';
import PresetSwitcher from './PresetSwitcher';
import DyePreview from './DyePreview';

interface CashEquipmentGridProps {
  cashEquipment: CharacterCashItemEquipment;
  beautyEquipment?: CharacterBeautyEquipment;
  characterImage?: string;
}

interface BeautySlotProps {
  label: string;
  name?: string;
  baseColor?: string;
  mixColor?: string;
  mixRate?: string;
  hue?: number;
  saturation?: number;
  brightness?: number;
}

const BeautySlot: React.FC<BeautySlotProps> = ({ label, name, baseColor, mixColor, mixRate, hue, saturation, brightness }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [adjustStyle, setAdjustStyle] = useState<React.CSSProperties>({}); // 防止超出螢幕

  const showTooltip = isOpen || isHovered;

  // Click Outside Listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 智慧定位：確保 Tooltip 不會超出左右邊界 (透過 left 修正中心點，保留 transform 動畫)
  useLayoutEffect(() => {
    if (showTooltip && tooltipRef.current) {
        const tooltipEl = tooltipRef.current;
        const parentEl = tooltipEl.parentElement;
        
        if (parentEl) {
            const parentRect = parentEl.getBoundingClientRect();
            const tooltipWidth = tooltipEl.getBoundingClientRect().width;
            
            const vw = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
            const padding = 10; 

            const parentCenter = parentRect.left + parentRect.width / 2;
            const currentLeft = parentCenter - tooltipWidth / 2;
            const currentRight = parentCenter + tooltipWidth / 2;

            let shiftX = 0;

            if (currentLeft < padding) {
                shiftX = padding - currentLeft;
            } 
            else if (currentRight > vw - padding) {
                shiftX = (vw - padding) - currentRight;
            } 

            if (shiftX !== 0) {
                setAdjustStyle({ left: `calc(50% + ${shiftX}px)` });
            } else {
                setAdjustStyle({});
            }
        }
    }
  }, [isOpen]);

  const hasMix = mixRate && parseInt(mixRate) > 0;
  const hasSkinDetails = 
    typeof hue === 'number' && 
    typeof saturation === 'number' && 
    typeof brightness === 'number' && 
    (hue !== 0 || saturation !== 0 || brightness !== 0);
  
  let iconSrc = '';
  if (label.includes('髮型')) iconSrc = '/image/theme/hair.png';
  else if (label.includes('臉型')) iconSrc = '/image/theme/face.png';
  else if (label.includes('皮膚')) iconSrc = '/image/theme/skin.png';

  // Beauty slots are typically at the top, so we show tooltip BELOW by default
  const mobileTooltipClass = 'top-full mt-2';

  return (
    <div 
      ref={containerRef}
      className={`relative group ${showTooltip ? 'z-[100]' : 'z-0'}`}
    >
      <div 
        className={`w-10 h-10 sm:w-12 sm:h-12 bg-[#1a1d24] border-2 ${name ? 'border-pink-500/50' : 'border-slate-800'} rounded-md flex flex-col items-center justify-center relative overflow-hidden transition-all p-1 cursor-pointer`}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {iconSrc ? (
           <img 
             src={iconSrc} 
             alt={label} 
             className={`w-8 h-8 object-contain ${name ? 'opacity-100' : 'opacity-30 grayscale'}`} 
           />
        ) : (
           name ? (
             <div className="text-[9px] sm:text-[10px] text-center leading-tight text-pink-200 break-words w-full overflow-hidden">
                {name.replace('髮型', '').replace('臉型', '')}
             </div>
           ) : (
             <span className="text-[10px] text-slate-700 select-none font-medium">{label.replace(' (Beta)', '').replace(' (變裝)', '')}</span>
           )
        )}
      </div>

      {name && (
        <div 
            ref={tooltipRef}
            style={adjustStyle}
            className={`absolute left-1/2 -translate-x-1/2 z-[200] w-[180px] animate-in fade-in duration-100 ${showTooltip ? 'block' : 'hidden'}
                        ${mobileTooltipClass} bottom-auto`}
        >
           <div className="bg-[#1a1d24]/95 backdrop-blur-md border border-pink-500/30 rounded-lg shadow-xl p-3 text-center">
             <div className="text-sm font-bold text-pink-300 mb-1">{label}</div>
             <div className="text-xs text-white mb-2">{name}</div>
             
             <div className="flex flex-col items-center gap-1">
               <div className="flex justify-center gap-2 text-[10px]">
                  {baseColor && <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">{baseColor}</span>}
                  {hasMix && (
                    <>
                      <span className="text-slate-500">+</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">{mixColor} ({mixRate}%)</span>
                    </>
                  )}
               </div>
               {hasSkinDetails && (
                   <div className="text-[9px] text-slate-400 mt-1">
                      H: {hue} / S: {saturation} / B: {brightness}
                   </div>
               )}
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

const CashSlot: React.FC<{ label: string; item?: CashItemEquipmentPreset; tooltipSide?: 'left' | 'right'; mobileDir?: 'up' | 'down' }> = ({ label, item, tooltipSide = 'left', mobileDir = 'down' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [adjustStyle, setAdjustStyle] = useState<React.CSSProperties>({}); // 防止超出螢幕

  const showTooltip = isOpen || isHovered;

  // Click Outside Listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 智慧定位：確保 Tooltip 不會超出左右邊界 (透過 left 修正中心點，保留 transform 動畫)
  useLayoutEffect(() => {
    if (showTooltip && tooltipRef.current) {
        const tooltipEl = tooltipRef.current;
        const parentEl = tooltipEl.parentElement;
        
        if (parentEl) {
            const parentRect = parentEl.getBoundingClientRect();
            const tooltipWidth = tooltipEl.getBoundingClientRect().width;
            
            const vw = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
            const padding = 10; 

            const parentCenter = parentRect.left + parentRect.width / 2;
            const currentLeft = parentCenter - tooltipWidth / 2;
            const currentRight = parentCenter + tooltipWidth / 2;

            let shiftX = 0;

            if (currentLeft < padding) {
                shiftX = padding - currentLeft;
            } 
            else if (currentRight > vw - padding) {
                shiftX = (vw - padding) - currentRight;
            } 

            if (shiftX !== 0) {
                setAdjustStyle({ left: `calc(50% + ${shiftX}px)` });
            } else {
                setAdjustStyle({});
            }
        }
    }
  }, [isOpen]);

  const desktopPositionClass = tooltipSide === 'left'
    ? 'md:right-full md:mr-1 md:left-auto'
    : 'md:left-full md:ml-1 md:right-auto';

  const prism = item?.cash_item_coloring_prism;
  const hasPrism = prism && (prism.hue !== 0 || prism.saturation !== 0 || prism.value !== 0 || (prism.color_range && prism.color_range !== ''));

  // Mobile position logic
  const mobilePositionClass = mobileDir === 'up'
    ? 'bottom-full mb-2 md:bottom-auto md:mb-0'
    : 'top-full mt-2 md:mt-0';

  return (
    <div 
      ref={containerRef}
      className={`relative group ${showTooltip ? 'z-[100]' : 'z-0'}`}
    >
      {/* 1. 格子本體 (Slot) */}
      <div 
        className={`w-10 h-10 sm:w-12 sm:h-12 bg-[#1a1d24] border-2 ${item ? 'border-pink-500/50' : 'border-slate-800'} rounded-md flex items-center justify-center relative overflow-hidden transition-all cursor-pointer`}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {item ? (
          <>
            {hasPrism ? (
              <>
                <DyePreview 
                    imageUrl={item.cash_item_icon} 
                    hue={prism.hue} 
                    saturation={prism.saturation} 
                    value={prism.value} 
                    className="max-w-full max-h-full object-contain z-10 bg-transparent translate-x-[1px] translate-y-[1px]"
                />
                <img src="/image/theme/cashitem.png" alt="染色" className="absolute bottom-[3px] left-[3px] w-3 h-3 z-20" title="染色" />
              </>
            ) : (
              <img src={item.cash_item_icon} alt={item.cash_item_name} className="max-w-full max-h-full object-contain z-10 translate-x-[1px] translate-y-[1px]" />
            )}
          </>
        ) : (
          <span className="text-[10px] text-slate-700 select-none font-medium">{label}</span>
        )}
      </div>

      {/* 2. 懸浮視窗 (Tooltip) */}
      {item && (
        <div 
            ref={tooltipRef}
            style={adjustStyle}
            className={`absolute left-1/2 -translate-x-1/2 z-[200] w-[200px] 
                        ${showTooltip ? 'block' : 'hidden'} animate-in fade-in zoom-in-95 duration-200
                        ${mobilePositionClass}
                        md:absolute md:top-0 ${desktopPositionClass} md:translate-y-0 md:translate-x-0 md:mt-0 md:zoom-in-100`}
        >
           <div className="bg-[#1a1d24]/95 backdrop-blur-md border border-pink-500/30 rounded-lg shadow-xl p-3 text-center">
             <div className="text-sm font-bold text-pink-300 mb-1">{item.cash_item_name}</div>
             <div className="text-[10px] text-slate-400">{item.cash_item_equipment_slot}</div>
             
             {hasPrism ? (
               <>
                 {/* [修正重點] 這裡的 Tooltip 預覽圖
                     1. 移除原本的 style (background: #222)
                     2. 改用 className 設定大小 (w-16 h-16) 並去背，與下方一般圖片一致
                 */}
                 <DyePreview 
                    imageUrl={item.cash_item_icon} 
                    hue={prism.hue} 
                    saturation={prism.saturation} 
                    value={prism.value} 
                    className="w-16 h-16 object-contain mx-auto my-2 bg-transparent"
                 />
                 
                 <div className="mt-2 pt-2 border-t border-slate-700/50 flex flex-col items-center">
                   <div className="text-[10px] font-bold text-indigo-300 mb-1 flex items-center justify-center gap-1">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full"></span> 染色資訊
                   </div>
                   <div className="text-[9px] text-slate-400 grid grid-cols-3 gap-1 mb-2">
                      <div className="bg-slate-800/50 rounded px-1 py-0.5 border border-slate-700">色相: {prism.hue}</div>
                      <div className="bg-slate-800/50 rounded px-1 py-0.5 border border-slate-700">飽和: {prism.saturation}</div>
                      <div className="bg-slate-800/50 rounded px-1 py-0.5 border border-slate-700">亮度: {prism.value}</div>
                   </div>
                 </div>
               </>
             ) : (
               // 一般裝備的圖片樣式 (作為參考)
               <img src={item.cash_item_icon} alt={item.cash_item_name} className="w-16 h-16 object-contain mx-auto my-2" />
             )}

             {item.cash_item_option && item.cash_item_option.length > 0 && (
                 <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-1">
                     {item.cash_item_option.map((opt, i) => (
                         <div key={i} className="text-[10px] text-slate-300">
                           {opt.option_type}: {opt.option_value}
                         </div>
                     ))}
                 </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

const CashEquipmentGrid: React.FC<CashEquipmentGridProps> = ({ cashEquipment, beautyEquipment, characterImage }) => {
  const activePresetNo = cashEquipment.preset_no ? parseInt(cashEquipment.preset_no) : 0;
  // 初始預設：如果有指定預設，直接選定該預設，否則顯示現
  const [selectedPreset, setSelectedPreset] = useState<number>(activePresetNo);
  useEffect(() => {
    setSelectedPreset(activePresetNo);
  }, [cashEquipment]);


  // 合併邏輯：以現有裝備為主，預設有資料才覆蓋
  function mergePreset(base: CashItemEquipmentPreset[], preset?: CashItemEquipmentPreset[]) {
    if (!preset || preset.length === 0) return base || [];
    const slotMap = new Map((base || []).map(item => [item.cash_item_equipment_slot, item]));
    for (const item of preset) {
      if (item && item.cash_item_equipment_slot) {
        slotMap.set(item.cash_item_equipment_slot, item);
      }
    }
    return Array.from(slotMap.values());
  }

  let mainItems: CashItemEquipmentPreset[] = [];
  let additionalItems: CashItemEquipmentPreset[] = [];
  if (selectedPreset === 0) {
    mainItems = cashEquipment.cash_item_equipment_base || [];
    additionalItems = cashEquipment.additional_cash_item_equipment_base || [];
  } else {
    const preset =
      selectedPreset === 1 ? cashEquipment.cash_item_equipment_preset_1 :
      selectedPreset === 2 ? cashEquipment.cash_item_equipment_preset_2 :
      selectedPreset === 3 ? cashEquipment.cash_item_equipment_preset_3 : [];
    const addPreset =
      selectedPreset === 1 ? cashEquipment.additional_cash_item_equipment_preset_1 :
      selectedPreset === 2 ? cashEquipment.additional_cash_item_equipment_preset_2 :
      selectedPreset === 3 ? cashEquipment.additional_cash_item_equipment_preset_3 : [];
    mainItems = mergePreset(cashEquipment.cash_item_equipment_base || [], preset || []);
    additionalItems = mergePreset(cashEquipment.additional_cash_item_equipment_base || [], addPreset || []);
  }
  let activeItems = [...mainItems, ...additionalItems];
  
  const findByKeywords = (keywords: string[]) => {
      return activeItems.find(item => keywords.some(k => item.cash_item_equipment_slot === k || item.cash_item_equipment_slot.includes(k)));
  };

  const findAllByKeywords = (keywords: string[]) => {
      return activeItems.filter(item => keywords.some(k => item.cash_item_equipment_slot === k || item.cash_item_equipment_slot.includes(k)));
  };

  const rings = findAllByKeywords(['戒指', 'Ring']);

  const showAdditionalBeauty = 
    beautyEquipment?.additional_character_hair?.hair_name && 
    (
      beautyEquipment?.character_class?.includes('神之子') || 
      beautyEquipment?.character_class?.includes('天使破壞者') || 
      beautyEquipment?.additional_character_hair?.hair_name !== beautyEquipment?.character_hair?.hair_name ||
      beautyEquipment?.additional_character_face?.face_name !== beautyEquipment?.character_face?.face_name ||
      beautyEquipment?.additional_character_skin?.skin_name !== beautyEquipment?.character_skin?.skin_name
    );

  return (
    <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner relative mt-4">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
         <span className="w-2 h-2 rounded-full bg-pink-500"></span> 時裝 (Cash Items)
      </h3>
      
      {/* 這裡加入了 showBase={true} 以顯示 '0' 按鈕 */}
      <PresetSwitcher 
        currentPreset={selectedPreset}
        onPresetChange={setSelectedPreset}
        activePresetNo={activePresetNo || undefined}
        label="時裝預設"
        showBase={true}
        baseLabel={"0"}
        className="-mx-3 sm:mx-0"
      />
      
      <div className="flex justify-center gap-6 mt-4">
         {/* Left Column */}
         <div className="flex gap-2">
            <div className="flex flex-col gap-2">
                <CashSlot label="戒指4" item={rings[3]} tooltipSide="right" mobileDir="down" />
                <CashSlot label="戒指3" item={rings[2]} tooltipSide="right" mobileDir="down" />
                <CashSlot label="戒指2" item={rings[1]} tooltipSide="right" mobileDir="up" />
                <CashSlot label="戒指1" item={rings[0]} tooltipSide="right" mobileDir="up" />
            </div>
            <div className="flex flex-col gap-2">
                <CashSlot label="臉飾" item={findByKeywords(['臉飾', 'Face'])} tooltipSide="right" mobileDir="down" />
                <CashSlot label="眼飾" item={findByKeywords(['眼飾', 'Eye'])} tooltipSide="right" mobileDir="up" />
                <CashSlot label="耳環" item={findByKeywords(['耳環', 'Earrings'])} tooltipSide="right" mobileDir="up" />
            </div>
         </div>

         {/* Center Character & Beauty */}
         <div className="w-32 flex flex-col items-center relative">
            <div className="absolute top-0 inset-x-0 h-32 bg-pink-500/10 rounded-full blur-xl transform scale-75 translate-y-4"></div>
            {characterImage ? (
                <img 
                  src={`${characterImage}${characterImage.includes('?') ? '&' : '?'}action=A06`} 
                  alt="Character" 
                  className="relative z-10 drop-shadow-2xl scale-125 transform translate-y-4" 
                />
            ) : (
                <div className="w-24 h-24 rounded-full bg-slate-800/50 mb-4" />
            )}
            
            <div className="flex flex-col gap-2 mt-12 relative z-20 items-center">
                <div className="flex gap-2">
                   <BeautySlot 
                      label={showAdditionalBeauty ? (beautyEquipment?.character_class?.includes('神之子') ? "髮型 (Alpha)" : "髮型 (一般)") : "髮型"} 
                      name={beautyEquipment?.character_hair?.hair_name} 
                      baseColor={beautyEquipment?.character_hair?.base_color}
                      mixColor={beautyEquipment?.character_hair?.mix_color}
                      mixRate={beautyEquipment?.character_hair?.mix_rate}
                   />
                   <BeautySlot 
                      label={showAdditionalBeauty ? (beautyEquipment?.character_class?.includes('神之子') ? "臉型 (Alpha)" : "臉型 (一般)") : "臉型"} 
                      name={beautyEquipment?.character_face?.face_name} 
                      baseColor={beautyEquipment?.character_face?.base_color}
                      mixColor={beautyEquipment?.character_face?.mix_color}
                      mixRate={beautyEquipment?.character_face?.mix_rate}
                   />
                   <BeautySlot 
                      label={showAdditionalBeauty ? (beautyEquipment?.character_class?.includes('神之子') ? "皮膚 (Alpha)" : "皮膚 (一般)") : "皮膚"} 
                      name={beautyEquipment?.character_skin?.skin_name} 
                      baseColor={beautyEquipment?.character_skin?.color_style} 
                      hue={beautyEquipment?.character_skin?.hue}
                      saturation={beautyEquipment?.character_skin?.saturation}
                      brightness={beautyEquipment?.character_skin?.brightness}
                   />
                </div>

                {showAdditionalBeauty && (
                    <div className="flex gap-2 opacity-90">
                       <BeautySlot 
                          label={beautyEquipment?.character_class?.includes('神之子') ? "髮型 (Beta)" : "髮型 (變裝)"} 
                          name={beautyEquipment?.additional_character_hair?.hair_name} 
                          baseColor={beautyEquipment?.additional_character_hair?.base_color}
                          mixColor={beautyEquipment?.additional_character_hair?.mix_color}
                          mixRate={beautyEquipment?.additional_character_hair?.mix_rate}
                        />
                       <BeautySlot 
                          label={beautyEquipment?.character_class?.includes('神之子') ? "臉型 (Beta)" : "臉型 (變裝)"} 
                          name={beautyEquipment?.additional_character_face?.face_name} 
                          baseColor={beautyEquipment?.additional_character_face?.base_color}
                          mixColor={beautyEquipment?.additional_character_face?.mix_color}
                          mixRate={beautyEquipment?.additional_character_face?.mix_rate}
                        />
                       <BeautySlot 
                          label={beautyEquipment?.character_class?.includes('神之子') ? "皮膚 (Beta)" : "皮膚 (變裝)"} 
                          name={beautyEquipment?.additional_character_skin?.skin_name} 
                          baseColor={beautyEquipment?.additional_character_skin?.color_style} 
                          hue={beautyEquipment?.additional_character_skin?.hue}
                          saturation={beautyEquipment?.additional_character_skin?.saturation}
                          brightness={beautyEquipment?.additional_character_skin?.brightness}
                        />
                    </div>
                )}
            </div>
         </div>

         {/* Right Column */}
         <div className="flex gap-2">
            <div className="flex flex-col gap-2">
                <CashSlot label="帽子" item={findByKeywords(['帽子', 'Hat', 'Cap'])} tooltipSide="left" mobileDir="down" />
                <CashSlot label="上衣" item={findByKeywords(['上衣', '套服', 'Top', 'Overall'])} tooltipSide="left" mobileDir="down" />
                <CashSlot label="褲子" item={findByKeywords(['褲子', 'Bottom'])} tooltipSide="left" mobileDir="up" />
                <CashSlot label="武器" item={activeItems.find(item => 
                   (item.cash_item_equipment_slot === '武器' || item.cash_item_equipment_slot === 'Weapon') && 
                   !item.cash_item_equipment_slot.includes('Secondary') && 
                   !item.cash_item_equipment_slot.includes('Shield')
                )} tooltipSide="left" mobileDir="up" />
            </div>
            <div className="flex flex-col gap-2">
                <CashSlot label="披風" item={findByKeywords(['披風', 'Cape'])} tooltipSide="left" mobileDir="down" />
                <CashSlot label="手套" item={findByKeywords(['手套', 'Gloves'])} tooltipSide="left" mobileDir="down" />
                <CashSlot label="鞋子" item={findByKeywords(['鞋子', 'Shoes'])} tooltipSide="left" mobileDir="up" />
                <CashSlot label="副武" item={findByKeywords(['副武', '輔助武器', 'Secondary', 'Shield'])} tooltipSide="left" mobileDir="up" />
            </div>
         </div>
      </div>
    </div>
  );
};

export default CashEquipmentGrid;