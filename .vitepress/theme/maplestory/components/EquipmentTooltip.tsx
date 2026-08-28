import React from 'react';
import { Flame } from 'lucide-react';
import { EquipmentItem, ItemOption, CharacterSetEffect } from '../types';
import { inferPotentialLineGrade } from '../potentialInference';
import { mapleAsset } from '../assets';

interface EquipmentTooltipProps {
  item: EquipmentItem;
  setEffect?: CharacterSetEffect;
  characterJob?: string;
  slotType?: string;
  showSetEffect?: boolean;
}

const windowAsset = (name: string) => mapleAsset(`window/${name}`);

const windowBg = (name: string) => ({ backgroundImage: `url('${windowAsset(name)}')` });

const DotDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`h-[3px] bg-repeat-x ${className}`.trim()} style={windowBg('window_dotline.png')} />
);

const StarForceIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <img
    className="block w-[11px] h-[10px] -mr-[1px]"
    alt={filled ? '★' : '☆'}
    src={windowAsset(filled ? 'starForce_filled.png' : 'starForce_empty.png')}
    aria-hidden="true"
  />
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

const PotentialLine: React.FC<{ text: string; icon: string }> = ({ text, icon }) => (
  <div className="flex items-center gap-x-[5px] text-white">
    <img className="w-[10px] h-[10px]" alt="" src={windowAsset(icon)} aria-hidden="true" />
    <span>{text}</span>
  </div>
);

const SoulBadge: React.FC = () => (
  <span className="inline-flex w-[10px] h-[10px] shrink-0 items-center justify-center overflow-hidden rounded-[2px] bg-[#ff3858]">
    <Flame className="w-[8px] h-[8px] fill-[#2e353d] text-[#2e353d] stroke-[2.5]" aria-hidden="true" />
  </span>
);

const isPotentialSealed = (flag?: string) => String(flag || '').toLowerCase() === 'true';

const getPotentialAssetName = (grade: string | undefined, type: 'title' | 'detail') => {
  const normalized = String(grade || '').toLowerCase();

  let suffix = 'legendary';
  if (type === 'title') {
    if (normalized.includes('unique') || normalized.includes('罕見')) suffix = 'unique';
    else if (normalized.includes('epic') || normalized.includes('稀有')) suffix = 'epic';
    else if (normalized.includes('rare') || normalized.includes('特殊')) suffix = 'rare';
  } else {
    if (normalized.includes('unique')) suffix = 'unique';
    else if (normalized.includes('epic')) suffix = 'epic';
    else if (normalized.includes('rare')) suffix = 'rare';
  }

  return `potential_${type}_${suffix}.png`;
};

type WeaponMetadata = {
  handedness: '單手' | '雙手';
};

// Nexon item-equipment 不提供武器持有方式；這些是遊戲武器分類的固定資料，
// 只用於補齊遊戲 Tooltip 的「武器／單手／雙手」標籤。
const WEAPON_METADATA: Array<{ matcher: RegExp; metadata: WeaponMetadata }> = [
  { matcher: /拳套/, metadata: { handedness: '雙手' } },
  { matcher: /短劍|匕首/, metadata: { handedness: '單手' } },
  { matcher: /單手劍/, metadata: { handedness: '單手' } },
  { matcher: /單手斧|單手棍/, metadata: { handedness: '單手' } },
  { matcher: /雙手劍/, metadata: { handedness: '雙手' } },
  { matcher: /雙手斧|雙手棍/, metadata: { handedness: '雙手' } },
  { matcher: /火槍|短槍|手銃/, metadata: { handedness: '雙手' } },
  { matcher: /槍|矛|長槍|長矛/, metadata: { handedness: '雙手' } },
  { matcher: /弓/, metadata: { handedness: '雙手' } },
  { matcher: /弩/, metadata: { handedness: '雙手' } },
  { matcher: /拳甲|指虎/, metadata: { handedness: '雙手' } },
  { matcher: /手杖|魔法棒|短杖/, metadata: { handedness: '單手' } },
  { matcher: /長杖/, metadata: { handedness: '雙手' } },
];

const getWeaponMetadata = (item: EquipmentItem, slotType?: string): WeaponMetadata | null => {
  const slot = String(item.item_equipment_slot || '');
  const part = String(item.item_equipment_part || '');
  const isWeapon = slotType === 'Weapon' || slot === '武器' || part === '武器';
  if (!isWeapon) return null;

  const text = `${part} ${slot} ${item.item_name || ''}`;
  return WEAPON_METADATA.find(({ matcher }) => matcher.test(text))?.metadata || null;
};

const getScissorUsageLabel = (item: EquipmentItem, setName?: string): string => {
  const cuttableCount = Number(item.cuttable_count);
  if (!Number.isFinite(cuttableCount) || cuttableCount <= 0 || cuttableCount >= 255) return '';

  // 台版目前已知會顯示白金神奇剪刀次數的裝備範圍。
  const itemName = String(item.item_name || '');
  const isEternal = itemName.includes('永恆') && /斗篷|披風|手套|鞋/.test(itemName);
  const isBrilliantBoss = setName?.includes('光輝Boss') || /根源的耳語|死亡之誓|不朽的遺產/.test(itemName);
  const isKnownLimitedCutItem = /米特拉的憤怒|全面控制核心/.test(itemName);
  if (!isEternal && !isBrilliantBoss && !isKnownLimitedCutItem) return '';

  return `白金神奇剪刀可使用次數 ${cuttableCount}次`;
};

const ExceptionalLine: React.FC<{ text: string }> = ({ text }) => (
  <div className="text-white leading-[1.35]">
    {text}
  </div>
);

const firstDefinedValue = (...values: unknown[]) => values.find((value) => value !== undefined && value !== null && value !== '');

const formatExceptionalStatValue = (value: unknown) => {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const extractExceptionalData = (item: EquipmentItem) => {
  const exceptionalOption = (item as any).item_exceptional_option;

  const directCount = firstDefinedValue(
    (item as any).exceptional_upgrade,
    (item as any).exceptional_enhancement,
    (item as any).exceptional_enhancement_count,
    exceptionalOption?.exceptional_upgrade,
    exceptionalOption?.exceptional_enhancement,
    exceptionalOption?.exceptional_enhancement_count,
    exceptionalOption?.upgrade_count,
    exceptionalOption?.count,
    exceptionalOption?.value,
  );

  const count = parseInt(String(directCount ?? '0'), 10) || 0;

  const allStat = ['str', 'dex', 'int', 'luk']
    .map((key) => formatExceptionalStatValue(exceptionalOption?.[key]))
    .filter((value) => value > 0);
  const hp = formatExceptionalStatValue(exceptionalOption?.max_hp);
  const mp = formatExceptionalStatValue(exceptionalOption?.max_mp);
  const attackPower = formatExceptionalStatValue(exceptionalOption?.attack_power);
  const magicPower = formatExceptionalStatValue(exceptionalOption?.magic_power);

  const lines: string[] = [];

  if (allStat.length > 0) {
    const allStatValue = Math.min(...allStat);
    lines.push(`全屬性 +${allStatValue}`);
  }

  if (hp > 0 || mp > 0) {
    const hpText = hp > 0 ? `最大HP/MP +${hp}` : '';
    const mpText = mp > 0 && mp !== hp ? `最大MP +${mp}` : '';
    lines.push([hpText, mpText].filter(Boolean).join(' '));
  }

  if (attackPower > 0 || magicPower > 0) {
    if (attackPower > 0 && magicPower > 0 && attackPower === magicPower) {
      lines.push(`攻擊力/魔法攻擊力 +${attackPower}`);
    } else {
      if (attackPower > 0) lines.push(`攻擊力 +${attackPower}`);
      if (magicPower > 0) lines.push(`魔法攻擊力 +${magicPower}`);
    }
  }

  return { count, lines };
};

const StatLine: React.FC<{ label: string; base: string; add: string; etc: string; star: string; total: string; isPercent?: boolean; spacious?: boolean; gemBreakdown?: boolean }> = ({ label, base, add, etc, star, total, isPercent, spacious = false, gemBreakdown = false }) => {
  if (total === '0' || !total) return null;

  const baseVal = parseInt(base || '0');
  const addVal = parseInt(add || '0'); // Flame (Green)
  const etcVal = parseInt(etc || '0'); // Scroll (Yellow)
  const starVal = parseInt(star || '0'); // Starforce (Purple)
  const totalVal = parseInt(total || '0');

  // Calculate breakdown string: (Base + Flame + Scroll + Starforce)
  const hasRegularBreakdown = addVal > 0 || etcVal > 0 || starVal > 0;
  // 寶玉的研磨／加工數值只會出現在 item_total_option，API 沒有獨立來源欄位。
  const hasGemBreakdown = gemBreakdown && !hasRegularBreakdown && totalVal > 0;
  const hasBreakdown = hasRegularBreakdown || hasGemBreakdown;
  const suffix = isPercent ? '%' : '';
  
  return (
    <div className={`flex items-center ${spacious ? 'min-h-6 text-[12px] leading-5' : 'text-[11px] leading-[12px]'}`}>
      <span className={`text-slate-300 shrink-0 font-medium ${spacious ? 'w-28' : 'w-24'}`}>{label}:</span>
      <div className="flex-1 min-w-0 whitespace-nowrap">
        <span className="text-white">+{total}{suffix}</span>
        {hasBreakdown && (
          <span className="ml-1 whitespace-nowrap">
            (
            <span className="text-white">{baseVal}{suffix}</span>
            {hasGemBreakdown
              ? <span className="text-[#b7b5ff]" title="寶玉強化"> + {totalVal}{suffix}</span>
              : <>
                {addVal > 0 && <span className="text-green-400" title="星火加成"> + {addVal}{suffix}</span>}
                {etcVal > 0 && <span className="text-yellow-400" title="卷軸加成"> + {etcVal}{suffix}</span>}
                {starVal > 0 && <span className="text-[#b7b5ff]" title="星力加成"> + {starVal}{suffix}</span>}
              </>}
            )
          </span>
        )}
      </div>
    </div>
  );
};

type DescriptionSupplement = {
  text: string;
  className?: string;
};

const getDescriptionSupplements = (item: EquipmentItem, formattedDescription: string): DescriptionSupplement[] => {
  const itemName = String(item.item_name || '');
  const supplements: DescriptionSupplement[] = [];

  const addIfMissing = (text: string, className?: string) => {
    if (!formattedDescription.includes(text)) supplements.push({ text, className });
  };

  // 部分活動圖騰的遊戲 Tooltip 會在 item_description 之外追加固定的強化限制；
  // Nexon API 沒有把這些段落放在獨立欄位，因此在名稱可明確辨識時補回。
  if (itemName.includes('勇敢挑戰者的圖騰')) {
    addIfMissing('裝備時，可獲得在特定地區狩獵時追加獲得經驗值。', 'text-yellow-400');
    addIfMissing('星力、追加屬性 無法強化');
  } else if (/姆[嗚鳴]圖騰/.test(itemName)) {
    addIfMissing('在部分情況下為不可見的道具。', 'text-yellow-400');
    addIfMissing('星力、卷軸、追加屬性 無法強化');
  } else if (itemName.includes('古代石板複製品')) {
    addIfMissing('星力、卷軸、追加屬性 無法強化');
  }

  return supplements;
};

const formatDescription = (desc: string, itemName = '') => {
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

  // 寶玉的固定說明在 API 轉碼後會出現「伊□絲／□磨／□光／□化」等字元。
  // 這些句型只套用到寶玉，避免把其他道具的未知字元誤判成相同文案。
  if (itemName.includes('寶玉') || itemName.includes('寶石')) {
    res = res
      .replace(/如伊.{0,2}絲眼眸般的寶玉想將一切都奉獻給珍視之人的.{0,3}心。?/g, '如伊妮絲眼眸般的寶玉想將一切都奉獻給珍視之人的單純真心。')
      .replace(/寶玉可以進行覺醒、.{0,2}磨和加工三種.{0,2}化。?/g, '寶玉可以進行覺醒、研磨和加工三種強化。')
      .replace(/當佩戴經過.{0,2}光和細工.{0,2}化的寶玉時/g, '當佩戴經過拋光和細工強化的寶玉時');
  }

  // 圖騰與機器人的固定文案也會被 API 以「□」替代部分字元；只對已知
  // 類別套用修復，避免誤改其他裝備中真的有未知字元的說明。
  if (itemName.includes('圖騰') || itemName.includes('古代石板複製品')) {
    res = res
      .replace(/這是□了/g, '這是為了')
      .replace(/充滿姆[嗚鳴]神□力量/g, '充滿姆嗚神奇力量')
      .replace(/□隨在後/g, '跟隨在後')
      .replace(/輪□星火/g, '輪迴星火')
      .replace(/賦予□力/g, '賦予力量');
  }

  if (itemName.includes('古代石板複製品')) {
    res = res.replace(
      /使用噴出岩輪.*?追加素質。?/g,
      '使用噴出岩輪迴星火可賦予能力追加素質。',
    );
  }

  if (itemName.includes('機器人')) {
    res = res
      .replace(/戰□機器人/g, '戰鬥機器人')
      .replace(/經驗□獲得/g, '經驗值獲得')
      .replace(/經驗□/g, '經驗值')
      .replace(/視□/g, '視窗')
      .replace(/按□/g, '按鈕')
      .replace(/□可/g, '即可')
      .replace(/□維持/g, '並維持')
      .replace(/雜貨商店功能[^。]*。/g, '雜貨商店功能。');
  }

  if (itemName.includes('七日怪物公園看守者')) {
    res = res.replace(
      /周圍的人就會知道(?:□)?是收集完7日勳章的怪物公園VIP。?/g,
      '周圍的人就會知道你是收集完7日勳章的怪物公園VIP。',
    );
  }

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
  const isPuzzlePiece = slotType === 'PuzzlePiece';
  const isGem = item.item_name.includes('寶玉') || item.item_equipment_part === '寶石' || item.item_equipment_slot === '寶石';
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
  const potentialTitleIcon = getPotentialAssetName(item.potential_option_grade, 'title');
  const additionalPotentialTitleIcon = getPotentialAssetName(item.additional_potential_option_grade, 'title');
  const mainPotentialSealed = isPotentialSealed(item.potential_option_flag);
  const additionalPotentialSealed = isPotentialSealed(item.additional_potential_option_flag);
  const { count: exceptionalCount, lines: exceptionalOptions } = extractExceptionalData(item);
  const hasExceptionalEnhancement = exceptionalCount > 0;
  const legacySoulName = String(item.soul_name || '').trim();
  const legacySoulOption = String(item.soul_option || '').trim();
  const hasLegacySoul = Boolean(legacySoulName || legacySoulOption);
  const legacySoulAttackIncrease = Math.floor(Number(item.item_base_option.attack_power || 0) * 0.1);
  const legacySoulMagicIncrease = Math.floor(Number(item.item_base_option.magic_power || 0) * 0.1);
  const legacySoulSkillName = /武公/.test(legacySoulName)
    ? '無雙之力'
    : /艾畢奈亞|艾畢/.test(legacySoulName)
      ? '妖精密語'
      : /瑪麗西亞/.test(legacySoulName)
        ? '瑪麗西亞靈魂寶珠'
        : '';
  const soulWeaponGrade = String(item.soul_weapon_grade || '').trim();
  const soulWeaponLevel = String(item.soul_weapon_level || '').trim();
  const soulWeaponPowerIncrease = String(item.soul_weapon_power_increase || '').trim();
  const soulWeaponOption = String(item.soul_weapon_option || '').trim();
  const hasSoulWeapon = Boolean(
    soulWeaponGrade || soulWeaponLevel || soulWeaponPowerIncrease || soulWeaponOption,
  );
  const formattedDescription = formatDescription(item.item_description || '', item.item_name);
  const descriptionSupplements = getDescriptionSupplements(item, formattedDescription);
  const formattedSoulWeaponPowerIncrease = /^[+-]/.test(soulWeaponPowerIncrease)
    ? soulWeaponPowerIncrease
    : `+${soulWeaponPowerIncrease}`;
  const weaponMetadata = getWeaponMetadata(item, slotType);
  const itemShapeName = String(item.item_shape_name || '').trim();
  const itemShapeIcon = String(item.item_shape_icon || '').trim();
  const hasAlternateShape = Boolean(itemShapeName && itemShapeName !== item.item_name);
  const hasAppliedShape = item.freestyle_flag === '1' || hasAlternateShape;
  const displayItemIcon = hasAppliedShape && itemShapeIcon ? itemShapeIcon : item.item_icon;
  const mainPotentialLines = [item.potential_option_1, item.potential_option_2, item.potential_option_3]
    .filter(Boolean)
    .map((text, index) => {
      const inferredGrade = inferPotentialLineGrade(item, text, item.potential_option_grade, index) || item.potential_option_grade;
      return {
        text,
        grade: inferredGrade,
        icon: getPotentialAssetName(inferredGrade, 'detail'),
      };
    });
  const additionalPotentialLines = [item.additional_potential_option_1, item.additional_potential_option_2, item.additional_potential_option_3]
    .filter(Boolean)
    .map((text, index) => {
      const inferredGrade = inferPotentialLineGrade(item, text, item.additional_potential_option_grade, index, 'additional') || item.additional_potential_option_grade;
      return {
        text,
        grade: inferredGrade,
        icon: getPotentialAssetName(inferredGrade, 'detail'),
      };
    });
  const equipmentCategory = ['馴服的怪物', '馬鞍', '怪物裝備'].includes(item.item_equipment_part) || ['馴服的怪物', '馬鞍', '怪物裝備'].includes(item.item_equipment_slot)
    ? '圖騰'
    : ['puzzle', 'Puzzle'].includes(item.item_equipment_part) || ['puzzle', 'Puzzle'].includes(item.item_equipment_slot)
    ? '拼圖'
    : ['android', 'Android'].includes(item.item_equipment_part) || ['android', 'Android'].includes(item.item_equipment_slot)
    ? '機器人'
    : item.item_name.includes('寶玉') && (['墜飾'].includes(item.item_equipment_part) || ['墜飾'].includes(item.item_equipment_slot))
    ? '寶玉'
    : item.item_equipment_part || item.item_equipment_slot || '未知';

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

  const slotLower = (item.item_equipment_slot || '').toLowerCase();
  const partLower = (item.item_equipment_part || '').toLowerCase();
  const isWeapon = slotType === 'Weapon' || item.item_equipment_slot === '武器' || item.item_equipment_part === '武器';
  const isSupportWeapon = slotType === 'Secondary';
  const isEmblemTag = slotType === 'Emblem';

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

      // 拼圖片名稱與套裝名稱的詞序不同，例如「真殺人鯨拼圖(攻擊力)1」
      // 對應「真殺人鯨攻擊力拼圖」，因此直接使用 API 中目前生效的拼圖套裝。
      if (isPuzzlePiece && setName.includes('拼圖')) return true;

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
  const scissorUsageLabel = getScissorUsageLabel(item, matchedSet?.set_name);

  const renderStars = () => {
      if (sfCount === 0) return null;

      const is25Star = sfCount >= 25; // 25星特效
      const row1Max = 15;
      const row2Max = 30;
      const limit = isSpecialWeapon ? sfCount : maxStars;

      const renderRow = (start: number, end: number) => {
        const groups: React.ReactNode[] = [];

        for (let groupStart = start; groupStart < end; groupStart += 5) {
          if (groupStart >= limit) break;

          const stars: React.ReactNode[] = [];
          for (let i = groupStart; i < Math.min(groupStart + 5, end, limit); i++) {
            stars.push(<StarForceIcon key={i} filled={i < sfCount} />);
          }

          groups.push(
            <span key={groupStart} className={`inline-flex items-center ${groupStart + 5 < end && groupStart + 5 < limit ? 'mr-[6px]' : ''}`}>
              {stars}
            </span>
          );
        }

        if (groups.length === 0) return null;

        return (
          <div className="flex h-[10px] items-start justify-center">
            {groups}
          </div>
        );
      };
      
      const starRow = renderRow(0, row1Max);
      const extraStarRow = limit > row1Max ? renderRow(row1Max, row2Max) : null;
      const hasStars = Boolean(starRow || extraStarRow);
      if (!hasStars) return null;
      
      return (
        <div className="relative text-center min-h-[0px] overflow-visible">
            <div className="relative z-10 mb-[8px]">
              {is25Star && (
                <img
                  src={windowAsset('starForce_anim.png')}
                  alt=""
                  className="absolute top-[-8px] left-0 w-full h-auto max-w-none pointer-events-none select-none z-0"
                  aria-hidden="true"
                />
              )}
              <div className="relative z-10">
                {starRow}
                {extraStarRow}
              </div>
            </div>
        </div>
      );
  };
  
  const renderedStars = renderStars();
  return (
    <div className={`maple-equipment-tooltip relative grid grid-cols-[14px_minmax(0,1fr)_15px] grid-rows-[14px_auto_15px] w-full text-white text-[12px] leading-[1.2] overflow-hidden z-50 text-left pointer-events-none ${isPuzzlePiece ? 'maple-equipment-tooltip-puzzle-piece' : ''}`}>
      <div className="bg-left-top" style={windowBg('window_nw.png')} />
      <div className="bg-repeat-x" style={windowBg('window_n.png')} />
      <div className="bg-left-top" style={windowBg('window_ne.png')} />

      <div className="bg-repeat-y" style={windowBg('window_w.png')} />
      <div className="relative [&>*:last-child]:pb-0" style={windowBg('window_c.png')}>
        <div className={`px-3 pt-[0px] text-center relative ${isPuzzlePiece ? 'pb-2 leading-snug' : 'pb-[3px] leading-none'}`}>
          {renderedStars}
          <h3 className={`font-bold text-white relative z-10 block m-0 p-0 ${isPuzzlePiece ? 'text-[15px] leading-snug' : 'text-sm leading-none'}`}>
           {item.item_name}
           {item.special_ring_level > 0 && <span className="text-orange-400 ml-1">Lv.{item.special_ring_level}</span>}
           {scrollCount > 0 ? ` (+${scrollCount})` : ''}
          </h3>
          {item.potential_option_grade && potInfo.label && (
            <p className="text-[10px] text-slate-300 m-0 leading-none">({potInfo.label}等級道具)</p>
          )}
        </div>

        <DotDivider />

        <div className={`pl-3 pr-1 relative ${isPuzzlePiece ? 'py-3' : 'py-[3px]'}`}>
          <div className="relative flex justify-between items-end gap-3">
            <div className="relative w-[64px] h-[64px] bg-no-repeat bg-[length:64px_64px]" style={windowBg('itemIcon_base.png')}>
              <div className="absolute inset-0 pointer-events-none bg-[length:64px_64px]" style={windowBg('itemIcon_shade.png')} />
              <div className="relative w-full h-full overflow-hidden">
                <img
                  src={displayItemIcon}
                  alt={item.item_name}
                  className="absolute max-w-6 max-h-6 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[2]"
                />
              </div>
            </div>
            <div className="flex flex-col items-end gap-y-[4px] text-[12px] leading-3">
              <div className="flex flex-wrap justify-end gap-1">
                {isWeapon && <CategoryBadge label="武器" />}
                {weaponMetadata && <CategoryBadge label={weaponMetadata.handedness} />}
                {isEmblemTag && <CategoryBadge label="能源" />}
                {isSupportWeapon && <CategoryBadge label="輔助武器" />}
                <CategoryBadge label={equipmentCategory} />
              </div>
              <div className="flex items-center gap-x-[5px]">
                <span className="text-[#B8BFC5]">要求等級</span>
                <span>Lv.{itemLevel}</span>
              </div>
            </div>
          </div>
        </div>

        <DotDivider />

        <div className={`px-3 ${isPuzzlePiece ? 'py-2 space-y-2' : 'py-[3px] space-y-1'} relative z-10`}>
          {hasAlternateShape && (
            <div className="flex items-center text-[11px] leading-tight">
              <span className="text-slate-400 w-24 shrink-0 font-medium text-left">目前外型</span>
              <span className="text-white">{itemShapeName}</span>
            </div>
          )}
          <div className={`flex items-center ${isPuzzlePiece ? 'text-[12px] leading-5' : 'text-[11px] leading-tight'}`}>
             <span className="text-slate-400 w-24 shrink-0 font-medium text-left">裝備職業</span>
             <span className="text-white">
                {getJobDisplay()}
             </span>
          </div>
          {/* Set Effect Summary Line */}
           {matchedSet && (
              <div className="flex items-center text-[11px] leading-tight text-green-400">
                  <span className="text-slate-400 w-24 shrink-0 font-medium text-left text-green-400">套組效果</span>
                  <span>{matchedSet.set_name} ({matchedSet.total_set_count})</span>
              </div>
           )}
          </div>

          {slotType !== 'Puzzle' && <DotDivider />}

          {slotType !== 'Puzzle' && (
          <div className={`px-3 relative z-10 bg-transparent ${isPuzzlePiece ? 'pt-[10px] pb-2 space-y-2' : 'py-0 space-y-1'}`}>
         {/* Categories */}
         <div className={isPuzzlePiece ? 'space-y-1' : 'space-y-[2px]'}>
           <StatLine label="STR" base={item.item_base_option.str} add={item.item_add_option.str} etc={item.item_etc_option.str} star={item.item_starforce_option.str} total={item.item_total_option.str} spacious={isPuzzlePiece} gemBreakdown={isGem} />
           <StatLine label="DEX" base={item.item_base_option.dex} add={item.item_add_option.dex} etc={item.item_etc_option.dex} star={item.item_starforce_option.dex} total={item.item_total_option.dex} spacious={isPuzzlePiece} gemBreakdown={isGem} />
           <StatLine label="INT" base={item.item_base_option.int} add={item.item_add_option.int} etc={item.item_etc_option.int} star={item.item_starforce_option.int} total={item.item_total_option.int} spacious={isPuzzlePiece} gemBreakdown={isGem} />
           <StatLine label="LUK" base={item.item_base_option.luk} add={item.item_add_option.luk} etc={item.item_etc_option.luk} star={item.item_starforce_option.luk} total={item.item_total_option.luk} spacious={isPuzzlePiece} gemBreakdown={isGem} />
           
           <StatLine label="最大 HP" base={item.item_base_option.max_hp} add={item.item_add_option.max_hp} etc={item.item_etc_option.max_hp} star={item.item_starforce_option.max_hp} total={item.item_total_option.max_hp} spacious={isPuzzlePiece} />
           <StatLine label="最大 MP" base={item.item_base_option.max_mp} add={item.item_add_option.max_mp} etc={item.item_etc_option.max_mp} star={item.item_starforce_option.max_mp} total={item.item_total_option.max_mp} spacious={isPuzzlePiece} />
           <StatLine label="攻擊力" base={item.item_base_option.attack_power} add={item.item_add_option.attack_power} etc={item.item_etc_option.attack_power} star={item.item_starforce_option.attack_power} total={item.item_total_option.attack_power} spacious={isPuzzlePiece} />
           <StatLine label="魔法攻擊力" base={item.item_base_option.magic_power} add={item.item_add_option.magic_power} etc={item.item_etc_option.magic_power} star={item.item_starforce_option.magic_power} total={item.item_total_option.magic_power} spacious={isPuzzlePiece} />
           <StatLine label="BOSS 傷害" base={item.item_base_option.boss_damage} add={item.item_add_option.boss_damage} etc={item.item_etc_option.boss_damage} star="0" total={item.item_total_option.boss_damage} isPercent spacious={isPuzzlePiece} />
           <StatLine label="無視防禦率" base={item.item_base_option.ignore_monster_armor} add={item.item_add_option.ignore_monster_armor} etc={item.item_etc_option.ignore_monster_armor} star="0" total={item.item_total_option.ignore_monster_armor} isPercent spacious={isPuzzlePiece} />
           <StatLine label="全屬性%" base={item.item_base_option.all_stat} add={item.item_add_option.all_stat} etc={item.item_etc_option.all_stat} star="0" total={item.item_total_option.all_stat} isPercent spacious={isPuzzlePiece} />
           
           {((item.scroll_upgradable_count || (item as any).scroll_upgradeable_count) !== undefined && String((item.scroll_upgradable_count || (item as any).scroll_upgradeable_count)) !== '0') && (
             <div className="flex items-center text-[11px] leading-none">
               <span className="text-slate-300 w-24 shrink-0 font-medium">可使用卷軸數:</span>
               <span className="text-white">{(item.scroll_upgradable_count || (item as any).scroll_upgradeable_count)}</span>
             </div>
           )}
           {scissorUsageLabel && (
             <div className="flex items-center text-[11px] leading-none">
               <span className="text-yellow-400 w-auto shrink-0 font-medium">{scissorUsageLabel}</span>
             </div>
           )}
         </div>
          </div>
          )}

          {item.potential_option_grade && <DotDivider />}

          {item.potential_option_grade && (
          <div className="px-3 py-[2px] relative z-10">
            <div className={`flex items-center gap-1.5 text-xs font-bold mb-[1px] ${potInfo.color}`}>
                <img className="w-[10px] h-[10px]" alt={potInfo.label} src={windowAsset(potentialTitleIcon)} />
              <span>潛在能力 : {potInfo.label}</span>
           </div>
            {mainPotentialSealed ? (
              <div className="text-xs pl-1 text-slate-300">潛在能力已封印</div>
            ) : (
              <div className="text-xs space-y-[1px] pl-1">
                  {mainPotentialLines.map((line, index) => <PotentialLine key={`${index}-${line.text}`} text={line.text} icon={line.icon} />)}
             </div>
            )}
        </div>
          )}

          {item.additional_potential_option_grade && <DotDivider />}

          {item.additional_potential_option_grade && (
          <div className="px-3 py-[2px] relative z-10">
            <div className={`flex items-center gap-1.5 text-xs font-bold mb-[1px] ${addPotInfo.color}`}>
                <img className="w-[10px] h-[10px]" alt={addPotInfo.label} src={windowAsset(additionalPotentialTitleIcon)} />
              <span>附加潛在能力 : {addPotInfo.label}</span>
           </div>
            {additionalPotentialSealed ? (
              <div className="text-xs pl-1 text-slate-300">附加潛在能力已封印</div>
            ) : (
              <div className="text-xs space-y-[1px] pl-1">
                  {additionalPotentialLines.map((line, index) => <PotentialLine key={`${index}-${line.text}`} text={line.text} icon={line.icon} />)}
             </div>
            )}
        </div>
          )}

          {hasExceptionalEnhancement && <DotDivider />}

          {hasExceptionalEnhancement && (
          <div className="px-3 py-[2px] relative z-10 text-xs">
            <div className="flex items-start gap-x-[6px] text-white">
              <img
                className="w-[14px] h-[14px] mt-[1px] shrink-0"
                alt="EX"
                src={windowAsset('exceptional_enhanced.png')}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[#F0D38A] leading-[1.35]">
                  卓越強化：{exceptionalCount} 次
                </div>
                <div className="mt-[1px] space-y-[1px]">
                  {exceptionalOptions.map((option) => (
                    <ExceptionalLine key={option} text={option} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}

          {hasLegacySoul && <DotDivider />}

          {hasLegacySoul && (
          <div className="px-3 py-[2px] relative z-10">
           <div className="flex items-center gap-1.5 text-xs font-bold mb-[1px] text-red-400">
              <SoulBadge />
              <span>靈魂寶珠：{legacySoulName || '已裝備'}</span>
           </div>
           <div className="text-xs space-y-[1px] text-white pl-1">
              <p className="mb-0">
                靈魂武器：1000（攻擊力 +{legacySoulAttackIncrease}，魔力 +{legacySoulMagicIncrease}）
              </p>
              {legacySoulOption && <p className="mb-0">{legacySoulOption}</p>}
              {legacySoulSkillName && <p className="mb-0">[{legacySoulSkillName}]技能可使用</p>}
           </div>
        </div>
          )}

          {hasSoulWeapon && <DotDivider />}

          {hasSoulWeapon && (
          <div className="px-3 py-[2px] relative z-10">
           <div className="flex items-center gap-1.5 text-xs font-bold mb-[1px] text-red-400">
              <SoulBadge />
              <span>{soulWeaponGrade ? `靈魂武器 - 第${soulWeaponGrade}階段` : '靈魂武器'}</span>
           </div>
           <div className="text-xs space-y-[1px] text-white pl-1">
              {soulWeaponLevel && (
                <p className="mb-0">
                  Lv. {soulWeaponLevel}
                  {soulWeaponPowerIncrease && `（攻擊力/魔力 ${formattedSoulWeaponPowerIncrease}）`}
                </p>
              )}
              {!soulWeaponLevel && soulWeaponPowerIncrease && (
                <p className="mb-0">攻擊力/魔力 {formattedSoulWeaponPowerIncrease}</p>
              )}
              {soulWeaponOption && <p className="mb-0">{soulWeaponOption}</p>}
              <p className="mb-0">可使用靈魂鬥志技能</p>
           </div>
        </div>
          )}
      
          {showSetEffect && matchedSet && matchedSet.set_effect_info && <DotDivider />}

          {showSetEffect && matchedSet && matchedSet.set_effect_info && (
          <div className="px-3 py-[2px] relative z-10 transition-all duration-300">
            <div className="flex justify-between items-center mb-[1px]">
                <h4 className="text-sm font-bold text-green-400">{matchedSet.set_name}</h4>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                   {matchedSet.total_set_count}件效果生效中
                </span>
            </div>
            <div className="space-y-1">
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
                            <p className="font-bold mb-0 text-orange-300">{opt.set_count}套裝效果</p>
                            <div className="pl-1 leading-relaxed whitespace-pre-wrap text-[11px] text-slate-300">
                                {opt.set_option}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
        )}

        {(formattedDescription || descriptionSupplements.length > 0) && <DotDivider />}

        {(formattedDescription || descriptionSupplements.length > 0) && (
        <div className="px-3 py-[2px] text-xs text-slate-300 text-left relative z-10 leading-relaxed whitespace-pre-wrap break-words">
          {formattedDescription}
          {descriptionSupplements.map(({ text, className }) => (
            <div key={text} className={className || 'text-slate-300'}>{text}</div>
          ))}
        </div>
        )}
      </div>
      <div className="bg-repeat-y" style={windowBg('window_e.png')} />

      <div className="bg-left-top" style={windowBg('window_sw.png')} />
      <div className="bg-repeat-x" style={windowBg('window_s.png')} />
      <div className="bg-left-top" style={windowBg('window_se.png')} />
    </div>
  );
};

export default EquipmentTooltip;
