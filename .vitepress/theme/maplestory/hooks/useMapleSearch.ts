import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchCharacterData, findBestDateInPastWeek } from '../services/nexonService';
import { DashboardData } from '../types';
import { fetchHolyBearCharacter } from '../services/holyBearService';

export const useMapleSearch = (
  apiKey: string | null,
  onSearchStart: () => void,
  setError: (error: string | null) => void
) => {
  const [characterName, setCharacterName] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScanningBest, setIsScanningBest] = useState(false); 
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  const initialSearchDone = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const lastSearchName = localStorage.getItem('maple_last_search_name');
    if (lastSearchName) {
      setCharacterName(lastSearchName);
    }
    const history = localStorage.getItem('maple_search_history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
    const favs = localStorage.getItem('maple_favorites');
    if (favs) {
      setFavorites(JSON.parse(favs));
    }
  }, []);

  useEffect(() => {
    let lastHandledLocation = '';

    const resetToMapleHome = () => {
      setData(null);
      setCharacterName('');
      setSelectedDate('');
      setLoading(false);
      setIsScanningBest(false);
      setShowHistory(false);
      setError(null);
    };

    const syncSearchFromLocation = () => {
       if (lastHandledLocation === window.location.href) return;
       lastHandledLocation = window.location.href;

       const hashName = decodeURIComponent(window.location.hash.substring(1));
       if (hashName) {
          setCharacterName(hashName);
          handleSearch(undefined, hashName, undefined, true);
       } else {
          resetToMapleHome();
       }
    };

    const handleMapleHomeClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const link = target?.closest('a');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

      const url = new URL(link.href, window.location.href);
      const normalizedPath = url.pathname.replace(/\/+$/, '') || '/';
      const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';

      if (normalizedPath === '/maplestory' && currentPath === '/maplestory' && !url.hash) {
        lastHandledLocation = url.href;
        resetToMapleHome();
      }
    };

    if (typeof window !== 'undefined' && window.location.hash && apiKey && !initialSearchDone.current) {
      const hashName = decodeURIComponent(window.location.hash.substring(1));
      if (hashName) {
        lastHandledLocation = window.location.href;
        setCharacterName(hashName);
        handleSearch(undefined, hashName, undefined, true);
        initialSearchDone.current = true;
      }
    }

    window.addEventListener('popstate', syncSearchFromLocation);
    window.addEventListener('hashchange', syncSearchFromLocation);
    document.addEventListener('click', handleMapleHomeClick, true);
    return () => {
      window.removeEventListener('popstate', syncSearchFromLocation);
      window.removeEventListener('hashchange', syncSearchFromLocation);
      document.removeEventListener('click', handleMapleHomeClick, true);
    };
  }, [apiKey]);

  const addToHistory = (name: string) => {
    const newHistory = [name, ...searchHistory.filter(h => h !== name)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('maple_search_history', JSON.stringify(newHistory));
  };

  const removeFromHistory = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const newHistory = searchHistory.filter(h => h !== name);
    setSearchHistory(newHistory);
    localStorage.setItem('maple_search_history', JSON.stringify(newHistory));
  };

  const toggleFavorite = useCallback((e: React.MouseEvent | undefined | null, name: string) => {
    e?.stopPropagation(); 
    let newFavs;
    if (favorites.includes(name)) {
      newFavs = favorites.filter(f => f !== name);
    } else {
      newFavs = [...favorites, name];
    }
    setFavorites(newFavs);
    localStorage.setItem('maple_favorites', JSON.stringify(newFavs));
  }, [favorites]);

  const handleSearch = async (e?: React.FormEvent, overrideName?: string, overrideKey?: string, skipHistoryPush?: boolean) => {
    if (e) e.preventDefault();
    
    const targetName = overrideName !== undefined ? overrideName : characterName;
    const targetKey = overrideKey !== undefined ? overrideKey : apiKey;

    if (!targetName.trim() || !targetKey || loading) return;

    onSearchStart();
    setLoading(true);
    setIsScanningBest(false);
    setError(null);
    setData(null);
    setShowHistory(false);

    try {
      void fetchHolyBearCharacter(targetName).catch((discoveryError) => {
        console.warn('HolyBear character discovery is temporarily unavailable', discoveryError);
      });
      const result = await fetchCharacterData(targetName, targetKey, selectedDate || undefined);
      setData(result);
      addToHistory(targetName);
      if (typeof window !== 'undefined' && !skipHistoryPush) {
        const currentHash = decodeURIComponent(window.location.hash.substring(1));
        if (currentHash !== targetName) {
             window.history.pushState({ character: targetName }, '', `#${targetName}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '發生非預期的錯誤，請檢查名稱或 API Key。');
    } finally {
      setLoading(false);
    }
  };

  const handleBestSearch = async (overrideName?: string) => {
    const targetName = overrideName !== undefined ? overrideName : characterName;
    if (!targetName.trim() || !apiKey) return;
    
    onSearchStart();
    setIsScanningBest(true);
    setLoading(true);
    setError(null);
    setData(null);
    setShowHistory(false);

    try {
      void fetchHolyBearCharacter(targetName).catch((discoveryError) => {
        console.warn('HolyBear character discovery is temporarily unavailable', discoveryError);
      });
      const bestRecord = await findBestDateInPastWeek(targetName, apiKey);

      if (!bestRecord) {
        throw new Error('過去七天內找不到該角色的有效資料 (可能未登入或資料庫維護中)');
      }

      setSelectedDate(bestRecord.date);

      const result = await fetchCharacterData(targetName, apiKey, bestRecord.date);
      
      setData(result);
      addToHistory(targetName);
      
      const currentHash = decodeURIComponent(window.location.hash.substring(1));
      if (currentHash !== targetName) {
           window.history.pushState({ character: targetName }, '', `#${targetName}`);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || '搜尋巔峰紀錄失敗');
    } finally {
      setIsScanningBest(false);
      setLoading(false);
    }
  };

  return {
    characterName, setCharacterName,
    selectedDate, setSelectedDate,
    data, setData,
    loading, setLoading,
    isScanningBest, setIsScanningBest,
    searchHistory, setSearchHistory,
    showHistory, setShowHistory,
    favorites, setFavorites,
    searchInputRef,
    handleSearch, handleBestSearch,
    addToHistory, removeFromHistory, toggleFavorite
  };
};
