import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { BorderBeam } from 'border-beam';
import { EquipmentItem, CharacterEquipment, CharacterSetEffect } from '../types';
import EquipmentTooltip from './EquipmentTooltip';
import PresetSwitcher from './PresetSwitcher';
import { Square, CheckSquare, X } from 'lucide-react';

import { CharacterAndroidEquipment } from '../types';
import { mapleAsset } from '../assets';

const characterAsset = (name: string) => mapleAsset(`maplestory_character/${name}`);
const windowAsset = (name: string) => mapleAsset(`window/${name}`);

interface EquipmentGridProps {
  equipment: CharacterEquipment;
  setEffect?: CharacterSetEffect;
  characterImage?: string;
  androidEquipment?: CharacterAndroidEquipment;
}

// Visual Layout Definition
const SLOT_DEFINITIONS: Record<string, { label: string, match: string[] }> = {
  // Rings
  'Ring1': { label: '戒1', match: ['ring1', 'ring 1', 'ring i', '戒指1'] },
  'Ring2': { label: '戒2', match: ['ring2', 'ring 2', 'ring ii', '戒指2'] },
  'Ring3': { label: '戒3', match: ['ring3', 'ring 3', 'ring iii', '戒指3'] },
  'Ring4': { label: '戒4', match: ['ring4', 'ring 4', 'ring iv', '戒指4'] },
  
  // Accessories (Left)
  'Pocket': { label: '口袋', match: ['pocketitem', 'pocket', '口袋道具'] },
  'Pendant': { label: '墜1', match: ['pendant', 'pendant1', '墜飾1', '項鍊', '項鍊1'] }, // 注意：這邊只留標準墜飾
  'Pendant2': { label: '墜2', match: ['pendant2', '項鍊2'] },
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
  
  // TMS Special Slots
  'Totem1': { label: '圖騰', match: ['totem1'] }, // 讓 findItem 處理特殊邏輯
  'Totem2': { label: '圖騰', match: ['totem2'] },
  'Totem3': { label: '圖騰', match: ['totem3'] },
  'Gem': { label: '寶玉', match: ['gem'] }, // 讓 findItem 處理特殊邏輯
  'Puzzle': { label: '拼圖', match: ['puzzle', '拼圖'] },
};

// Custom Totem Image Mapping
// 使用者待填寫對應名稱
const TOTEM_MAPPING = [
  { name: '姆嗚圖騰', path: characterAsset('totem1.png') },
  { name: '彩虹月石寶石圖騰', path: characterAsset('totem2.png') },
  { name: '真和真圖騰', path: characterAsset('totem3.png') },
  { name: '真阿克婭圖騰', path: characterAsset('totem4.png') },
  { name: '真惠惠圖騰', path: characterAsset('totem5.png') },
  { name: '真達克妮絲圖騰', path: characterAsset('totem6.png') },
  { name: '勇敢挑戰者的圖騰', path: characterAsset('totem7.png') },
  { name: '赤之寶石圖騰', path: characterAsset('totem8.png') },
  { name: '綠之寶石圖騰', path: characterAsset('totem9.png') },
  { name: '青之寶石圖騰', path: characterAsset('totem10.png') },
  { name: '黃之寶石圖騰', path: characterAsset('totem11.png') },
  { name: '五個碎片的橘子樂園圖騰', path: characterAsset('totem12.png') },
  { name: '超越的圖騰', path: characterAsset('totem13.png') },
  { name: '醫院長圖騰', path: characterAsset('totem14.png') },
  { name: '女護士圖騰', path: characterAsset('totem15.png') },
  { name: '輔助人員圖騰', path: characterAsset('totem16.png') },
  { name: '小筱精靈圖騰', path: characterAsset('totem17.png') },
  { name: '拉尼亞的美味便當圖騰', path: characterAsset('totem18.png') },
  { name: '異界的西格諾斯圖騰', path: characterAsset('totem19.png') },
  { name: '輪迴碑石', path: characterAsset('totem20.png') },
  { name: '古代石板複製品', path: characterAsset('totem21.png') },
  { name: '貝奧武夫的痕跡', path: characterAsset('totem22.png') },
  { name: '萬事的痕跡', path: characterAsset('totem23.png') },
  { name: '阿德勒的痕跡', path: characterAsset('totem24.png') },
  { name: '柏林的痕跡', path: characterAsset('totem25.png') },
  { name: 'TMS勇者號意念', path: characterAsset('totem26.png') },
  { name: '時空挑戰者的圖騰', path: characterAsset('totem27.png') },
];

const CUSTOM_ITEM_ICON_MAPPING = [
  { name: '神諭者的戒指', path: characterAsset('raw1.png') },
];

const resolveItemIcon = (item: EquipmentItem | undefined, slotKey: string): string | undefined => {
  if (!item) return undefined;
  
  // 0. Puzzle uses custom icon
  if (slotKey === 'Puzzle') {
      return characterAsset('puzzle.png');
  }

  // 1. Gem always uses custom icon
  if (slotKey === 'Gem') {
    return characterAsset('gem.png');
  }

  // 2. Totems check mapping
  if (['Totem1', 'Totem2', 'Totem3'].includes(slotKey)) {
    const match = TOTEM_MAPPING.find(m => m.name === item.item_name);
    if (match) return match.path;
  }

  // API 有套用外型時，優先使用變更後的外型圖示；沒有外型資料才回退原圖。
  const shapeName = String(item.item_shape_name || '').trim();
  const shapeIcon = String(item.item_shape_icon || '').trim();
  const hasAppliedShape = item.freestyle_flag === '1' || Boolean(shapeName && shapeName !== item.item_name);
  if (hasAppliedShape && shapeIcon) return shapeIcon;

  const customItemIcon = CUSTOM_ITEM_ICON_MAPPING.find(m => m.name === item.item_name);
  if (customItemIcon) {
    return customItemIcon.path;
  }

  // 3. Fallback to API icon
  return item.item_icon;
};

const getPuzzleSlotIndex = (item: EquipmentItem) => {
  const match = String(item.item_equipment_slot || '').match(/(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

const PuzzleBoard: React.FC<{
  items: EquipmentItem[];
  setEffect?: CharacterSetEffect;
  characterJob?: string;
  showSetEffect?: boolean;
  onClose: () => void;
}> = ({ items, setEffect, characterJob, showSetEffect = false, onClose }) => {
  const [hoveredPiece, setHoveredPiece] = useState<EquipmentItem | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<EquipmentItem | null>(null);
  const sortedItems = [...items].sort((a, b) => getPuzzleSlotIndex(a) - getPuzzleSlotIndex(b));
  const piecesBySlot = new Map(sortedItems.map((item) => [getPuzzleSlotIndex(item), item]));
  const activePiece = hoveredPiece || selectedPiece;

  return (
    <div
      className="maple-puzzle-board relative w-[176px] rounded-lg border border-slate-300 bg-white p-3 !text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.24)] dark:border-slate-700 dark:bg-[#111827] dark:!text-slate-100 dark:shadow-2xl"
      role="dialog"
      aria-label="目前裝備的拼圖"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="maple-puzzle-board-title text-sm font-bold tracking-wide !text-slate-900 dark:!text-slate-100">拼圖</span>
        <button
          type="button"
          aria-label="關閉拼圖"
          className="maple-puzzle-board-close flex h-6 w-6 items-center justify-center rounded-md border border-transparent !text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:!text-slate-900 dark:!text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:!text-white"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        className="grid grid-cols-3 gap-0 overflow-hidden rounded border border-slate-400 bg-black shadow-inner dark:border-slate-700"
        onMouseLeave={() => setHoveredPiece(null)}
      >
        {Array.from({ length: 12 }, (_, index) => {
          const piece = piecesBySlot.get(index + 1);
          if (!piece) {
            return <div key={index} className="h-12 w-12 bg-slate-950" aria-hidden="true" />;
          }

          const isSelected = selectedPiece === piece;
          return (
            <button
              key={`${piece.item_equipment_slot}-${piece.item_name}`}
              type="button"
              aria-label={`查看${piece.item_name}`}
              aria-pressed={isSelected}
              className={`relative m-0 h-12 w-12 overflow-hidden border-0 bg-black p-0 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${isSelected ? 'z-10 shadow-[inset_0_0_0_2px_rgba(34,211,238,0.9)]' : ''}`}
              onMouseEnter={() => setHoveredPiece(piece)}
              onFocus={() => setHoveredPiece(piece)}
              onBlur={() => setHoveredPiece(null)}
              onClick={() => setSelectedPiece((current) => current === piece ? null : piece)}
            >
              <img
                src={piece.item_icon}
                alt=""
                aria-hidden="true"
                className="absolute -inset-[2px] h-[calc(100%+4px)] w-[calc(100%+4px)] max-w-none object-fill"
                style={{ imageRendering: 'pixelated' }}
              />
            </button>
          );
        })}
      </div>

      <div className="maple-puzzle-board-hint mt-2 text-center text-[10px] leading-4 !text-slate-500 dark:!text-slate-400">
        移入或點選拼圖片查看能力
      </div>

      {activePiece && (
        <div className="absolute left-1/2 top-full z-[300] mt-2 w-[300px] max-w-[calc(100vw-20px)] -translate-x-1/2 md:left-auto md:right-[calc(100%+8px)] md:top-8 md:mt-0 md:translate-x-0">
          <EquipmentTooltip
            item={activePiece}
            setEffect={setEffect}
            characterJob={characterJob}
            slotType="PuzzlePiece"
            showSetEffect={showSetEffect}
          />
        </div>
      )}
    </div>
  );
};

interface SkillRingToggle {
  isOpen: boolean;
  ringName: string;
  onToggle: () => void;
}

interface ZeroWeaponToggle {
  isAlternate: boolean;
  currentName: string;
  nextName: string;
  onToggle: () => void;
}

const Slot: React.FC<{ slotKey: string; item?: EquipmentItem; tooltipSide?: 'left' | 'right'; mobileDir?: 'up' | 'down'; setEffect?: CharacterSetEffect; characterJob?: string; showSetEffect?: boolean; disabled?: boolean; skillRingToggle?: SkillRingToggle; zeroWeaponToggle?: ZeroWeaponToggle; puzzleItems?: EquipmentItem[] }> = ({ slotKey, item, tooltipSide = 'left', mobileDir = 'down', setEffect, characterJob, showSetEffect, disabled = false, skillRingToggle, zeroWeaponToggle, puzzleItems }) => {
  const def = SLOT_DEFINITIONS[slotKey];
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [adjustStyle, setAdjustStyle] = useState<React.CSSProperties>({});

  // Resolve Icon logic moved here to be shared with Tooltip
  const displayIcon = resolveItemIcon(item, slotKey);
  // Create a display item with the resolved icon to pass to Tooltip
  const displayItem = item ? { ...item, item_icon: displayIcon } : undefined;

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

  const isPuzzleBoard = slotKey === 'Puzzle' && Boolean(puzzleItems?.length);
  const showTooltip = isOpen || (!isPuzzleBoard && isHovered);

  // Smart Tooltip Positioning
  useLayoutEffect(() => {
    if (showTooltip && tooltipRef.current) {
        // Tailwind md breakpoint is 768px.
        // The side-positioning logic (md:right-full etc) is generally safe on desktop.
        // This adjustment logic assumes centered positioning, which conflicts with side positioning.
        // So we disable it on desktop.
        // HOWEVER, if the user reports difference between clicl/hover, we must ensure logic runs consistently.
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
            if (currentLeft < padding) shiftX = padding - currentLeft;
            else if (currentRight > vw - padding) shiftX = (vw - padding) - currentRight;
            if (shiftX !== 0) setAdjustStyle({ left: `calc(50% + ${shiftX}px)` });
            else setAdjustStyle({});
        }
    }
  }, [showTooltip]);
  
  if (!def) return <div className="w-10 h-10 sm:w-12 sm:h-12 invisible flex-shrink-0" />;

  // Restore style variables logic
  let borderColor = disabled ? 'border-slate-700' : 'border-slate-800';
  let bgColor = disabled ? 'bg-[#11151b]' : 'bg-[#1a1d24]';
  let glow = '';

  if (!disabled && item) {
    const grade = item.potential_option_grade ? item.potential_option_grade.toLowerCase() : '';
    if (grade.includes('legendary') || grade.includes('傳說')) { 
        borderColor = 'border-green-500'; 
        glow = 'shadow-[0_0_10px_-2px_rgba(34,197,94,0.3)]'; 
    }
    else if (grade.includes('unique') || grade.includes('罕見')) { borderColor = 'border-yellow-500'; }
    else if (grade.includes('epic') || grade.includes('稀有')) { borderColor = 'border-purple-500'; }
    else if (grade.includes('rare') || grade.includes('特殊')) { borderColor = 'border-blue-500'; }
    else { borderColor = 'border-slate-600'; }
  }

  const desktopPositionClass = tooltipSide === 'left' ? 'md:right-full md:mr-1 md:left-auto' : 'md:left-full md:ml-1 md:right-auto';
  // Use centered vertical alignment for desktop to handle long tooltips nicely as requested
  const desktopVerticalClass = 'md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:mt-0 md:mb-0';
  const mobilePositionClass = mobileDir === 'up' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <div 
      ref={containerRef}
      className={`relative group ${showTooltip ? 'z-[100]' : 'z-0'} !transform-none !transition-none !translate-y-0 !m-0`}
    >
      <div 
        className={`w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 ${bgColor} border-2 ${borderColor} rounded-md flex items-center justify-center relative overflow-hidden ${glow} ${item ? 'cursor-pointer' : 'cursor-default'} ${disabled ? 'opacity-45 saturate-0' : ''}`}
        role={isPuzzleBoard ? 'button' : undefined}
        tabIndex={isPuzzleBoard ? 0 : undefined}
        aria-label={isPuzzleBoard ? '查看目前裝備的拼圖' : undefined}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        onKeyDown={(event) => {
          if (isPuzzleBoard && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            setIsOpen((current) => !current);
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {item ? (
          <>
            <img 
              src={displayIcon} 
              alt={item.item_name} 
              className={`max-w-full max-h-full object-contain z-10 ${skillRingToggle || zeroWeaponToggle ? '-translate-x-[2px] -translate-y-[2px]' : ['Gem', 'Pocket', 'Badge', 'Ring1', 'Ring2', 'Ring3', 'Ring4'].includes(slotKey) ? 'translate-x-[1px] translate-y-[1px]' : ''}`}
            />
            {(item.potential_option_grade?.includes('Legendary') || item.potential_option_grade?.includes('傳說')) && <div className="absolute inset-0 bg-green-500/10 animate-pulse z-0" />}
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
      {skillRingToggle && (
        <button
          type="button"
          aria-label={`${skillRingToggle.isOpen ? '關閉' : '開啟'}輔助特殊技能戒指：${skillRingToggle.ringName}`}
          aria-pressed={skillRingToggle.isOpen}
          title={`${skillRingToggle.isOpen ? '關閉' : '開啟'}輔助特殊技能戒指：${skillRingToggle.ringName}`}
          className="absolute bottom-0 right-0 z-30 h-[19px] w-[19px] border-0 bg-transparent p-0 transition-[filter,transform] hover:brightness-110 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300"
          onClick={(event) => {
            event.stopPropagation();
            skillRingToggle.onToggle();
          }}
        >
          <img
            src={windowAsset(`skill-ring-${skillRingToggle.isOpen ? 'open' : 'close'}.png`)}
            alt=""
            aria-hidden="true"
            className="block h-[19px] w-[19px] max-w-none"
          />
        </button>
      )}
      {zeroWeaponToggle && (
        <button
          type="button"
          aria-label={`切換神之子武器：${zeroWeaponToggle.currentName} → ${zeroWeaponToggle.nextName}`}
          aria-pressed={zeroWeaponToggle.isAlternate}
          title={`切換為 ${zeroWeaponToggle.nextName}`}
          className="absolute bottom-0 right-0 z-30 h-[19px] w-[19px] border-0 bg-transparent p-0 transition-[filter,transform] hover:brightness-110 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300"
          onClick={(event) => {
            event.stopPropagation();
            zeroWeaponToggle.onToggle();
          }}
        >
          <img
            src={windowAsset(`skill-ring-${zeroWeaponToggle.isAlternate ? 'open' : 'close'}.png`)}
            alt=""
            aria-hidden="true"
            className="block h-[19px] w-[19px] max-w-none"
          />
        </button>
      )}
      {displayItem && (
        <div 
            ref={tooltipRef}
            style={adjustStyle}
            // Use showTooltip state instead of group-hover:block to ensure JS positioning logic runs consistently
            className={`absolute left-1/2 -translate-x-1/2 z-[200] ${isPuzzleBoard ? 'w-[176px]' : 'w-[300px]'} max-w-[90vw]
                        ${showTooltip ? 'block' : 'hidden'} animate-in fade-in duration-200 shadow-2xl rounded-xl
                        ${mobilePositionClass}
                        md:absolute ${desktopVerticalClass} ${desktopPositionClass} md:translate-x-0 ${isPuzzleBoard ? 'md:w-[176px]' : 'md:w-[300px]'} md:max-h-none md:overflow-visible`}
        >
           {isPuzzleBoard && puzzleItems ? (
             <PuzzleBoard
               items={puzzleItems}
               setEffect={setEffect}
               characterJob={characterJob}
               showSetEffect={showSetEffect}
               onClose={() => setIsOpen(false)}
             />
           ) : (
             <EquipmentTooltip item={displayItem} setEffect={setEffect} characterJob={characterJob} slotType={slotKey} showSetEffect={slotKey === 'Puzzle' ? true : showSetEffect} />
           )}
        </div>
      )}
    </div>
  );
};

const EquipmentGrid: React.FC<EquipmentGridProps> = ({ equipment, setEffect, characterImage, androidEquipment }) => {
  if (!equipment) return null; 
  const characterJob = equipment.character_class;
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  
  // 使用 preset_no 或預設為 1
  const activePresetNo = parseInt(equipment.preset_no || '1');
  const [selectedPreset, setSelectedPreset] = useState<number>(activePresetNo);
  const [showSetEffect, setShowSetEffect] = useState(false);
  const [showAuxiliarySkillRing, setShowAuxiliarySkillRing] = useState(false);
  const [showZeroAlternateWeapon, setShowZeroAlternateWeapon] = useState(false);

  useEffect(() => {
    if (equipment.preset_no) {
      setSelectedPreset(parseInt(equipment.preset_no));
    }
  }, [equipment]);

  // 取得顯示的裝備列表 (fallback 到 item_equipment 以防 preset 為空)
  const getDisplayItems = () => {
    const presetKey = `item_equipment_preset_${selectedPreset}`;
    const presetItems = (equipment as any)[presetKey];
    
    // 如果選擇的預設就是當前生效的預設，優先使用 item_equipment (因為它最準確包含所有生效效果)
    if (selectedPreset === activePresetNo && equipment.item_equipment && equipment.item_equipment.length > 0) {
        return equipment.item_equipment;
    }
    
    return presetItems && presetItems.length > 0 ? presetItems : (equipment.item_equipment || []);
  };

  const displayItems = getDisplayItems();
  const puzzleItems = (equipment.item_equipment || []).filter((item: EquipmentItem) =>
    normalize(item.item_equipment_part || '') === '拼圖'
    && /^拼圖\d+$/.test(normalize(item.item_equipment_slot || ''))
  );

  const isZeroCharacter = normalize(characterJob || '') === '神之子';
  const isZeroAstraSecondary = (item: EquipmentItem) => {
    const slot = normalize(item.item_equipment_slot || '');
    const part = normalize(item.item_equipment_part || '');
    return slot === '阿斯特拉輔助武器神之子' || part === '阿斯特拉輔助武器神之子';
  };
  const zeroPrimaryWeapon = isZeroCharacter
    ? displayItems.find((item: EquipmentItem) =>
        normalize(item.item_equipment_slot || '') === '武器'
        && !isZeroAstraSecondary(item)
      )
    : undefined;
  const zeroAlternateWeapon = isZeroCharacter
    ? displayItems.find((item: EquipmentItem) =>
        normalize(item.item_equipment_slot || '') === '輔助武器'
        && normalize(item.item_equipment_part || '') === '琉'
      )
    : undefined;
  const zeroAstraSecondary = isZeroCharacter
    ? displayItems.find(isZeroAstraSecondary)
    : undefined;

  const isAuxiliarySkillRing = (item: EquipmentItem) => {
    const slot = normalize(item.item_equipment_slot || '');
    const part = normalize(item.item_equipment_part || '');
    return slot === '輔助特殊技能戒指' || part === '輔助特殊技能戒指';
  };
  const auxiliarySkillRing = displayItems.find(isAuxiliarySkillRing);
  const isEquippedSkillRing = (item: EquipmentItem) =>
    !isAuxiliarySkillRing(item)
    && Number(item.special_ring_level || 0) > 0
    && (normalize(item.item_equipment_part || '') === '戒指' || normalize(item.item_equipment_slot || '').startsWith('戒指'));
  const equippedSkillRing = displayItems.find((item: EquipmentItem) =>
    isEquippedSkillRing(item) && /(規範|永續)戒指/.test(item.item_name || '')
  ) || displayItems.find(isEquippedSkillRing);
  const equippedSkillRingSlotKey = equippedSkillRing
    ? Object.keys(SLOT_DEFINITIONS).find((slotKey) => {
        const definition = SLOT_DEFINITIONS[slotKey];
        const slot = normalize(equippedSkillRing.item_equipment_slot || '');
        return definition.match.some((match) => normalize(match) === slot);
      })
    : undefined;

  useEffect(() => {
    if (!auxiliarySkillRing || !equippedSkillRingSlotKey) {
      setShowAuxiliarySkillRing(false);
    }
  }, [auxiliarySkillRing, equippedSkillRingSlotKey]);

  useEffect(() => {
    if (!zeroPrimaryWeapon || !zeroAlternateWeapon) {
      setShowZeroAlternateWeapon(false);
    }
  }, [zeroPrimaryWeapon, zeroAlternateWeapon]);

  // ---------------------------------------------------------
  // 核心邏輯修正：針對 TMS 特殊欄位進行強制配對
  // ---------------------------------------------------------
  const findItem = (slotKey: string) => {
    const def = SLOT_DEFINITIONS[slotKey];
    if (!def) return undefined;

    if (showAuxiliarySkillRing && auxiliarySkillRing && slotKey === equippedSkillRingSlotKey) {
      return auxiliarySkillRing;
    }

    if (isZeroCharacter && slotKey === 'Weapon' && zeroPrimaryWeapon && zeroAlternateWeapon) {
      return showZeroAlternateWeapon ? zeroAlternateWeapon : zeroPrimaryWeapon;
    }

    if (isZeroCharacter && slotKey === 'Secondary' && zeroAstraSecondary) {
      return zeroAstraSecondary;
    }

    const activeItems = equipment.item_equipment || [];

    // 1. 特殊處理：寶玉 (Gem)
    // 寶玉在 API 中 Slot 是 "墜飾"，所以不能只靠 Slot 找，必須檢查名稱包含 "寶玉"
    if (slotKey === 'Gem') {
        const predicate = (item: EquipmentItem) => item.item_name.includes('寶玉');
        const activeItem = activeItems.find(predicate);
        if (activeItem) return activeItem;

        return displayItems.find(predicate);
    }

    // 2. 特殊處理：墜飾 (Pendant / Pendant2)
    // 必須排除掉 "寶玉"，否則會顯示重複
    if (slotKey === 'Pendant' || slotKey === 'Pendant2') {
        // 先過濾掉寶玉
        const pendants = displayItems.filter((item: EquipmentItem) => !item.item_name.includes('寶玉'));
        
        // Pendant2 (第二個墜飾) 通常 slot 叫 '墜飾2'
        if (slotKey === 'Pendant2') {
            return pendants.find((item: EquipmentItem) => normalize(item.item_equipment_slot) === '墜飾2' || normalize(item.item_equipment_slot) === 'pendant2');
        }
        
        // Pendant (第一個墜飾)
        return pendants.find((item: EquipmentItem) => {
             const s = normalize(item.item_equipment_slot);
             return s === '墜飾' || s === 'pendant' || s === '墜飾1';
        });
    }

    // 3. 特殊處理：圖騰 (Totem 1/2/3) - 針對 TMS 的怪異 Slot 名稱
    if (slotKey === 'Totem1') {
        const predicate = (item: EquipmentItem) => item.item_equipment_slot === '馴服的怪物' || normalize(item.item_equipment_slot) === 'tamedmonster' || item.item_equipment_slot === 'Totem 1' || item.item_equipment_slot === '圖騰1';
        const activeItem = activeItems.find(predicate);
        if (activeItem) return activeItem;
        return displayItems.find(predicate);
    }
    if (slotKey === 'Totem2') {
        const predicate = (item: EquipmentItem) => item.item_equipment_slot === '馬鞍' || normalize(item.item_equipment_slot) === 'saddle' || item.item_equipment_slot === 'Totem 2' || item.item_equipment_slot === '圖騰2';
        const activeItem = activeItems.find(predicate);
        if (activeItem) return activeItem;
        return displayItems.find(predicate);
    }
    if (slotKey === 'Totem3') {
        const predicate = (item: EquipmentItem) => item.item_equipment_slot === '怪物裝備' || normalize(item.item_equipment_slot) === 'monsterequipment' || item.item_equipment_slot === 'Totem 3' || item.item_equipment_slot === '圖騰3';
        const activeItem = activeItems.find(predicate);
        if (activeItem) return activeItem;
        return displayItems.find(predicate);
    }

    // 拼圖處理: 從 Set Effect 猜測
    if (slotKey === 'Puzzle') {
        if (puzzleItems.length > 0) {
             return {
                ...puzzleItems[0],
                item_equipment_part: 'puzzle',
                item_equipment_slot: 'Puzzle',
                item_name: '拼圖盒',
                item_icon: characterAsset('puzzle.png'),
             };
        }

        const foundSet = setEffect?.set_effect?.find(s => s.set_name.includes('拼圖'));
        if (foundSet) {
             return {
                item_equipment_part: 'puzzle',
                item_equipment_slot: 'Puzzle',
                item_name: foundSet.set_name,
                item_icon: characterAsset('puzzle.png'),
                item_description: '由套組效果判定的拼圖道具',
                // Dummy values to satisfy type
                item_shape_name: '', item_shape_icon: '', item_gender: '',
                item_total_option: {} as any, item_base_option: {} as any, item_add_option: {} as any, item_etc_option: {} as any, item_starforce_option: {} as any,
                potential_option_grade: '', additional_potential_option_grade: '',
                potential_option_1: '', potential_option_2: '', potential_option_3: '',
                additional_potential_option_1: '', additional_potential_option_2: '', additional_potential_option_3: '',
                starforce: '', scroll_upgrade: '', starforce_scroll_flag: '', item_level: 0, special_ring_level: 0, date_expire: '',
             } as EquipmentItem;
        }
    }

    // 4. 一般裝備處理 (Android 特殊處理)
    if (slotKey === 'Android' && androidEquipment && androidEquipment.android_name) {
      return {
        item_equipment_part: 'android',
        item_equipment_slot: 'android',
        item_name: androidEquipment.android_name,
        item_icon: androidEquipment.android_icon,
        item_description: androidEquipment.android_description,
        // ... (補齊其他必要欄位以防 TS 報錯)
        item_shape_name: '', item_shape_icon: '', item_gender: '',
        item_total_option: {} as any, item_base_option: {} as any, item_add_option: {} as any, item_etc_option: {} as any, item_starforce_option: {} as any,
        potential_option_grade: '', additional_potential_option_grade: '',
        potential_option_1: '', potential_option_2: '', potential_option_3: '',
        additional_potential_option_1: '', additional_potential_option_2: '', additional_potential_option_3: '',
        starforce: '', scroll_upgrade: '', starforce_scroll_flag: '', item_level: 0, special_ring_level: 0, date_expire: '',
      };
    }
    
    // 5. 其他標準欄位：先精確比對，再模糊比對
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
    return fuzzy;
  };

  const visibleItems = getDisplayItems();
  const hasOverall = visibleItems.some((item: EquipmentItem) => {
    const slot = normalize(item.item_equipment_slot);
    const part = normalize(item.item_equipment_part);
    return slot === '套服' || slot === 'overall' || part === '套服' || part === 'overall';
  });

  return (
    <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner relative">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
         <span className="w-2 h-2 rounded-full bg-indigo-500"></span> 裝備 (Equipment)
      </h3>

      <PresetSwitcher 
        currentPreset={selectedPreset}
        onPresetChange={setSelectedPreset}
        activePresetNo={activePresetNo}
        label="裝備預設"
        showBase={false}
        className="-mx-3 sm:mx-0"
        extraControls={
          <button 
             onClick={() => setShowSetEffect(!showSetEffect)} 
             className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 transition-all ${showSetEffect ? 'bg-purple-900/40 text-purple-300 border-purple-700/50 hover:bg-purple-900/60' : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700 hover:text-slate-400'}`}
          >
             {showSetEffect ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
             詳細套裝效果
          </button>
        }
      />

      <div className="mt-4 flex justify-center gap-0.5 sm:gap-4 lg:gap-6">
      
      {/* Left Columns (Accessories) */}
      <div className="flex gap-2">
        <div className="flex flex-col gap-2">
          {['Ring4', 'Ring3', 'Ring2', 'Ring1', 'Belt', 'Pocket'].map((key, idx) => (
            <Slot
              key={key}
              slotKey={key}
              item={findItem(key)}
              tooltipSide="right"
              mobileDir={idx < 3 ? 'down' : 'up'}
              setEffect={setEffect}
              characterJob={characterJob}
              showSetEffect={showSetEffect}
              skillRingToggle={key === equippedSkillRingSlotKey && auxiliarySkillRing ? {
                isOpen: showAuxiliarySkillRing,
                ringName: auxiliarySkillRing.item_name,
                onToggle: () => setShowAuxiliarySkillRing((current) => !current),
              } : undefined}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2">
           {['Face', 'Eye', 'Earrings', 'Pendant2', 'Pendant', 'Puzzle'].map((key, idx) => <Slot key={key} slotKey={key} item={findItem(key)} tooltipSide="right" mobileDir={idx < 3 ? 'down' : 'up'} setEffect={setEffect} characterJob={characterJob} showSetEffect={showSetEffect} puzzleItems={key === 'Puzzle' ? puzzleItems : undefined} />)}
        </div>
      </div>

      {/* Center Character */}
      <div className="w-[9.25rem] sm:w-28 lg:w-32 flex flex-col items-center justify-start relative gap-2">
         {/* Using BorderBeam as requested for background effect */}
         <div className="absolute inset-0 pointer-events-none scale-125 sm:scale-140 lg:scale-150 top-10 w-20 h-20 sm:w-24 sm:h-24">
           <BorderBeam colorVariant="mono">
             <div className="w-full h-full rounded-full" />
           </BorderBeam>
         </div>
         <div className="h-[152px] sm:h-[184px] lg:h-[216px] flex items-center justify-center w-full relative z-20">
            {characterImage ? (
            <img src={characterImage} alt="Character" className="relative z-10 max-w-full drop-shadow-2xl scale-100 sm:scale-110 lg:scale-[1.35] transform translate-y-1 sm:translate-y-2 origin-bottom pointer-events-none" />
            ) : (
                <div className="w-24 h-24 rounded-full bg-slate-800/50 relative z-10" />
            )}
         </div>

         {/* Weapon Row */}
         <div className="flex flex-col gap-2 items-center w-full">
            <div className="flex gap-2">
               <Slot
                 slotKey="Weapon"
                 item={findItem('Weapon')}
                 tooltipSide="left"
                 mobileDir="up"
                 setEffect={setEffect}
                 characterJob={characterJob}
                 showSetEffect={showSetEffect}
                 zeroWeaponToggle={zeroPrimaryWeapon && zeroAlternateWeapon ? {
                   isAlternate: showZeroAlternateWeapon,
                   currentName: showZeroAlternateWeapon ? zeroAlternateWeapon.item_name : zeroPrimaryWeapon.item_name,
                   nextName: showZeroAlternateWeapon ? zeroPrimaryWeapon.item_name : zeroAlternateWeapon.item_name,
                   onToggle: () => setShowZeroAlternateWeapon((current) => !current),
                 } : undefined}
               />
               <Slot slotKey="Secondary" item={findItem('Secondary')} tooltipSide="left" mobileDir="up" setEffect={setEffect} characterJob={characterJob} showSetEffect={showSetEffect} />
               <Slot slotKey="Emblem" item={findItem('Emblem')} tooltipSide="left" mobileDir="up" setEffect={setEffect} characterJob={characterJob} showSetEffect={showSetEffect} />
            </div>
            {/* Totem/Gem Row */}
            <div className="flex gap-2">
               <Slot slotKey="Totem1" item={findItem('Totem1')} tooltipSide="left" mobileDir="up" setEffect={setEffect} characterJob={characterJob} showSetEffect={showSetEffect} />
               <Slot slotKey="Totem2" item={findItem('Totem2')} tooltipSide="left" mobileDir="up" setEffect={setEffect} characterJob={characterJob} showSetEffect={showSetEffect} />
               <Slot slotKey="Totem3" item={findItem('Totem3')} tooltipSide="left" mobileDir="up" setEffect={setEffect} characterJob={characterJob} showSetEffect={showSetEffect} />
            </div>
         </div>
      </div>

      {/* Right Columns (Armor) */}
      <div className="flex gap-2">
          <div className="flex flex-col gap-2">
            {['Hat', 'Top', 'Bottom', 'Shoulder', 'Android', 'Gem'].map((key, idx) => <Slot key={key} slotKey={key} item={key === 'Bottom' && hasOverall ? undefined : findItem(key)} tooltipSide="left" mobileDir={idx < 3 ? 'down' : 'up'} setEffect={setEffect} characterJob={characterJob} showSetEffect={showSetEffect} disabled={key === 'Bottom' && hasOverall} />)}
          </div>
          <div className="flex flex-col gap-2">
            {['Cape', 'Gloves', 'Shoes', 'Medal', 'Heart', 'Badge'].map((key, idx) => <Slot key={key} slotKey={key} item={findItem(key)} tooltipSide="left" mobileDir={idx < 3 ? 'down' : 'up'} setEffect={setEffect} characterJob={characterJob} showSetEffect={showSetEffect} />)}
          </div>
      </div>
      </div>

    </div>
  );
};

export default EquipmentGrid;
