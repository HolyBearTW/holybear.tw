import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, TrendingUp, Star, History, X, AlertCircle } from 'lucide-react';
import { SERVER_ICONS } from '../constants';
import { fetchMaplerHouseCharacterRank, MaplerHouseCharacterRank } from '../services/maplerhouseService';
import { fetchCharacterBasic } from '../services/nexonService';
import { CharacterBasic } from '../types';

interface SearchFormProps {
    apiKey?: string | null;
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    characterName: string;
    setCharacterName: (name: string) => void;
    handleSearch: (e?: React.FormEvent, nameOverride?: string) => void;
    handleBestSearch: () => void;
    loading: boolean;
    isScanningBest: boolean;
    data: any;
    favorites: string[];
    toggleFavorite: (e: React.MouseEvent | undefined | null, name: string) => void;
    searchHistory: string[];
    setSearchHistory: (history: string[]) => void;
}

const SearchForm: React.FC<SearchFormProps> = ({
    apiKey,
    selectedDate,
    setSelectedDate,
    characterName,
    setCharacterName,
    handleSearch,
    handleBestSearch,
    loading,
    isScanningBest,
    data,
    favorites,
    toggleFavorite,
    searchHistory,
    setSearchHistory
}) => {
    const [showHistory, setShowHistory] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [characterRanks, setCharacterRanks] = useState<Record<string, MaplerHouseCharacterRank | null>>({});
    const [characterBasics, setCharacterBasics] = useState<Record<string, CharacterBasic | null>>({});

    useEffect(() => {
        const name = characterName.trim();
        if (name) localStorage.setItem('maple_last_search_name', name);
    }, [characterName]);

    useEffect(() => {
        const names = Array.from(new Set([...favorites, ...searchHistory]));
        if (names.length === 0) {
            setCharacterRanks({});
            return;
        }

        let active = true;
        Promise.all(names.map(async (name) => [name, await fetchMaplerHouseCharacterRank(name)] as const))
            .then((results) => {
                if (!active) return;
                setCharacterRanks(Object.fromEntries(results));
            })
            .catch(() => {
                if (active) setCharacterRanks({});
            });

        return () => {
            active = false;
        };
    }, [favorites, searchHistory]);

    useEffect(() => {
        if (!showHistory || !apiKey) return;
        const names = Array.from(new Set([...favorites, ...searchHistory]));
        let active = true;
        Promise.all(names.map(async (name) => [name, await fetchCharacterBasic(name, apiKey)] as const))
            .then((results) => {
                if (active) setCharacterBasics((current) => ({ ...current, ...Object.fromEntries(results) }));
            });
        return () => { active = false; };
    }, [apiKey, favorites, searchHistory, showHistory]);

    const renderCharacterMeta = (name: string) => {
        const rankInfo = characterRanks[name];
        const entry = rankInfo?.entry;
        const basic = characterBasics[name];
        const hasRankLookup = Object.prototype.hasOwnProperty.call(characterRanks, name);
        const characterImage = entry?.characterImage || basic?.character_image;
        const worldName = entry?.worldName || basic?.world_name;
        return (
            <>
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-800 ring-1 ring-slate-600/60">
                    {characterImage ? (
                        <img src={characterImage} alt="" className="absolute left-1/2 top-1/2 h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 object-cover" aria-hidden="true" />
                    ) : <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">?</span>}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                        {worldName && SERVER_ICONS[worldName] ? <img src={SERVER_ICONS[worldName]} alt="" width={12} height={12} className="shrink-0" aria-hidden="true" /> : null}
                        <span className="truncate">{name}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                        {!hasRankLookup ? <span>排名資料查詢中…</span> : rankInfo ? <><span>第 {rankInfo.rank.toLocaleString()} 名</span><span>・</span><span>{entry.combatPower.toLocaleString()}</span></> : <span>未列入近期戰力排名</span>}
                    </div>
                </div>
            </>
        );
    };

    const removeFromHistory = (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        const newHistory = searchHistory.filter(h => h !== name);
        setSearchHistory(newHistory);
        localStorage.setItem('maple_search_history', JSON.stringify(newHistory));
    };

    const submitSearch = (e: React.FormEvent) => {
        setShowHistory(false);
        searchInputRef.current?.blur();
        handleSearch(e);
    };

    const startBestSearch = () => {
        setShowHistory(false);
        searchInputRef.current?.blur();
        handleBestSearch();
    };

    return (
        <div className="w-full flex flex-col items-center gap-6 relative">
            <div className="maple-date-control flex items-center gap-2 text-sm text-slate-400">
                <span>指定日期 (選填):</span>
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-[#1a1d24] border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            <form onSubmit={submitSearch} className="w-full max-w-2xl relative group">
                <Search className="maple-search-leading-icon absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors" />
                <input 
                    ref={searchInputRef}
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    onFocus={() => setShowHistory(true)}
                    onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                    placeholder="輸入角色名稱"
                    className="maple-character-search-input w-full bg-[#1a1d24] border border-slate-700 rounded-xl py-3 pl-12 pr-20 sm:pr-32 text-sm sm:text-base focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-white placeholder:text-slate-600 shadow-lg"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 items-center">
                    {data && (
                        <div className="flex flex-col items-end mr-2 justify-center min-w-[60px] sm:min-w-auto">
                            <span className="text-[10px] text-slate-500 leading-none hidden sm:block">資料日期</span>
                            <span className="text-[10px] sm:text-xs font-mono text-indigo-400 font-bold">
                            {data.lastUpdated}
                            </span>
                        </div>
                    )}
                    <button type="submit" disabled={loading || isScanningBest} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading && !isScanningBest ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    </button>
                    <div className="w-px h-6 bg-slate-700 mx-1"></div>
                    <button 
                        type="button" 
                        onClick={startBestSearch}
                        disabled={loading || isScanningBest}
                        className="p-1.5 hover:bg-indigo-900/50 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50 group/best relative"
                        title="自動搜尋近七日最高戰力"
                    >
                        {isScanningBest ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
                    </button>
                </div>
                
                {(showHistory && (searchHistory.length > 0 || favorites.length > 0)) && (
                    <div className="maple-search-history-panel absolute top-full left-0 right-0 mt-2 rounded-xl border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        {favorites.length > 0 && (
                            <>
                                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 bg-transparent">
                                    <span className="text-xs font-bold text-yellow-400 flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400" /> 收藏角色</span>
                                </div>
                                {favorites.map((name, idx) => (
                                    <div key={`fav-${idx}`} onClick={() => { setCharacterName(name); setShowHistory(false); handleSearch(undefined, name); }} className="px-4 py-2.5 text-sm text-slate-300 hover:bg-indigo-600/20 hover:text-indigo-300 cursor-pointer flex items-center gap-3 group/item transition-colors">
                                        {renderCharacterMeta(name)}
                                        <button type="button" onClick={(e) => toggleFavorite(e, name)} className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-slate-700 rounded text-yellow-500 hover:text-yellow-400 transition-all">
                                            <Star className="w-3 h-3 fill-yellow-500" />
                                        </button>
                                    </div>
                                ))}
                                {searchHistory.length > 0 && <div className="h-1 bg-slate-800"></div>}
                            </>
                        )}
                        {searchHistory.length > 0 && (
                            <>
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-transparent">
                                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><History className="w-3 h-3" /> 搜尋紀錄</span>
                                    <button type="button" onClick={() => { setSearchHistory([]); localStorage.removeItem('maple_search_history'); }} className="text-[10px] text-slate-500 hover:text-red-400 transition-colors">清除全部</button>
                                </div>
                                {searchHistory.map((name, idx) => (
                                    <div key={idx} onClick={() => { setCharacterName(name); setShowHistory(false); handleSearch(undefined, name); }} className="px-4 py-2.5 text-sm text-slate-300 hover:bg-indigo-600/20 hover:text-indigo-300 cursor-pointer flex items-center gap-3 group/item transition-colors">
                                        {renderCharacterMeta(name)}
                                        <button type="button" onClick={(e) => removeFromHistory(e, name)} className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-red-400 transition-all"><X className="w-3 h-3" /></button>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </form>
        </div>
    );
};

export default SearchForm;
export interface SearchStatusProps {
  loading: boolean;
  isScanningBest: boolean;
  data: any;
  error: string | null;
  handleSearch: () => void;
}

export const SearchStatus: React.FC<SearchStatusProps> = ({
  loading,
  isScanningBest,
  data,
  error,
  handleSearch,
}) => {
  return (
    <>
      {loading && !data && (
         <div className="flex flex-col items-center justify-center min-h-[300px] animate-pulse">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <p className="maple-character-loading-text font-medium">{isScanningBest ? '正在掃描過去七天數據，尋找最強狀態...' : '正在讀取角色資料...'}</p>
         </div>
      )}

      {error && !(error.includes('AI') || error.includes('Quota')) && (
         <div className="max-w-md mx-auto mt-20 p-6 bg-red-950/20 border border-red-900 rounded-xl text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-red-400 font-bold mb-1">讀取失敗</h3>
            <p className="text-red-300/80 text-sm mb-4">{error}</p>
            <div className="flex flex-col gap-2 justify-center sm:flex-row">
              <button onClick={() => handleSearch()} className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 rounded text-white text-sm transition-colors">重試</button>
            </div>
         </div>
      )}
    </>
  );
};

export const SearchEmptyState: React.FC = () => {
  return (
    <div className="maple-empty-state flex flex-col items-center mt-4 mx-auto">
      <div className="maple-empty-state-icon w-20 h-20 rounded-full flex items-center justify-center mb-3">
        <Search className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold mb-2">開始查詢</h2>
      <p className="max-w-sm text-center">輸入角色名稱，查看新楓之谷的詳細數據與裝備。</p>
    </div>
  );
};
