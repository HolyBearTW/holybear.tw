import React, { useState, useRef } from 'react';
import { Search, Loader2, TrendingUp, Star, History, X, AlertCircle } from 'lucide-react';

interface SearchFormProps {
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

    const removeFromHistory = (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        const newHistory = searchHistory.filter(h => h !== name);
        setSearchHistory(newHistory);
        localStorage.setItem('maple_search_history', JSON.stringify(newHistory));
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

            <form onSubmit={handleSearch} className="w-full max-w-2xl relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                    ref={searchInputRef}
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    onFocus={() => setShowHistory(true)}
                    onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                    placeholder="輸入角色名稱"
                    className="w-full bg-[#1a1d24] border border-slate-700 rounded-xl py-3 pl-12 pr-20 sm:pr-32 text-sm sm:text-base focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-white placeholder:text-slate-600 shadow-lg"
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
                        onClick={handleBestSearch}
                        disabled={loading || isScanningBest}
                        className="p-1.5 hover:bg-indigo-900/50 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50 group/best relative"
                        title="自動搜尋近七日最高戰力"
                    >
                        {isScanningBest ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
                    </button>
                </div>
                
                {(showHistory && (searchHistory.length > 0 || favorites.length > 0)) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d24] border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        {favorites.length > 0 && (
                            <>
                                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 bg-[#15171c]">
                                    <span className="text-xs font-bold text-yellow-400 flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400" /> 收藏角色</span>
                                </div>
                                {favorites.map((name, idx) => (
                                    <div key={`fav-${idx}`} onClick={() => { setCharacterName(name); handleSearch(undefined, name); }} className="px-4 py-3 text-sm text-slate-300 hover:bg-indigo-600/20 hover:text-indigo-300 cursor-pointer flex justify-between items-center group/item transition-colors">
                                        <span>{name}</span>
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
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-[#15171c]">
                                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><History className="w-3 h-3" /> 搜尋紀錄</span>
                                    <button type="button" onClick={() => { setSearchHistory([]); localStorage.removeItem('maple_search_history'); }} className="text-[10px] text-slate-500 hover:text-red-400 transition-colors">清除全部</button>
                                </div>
                                {searchHistory.map((name, idx) => (
                                    <div key={idx} onClick={() => { setCharacterName(name); handleSearch(undefined, name); }} className="px-4 py-3 text-sm text-slate-300 hover:bg-indigo-600/20 hover:text-indigo-300 cursor-pointer flex justify-between items-center group/item transition-colors">
                                        <span>{name}</span>
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
            <p className="text-slate-500 font-medium">{isScanningBest ? '正在掃描過去七天數據，尋找最強狀態...' : '正在讀取角色資料...'}</p>
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
    <div className="maple-empty-state flex flex-col items-center mt-6">
      <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-3 opacity-50">
        <Search className="w-8 h-8 text-slate-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-300 mb-2">開始查詢</h2>
      <p className="text-slate-500 max-w-sm text-center">輸入角色名稱，查看新楓之谷的詳細數據與裝備。</p>
    </div>
  );
};
