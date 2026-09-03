import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { BorderBeam } from 'border-beam';
import { CharacterCashItemEquipment, CashItemEquipmentPreset, CharacterBeautyEquipment } from '../types';
import PresetSwitcher from './PresetSwitcher';
import DyePreview from './DyePreview';
import { mapleAsset } from '../assets';
import { useEquipmentLayoutScale } from './useEquipmentLayoutScale';

const windowAsset = (name: string) => mapleAsset(`window/${name}`);
const CUSTOM_CASH_ITEM_ICON_MAPPING = [
  { name: '神諭者的戒指', path: mapleAsset('maplestory_character/raw1.png') },
];

const windowBg = (name: string) => ({ backgroundImage: `url('${windowAsset(name)}')` });

const resolveCashItemIcon = (item?: CashItemEquipmentPreset): string | undefined => {
  if (!item) return undefined;

  const customItemIcon = CUSTOM_CASH_ITEM_ICON_MAPPING.find(mapping => mapping.name === item.cash_item_name);
  return customItemIcon?.path || item.cash_item_icon;
};

const DotDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`h-[3px] bg-repeat-x ${className}`.trim()} style={windowBg('window_dotline.png')} />
);

const CategoryBadge: React.FC<{ label: string }> = ({ label }) => (
  <div className="inline-flex items-center">
    <div className="w-[8px] h-[14px] shrink-0" style={windowBg('category_w.png')} />
    <div className="h-[14px] flex items-center bg-repeat-x px-[2px] text-[#B8BFC5]" style={windowBg('category_c.png')}>
      {label}
    </div>
    <div className="w-[8px] h-[14px] shrink-0" style={windowBg('category_e.png')} />
  </div>
);

const CashTooltipWindow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`maple-equipment-tooltip relative grid grid-cols-[14px_minmax(0,1fr)_15px] grid-rows-[14px_auto_15px] w-full text-white text-[12px] leading-[1.2] overflow-hidden z-50 text-left pointer-events-none ${className}`.trim()}>
    <div className="bg-left-top" style={windowBg('window_nw.png')} />
    <div className="bg-repeat-x" style={windowBg('window_n.png')} />
    <div className="bg-left-top" style={windowBg('window_ne.png')} />

    <div className="bg-repeat-y" style={windowBg('window_w.png')} />
    <div className="relative" style={windowBg('window_c.png')}>
      {children}
    </div>
    <div className="bg-repeat-y" style={windowBg('window_e.png')} />

    <div className="bg-left-top" style={windowBg('window_sw.png')} />
    <div className="bg-repeat-x" style={windowBg('window_s.png')} />
    <div className="bg-left-top" style={windowBg('window_se.png')} />
  </div>
);

const BeautyTooltipContent: React.FC<BeautySlotProps> = ({ label, name, baseColor, mixColor, mixRate, hue, saturation, brightness }) => {
  const hasMix = mixRate && parseInt(mixRate) > 0;
  const hasSkinDetails =
    typeof hue === 'number' &&
    typeof saturation === 'number' &&
    typeof brightness === 'number' &&
    (hue !== 0 || saturation !== 0 || brightness !== 0);

  return (
    <CashTooltipWindow>
      <div className="px-3 pt-3 pb-2 text-center">
        <h3 className="text-sm font-bold text-white">{name}</h3>
      </div>

      <DotDivider />

      <div className="px-3 py-[6px] flex justify-end">
        <CategoryBadge label={label} />
      </div>

      <DotDivider />

      <div className="px-3 py-[8px] space-y-2 text-[11px] leading-tight">
        {baseColor && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">基底</span>
            <span className="text-white">{baseColor}</span>
          </div>
        )}
        {hasMix && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">混染</span>
            <span className="text-white">{mixColor} ({mixRate}%)</span>
          </div>
        )}
        {hasSkinDetails && (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">色相</span>
              <span className="text-white">{hue}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">飽和</span>
              <span className="text-white">{saturation}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">亮度</span>
              <span className="text-white">{brightness}</span>
            </div>
          </>
        )}
      </div>
    </CashTooltipWindow>
  );
};

const CashItemTooltipContent: React.FC<{ item: CashItemEquipmentPreset; hasPrism: boolean }> = ({ item, hasPrism }) => {
  const prism = item.cash_item_coloring_prism;
  const displayIcon = resolveCashItemIcon(item);

  return (
    <CashTooltipWindow>
      <div className="px-3 pt-3 pb-2 text-center">
        <h3 className="text-sm font-bold text-white">{item.cash_item_name}</h3>
      </div>

      <DotDivider />

      <div className="px-3 py-[6px] relative">
        <div className="relative flex justify-between items-end gap-3">
          <div className="relative w-[64px] h-[64px] bg-no-repeat bg-[length:64px_64px]" style={windowBg('itemIcon_base.png')}>
            <div className="absolute inset-0 pointer-events-none bg-[length:64px_64px]" style={windowBg('itemIcon_shade.png')} />
            <div className="relative w-full h-full overflow-hidden">
              {hasPrism && prism ? (
                <DyePreview
                  imageUrl={displayIcon}
                  hue={prism.hue}
                  saturation={prism.saturation}
                  value={prism.value}
                  className="absolute max-w-6 max-h-6 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[2] bg-transparent"
                />
              ) : (
                <img
                  src={displayIcon}
                  alt={item.cash_item_name}
                  className="absolute max-w-6 max-h-6 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[2]"
                />
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-y-[4px] text-[12px] leading-3">
            <CategoryBadge label={(/ring|戒指/i.test(item.cash_item_equipment_slot || '') ? '戒指' : item.cash_item_equipment_slot) || '時裝'} />
            {hasPrism && <span className="text-[11px] text-indigo-300">染色套用中</span>}
          </div>
        </div>
      </div>

      {(hasPrism || (item.cash_item_option && item.cash_item_option.length > 0)) && <DotDivider />}

      <div className="px-3 py-[8px] space-y-1 text-[11px] leading-tight">
        {hasPrism && prism && (
          <>
            <div className="text-indigo-300 font-medium mb-1">染色資訊</div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">色相</span>
              <span className="text-white">{prism.hue}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">飽和</span>
              <span className="text-white">{prism.saturation}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">亮度</span>
              <span className="text-white">{prism.value}</span>
            </div>
          </>
        )}
        {item.cash_item_option?.map((opt, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="text-slate-400">{opt.option_type}</span>
            <span className="text-white">{opt.option_value}</span>
          </div>
        ))}
      </div>
    </CashTooltipWindow>
  );
};

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
      const vw = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
      if (vw >= 768) {
        setAdjustStyle({});
        return;
      }

        const tooltipEl = tooltipRef.current;
        const parentEl = tooltipEl.parentElement;
        
        if (parentEl) {
            const parentRect = parentEl.getBoundingClientRect();
            const tooltipWidth = tooltipEl.getBoundingClientRect().width;
            
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
  const borderColor = name ? 'border-slate-600' : 'border-slate-800';
  const glow = name ? 'shadow-[0_0_10px_-2px_rgba(148,163,184,0.18)]' : '';
  
  let iconSrc = '';
  if (label.includes('髮型')) iconSrc = mapleAsset('hair.png');
  else if (label.includes('臉型')) iconSrc = mapleAsset('face.png');
  else if (label.includes('皮膚')) iconSrc = mapleAsset('skin.png');

  // Beauty slots are typically at the top, so we show tooltip BELOW by default
  const mobileTooltipClass = 'top-full mt-2';
  const desktopPositionClass = 'md:right-full md:mr-1 md:left-auto';
  const desktopVerticalClass = 'md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:mt-0 md:mb-0';

  return (
    <div 
      ref={containerRef}
      className={`relative group ${showTooltip ? 'z-[300] isolate' : 'z-0'} !transform-none !transition-none !translate-y-0 !m-0`}
    >
      <div 
        className={`h-12 w-12 flex-shrink-0 bg-[#1a1d24] border-2 ${borderColor} rounded-md flex flex-col items-center justify-center relative overflow-hidden ${glow} cursor-pointer p-1`}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {iconSrc ? (
           <img 
             src={iconSrc} 
             alt={label} 
             className={`h-8 w-auto max-w-full object-contain sm:h-9 ${name ? 'opacity-100' : 'opacity-30 grayscale'}`}
           />
        ) : (
           name ? (
             <div className="text-[9px] sm:text-[10px] text-center leading-tight text-slate-200 break-words w-full overflow-hidden">
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
            className={`absolute left-1/2 -translate-x-1/2 z-[200] w-[240px] animate-in fade-in zoom-in-95 duration-200 ${showTooltip ? 'block' : 'hidden'}
                ${mobileTooltipClass} bottom-auto md:absolute ${desktopVerticalClass} ${desktopPositionClass} md:translate-x-0 md:zoom-in-100`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
           <BeautyTooltipContent
             label={label}
             name={name}
             baseColor={baseColor}
             mixColor={mixColor}
             mixRate={mixRate}
             hue={hue}
             saturation={saturation}
             brightness={brightness}
           />
        </div>
      )}
    </div>
  );
};

const CashSlot: React.FC<{ label: string; item?: CashItemEquipmentPreset; tooltipSide?: 'left' | 'right'; mobileDir?: 'up' | 'down'; disabled?: boolean }> = ({ label, item, tooltipSide = 'left', mobileDir = 'down', disabled = false }) => {
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
      const vw = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
      if (vw >= 768) {
        setAdjustStyle({});
        return;
      }

        const tooltipEl = tooltipRef.current;
        const parentEl = tooltipEl.parentElement;
        
        if (parentEl) {
            const parentRect = parentEl.getBoundingClientRect();
            const tooltipWidth = tooltipEl.getBoundingClientRect().width;
            
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
  }, [showTooltip]);

  const desktopPositionClass = tooltipSide === 'left'
    ? 'md:right-full md:mr-1 md:left-auto'
    : 'md:left-full md:ml-1 md:right-auto';

  const prism = item?.cash_item_coloring_prism;
  const displayIcon = resolveCashItemIcon(item);
  const hasPrism = prism && (prism.hue !== 0 || prism.saturation !== 0 || prism.value !== 0 || (prism.color_range && prism.color_range !== ''));
  const borderColor = disabled ? 'border-slate-700' : item ? 'border-slate-600' : 'border-slate-800';
  const glow = disabled ? '' : item ? 'shadow-[0_0_10px_-2px_rgba(148,163,184,0.18)]' : '';

  const mobilePositionClass = mobileDir === 'up'
    ? 'bottom-full mb-2 md:bottom-auto md:mb-0'
    : 'top-full mt-2 md:mt-0';
  const desktopVerticalClass = 'md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:mt-0 md:mb-0';

  return (
    <div 
      ref={containerRef}
      className={`relative group ${showTooltip ? 'z-[300] isolate' : 'z-0'} !transform-none !transition-none !translate-y-0 !m-0`}
    >
      {/* 1. 格子本體 (Slot) */}
      <div 
        className={`h-12 w-12 flex-shrink-0 ${disabled ? 'bg-[#11151b]' : 'bg-[#1a1d24]'} border-2 ${borderColor} rounded-md flex items-center justify-center relative overflow-hidden ${glow} ${item ? 'cursor-pointer' : 'cursor-default'} ${disabled ? 'opacity-45 saturate-0' : ''}`}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {item ? (
          <>
            {hasPrism ? (
              <>
                <DyePreview 
                  imageUrl={displayIcon} 
                    hue={prism.hue} 
                    saturation={prism.saturation} 
                    value={prism.value} 
                    className="max-w-full max-h-full object-contain z-10 bg-transparent translate-x-[1px] translate-y-[1px]"
                />
                <img src={mapleAsset('cashitem.png')} alt="染色" className="absolute bottom-[3px] left-[3px] w-3 h-3 z-20" title="染色" />
              </>
            ) : (
              <img src={displayIcon} alt={item.cash_item_name} className="max-w-full max-h-full object-contain z-10 translate-x-[1px] translate-y-[1px]" />
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
            className={`absolute left-1/2 -translate-x-1/2 z-[9999] w-[260px]
                        ${showTooltip ? 'block' : 'hidden'} animate-in fade-in zoom-in-95 duration-200
                        ${mobilePositionClass}
                        md:absolute ${desktopVerticalClass} ${desktopPositionClass} md:translate-x-0 md:mt-0 md:zoom-in-100`}
        >
           <CashItemTooltipContent item={item} hasPrism={Boolean(hasPrism)} />
        </div>
      )}
    </div>
  );
};

const CashEquipmentGrid: React.FC<CashEquipmentGridProps> = ({ cashEquipment, beautyEquipment, characterImage }) => {
  const { cardRef, layoutScale } = useEquipmentLayoutScale();
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
  
  const normalizeText = (value?: string) => (value || '').trim().toLowerCase();

  const matchesKeywords = (item: CashItemEquipmentPreset, keywords: string[]) => {
      const normalizedKeywords = keywords.map(keyword => keyword.trim().toLowerCase());
      const slot = normalizeText(item.cash_item_equipment_slot);
      const part = normalizeText(item.cash_item_equipment_part);

      return normalizedKeywords.some(keyword => (
        slot === keyword ||
        slot.includes(keyword) ||
        part === keyword ||
        part.includes(keyword)
      ));
  };

  const findByKeywords = (keywords: string[]) => {
      return activeItems.find(item => matchesKeywords(item, keywords));
  };

  const findAllByKeywords = (keywords: string[]) => {
      return activeItems.filter(item => matchesKeywords(item, keywords));
  };

  const rings = findAllByKeywords(['戒指', 'Ring']);
  const overallItem = findByKeywords(['套服', 'overall', 'longcoat', '한벌옷', '한벌', 'coat']);
  const topItem = findByKeywords(['上衣', 'Top']);
  const bottomItem = findByKeywords(['褲子', 'Bottom']);
  const hasOverall = Boolean(overallItem);

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
    <div ref={cardRef} className="relative rounded-xl border border-slate-800 bg-[#161b22] p-6 shadow-inner">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-sky-400"></span> 時裝 (Cash Items)
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
      
      <div className="-mx-6 mt-4 flex justify-center sm:mx-0">
      <div
        className="flex w-96 shrink-0 justify-center gap-6"
        style={{ zoom: layoutScale }}
      >
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
         <div className="relative flex w-32 flex-col items-center gap-2">
           <div className="relative flex h-40 w-full flex-none items-center justify-center">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-32 -translate-y-1/2 scale-75 transform">
                 <BorderBeam colorVariant="colorful">
                   <div className="w-full h-full rounded-full" />
                 </BorderBeam>
             </div>
             {characterImage ? (
                 <img
                   src={`${characterImage}${characterImage.includes('?') ? '&' : '?'}action=A06`}
                   alt="Character"
                   className="relative z-10 max-w-full scale-125 transform drop-shadow-2xl"
                 />
             ) : (
                <div className="h-24 w-24 rounded-full bg-slate-800/50" />
             )}
           </div>

            <div className="relative flex flex-col gap-2 items-center">
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
                <CashSlot label="上衣" item={overallItem || topItem} tooltipSide="left" mobileDir="down" />
                <CashSlot label="褲子" item={hasOverall ? undefined : bottomItem} tooltipSide="left" mobileDir="up" disabled={hasOverall} />
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
    </div>
  );
};

export default CashEquipmentGrid;
