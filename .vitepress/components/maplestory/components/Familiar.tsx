import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CheckSquare, Link2, PawPrint, Sparkles, Square } from 'lucide-react';
import { CharacterFamiliar, DashboardData, FamiliarInfo, FamiliarLinkSlot, FamiliarOption } from '../types';

interface FamiliarProps {
  data: DashboardData;
}

interface FamiliarNameTooltipProps {
  displayName: string;
  originalName: string;
}

const FamiliarNameTooltip: React.FC<FamiliarNameTooltipProps> = ({ displayName, originalName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [adjustStyle, setAdjustStyle] = useState<React.CSSProperties>({});

  const showTooltip = isOpen || isHovered;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (showTooltip && tooltipRef.current && containerRef.current) {
      const tooltipEl = tooltipRef.current;
      const containerEl = containerRef.current;
      const containerRect = containerEl.getBoundingClientRect();
      const tooltipWidth = tooltipEl.getBoundingClientRect().width;
      const vw = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
      const padding = 10;
      const containerCenter = containerRect.left + containerRect.width / 2;
      const currentLeft = containerCenter - tooltipWidth / 2;
      const currentRight = containerCenter + tooltipWidth / 2;

      let shiftX = 0;

      if (currentLeft < padding) {
        shiftX = padding - currentLeft;
      } else if (currentRight > vw - padding) {
        shiftX = (vw - padding) - currentRight;
      }

      if (shiftX !== 0) {
        setAdjustStyle({ left: `calc(50% + ${shiftX}px)` });
      } else {
        setAdjustStyle({});
      }
    }
  }, [showTooltip]);

  return (
    <div
      ref={containerRef}
      className={`relative min-w-0 max-w-full ${showTooltip ? 'z-[100]' : 'z-0'}`}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(value => !value);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        className="min-w-0 max-w-full truncate rounded border-b border-dashed border-sky-400/70 text-left text-base font-bold text-slate-100 transition-colors hover:border-sky-300 hover:text-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-400/40 cursor-help"
        aria-expanded={showTooltip}
      >
        {displayName}
      </button>

      <div
        ref={tooltipRef}
        style={adjustStyle}
        className={`absolute bottom-full left-1/2 z-[200] mb-2 w-[min(220px,calc(100vw-20px))] max-w-[calc(100vw-20px)] -translate-x-1/2 rounded-lg border border-sky-500/40 bg-[#1a1d24]/95 p-3 shadow-2xl backdrop-blur-md ${showTooltip ? 'block' : 'hidden'} animate-in fade-in zoom-in-95 duration-200 pointer-events-none`}
      >
        <div className="text-[11px] font-bold tracking-wide text-sky-300">原始萌獸名稱</div>
        <div className="mt-1 break-words text-sm font-bold text-white leading-tight">{originalName}</div>
      </div>
    </div>
  );
};

const Familiar: React.FC<FamiliarProps> = ({ data }) => {
  const fam = data.familiar as CharacterFamiliar | undefined;
  const [showAllFamiliars, setShowAllFamiliars] = useState(false);
  const characterClass = data.basic?.character_class || '';
  const isDemonAvenger = characterClass.includes('惡魔復仇者');
  const familiarList =
    fam?.familiar_list ||
    fam?.familiar_info ||
    [];
  const linkSlots = fam?.familiar_link_slot || [];
  const finalStats = data.stat?.final_stat || [];

  const formatSlot = (slotId?: string) => {
    if (!slotId) return '未連結';
    if (slotId === 'vip') return 'VIP';
    if (slotId === 'not link') return '未連結';
    return `插槽 ${slotId}`;
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    return value.split('T')[0];
  };

  const isActiveLinkedFamiliar = (familiar: FamiliarInfo) => {
    if (!familiar.slot_id) return false;
    return linkSlots.some(slot => slot.slot_id === familiar.slot_id && slot.active_flag === 'true');
  };

  const getFamiliarUsageMeta = (familiar: FamiliarInfo) => {
    const isSummoned = familiar.summoned_flag === 'true';
    const isLinked = familiar.slot_id !== undefined && familiar.slot_id !== null && familiar.slot_id !== '' && familiar.slot_id !== 'not link';
    const isActiveLinked = isActiveLinkedFamiliar(familiar);

    return {
      isSummoned,
      isLinked,
      isActiveLinked,
      isUsing: isSummoned,
    };
  };

  const parseOptionValue = (value?: string) => {
    if (!value) return Number.NEGATIVE_INFINITY;
    const matched = value.match(/-?\d+(?:\.\d+)?/);
    return matched ? Number(matched[0]) : Number.NEGATIVE_INFINITY;
  };

  const getFinalStatValue = (statName: string) => {
    const stat = finalStats.find(item => item.stat_name === statName);
    if (!stat) return Number.NEGATIVE_INFINITY;
    return parseOptionValue(stat.stat_value);
  };

  const focusedMainStat = [
    { label: 'STR', value: getFinalStatValue('STR') },
    { label: 'DEX', value: getFinalStatValue('DEX') },
    { label: 'INT', value: getFinalStatValue('INT') },
    { label: 'LUK', value: getFinalStatValue('LUK') },
  ].sort((left, right) => right.value - left.value)[0]?.label;

  const isExcludedThresholdOption = (option: FamiliarOption) => {
    const optionName = option.option_name || '';
    const optionValue = option.option_value || '';
    const normalizedText = `${optionName} ${optionValue}`.replace(/\s+/g, '');
    const isRecoveryOption =
      (
        normalizedText.includes('秒內') ||
        normalizedText.includes('攻擊時')
      ) && (
        normalizedText.includes('恢復HP') ||
        normalizedText.includes('恢復MP') ||
        normalizedText.includes('恢復HP/MP')
      );
    const isLowValueStatOption =
      optionName.includes('MaxHP') ||
      optionName.includes('MaxMP') ||
      optionName.includes('防禦力');

    return (
      optionName.includes('效果') ||
      isRecoveryOption ||
      isLowValueStatOption
    );
  };

  const getWhitelistedPotentialWeight = (option: FamiliarOption) => {
    const optionName = option.option_name || '';
    const optionValue = option.option_value || '';
    const normalizedText = `${optionName} ${optionValue}`.replace(/\s+/g, '').toUpperCase();

    if (
      normalizedText.includes('最終傷害') ||
      normalizedText.includes('BOSS傷害') ||
      normalizedText.includes('攻擊BOSS怪物時傷害') ||
      normalizedText.includes('無視防禦') ||
      normalizedText.includes('無視怪物防禦率')
    ) {
      return 6;
    }

    if (
      normalizedText.includes('爆擊傷害') ||
      normalizedText.includes('爆傷')
    ) {
      return 5;
    }

    if (
      normalizedText.includes('爆擊率') ||
      normalizedText.includes('物理攻擊力%') ||
      normalizedText.includes('魔法攻擊力%') ||
      normalizedText.includes('攻擊力%') ||
      normalizedText.includes('魔力%') ||
      normalizedText.includes('加持持續時間') ||
      normalizedText.includes('被動技能增加')
    ) {
      return 4;
    }

    if (
      normalizedText.includes('全屬性%') ||
      normalizedText.includes('所有屬性%')
    ) {
      return focusedMainStat ? 4 : 3;
    }

    if (
      normalizedText.includes('STR%') ||
      normalizedText.includes('DEX%') ||
      normalizedText.includes('INT%') ||
      normalizedText.includes('LUK%') ||
      (isDemonAvenger && normalizedText.includes('HP%'))
    ) {
      if (focusedMainStat && normalizedText.includes(`${focusedMainStat}%`)) {
        return 5;
      }

      return 3;
    }

    return 0;
  };

  const getFamiliarPotentialScore = (familiar: FamiliarInfo) => {
    const options = Array.isArray(familiar.option) ? familiar.option : [];

    return options.reduce((total, option) => {
      if (isExcludedThresholdOption(option)) {
        return total;
      }

      const weight = getWhitelistedPotentialWeight(option);
      if (weight <= 0) {
        return total;
      }

      const value = parseOptionValue(option.option_value);
      if (!Number.isFinite(value)) {
        return total;
      }

      return total + Math.max(value, 0) * weight;
    }, 0);
  };

  const sortedFamiliarList = [...familiarList].sort((left, right) => {
    const leftMeta = getFamiliarUsageMeta(left);
    const rightMeta = getFamiliarUsageMeta(right);

    const leftUsageScore = (leftMeta.isUsing ? 100 : 0) + (leftMeta.isSummoned ? 10 : 0) + (leftMeta.isActiveLinked ? 5 : 0) + (leftMeta.isLinked ? 1 : 0);
    const rightUsageScore = (rightMeta.isUsing ? 100 : 0) + (rightMeta.isSummoned ? 10 : 0) + (rightMeta.isActiveLinked ? 5 : 0) + (rightMeta.isLinked ? 1 : 0);

    if (leftUsageScore !== rightUsageScore) {
      return rightUsageScore - leftUsageScore;
    }

    const leftPotentialScore = getFamiliarPotentialScore(left);
    const rightPotentialScore = getFamiliarPotentialScore(right);

    if (leftPotentialScore !== rightPotentialScore) {
      return rightPotentialScore - leftPotentialScore;
    }

    return (left.familiar_name || left.familiar_nickname || '').localeCompare(right.familiar_name || right.familiar_nickname || '', 'zh-Hant');
  });

  const shouldShowPotential = (familiar: FamiliarInfo, options: FamiliarOption[]) => {
    const { isSummoned, isLinked } = getFamiliarUsageMeta(familiar);

    if (isSummoned || isLinked) {
      return true;
    }

    return options.some(option => !isExcludedThresholdOption(option) && parseOptionValue(option.option_value) >= 10);
  };

  const visibleFamiliarList = sortedFamiliarList.filter(familiar => {
    const options = Array.isArray(familiar.option) ? familiar.option : [];
    return shouldShowPotential(familiar, options);
  });
  const displayedFamiliarList = showAllFamiliars ? sortedFamiliarList : visibleFamiliarList;

  const renderOption = (option: FamiliarOption, idx: number) => {
    const label = option.option_name || `選項 ${option.option_no ?? idx + 1}`;
    const value = option.option_value || '-';

    return (
      <div key={`${label}-${idx}`} className="maple-familiar-option flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-green-400">{value}</span>
      </div>
    );
  };

  const renderLinkSlot = (slot: FamiliarLinkSlot, idx: number) => {
    const active = slot.active_flag === 'true';

    return (
      <div key={`${slot.slot_id || 'slot'}-${idx}`} className={`maple-familiar-slot ${active ? 'is-active' : ''} rounded-lg border border-pink-500/20 bg-pink-950/10 p-3`}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-pink-300">
            <Link2 className="h-4 w-4" />
            <span>{formatSlot(slot.slot_id)}</span>
          </div>
          <span className={`maple-familiar-slot-status ${active ? 'is-active' : ''} rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
            {active ? '啟用中' : '未啟用'}
          </span>
        </div>
        <div className="space-y-1 text-xs text-slate-400">
          <div>連結萌獸: <span className="text-slate-200">{slot.familiar_name || '未配置'}</span></div>
          <div>截止日期: <span className="text-slate-300">{formatDate(slot.expire_date)}</span></div>
        </div>
      </div>
    );
  };

  const renderFamiliarCard = (familiar: FamiliarInfo, idx: number) => {
    const originalName = familiar.familiar_name || '未知萌獸';
    const nickname = familiar.familiar_nickname;
    const displayName = nickname || originalName;
    const hasCustomName = Boolean(nickname && nickname !== originalName);
    const options = Array.isArray(familiar.option) ? familiar.option : [];
    const { isSummoned, isLinked, isUsing } = getFamiliarUsageMeta(familiar);
    const isSpecial = familiar.familiar_special_flag === 'true';

    return (
      <div
        key={`${displayName}-${idx}`}
        className={`maple-familiar-card ${isSpecial ? 'is-special' : ''} relative overflow-visible rounded-xl border p-4 shadow-inner transition-all ${isSpecial ? 'border-amber-400/50 bg-[linear-gradient(135deg,rgba(120,53,15,0.28),rgba(15,23,42,0.92))] shadow-[0_0_24px_rgba(251,191,36,0.16)]' : 'border-slate-700 bg-slate-900/60'}`}
      >
        {isSpecial && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_45%)] animate-pulse" />
          </>
        )}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 whitespace-nowrap min-w-0 overflow-visible">
              {hasCustomName ? (
                <FamiliarNameTooltip displayName={displayName} originalName={originalName} />
              ) : (
                <div className="min-w-0 max-w-full truncate text-base font-bold text-slate-100">
                  {displayName}
                </div>
              )}
              {isSpecial && (
                <span className="maple-familiar-special-badge shrink-0 rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.18)] animate-pulse">
                  傲天
                </span>
              )}
              {isUsing && (
                <span className="maple-familiar-summoned-badge shrink-0 rounded-full border border-emerald-700/40 bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  召喚中
                </span>
              )}
              {isLinked && (
                <span className="maple-familiar-linked-badge shrink-0 rounded-full border border-pink-700/40 bg-pink-900/30 px-2 py-0.5 text-[10px] font-bold text-pink-300">
                  已放入{formatSlot(familiar.slot_id)}
                </span>
              )}
            </div>
          </div>
        </div>

        {isSpecial && (
          <div className="mb-4 grid grid-cols-1 gap-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/10 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-amber-200">
                <Sparkles className="h-4 w-4" />
                額外技能
              </div>
              <div className="text-xs text-slate-300">
                {familiar.skill_name || '無技能資料'}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-300">萌獸潛能</div>
          {options.length > 0 ? options.map(renderOption) : (
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-3 py-4 text-center text-xs text-slate-500">
              無萌獸潛能資料
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!fam || !Array.isArray(familiarList) || familiarList.length === 0) {
    return (
      <div className="maple-familiar-section bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner w-full min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-pink-400 flex-shrink-0"><PawPrint className="w-5 h-5" /></span>
            <h3 className="text-lg font-bold text-slate-200">萌獸資訊</h3>
          </div>
          <span className="text-[11px] text-slate-500">Familiar</span>
        </div>
        <div className="text-slate-500 text-sm text-center py-6 bg-slate-900/40 rounded-lg border border-slate-800 border-dashed">
          無萌獸資料
        </div>
      </div>
    );
  }

  return (
    <div className="maple-familiar-section bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner w-full min-w-0">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-pink-400 flex-shrink-0"><PawPrint className="w-5 h-5" /></span>
          <h3 className="text-lg font-bold text-slate-200">萌獸資訊</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowAllFamiliars(value => !value)}
            className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 transition-all ${showAllFamiliars ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/60' : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700 hover:text-slate-400'}`}
          >
            {showAllFamiliars ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
            {showAllFamiliars ? `顯示全部 ${familiarList.length} 隻` : `顯示 ${visibleFamiliarList.length} / ${familiarList.length} 隻`}
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {linkSlots.length > 0 ? linkSlots.map(renderLinkSlot) : (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-4 py-5 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-4">
            無萌獸鏈路插槽資料
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {displayedFamiliarList.length > 0 ? displayedFamiliarList.map(renderFamiliarCard) : (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-4 py-8 text-center text-sm text-slate-500 sm:col-span-2 lg:col-span-3 xl:col-span-5">
            沒有符合顯示條件的萌獸
          </div>
        )}
      </div>
    </div>
  );
};

export default Familiar;
