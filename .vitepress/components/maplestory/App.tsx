import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, RefreshCw, AlertCircle, Wand2, ThumbsUp, Shield, Sword, Flame, Star, Zap, ChevronDown, ChevronUp, History, X, Settings, Crown, LogOut, Share2, Info, Mail, Globe, TrendingUp } from 'lucide-react';
import ApiKeyModal from './components/ApiKeyModal';
import ShareModal from './components/ShareModal';
import EquipmentGrid from './components/EquipmentGrid';
import CashEquipmentGrid from './components/CashEquipmentGrid';
import CharacterDetails from './components/CharacterDetails';
import StatRadarChart from './components/StatRadarChart';
import PresetSwitcher from './components/PresetSwitcher';
import { fetchCharacterData, findBestDateInPastWeek } from './services/nexonService';
import { analyzeCharacter } from './services/geminiService';
import { DashboardData } from './types';
import { MOCK_DATA } from './constants';
import MarkdownIt from 'markdown-it';

const DEFAULT_GEMINI_KEY = import.meta.env.VITE_DEFAULT_GEMINI_KEY || '';

const SERVER_ICONS: Record<string, string> = {
  '艾麗亞': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/ai_li_ya.png',
  '普力特': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/pu_li_te.png',
  '琉德': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/liu_de.png',
  '優依娜': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/you_yi_na.png',
  '愛麗西亞': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/ai_li_xi_ya.png',
  '殺人鯨': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/sha_ren_jing.png',
  '賽蓮': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/silien.png',
  '米特拉': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/reboot.png',
  'Reboot': 'https://tw.hicdn.beanfun.com/beanfun/event/MapleStory/UnionWebRank/assets/img/reboot.png',
  '挑戰者': '/image/theme/ChallengerServer.png'
};

const getJobBackgroundMap = (jobName: string): string => {
  if (!jobName) return '100000000';
  
  if (['皇家', '米哈逸', '聖魂', '烈焰', '破風', '暗夜', '閃雷'].some(k => jobName.includes(k))) return '130000000';
  if (['反抗軍', '惡魔', '傑諾', '煉獄', '機甲', '狂豹', '爆拳'].some(k => jobName.includes(k))) return '310000000';
  if (jobName.includes('精靈遊俠')) return '101050000';
  if (jobName.includes('狂狼勇士')) return '140000000';
  if (jobName.includes('幻影俠盜')) return '915000000';
  if (jobName.includes('隱月')) return '410000000';
  if (['凱撒', '天使破壞者', '卡蒂娜', '凱恩'].some(k => jobName.includes(k))) return '400000000';
  if (['阿戴爾', '亞克', '伊利恩', '卡莉'].some(k => jobName.includes(k))) return '402000000';
  if (jobName.includes('神之子')) return '321000000';
  if (jobName.includes('凱內西斯')) return '331000000';
  if (['劍士', '英雄', '聖騎士', '黑騎士', '狂戰士', '十字軍', '騎士', '槍騎兵', '龍騎士'].some(k => jobName.includes(k))) return '102000000';
  if (['法師', '火毒', '冰雷', '主教', '巫師', '魔導士', '僧侶', '祭司', '琳恩', '幻獸師'].some(k => jobName.includes(k))) return '101000000';
  if (['盜賊', '夜使者', '暗影神偷', '影武者', '刺客', '暗殺者', '俠盜', '神偷'].some(k => jobName.includes(k))) return '103000000';
  if (['海盜', '拳霸', '槍神', '重砲', '指拳手', '衝鋒隊長', '槍手', '墨玄', '蒼龍'].some(k => jobName.includes(k))) return '120000000';

  return '100000000';
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    return localStorage.getItem('nexon_api_key') || import.meta.env.VITE_NEXON_API_KEY || null;
  });
  
  const [geminiKey, setGeminiKey] = useState<string | null>(() => {
    return localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_DEFAULT_GEMINI_KEY || null;
  });

  const [geminiModel, setGeminiModel] = useState<string>(() => {
    return localStorage.getItem('gemini_model') || 'gemini-3.0-flash';
  });
  const [showKeySettings, setShowKeySettings] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScanningBest, setIsScanningBest] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showDetailStats, setShowDetailStats] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const initialSearchDone = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const aiResultRef = useRef<HTMLDivElement>(null);

  // 內在潛能預設狀態
  const [abilityPreset, setAbilityPreset] = useState(1);

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
    if (aiAnalysis && aiResultRef.current) {
      setTimeout(() => {
        aiResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [aiAnalysis]);

  useEffect(() => {
    if (data?.ability?.preset_no) {
      setAbilityPreset(parseInt(data.ability.preset_no));
    }
  }, [data]);

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

    setLoading(true);
    setIsScanningBest(false);
    setError(null);
    setAiAnalysis(null);
    setData(null);
    setShowHistory(false);

    if (targetKey === 'DEMO_MODE') {
      setTimeout(() => {
        setData({ 
          ...MOCK_DATA, 
          hyperStat: { character_class: 'Bishop', hyper_stat_preset_1: [], hyper_stat_preset_1_remain_point: 0 },
          linkSkill: { character_link_skill: [] },
          basic: { ...MOCK_DATA.basic, character_name: targetName || 'DemoHero' },
          lastUpdated: new Date().toLocaleString('zh-TW', { hour12: false })
        });
        setLoading(false);
        addToHistory(targetName || 'DemoHero');
      }, 800);
      return;
    }

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
    
    setIsScanningBest(true);
    setLoading(true);
    setError(null);
    setData(null);
    setAiAnalysis(null);
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

  const handleAiAnalyze = async () => {
    if (!data) return;
    const keyToUse = geminiKey || DEFAULT_GEMINI_KEY;
    setAnalyzing(true);
    setAiAnalysis(null);
    setError(null);

    try {
      const result = await analyzeCharacter(data, keyToUse, geminiModel);
      
      const isQuotaError = result && (
        result.includes('Rate Limit Exceeded') || 
        result.includes('429') || 
        result.includes('Resource has been exhausted') ||
        result.includes('Quota exceeded')
      );

      if (isQuotaError) {
        setError('AI 額度已用完，請更換金鑰或稍後再試。');
        setAiAnalysis(null);
      } else if (!result || result.startsWith('AI Analysis Failed:')) {
        const msg = result?.replace('AI Analysis Failed:', '').trim() || 'AI 分析連線逾時或失敗，請重試。';
        setError(msg); 
        setAiAnalysis(null);
      } else {
        setAiAnalysis(result);
      }
    } catch (err: any) {
      const errorMessage = err?.message || '';
      if (errorMessage.includes('429') || errorMessage.includes('Quota')) {
        setError('AI 額度已用完，請更換金鑰或稍後再試。');
      } else {
        setError(errorMessage || 'AI 分析發生未預期錯誤，請稍後再試。');
      }
      setAiAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  };

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

  const getStatVal = (name: string): string => {
    const map: Record<string, string> = {
      'Combat Power': '戰鬥力',
      'Final Damage': '最終傷害',
      'Boss Damage': 'BOSS怪物傷害',
      'Ignore Defense Rate': '無視防禦率',
      'Critical Damage': '爆擊傷害',
      'Star Force': '星力',
      'Arcane Power': '神秘力量',
      'Authentic Force': '真實之力',
      'Attack Power': '攻擊力',
      'Magic Power': '魔法攻擊力',
      'Item Drop Rate': '道具掉落率',
      'Meso Drop Rate': '楓幣獲得量'
    };
    
    const found = data?.stat.final_stat.find(s => 
       s.stat_name === name || s.stat_name === map[name]
    );
    return found ? found.stat_value : '0';
  };

  const formatNumber = (val: string) => parseInt(val.replace(/,/g, '')).toLocaleString();
  const formatBigNumber = (val: string) => {
     const num = parseInt(val.replace(/,/g, ''));
     if (num > 100000000) {
        const yi = Math.floor(num / 100000000);
        const wan = Math.floor((num % 100000000) / 10000);
        return `${yi}億 ${wan}萬`;
     }
     return num.toLocaleString();
  };

  const getAbilityStyle = (grade: string) => {
    const g = grade.toLowerCase();
    if (g.includes('legendary') || g.includes('傳說')) return 'border-green-600 bg-green-50/50 text-green-600 dark:bg-green-950/30 dark:text-green-400';
    if (g.includes('unique') || g.includes('罕見')) return 'border-yellow-600 bg-yellow-50/50 text-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-400';
    if (g.includes('epic') || g.includes('稀有')) return 'border-purple-600 bg-purple-50/50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400';
    if (g.includes('rare') || g.includes('特殊')) return 'border-blue-600 bg-blue-50/50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400';
    return 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  };

  const focusStatKeys = [
    '戰鬥力', '最終傷害', 'BOSS怪物傷害', '無視防禦率', '爆擊傷害', 
    '攻擊力', '魔法攻擊力', '星力', '神秘力量', '真實之力',
    '傷害', '一般怪物傷害'
  ];

  const detailedStats = [
    { label: '戰鬥力', key: '戰鬥力', format: formatBigNumber },
    { label: '最低屬性攻擊力', key: '最低屬性攻擊力', format: formatNumber },
    { label: '最高屬性攻擊力', key: '最高屬性攻擊力', format: formatNumber },
    { label: '傷害', key: '傷害', suffix: '%' },
    { label: 'BOSS 傷害', key: 'BOSS怪物傷害', suffix: '%' },
    { label: '最終傷害', key: '最終傷害', suffix: '%' },
    { label: '無視防禦率', key: '無視防禦率', suffix: '%' },
    { label: '爆擊機率', key: '爆擊機率', suffix: '%' },
    { label: '爆擊傷害', key: '爆擊傷害', suffix: '%' },
    { label: '狀態異常耐性', key: '狀態異常耐性' },
    { label: '格擋', key: '格擋' },
    { label: '防禦力', key: '防禦力', format: formatNumber },
    { label: '移動速度', key: '移動速度', suffix: '%' },
    { label: '跳躍力', key: '跳躍力', suffix: '%' },
    { label: '星力', key: '星力' },
    { label: '神秘力量 (ARC)', key: '神秘力量' },
    { label: '真實之力 (AUT)', key: '真實之力' },
    { label: 'STR', key: 'STR', format: formatNumber },
    { label: 'DEX', key: 'DEX', format: formatNumber },
    { label: 'INT', key: 'INT', format: formatNumber },
    { label: 'LUK', key: 'LUK', format: formatNumber },
    { label: 'HP', key: 'HP', format: formatNumber },
    { label: 'MP', key: 'MP', format: formatNumber },
    { label: 'AP STR', key: 'AP配點STR', format: formatNumber },
    { label: 'AP DEX', key: 'AP配點DEX', format: formatNumber },
    { label: 'AP INT', key: 'AP配點INT', format: formatNumber },
    { label: 'AP LUK', key: 'AP配點LUK', format: formatNumber },
    { label: 'AP HP', key: 'AP配點HP', format: formatNumber },
    { label: 'AP MP', key: 'AP配點MP', format: formatNumber },
    { label: '道具掉落率', key: '道具掉落率', suffix: '%' },
    { label: '楓幣獲得量', key: '楓幣獲得量', suffix: '%' },
    { label: 'Buff 持續時間', key: 'Buff持續時間', suffix: '%' },
    { label: '攻擊速度', key: '攻擊速度' },
    { label: '一般怪物傷害', key: '一般怪物傷害', suffix: '%' },
    { label: '冷卻時間減少(秒)', key: '冷卻時間減少(秒)' },
    { label: '冷卻時間減少(%)', key: '冷卻時間減少(％)', suffix: '%' },
    { label: '未套用冷卻時間', key: '未套用冷卻時間' },
    { label: '無視屬性耐性', key: '無視屬性耐性', suffix: '%' },
    { label: '狀態異常追加傷害', key: '狀態異常追加傷害', suffix: '%' },
    { label: '武器熟練度', key: '武器熟練度', suffix: '%' },
    { label: '獲得額外經驗值', key: '獲得額外經驗值', suffix: '%' },
    { label: '攻擊力', key: '攻擊力', format: formatNumber },
    { label: '魔法攻擊力', key: '魔法攻擊力', format: formatNumber },
    { label: '召喚獸持續時間', key: '召喚獸持續時間增加', suffix: '%' },
  ].filter(stat => !focusStatKeys.includes(stat.key));

  const getAbilityData = () => {
    if (!data?.ability) return [];
    const presetKey = `ability_preset_${abilityPreset}`;
    const presetData = (data.ability as any)[presetKey];
    
    if (presetData && presetData.ability_info) {
        return presetData.ability_info;
    }
    
    if (data.ability.preset_no && parseInt(data.ability.preset_no) === abilityPreset) {
        return data.ability.ability_info;
    }

    return [];
  };

  const currentAbilityInfo = getAbilityData();

  return (
    <div className="min-h-screen bg-transparent text-slate-200 font-sans pb-20">
      {!apiKey && (
        <ApiKeyModal 
          defaultNexonKey={apiKey || ''}
          defaultGeminiKey={geminiKey || ''}
          onSave={(nexonKey, geminiKey) => {
            setApiKey(nexonKey);
            localStorage.setItem('nexon_api_key', nexonKey);
            if (geminiKey) {
              setGeminiKey(geminiKey);
              localStorage.setItem('gemini_api_key', geminiKey);
            }
          }} 
          onDemo={() => { setApiKey('DEMO_MODE'); setCharacterName('DemoHero'); }}
        />
      )}

      {/* Key Settings Modal */}
      {showKeySettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowKeySettings(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" /> 設定 AI Key
            </h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">API Key</label>
                <input
                  type="password"
                  value={geminiKey || ''}
                  placeholder="貼上您的 Gemini API Key..."
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-indigo-500 outline-none"
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setGeminiKey(val || null);
                    if (val) localStorage.setItem('gemini_api_key', val);
                    else localStorage.removeItem('gemini_api_key');
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">AI 模型</label>
                <select
                  value={geminiModel}
                  onChange={(e) => {
                    setGeminiModel(e.target.value);
                    localStorage.setItem('gemini_model', e.target.value);
                  }}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-indigo-500 outline-none appearance-none"
                >
                  <option value="gemini-3.0-flash">Gemini 3.0 Flash (最新預設 / 極速)</option>
                  <option value="gemini-3.0-pro">Gemini 3.0 Pro (最強推論 / 穩定)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (舊版穩定)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (經典)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (舊版高階)</option>
                  <option value="gemini-3-pro-preview">Gemini 3.0 Pro Preview (預覽)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button 
                onClick={() => setShowKeySettings(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="max-w-[1600px] mx-auto px-6 pt-8 pb-4 flex flex-col items-center gap-6 relative">
        {/* NEW: 全域設定按鈕 (右上角) */}
        <div className="absolute top-8 right-6">
           <button 
             onClick={() => setShowKeySettings(true)}
             className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors flex items-center gap-2"
             title="AI 與 API 設定"
           >
             <Settings className="w-5 h-5" />
           </button>
        </div>

        <div className="flex items-center gap-3">
           <div className="w-12 h-12 flex items-center justify-center">
              <img src="/image/theme/Maple_Icon.png" />
           </div>
           <h1 className="font-bold text-2xl text-white">新楓之谷戰力分析</h1>
           {apiKey === 'DEMO_MODE' && (
             <div className="flex items-center gap-2 ml-2">
               <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded border border-yellow-500/30">DEMO</span>
               <button 
                 onClick={() => { 
                   setApiKey(null); 
                   localStorage.removeItem('nexon_api_key'); 
                   setData(null);
                   setCharacterName('');
                 }}
                 className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 text-[10px] rounded transition-colors border border-slate-700 hover:border-red-900/50"
                 title="退出演示模式"
               >
                 <LogOut className="w-3 h-3" /> 退出
               </button>
             </div>
           )}
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-400">
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
             placeholder="輸入角色名稱 (例如: 怪獸小熊)"
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

      <main className="max-w-[1600px] mx-auto p-6 mt-4">
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
                {(error.includes('429') || error.includes('Rate limited')) && (
                  <button onClick={() => { setApiKey('DEMO_MODE'); setCharacterName('DemoHero'); handleSearch(undefined, 'DemoHero', 'DEMO_MODE'); }} className="px-4 py-2 bg-indigo-900/40 hover:bg-indigo-900/60 rounded text-white text-sm transition-colors">切換至演示模式</button>
                )}
              </div>
           </div>
        )}

        {data && !loading && (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 space-y-4">
               <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden shadow-xl relative group">
                  <div className="h-32 bg-slate-800 relative overflow-hidden">
                      <div className="absolute inset-0 bg-cover bg-center opacity-30 grayscale mix-blend-overlay transition-all duration-700 group-hover:scale-110 group-hover:opacity-40 group-hover:grayscale-0" style={{ backgroundImage: `url('https://maplestory.io/api/GMS/248/map/${getJobBackgroundMap(data.basic.character_class)}/render/back')` }}></div>
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#161b22]"></div>
                  </div>
                  <div className="px-5 relative -mt-16 flex flex-col items-center pb-5">
                      <div className="w-32 h-32 rounded-full bg-[#0a0c10] border-4 border-[#1f242e] shadow-2xl overflow-hidden flex items-center justify-center mb-3 relative z-10 group-hover:scale-105 transition-transform duration-500">
                          <img src={data.basic.character_image} alt="Character" className="w-[150%] h-[150%] object-cover mt-8" />
                      </div>
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
                         <div className="flex justify-between border-b border-slate-800/50 pb-1.5">
                            <span>近7日登入</span>
                            <span className="text-green-400 font-bold">true</span>
                         </div>
                         <div className="flex justify-between border-b border-slate-800/50 pb-1.5">
                            <span>七日成長</span>
                            <span className="text-slate-300 font-mono">
                              {(() => {
                                 if (!data.character_basic_7days_ago) return '- %';
                                 const levelDiff = data.basic.character_level - data.character_basic_7days_ago.character_level;
                                 if (levelDiff > 0) return `+${levelDiff} Lv`;
                                 const expDiff = parseFloat(data.basic.character_exp_rate) - parseFloat(data.character_basic_7days_ago.character_exp_rate);
                                 return `${expDiff >= 0 ? '+' : ''}${expDiff.toFixed(3)}%`;
                              })()}
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

                      <button onClick={handleAiAnalyze} disabled={analyzing} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 hover:translate-y-[-1px]">
                         {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                         {aiAnalysis ? '重新分析' : 'AI 健檢'}
                      </button>
                   </div>
               </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
               <div className="bg-[#161b22] border border-slate-800 rounded-xl p-5 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <Sword className="w-4 h-4" /> 焦點屬性
                  </h3>
                  <div className="bg-[#0d1117] border border-slate-700/50 rounded-lg p-3 mb-4">
                     <div className="text-xs text-slate-500 mb-1">戰鬥力</div>
                     <div className="text-xl font-bold text-indigo-400 font-mono tracking-tight">{formatBigNumber(getStatVal('Combat Power'))}</div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Flame className="w-3.5 h-3.5 text-orange-500" /> 最終傷害</span>
                        <span className="font-mono text-white">{getStatVal('Final Damage')}%</span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Shield className="w-3.5 h-3.5 text-red-500" /> BOSS 傷害</span>
                        <span className="font-mono text-white">{getStatVal('Boss Damage')}%</span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Sword className="w-3.5 h-3.5 text-red-400" /> 傷害</span>
                        <span className="font-mono text-white">{getStatVal('傷害')}%</span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Sword className="w-3.5 h-3.5 text-slate-400" /> 一般怪物傷害</span>
                        <span className="font-mono text-white">{getStatVal('一般怪物傷害')}%</span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Shield className="w-3.5 h-3.5 text-blue-500" /> 無視防禦率</span>
                        <span className="font-mono text-white">{getStatVal('Ignore Defense Rate')}%</span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Sword className="w-3.5 h-3.5 text-yellow-500" /> 爆擊傷害</span>
                        <span className="font-mono text-white">{getStatVal('Critical Damage')}%</span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
                        <span className="flex items-center gap-2 text-slate-400"><Sword className="w-3.5 h-3.5 text-slate-300" /> 攻擊力 / 魔攻</span>
                        <span className="font-mono text-white">{formatNumber(getStatVal('Attack Power'))} / {formatNumber(getStatVal('Magic Power'))}</span>
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
                        {detailedStats.map((stat, i) => (
                          <div key={i} className="flex justify-between items-center text-xs border-b border-slate-800/30 pb-1 last:border-0">
                            <span className="text-slate-500">{stat.label}</span>
                            <span className="text-slate-300 font-mono">
                              {stat.format ? stat.format(getStatVal(stat.key)) : getStatVal(stat.key)}
                              {stat.suffix || ''}
                            </span>
                          </div>
                        ))}
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
               <EquipmentGrid equipment={data.equipment} characterImage={data.basic.character_image} androidEquipment={data.androidEquipment?.[`android_preset_${data.equipment?.preset_no || 1}`] || data.androidEquipment?.android_preset_1} />
              {data.cashItemEquipment && <CashEquipmentGrid cashEquipment={data.cashItemEquipment} beautyEquipment={data.beautyEquipment} characterImage={data.basic.character_image} />}
            </div>
          </div>

           {/* AI Response Area */}
           {/* Fix: Always show container if we have result OR analyzing OR specific error. Button is now always visible inside. */}
           <div ref={aiResultRef} className={`bg-[#161b22] border border-indigo-500/30 rounded-xl p-5 mt-6 shadow-lg transition-all ${!analyzing && !aiAnalysis && !error?.includes('AI') ? 'hidden' : 'block'}`}>
               <h3 className="text-indigo-400 font-bold text-base mb-3 flex items-center gap-2 border-b border-indigo-500/20 pb-2">
                 <Wand2 className="w-5 h-5" /> AI 角色分析報告
               </h3>
               
               {analyzing ? (
                 <div className="flex flex-col items-center py-20 animate-pulse">
                   <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                   <p className="text-slate-500 font-medium">AI 正在分析裝備與數據...</p>
                 </div>
               ) : (
                 <>
                   {error && (error.includes('AI') || error.includes('Quota')) ? (
                      <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-lg text-red-300 text-sm mb-4">
                        {error}
                      </div>
                   ) : aiAnalysis ? (
                      <div 
                        className="text-sm text-slate-300 leading-relaxed ai-markdown-content"
                        dangerouslySetInnerHTML={{ 
                          __html: new MarkdownIt({ html: true, breaks: true, linkify: true }).render(aiAnalysis || '') 
                        }}
                      />
                   ) : null}

                   {/* Footer Actions - ALWAYS Visible if container is visible */}
                   <div className="mt-4 pt-3 border-t border-indigo-500/20 flex justify-between items-center">
                     <span className="text-[10px] text-slate-500">Generated by Google Gemini</span>
                     <button 
                      onClick={() => setShowKeySettings(true)}
                      className="text-[10px] flex items-center gap-1 transition-colors px-2 py-1 rounded text-indigo-400 hover:text-indigo-300 bg-indigo-950/30 hover:bg-indigo-900/50"
                     >
                      <Settings className="w-3 h-3" />
                      設定模型 / API Key
                     </button>
                   </div>
                 </>
               )}
               
               {/* 修正後的 CSS: 增加對比度與強制顯示邊框 */}
               <style>{`
                 .ai-markdown-content ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
                 .ai-markdown-content ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
                 .ai-markdown-content h1, .ai-markdown-content h2, .ai-markdown-content h3 { font-weight: bold; color: #818cf8; margin-top: 1.2em; margin-bottom: 0.6em; }
                 .ai-markdown-content p { margin-bottom: 0.8em; }
                 .ai-markdown-content strong { color: #c7d2fe; font-weight: 700; }
                 .ai-markdown-content table { width: 100%; border-collapse: collapse; margin-bottom: 1em; font-size: 0.9em; }
                 /* Fix: Lighter border color for visibility */
                 .ai-markdown-content th, .ai-markdown-content td { border: 1px solid rgba(148, 163, 184, 0.4); padding: 8px 12px; text-align: left; }
                 .ai-markdown-content th { background-color: #1e293b; color: #a5b4fc; font-weight: 600; }
                 .ai-markdown-content tr:nth-child(even) { background-color: #1e293b; }
                 .ai-markdown-content tr:hover { background-color: #334155; }
               `}</style>
           </div>

          <CharacterDetails 
           data={data} 
           apiKey={apiKey || ''} // 傳入 apiKey
          />
          {showShareModal && <ShareModal characterName={data.basic.character_name} onClose={() => setShowShareModal(false)} />}
          </>
        )}

        {!data && !loading && !error && (
          <div className="flex flex-col items-center mt-6">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-3 opacity-50"><Search className="w-8 h-8 text-slate-500" /></div>
            <h2 className="text-xl font-bold text-slate-300 mb-2">開始查詢</h2>
            <p className="text-slate-500 max-w-sm text-center">輸入角色名稱，查看新楓之谷的詳細數據與裝備。</p>
          </div>
        )}
      </main>
          {(!data && !loading && !error) && (
            <div className="my-8 flex justify-center">
              <div className="vp-tip custom-vp-tip p-4 sm:p-6 rounded-lg border-l-4 border-indigo-400 bg-indigo-50/90 text-indigo-900 dark:bg-[#23263a] dark:text-indigo-200 dark:border-indigo-500 shadow-sm mx-auto">
                <div className="font-bold mb-1 text-indigo-700 dark:text-indigo-300">更新日誌</div>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li><span className="font-mono text-xs text-indigo-700 dark:text-indigo-300">2025/12/23</span> 優化符文總和計算區塊，顯示詳細的屬性加成，並為每個聯盟神器增加對應圖示。</li>
                  <li><span className="font-mono text-xs text-indigo-700 dark:text-indigo-300">2025/12/22</span> 新增近 7 天經驗值趨勢統計元件，用於視覺化經驗成長趨勢。</li>
                  <li><span className="font-mono text-xs text-indigo-700 dark:text-indigo-300">2025/12/21</span> 重構核心技能區塊的 HEXA 矩陣進度演算法，並新增是否計算靈魂亞努斯選項。</li>
                  <li><span className="font-mono text-xs text-indigo-700 dark:text-indigo-300">2025/12/21</span> 新增機器人裝備欄位。</li>
                  <li><span className="font-mono text-xs text-indigo-700 dark:text-indigo-300">2025/12/21</span> 時裝格子支援即時染色預覽。</li>
                  <li><span className="font-mono text-xs text-indigo-700 dark:text-indigo-300">2025/12/21</span> 滑鼠懸浮在時裝格子時也會顯示圖片預覽。</li>
                  <li><span className="font-mono text-xs text-indigo-700 dark:text-indigo-300">2025/12/18</span> 優化 AI 健檢回應速度，平均縮短 30% 回應時間。</li>
                  <li><span className="font-mono text-xs text-indigo-700 dark:text-indigo-300">2025/12/18</span> 升級預設 AI 模型為 Gemini 3.0 Flash，並新增 Gemini 3.0 Pro 選項。</li>
                  <li><span className="font-mono text-xs text-indigo-700 dark:text-indigo-300">2025/12/17</span> 新增「預設」功能，適用於內在潛能、裝備、時裝、連結技能、極限屬性。</li>
                  <li><span className="font-mono text-xs text-indigo-700 dark:text-indigo-300">2025/12/17</span> 新增「七日巔峰搜尋」功能，自動掃描並載入本週最高戰力紀錄。</li>
                  <li><span className="font-mono text-xs text-indigo-700 dark:text-indigo-300">2025/12/14</span> 首次發佈</li>
                </ul>
              </div>
            </div>
          )}
          <style>{`
            .custom-vp-tip {
              background: rgba(0,255,238,0.12);
              /* #00FFEE 主題色系 */
              box-sizing: border-box;
              max-width: 28rem;
              margin-left: 1rem;
              margin-right: 1rem;
              padding-left: 1rem;
              padding-right: 1rem;
              display: block;
              border-left: 4px solid #00FFEE;
              color: #b8fff9;
            }
            @media (min-width: 640px) {
              .custom-vp-tip {
                max-width: 42rem;
                margin-left: auto;
                margin-right: auto;
                padding-left: 1.5rem;
                padding-right: 1.5rem;
              }
            }
            .custom-vp-tip .font-bold {
              color: #00FFEE;
            }
            .custom-vp-tip li {
              color: #b8fff9;
            }
            .dark .custom-vp-tip {
              background: rgba(0,255,238,0.18) !important;
              border-left: 4px solid #00FFEE !important;
              color: #99ffff !important;
            }
            .dark .custom-vp-tip .font-bold {
              color: #00FFEE !important;
            }
            .dark .custom-vp-tip li {
              color: #99ffff !important;
            }
            .custom-vp-tip .font-bold {
              color: #0ea5e9;
            }
            .custom-vp-tip li {
              color: #0369a1;
            }
            .dark .custom-vp-tip {
              background: linear-gradient(90deg, #0f172a 0%, #164e63 100%);
              border-left: 4px solid #38bdf8;
              color: #bae6fd;
            }
            .dark .custom-vp-tip .font-bold {
              color: #38bdf8;
            }
            .dark .custom-vp-tip li {
              color: #bae6fd;
            }
            .dark .custom-vp-tip {
              background: linear-gradient(90deg, #23263a 0%, #1e2130 100%);
            }
          `}</style>
    </div>
  );
};

export default App;
