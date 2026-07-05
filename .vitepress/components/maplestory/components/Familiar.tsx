import React, { useState } from 'react';
import { CheckSquare, Link2, PawPrint, Square, Star } from 'lucide-react';
import { CharacterFamiliar, DashboardData, FamiliarInfo, FamiliarLinkSlot, FamiliarOption } from '../types';

interface FamiliarProps {
  data: DashboardData;
}

const Familiar: React.FC<FamiliarProps> = ({ data }) => {
  const fam = data.familiar as CharacterFamiliar | undefined;
  const [showAllFamiliars, setShowAllFamiliars] = useState(false);
  const familiarList =
    fam?.familiar_list ||
    fam?.familiar_info ||
    [];
  const linkSlots = fam?.familiar_link_slot || [];

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

  const sortedFamiliarList = [...familiarList].sort((left, right) => {
    const leftMeta = getFamiliarUsageMeta(left);
    const rightMeta = getFamiliarUsageMeta(right);

    const leftScore = (leftMeta.isUsing ? 100 : 0) + (leftMeta.isSummoned ? 10 : 0) + (leftMeta.isActiveLinked ? 5 : 0) + (leftMeta.isLinked ? 1 : 0);
    const rightScore = (rightMeta.isUsing ? 100 : 0) + (rightMeta.isSummoned ? 10 : 0) + (rightMeta.isActiveLinked ? 5 : 0) + (rightMeta.isLinked ? 1 : 0);

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    return (left.familiar_name || left.familiar_nickname || '').localeCompare(right.familiar_name || right.familiar_nickname || '', 'zh-Hant');
  });

  const parseOptionValue = (value?: string) => {
    if (!value) return Number.NEGATIVE_INFINITY;
    const matched = value.match(/-?\d+(?:\.\d+)?/);
    return matched ? Number(matched[0]) : Number.NEGATIVE_INFINITY;
  };

  const isExcludedThresholdOption = (option: FamiliarOption) => {
    const optionName = option.option_name || '';
    const optionValue = option.option_value || '';
    const normalizedText = `${optionName} ${optionValue}`.replace(/\s+/g, '');
    const isRecoveryOption =
      normalizedText.includes('秒內') && (
        normalizedText.includes('恢復HP') ||
        normalizedText.includes('恢復MP') ||
        normalizedText.includes('恢復HP/MP')
      );

    return (
      optionName.includes('效果') ||
      isRecoveryOption
    );
  };

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
      <div key={`${label}-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-green-400">{value}</span>
      </div>
    );
  };

  const renderLinkSlot = (slot: FamiliarLinkSlot, idx: number) => {
    const active = slot.active_flag === 'true';

    return (
      <div key={`${slot.slot_id || 'slot'}-${idx}`} className="rounded-lg border border-pink-500/20 bg-pink-950/10 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-pink-300">
            <Link2 className="h-4 w-4" />
            <span>{formatSlot(slot.slot_id)}</span>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
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
    const name = familiar.familiar_name || familiar.familiar_nickname || '未知萌獸';
    const nickname = familiar.familiar_nickname;
    const options = Array.isArray(familiar.option) ? familiar.option : [];
    const { isSummoned, isLinked, isUsing } = getFamiliarUsageMeta(familiar);

    return (
      <div key={`${name}-${idx}`} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 shadow-inner">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-bold text-slate-100 break-words">{name}</div>
              {isUsing && (
                <span className="rounded-full border border-emerald-700/40 bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  召喚中
                </span>
              )}
              {isLinked && (
                <span className="rounded-full border border-pink-700/40 bg-pink-900/30 px-2 py-0.5 text-[10px] font-bold text-pink-300">
                  已放入{formatSlot(familiar.slot_id)}
                </span>
              )}
            </div>
            {nickname && nickname !== name && <div className="mt-1 text-xs text-slate-400">暱稱: {nickname}</div>}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3">
          <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-blue-300">
              <Star className="h-4 w-4" />
              外觀與識別
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              <div>外觀名稱: <span className="text-slate-200">{familiar.look_name || '-'}</span></div>
              <div>萌獸名稱: <span className="text-slate-200">{familiar.familiar_name || '-'}</span></div>
            </div>
          </div>
        </div>

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
      <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner w-full min-w-0">
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
    <div className="bg-[#161b22] p-6 rounded-xl border border-slate-800 shadow-inner w-full min-w-0">
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
