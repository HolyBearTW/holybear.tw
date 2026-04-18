import { useState, useEffect, useRef } from 'react';
import { fetchCharacterData, findBestDateInPastWeek, fetchWeeklyHistory } from '../services/nexonService';
import { DashboardData } from '../types';

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
  const [historyData, setHistoryData] = useState<any[]>([]);
  
  const initialSearchDone = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
    if (!data?.basic?.character_name || !apiKey) return;
    fetchWeeklyHistory(data.basic.character_name, apiKey)
      .then(history => setHistoryData(history || []))
      .catch(() => setHistoryData([]));
  }, [data?.basic?.character_name, apiKey]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash && apiKey && !initialSearchDone.current) {
      const hashName = decodeURIComponent(window.location.hash.substring(1));
      if (hashName) {
        setCharacterName(hashName);
        handleSearch(undefined, hashName, undefined, true);
        initialSearchDone.current = true;
      }
    }

    const handlePopState = (event: PopStateEvent) => {
       const hashName = decodeURIComponent(window.location.hash.substring(1));
       if (hashName) {
          setCharacterName(hashName);
          handleSearch(undefined, hashName, undefined, true);
       } else {
          setData(null);
          setCharacterName('');
       }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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

  const toggleFavorite = (e: React.MouseEvent | undefined | null, name: string) => {
    e?.stopPropagation(); 
    let newFavs;
    if (favorites.includes(name)) {
      newFavs = favorites.filter(f => f !== name);
    } else {
      newFavs = [...favorites, name];
    }
    setFavorites(newFavs);
    localStorage.setItem('maple_favorites', JSON.stringify(newFavs));
  };

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

  const handleBestSearch = async () => {
    if (!characterName.trim() || !apiKey) return;
    
    onSearchStart();
    setIsScanningBest(true);
    setLoading(true);
    setError(null);
    setData(null);
    setShowHistory(false);

    try {
      const bestRecord = await findBestDateInPastWeek(characterName, apiKey);

      if (!bestRecord) {
        throw new Error('過去七天內找不到該角色的有效資料 (可能未登入或資料庫維護中)');
      }

      setSelectedDate(bestRecord.date);

      const result = await fetchCharacterData(characterName, apiKey, bestRecord.date);
      
      setData(result);
      addToHistory(characterName);
      
      const currentHash = decodeURIComponent(window.location.hash.substring(1));
      if (currentHash !== characterName) {
           window.history.pushState({ character: characterName }, '', `#${characterName}`);
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
    historyData, setHistoryData,
    searchInputRef,
    handleSearch, handleBestSearch,
    addToHistory, removeFromHistory, toggleFavorite
  };
};
