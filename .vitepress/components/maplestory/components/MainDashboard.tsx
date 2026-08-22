

import { getJobBackgroundMap, SERVER_ICONS } from '../constants';
import React from 'react';
import { calculateWeeklyGrowth } from './ExpTrendChart';
import { ThumbsUp, Star, Crown, Zap, ChevronUp, ChevronDown, Info, Mail, Share2, Loader2, Wand2, Sword, Shield, Flame, Calculator } from 'lucide-react';
import StatRadarChart from './StatRadarChart';
import PresetSwitcher from './PresetSwitcher';
import StatTooltip from './StatTooltip';
import EquipmentGrid from './EquipmentGrid';
import CashEquipmentGrid from './CashEquipmentGrid';
import {
  fetchMaplerHouseCharacterRank,
  fetchMaplerHouseHistoryStatus,
  invalidateMaplerHouseRankingCache,
  MaplerHouseCharacterRank,
} from '../services/maplerhouseService';
import MaplerHouseGrowthTracker from './MaplerHouseGrowthTracker';
import MapleFeatureTour, { GrowthTrackingState } from './MapleFeatureTour';
import { fetchWeeklyHistory, findBestDateInPastWeek } from '../services/nexonService';

// Keep the calculator and its formula code out of the character result's first paint.
const CharacterCalculatorModal = React.lazy(() => import('./CharacterCalculatorModal'));

interface MainDashboardProps {
    data: any;
    apiKey: string;
    loading: boolean;
    isScanningBest: boolean;
    showDetailStats: boolean;
    setShowDetailStats: (show: boolean) => void;
    getStatVal: (key: string) => string | number;
    getStatBreakdown: (data: any, key: string) => any;
    detailedStats: any[];
    favorites?: string[];
    toggleFavorite?: (e: any, name: string) => void;
    setShowShareModal?: (show: boolean) => void;
    analyzing?: boolean;
    handleAiAnalyze?: () => void;
    aiAnalysis?: string | null;
    abilityPreset?: number;
    setAbilityPreset?: (preset: number) => void;
    currentAbilityInfo?: any[];
    getAbilityStyle?: (grade: string) => string;
}

const formatNumber = (val: string | number) => {
  if (val === '-' || val == null) return '-';
  const valStr = String(val);
  return parseInt(valStr.replace(/,/g, '') || '0').toLocaleString();
};

const formatBigNumber = (val: string | number) => {
  if (val === '-' || val == null) return '-';
  const valStr = String(val);
  const num = parseInt(valStr.replace(/,/g, '') || '0');
  if (num > 100000000) {
    const yi = Math.floor(num / 100000000);
    const wan = Math.floor((num % 100000000) / 10000);
    const rest = num % 10000;
    return `${yi}億 ${wan}萬 ${rest}`;
  }
  return num.toLocaleString();
};

interface RecentPowerRankHandle {
  refresh: () => void;
}

interface RecentPowerRankStatusProps {
  characterName: string;
  characterLevel: number;
  ocid?: string;
}

const RecentPowerRankStatus = React.forwardRef<RecentPowerRankHandle, RecentPowerRankStatusProps>(({
  characterName,
  characterLevel,
  ocid,
}, ref) => {
  const [recentPowerRank, setRecentPowerRank] = React.useState<MaplerHouseCharacterRank | null>(null);
  const [status, setStatus] = React.useState<'loading' | 'syncing' | 'found' | 'not-found' | 'error'>('loading');
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useImperativeHandle(ref, () => ({
    refresh: () => {
      invalidateMaplerHouseRankingCache();
      setRefreshKey((current) => current + 1);
    },
  }), []);

  React.useEffect(() => {
    let active = true;
    setRecentPowerRank(null);
    setStatus('loading');

    const loadRank = async () => {
      let result = await fetchMaplerHouseCharacterRank(characterName);
      let syncing = false;

      if (!result && ocid) {
        try {
          const trackingStatus = await fetchMaplerHouseHistoryStatus(ocid);
          const rankingEligible = Number(characterLevel || 0) >= 260;
          if (trackingStatus.tracked && trackingStatus.job?.status === 'completed' && rankingEligible) {
            invalidateMaplerHouseRankingCache();
            result = await fetchMaplerHouseCharacterRank(characterName);
            syncing = !result;
          }
        } catch {
          // 名次查詢仍可維持「未列入」，不讓追蹤狀態錯誤覆蓋主要結果。
        }
      }

      return { result, syncing };
    };

    loadRank()
      .then(({ result, syncing }) => {
        if (!active) return;
        setRecentPowerRank(result);
        setStatus(result ? 'found' : syncing ? 'syncing' : 'not-found');
      })
      .catch(() => {
        if (!active) return;
        setRecentPowerRank(null);
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [characterName, characterLevel, ocid, refreshKey]);

  if (status === 'loading') return <span className="text-slate-500">正在查詢近期排名...</span>;
  if (status === 'syncing') return <span className="text-emerald-400">正在同步近期戰力排名中...</span>;
  if (status === 'found' && recentPowerRank) {
    return (
      <span className="font-semibold text-yellow-300">
        近期戰力排名：第 {recentPowerRank.rank.toLocaleString()} / {recentPowerRank.total.toLocaleString()} 名
      </span>
    );
  }
  if (status === 'error') return <span className="text-slate-500">近期排名暫時無法取得</span>;
  return <span className="text-slate-500">未列入近期戰力排名</span>;
});

RecentPowerRankStatus.displayName = 'RecentPowerRankStatus';

const WeeklyGrowthValue = React.memo(({ characterName, apiKey }: { characterName: string; apiKey: string }) => {
  const [historyData, setHistoryData] = React.useState<any[] | null>(null);

  React.useEffect(() => {
    let active = true;
    fetchWeeklyHistory(characterName, apiKey)
      .then((history) => {
        if (active) setHistoryData(history || []);
      })
      .catch(() => {
        if (active) setHistoryData([]);
      });
    return () => {
      active = false;
    };
  }, [characterName, apiKey]);

  return <>{historyData ? calculateWeeklyGrowth(historyData) : '- %'}</>;
});

WeeklyGrowthValue.displayName = 'WeeklyGrowthValue';

const BestCombatPowerInfo = React.memo(({ characterName, apiKey }: { characterName: string; apiKey: string }) => {
  const [record, setRecord] = React.useState<{ date: string; combatPower: number } | null>(null);
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    findBestDateInPastWeek(characterName, apiKey)
      .then((result) => {
        if (active) setRecord(result);
      })
      .catch(() => {
        if (active) setRecord(null);
      });
    return () => {
      active = false;
    };
  }, [characterName, apiKey]);

  if (!record) return null;

  return (
    <>
      <button
        type="button"
        className="relative inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-emerald-400 focus-visible:text-emerald-400 focus-visible:outline-none"
        aria-label="顯示近7日最高戰鬥力"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={() => setShow(true)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {show && (
        <div
          role="status"
          className="maple-best-combat-power-tooltip absolute left-3 top-11 z-40 min-w-60 rounded-lg border border-emerald-400/30 bg-black/95 px-3 py-2 text-xs text-slate-200 shadow-xl shadow-black/50 backdrop-blur-sm"
        >
          <div className="font-bold text-emerald-300">近7日最高戰鬥力：{formatBigNumber(record.combatPower)}</div>
          <div className="mt-1 text-slate-400">紀錄時間：{record.date.replace(/-/g, '/')}</div>
        </div>
      )}
    </>
  );
});

BestCombatPowerInfo.displayName = 'BestCombatPowerInfo';

const MainDashboard: React.FC<MainDashboardProps> = ({
    data,
    apiKey,
    loading,
    isScanningBest,
    showDetailStats,
    setShowDetailStats,
    getStatVal,
    getStatBreakdown,
    detailedStats,
    favorites = [],
    toggleFavorite = () => {},
    setShowShareModal = () => {},
    analyzing = false,
    handleAiAnalyze = () => {},
    aiAnalysis = null,
    abilityPreset = 1,
    setAbilityPreset = () => {},
    currentAbilityInfo = [],
    getAbilityStyle = () => ''
}) => {
    const hasRecentLogin = String(data.basic.access_flag).toLowerCase() === 'true';
    const [showRecentLoginStatus, setShowRecentLoginStatus] = React.useState(false);
    const [showCalculator, setShowCalculator] = React.useState(false);
    const [growthTrackingState, setGrowthTrackingState] = React.useState<GrowthTrackingState>('loading');
    const recentPowerRankRef = React.useRef<RecentPowerRankHandle>(null);
    const growthButtonRef = React.useRef<HTMLButtonElement>(null);
    const aiCheckButtonRef = React.useRef<HTMLButtonElement>(null);
    const calculatorButtonRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
      setGrowthTrackingState('loading');
    }, [data.ocid]);

    const handleTrackingComplete = React.useCallback(() => {
      recentPowerRankRef.current?.refresh();
    }, []);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 space-y-4">
               <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden shadow-xl relative group">
                  <div className="maple-profile-banner h-32 bg-slate-800 relative overflow-hidden">
                      <div className="maple-profile-city absolute inset-0 bg-cover bg-center opacity-[0.68] transition-all duration-700 group-hover:scale-110 group-hover:opacity-[0.82]" style={{ backgroundImage: `url('https://maplestory.io/api/GMS/248/map/${getJobBackgroundMap(data.basic.character_class)}/render/back')` }}></div>
                      <div className="maple-profile-shade absolute inset-0 bg-gradient-to-b from-transparent to-[#161b22]"></div>
                  </div>
                  <div className="px-5 relative -mt-16 flex flex-col items-center pb-5">
                      <button
                        type="button"
                        className="relative z-10 mb-3 group-hover:scale-105 transition-transform duration-500"
                        aria-label={`近7日登入狀態：${hasRecentLogin}`}
                        onMouseEnter={() => setShowRecentLoginStatus(true)}
                        onMouseLeave={() => setShowRecentLoginStatus(false)}
                        onFocus={() => setShowRecentLoginStatus(true)}
                        onBlur={() => setShowRecentLoginStatus(false)}
                        onClick={() => setShowRecentLoginStatus(true)}
                      >
                          <span
                            className={`maple-recent-login-ring pointer-events-none absolute inset-0.5 z-10 rounded-full border-[3px] animate-pulse ${hasRecentLogin
                              ? 'border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9),0_0_18px_rgba(34,197,94,0.5)]'
                              : 'border-red-400 shadow-[0_0_8px_rgba(248,113,113,0.9),0_0_18px_rgba(239,68,68,0.5)]'
                            }`}
                            aria-hidden="true"
                          />
                          <div className="relative w-32 h-32 rounded-full bg-[#0a0c10] border-4 border-[#1f242e] shadow-2xl overflow-hidden flex items-center justify-center">
                              <img src={data.basic.character_image} alt="Character" className="w-[150%] h-[150%] object-cover mt-8" />
                          </div>
                          {showRecentLoginStatus && (
                            <span
                              role="status"
                              className={`maple-recent-login-tooltip pointer-events-none absolute left-1/2 -top-10 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border bg-[#0d1117]/95 px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-sm ${hasRecentLogin
                                ? 'border-emerald-400/40 text-emerald-300 shadow-emerald-950/40'
                                : 'border-red-400/40 text-red-300 shadow-red-950/40'
                              }`}
                            >
                              近7日登入：{String(hasRecentLogin)}
                            </span>
                          )}
                      </button>
                      <h2 className="text-2xl font-bold text-white mb-1 text-center">{data.basic.character_name}</h2>
                      {/* FIX: items-center added */}
                      <div className="flex flex-wrap justify-center items-center gap-2 text-xs text-slate-400 mb-6">
                         <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {data.stat.pop || 0}</span>
                         <span className="text-slate-600">|</span>
                         <span className="flex items-center gap-1">
                           {data.basic.character_gender === 'male' || data.basic.character_gender === '男' ? (
                             <span style={{color:'#3b82f6'}}>♂</span>
                           ) : data.basic.character_gender === 'female' || data.basic.character_gender === '女' ? (
                             <span style={{color:'#f472b6'}}>♀</span>
                           ) : (
                             <span style={{color:'#64748b'}}>?</span>
                           )}
                         </span>
                         <span className="text-slate-600">|</span>
                         <span>{data.basic.character_guild_name || '無公會'}</span>
                         <span className="text-slate-600">|</span>
                         <span className="flex items-center gap-1">
                           {SERVER_ICONS[data.basic.world_name] ? <img src={SERVER_ICONS[data.basic.world_name]} alt={data.basic.world_name} className="w-4 h-4 object-contain align-middle" /> : <Globe className="w-3 h-3 text-indigo-400 align-middle" />}
                           <span className="text-indigo-400">{data.basic.world_name}</span>
                         </span>
                         {/* FIX: Use 'e' properly here */}
                         <button onClick={(e) => toggleFavorite(e, data.basic.character_name)} className={`p-1 rounded-full ${favorites.includes(data.basic.character_name) ? 'text-yellow-400' : 'text-slate-400'}`}><Star className={`w-3 h-3 ${favorites.includes(data.basic.character_name) ? 'fill-yellow-400' : ''}`} /></button>
                         <button onClick={() => setShowShareModal(true)} className="p-1 text-slate-400 hover:text-indigo-400"><Share2 className="w-3 h-3" /></button>
                      </div>
                      
                      <div className="w-full mb-4 p-3 bg-[#0d1117]/80 backdrop-blur-sm rounded-lg border border-slate-800">
                         <div className="flex justify-between items-baseline mb-1">
                            <span className="text-sm font-bold text-white">{data.basic.character_class}</span>
                            <span className="text-xs text-slate-500">{data.basic.character_exp_rate}%</span>
                         </div>
                         <div className="text-2xl font-mono font-bold text-white mb-2">LV. {data.basic.character_level}</div>
                         <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: `${Math.min(parseFloat(data.basic.character_exp_rate), 100)}%` }} />
                         </div>
                      </div>

                      <div className="w-full space-y-2 text-xs text-slate-400 mb-6 bg-[#0d1117]/50 p-3 rounded-lg border border-slate-800/50">
                         <div className="flex justify-between border-b border-slate-800/50 pb-1.5">
                            <span>建立日期</span>
                            <span className="text-slate-300 font-mono">{data.basic.character_date_create ? data.basic.character_date_create.split('T')[0] : '2021-03-24'}</span>
                         </div>
                         <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
                           <span className="whitespace-nowrap">七日成長</span>
                           <span className="text-slate-300 font-mono text-right w-24">
                            <WeeklyGrowthValue key={data.basic.character_name} characterName={data.basic.character_name} apiKey={apiKey} />
                           </span>
                         </div>
                         <div className="flex justify-between border-b border-slate-800/50 pb-1.5">
                            <span>聯盟戰地</span>
                            <span className="text-slate-300 font-mono">{data.union?.union_level || 0}</span>
                         </div>
                         <div className="flex justify-between border-b border-slate-800/50 pb-1.5">
                            <span>神器等級</span>
                            <span className="text-slate-300 font-mono">{data.unionArtifact?.union_artifact_level ?? data.unionArtifact?.level ?? data.union?.union_artifact_level ?? 0}</span>
                         </div>
                         <div className="flex justify-between border-b border-slate-800/50 pb-1.5">
                            <span>武陵道場</span>
                            <span className="text-slate-300 font-mono">{data.dojo?.dojang_best_floor ? `${data.dojo.dojang_best_floor} 層` : '無紀錄'}</span>
                         </div>
                         <div className="flex justify-between pt-0.5">
                            <span>更新時間</span>
                            <span className="text-slate-500 font-mono">{data.lastUpdated}</span>
                         </div>
                      </div>

                      <div className="mb-6"><StatRadarChart data={data} /></div>

                      <MaplerHouseGrowthTracker
                        ocid={data.ocid}
                        characterName={data.basic.character_name}
                        onTrackingComplete={handleTrackingComplete}
                        createButtonRef={growthButtonRef}
                        onTrackingStatusChange={setGrowthTrackingState}
                      />

                      <button ref={aiCheckButtonRef} onClick={handleAiAnalyze} disabled={analyzing} className="maple-ai-check-button w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 hover:translate-y-[-1px]">
                         {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                         {aiAnalysis ? '重新分析' : 'AI 健檢'}
                      </button>
                      <button ref={calculatorButtonRef} onClick={() => setShowCalculator(true)} className="maple-calculator-open-button mt-2.5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 hover:translate-y-[-1px]">
                         <Calculator className="w-4 h-4" />
                         戰力計算機
                      </button>
                   </div>
               </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
               <div className="bg-[#161b22] border border-slate-800 rounded-xl p-5 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <Sword className="w-4 h-4" /> 焦點屬性
                  </h3>
                  <div className="relative bg-[#0d1117] border border-slate-700/50 rounded-lg p-3 mb-4">
                     <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <span>戰鬥力</span>
                        <BestCombatPowerInfo key={data.basic.character_name} characterName={data.basic.character_name} apiKey={apiKey} />
                     </div>
                     <div className="text-xl font-bold text-indigo-400 font-mono tracking-tight">{formatBigNumber(getStatVal('Combat Power'))}</div>
                     <div className="mt-1 text-xs">
                       <RecentPowerRankStatus
                         ref={recentPowerRankRef}
                         characterName={data.basic?.character_name || ''}
                         characterLevel={Number(data.basic?.character_level || 0)}
                         ocid={data.ocid}
                       />
                     </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Flame className="w-3.5 h-3.5 text-orange-500" /> 最終傷害</span>
                        <span className="font-mono text-white">{getStatVal('Final Damage')}%</span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Shield className="w-3.5 h-3.5 text-red-500" /> BOSS 傷害</span>
                        <span className="font-mono text-white">
                           <StatTooltip label="BOSS 傷害" breakdown={getStatBreakdown(data, 'BOSS怪物傷害')}>
                              {getStatVal('Boss Damage')}%
                           </StatTooltip>
                        </span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Sword className="w-3.5 h-3.5 text-red-400" /> 傷害</span>
                        <span className="font-mono text-white">
                           <StatTooltip label="傷害" breakdown={getStatBreakdown(data, '傷害')}>
                              {getStatVal('傷害')}%
                           </StatTooltip>
                        </span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Sword className="w-3.5 h-3.5 text-slate-400" /> 一般怪物傷害</span>
                        <span className="font-mono text-white">{getStatVal('一般怪物傷害')}%</span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Shield className="w-3.5 h-3.5 text-blue-500" /> 無視防禦率</span>
                        <span className="font-mono text-white">
                           <StatTooltip label="無視防禦率" breakdown={getStatBreakdown(data, '無視防禦率')}>
                              {getStatVal('Ignore Defense Rate')}%
                           </StatTooltip>
                        </span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Sword className="w-3.5 h-3.5 text-yellow-500" /> 爆擊傷害</span>
                        <span className="font-mono text-white">
                           <StatTooltip label="爆擊傷害" breakdown={getStatBreakdown(data, '爆擊傷害')}>
                              {getStatVal('Critical Damage')}%
                           </StatTooltip>
                        </span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Sword className="w-3.5 h-3.5 text-slate-300" /> 攻擊力 / 魔攻</span>
                        <span className="font-mono text-white">
                           <StatTooltip label="攻擊力" breakdown={getStatBreakdown(data, '攻擊力')}>
                               {formatNumber(getStatVal('Attack Power'))}
                           </StatTooltip> 
                           <span className="mx-1">/</span> 
                           <StatTooltip label="魔法攻擊力" breakdown={getStatBreakdown(data, '魔法攻擊力')}>
                               {formatNumber(getStatVal('Magic Power'))}
                           </StatTooltip>
                        </span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Star className="w-3.5 h-3.5 text-yellow-400" /> 星力</span>
                        <span className="font-mono text-white">{getStatVal('Star Force')}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Star className="w-3.5 h-3.5 text-purple-400" /> 神秘力量 (ARC)</span>
                        <span className="font-mono text-white">{getStatVal('Arcane Power')}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Star className="w-3.5 h-3.5 text-orange-400" /> 真實之力 (AUT)</span>
                        <span className="font-mono text-white">{getStatVal('Authentic Force')}</span>
                     </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" /> 內在潛能
                    </h3>
                    
                    <PresetSwitcher 
                      currentPreset={abilityPreset}
                      onPresetChange={setAbilityPreset}
                      activePresetNo={data.ability.preset_no ? parseInt(data.ability.preset_no) : 1}
                      label="潛能預設"
                      showBase={false} 
                    />

                    <div className="space-y-2 mb-2 mt-2">
                      {currentAbilityInfo.map((a: any, i: number) => (
                        <div key={i} className={`p-2.5 rounded text-xs font-medium border ${getAbilityStyle(a.ability_grade)} shadow-sm`}>
                          {a.ability_value}
                        </div>
                      ))}
                      {currentAbilityInfo.length === 0 && (
                        <div className="text-center text-slate-500 py-4 text-xs">此預設未配置潛能</div>
                      )}
                    </div>

                    <button 
                      onClick={() => setShowDetailStats(!showDetailStats)}
                      className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-500 hover:text-indigo-400 hover:bg-indigo-900/10 rounded transition-colors"
                    >
                      {showDetailStats ? '收起詳細屬性' : '顯示詳細屬性'} 
                      {showDetailStats ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    
                    {showDetailStats && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 animate-in fade-in slide-in-from-top-1 bg-[#0d1117] p-3 rounded-lg border border-slate-800">
                        {detailedStats.map((stat, i) => {
                          const val = stat.format ? stat.format(getStatVal(stat.key)) : getStatVal(stat.key);
                          const breakdown = getStatBreakdown(data, stat.key);
                          return (
                            <StatTooltip 
                              key={i} 
                              label={stat.label} 
                              value={val} 
                              suffix={stat.suffix} 
                              breakdown={breakdown} 
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                        {/* Notice / Disclaimer */}
                        <div className="mt-6 pt-4 border-t border-slate-800/50 text-[11px] text-slate-500 space-y-2">
                          <div className="flex gap-2 items-start">
                            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                            <p className="leading-relaxed">資料來源為 Nexon Open API，所有數據皆為每 15 分鐘更新一次。 若顯示舊資料請稍後再試。</p>
                          </div>
                          <div className="flex gap-2 items-start">
                            <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                            <p className="leading-relaxed">若數值與遊戲內不符，請聯繫站長聖小熊：<a href="mailto:holybear@holybear.tw" className="text-indigo-400 hover:underline hover:text-indigo-300 transition-colors">holybear@holybear.tw</a></p>
                          </div>
                        </div>
               </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
                      <EquipmentGrid 
                 equipment={data.equipment} 
                 setEffect={data.setEffect}
                 characterImage={data.basic.character_image} 
                 androidEquipment={data.androidEquipment?.[`android_preset_${data.equipment?.preset_no || 1}`] || data.androidEquipment?.android_preset_1} 
               />
                     {data.cashItemEquipment && <CashEquipmentGrid cashEquipment={data.cashItemEquipment} beautyEquipment={data.beautyEquipment} characterImage={data.basic.character_image} />}
            </div>
            {showCalculator && (
              <React.Suspense fallback={(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-[#161b22] px-5 py-3 text-sm font-bold text-emerald-300 shadow-2xl">
                    <Loader2 className="h-4 w-4 animate-spin" /> 正在開啟計算機...
                  </div>
                </div>
              )}>
                <CharacterCalculatorModal data={data} onClose={() => setShowCalculator(false)} />
              </React.Suspense>
            )}
            <MapleFeatureTour
              characterKey={data.ocid || data.basic.character_name}
              growthTrackingState={growthTrackingState}
              growthTargetRef={growthButtonRef}
              aiTargetRef={aiCheckButtonRef}
              calculatorTargetRef={calculatorButtonRef}
            />
          </div>
    );
};

export default React.memo(MainDashboard);
