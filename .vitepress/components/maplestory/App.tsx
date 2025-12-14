import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, RefreshCw, AlertCircle, Wand2, ThumbsUp, Shield, Sword, Flame, Star, Zap, ChevronDown, ChevronUp, History, X, Settings, Crown, LogOut, Share2 } from 'lucide-react';
import ApiKeyModal from './components/ApiKeyModal';
import ShareModal from './components/ShareModal';
import EquipmentGrid from './components/EquipmentGrid';
import CharacterDetails from './components/CharacterDetails';
import StatRadarChart from './components/StatRadarChart';
import { fetchCharacterData } from './services/nexonService';
import { analyzeCharacter } from './services/geminiService';
import { DashboardData } from './types';
import { MOCK_DATA } from './constants';
import MarkdownIt from 'markdown-it';

const DEFAULT_GEMINI_KEY = import.meta.env.VITE_DEFAULT_GEMINI_KEY || '';

const getJobBackgroundMap = (jobName: string): string => {
  if (!jobName) return '100000000';
  
  // Cygnus
  if (['皇家', '米哈逸', '聖魂', '烈焰', '破風', '暗夜', '閃雷'].some(k => jobName.includes(k))) return '130000000'; // Ereve
  
  // Resistance / Demon / Xenon
  if (['反抗軍', '惡魔', '傑諾', '煉獄', '機甲', '狂豹', '爆拳'].some(k => jobName.includes(k))) return '310000000'; // Edelstein
  
  // Heroes
  if (jobName.includes('精靈遊俠')) return '101050000'; // Elluel
  if (jobName.includes('狂狼勇士')) return '140000000'; // Rien
  if (jobName.includes('幻影俠盜')) return '915000000'; // Lumiere
  if (jobName.includes('隱月')) return '410000000'; // Fox Point
  
  // Nova
  if (['凱撒', '天使破壞者', '卡蒂娜', '凱恩'].some(k => jobName.includes(k))) return '400000000'; // Pantheon
  
  // Lef
  if (['阿戴爾', '亞克', '伊利恩', '卡莉'].some(k => jobName.includes(k))) return '402000000'; // Ristonia
  
  // Zero
  if (jobName.includes('神之子')) return '321000000'; // Mirror World
  
  // Kinesis
  if (jobName.includes('凱內西斯')) return '331000000'; // Seoul

  // Explorers (冒險家)
  // Warrior -> Perion (勇士之村)
  if (['劍士', '英雄', '聖騎士', '黑騎士', '狂戰士', '十字軍', '騎士', '槍騎兵', '龍騎士'].some(k => jobName.includes(k))) return '102000000';
  
  // Magician -> Ellinia (魔法森林)
  if (['法師', '火毒', '冰雷', '主教', '巫師', '魔導士', '僧侶', '祭司', '琳恩', '幻獸師'].some(k => jobName.includes(k))) return '101000000';
  
  // Thief -> Kerning City (墮落城市)
  if (['盜賊', '夜使者', '暗影神偷', '影武者', '刺客', '暗殺者', '俠盜', '神偷'].some(k => jobName.includes(k))) return '103000000';
  
  // Pirate -> Nautilus (諾特勒斯)
  if (['海盜', '拳霸', '槍神', '重砲', '指拳手', '衝鋒隊長', '槍手', '墨玄', '蒼龍'].some(k => jobName.includes(k))) return '120000000';

  // Bowman -> Henesys (弓箭手村) - Default
  // if (['弓箭手', '箭神', '神射手', '開拓者'].some(k => jobName.includes(k))) return '100000000';

  return '100000000'; // Henesys (Default)
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    return import.meta.env.VITE_NEXON_API_KEY || localStorage.getItem('nexon_api_key') || null;
  });
  const [geminiKey, setGeminiKey] = useState<string | null>(() => {
    return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_DEFAULT_GEMINI_KEY || localStorage.getItem('gemini_api_key') || null;
  });
  const [geminiModel, setGeminiModel] = useState<string>(() => {
    return localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
  });
  const [showKeySettings, setShowKeySettings] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showDetailStats, setShowDetailStats] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const initialSearchDone = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const aiResultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const history = localStorage.getItem('maple_search_history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  // Scroll to AI result when analysis is ready
  useEffect(() => {
    if (aiAnalysis && aiResultRef.current) {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        aiResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [aiAnalysis]);

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

  const handleSearch = async (e?: React.FormEvent, overrideName?: string, overrideKey?: string) => {
    if (e) e.preventDefault();
    
    const targetName = overrideName !== undefined ? overrideName : characterName;
    const targetKey = overrideKey !== undefined ? overrideKey : apiKey;

    if (!targetName.trim() || !targetKey || loading) return;

    setLoading(true);
    setError(null);
    setAiAnalysis(null);
    setData(null);
    setShowHistory(false);

    // MOCK / DEMO MODE
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

    // REAL API CALL
    try {
      const result = await fetchCharacterData(targetName, targetKey);
      setData(result);
      addToHistory(targetName);
      // Update URL hash
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `#${targetName}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '發生非預期的錯誤，請檢查名稱或 API Key。');
    } finally {
      setLoading(false);
    }
  };

  const handleAiAnalyze = async () => {
    if (!data) return;
    
    // Use user's key if available, otherwise use default
    const keyToUse = geminiKey || DEFAULT_GEMINI_KEY;

    setAnalyzing(true);
    const result = await analyzeCharacter(data, keyToUse, geminiModel);
    setAiAnalysis(result);
    setAnalyzing(false);
  };

  // Handle URL hash for direct linking
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash && apiKey && !initialSearchDone.current) {
      const hashName = decodeURIComponent(window.location.hash.substring(1));
      if (hashName) {
        setCharacterName(hashName);
        handleSearch(undefined, hashName);
        initialSearchDone.current = true;
      }
    }
  }, [apiKey]);

  // Helper to extract specific stat values safely
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

  // Color mapping for Inner Ability
  const getAbilityStyle = (grade: string) => {
    // Check for both English and potential Chinese keys just in case
    const g = grade.toLowerCase();
    if (g.includes('legendary') || g.includes('傳說')) return 'border-green-600 bg-green-950/30 text-green-400';
    if (g.includes('unique') || g.includes('罕見')) return 'border-yellow-600 bg-yellow-950/30 text-yellow-400';
    if (g.includes('epic') || g.includes('稀有')) return 'border-purple-600 bg-purple-950/30 text-purple-400';
    if (g.includes('rare') || g.includes('特殊')) return 'border-blue-600 bg-blue-950/30 text-blue-400';
    return 'border-slate-700 bg-slate-800 text-slate-300';
  };

  const focusStatKeys = [
    '戰鬥力', '最終傷害', 'BOSS怪物傷害', '無視防禦率', '爆擊傷害', 
    '攻擊力', '魔法攻擊力', '星力', '神秘力量', '真實之力'
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
            <p className="text-sm text-slate-400 mb-4">
              預設使用公共 Key，若遇到額度限制或想要更穩定的體驗，請輸入您自己的 Google Gemini API Key。
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">API Key</label>
                <input
                  type="password"
                  defaultValue={geminiKey || ''}
                  placeholder="貼上您的 Gemini API Key..."
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-indigo-500 outline-none"
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (val) {
                      setGeminiKey(val);
                      localStorage.setItem('gemini_api_key', val);
                    } else {
                      setGeminiKey(null);
                      localStorage.removeItem('gemini_api_key');
                    }
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
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (推薦 / 快速)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (穩定)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (更聰明)</option>
                  <option value="gemini-3-pro-preview">Gemini 3.0 Pro Preview (最新最強)</option>
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
      <div className="max-w-[1600px] mx-auto px-6 pt-8 pb-4 flex flex-col items-center gap-6">
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

        <form onSubmit={handleSearch} className="w-full max-w-2xl relative group">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
           <input 
             ref={searchInputRef}
             value={characterName}
             onChange={(e) => setCharacterName(e.target.value)}
             onFocus={() => setShowHistory(true)}
             onBlur={() => setTimeout(() => setShowHistory(false), 200)}
             placeholder="輸入角色名稱 (例如: 怪獸小熊)"
             className="w-full bg-[#1a1d24] border border-slate-700 rounded-xl py-3 pl-12 pr-12 text-base focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-white placeholder:text-slate-600 shadow-lg"
           />
           <button type="submit" disabled={loading} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
           </button>

           {/* Search History Dropdown */}
           {showHistory && searchHistory.length > 0 && (
             <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d24] border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
               <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-[#15171c]">
                 <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><History className="w-3 h-3" /> 搜尋紀錄</span>
                 <button 
                   type="button"
                   onClick={() => { setSearchHistory([]); localStorage.removeItem('maple_search_history'); }}
                   className="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
                 >
                   清除全部
                 </button>
               </div>
               {searchHistory.map((name, idx) => (
                 <div 
                   key={idx}
                   onClick={() => { setCharacterName(name); handleSearch(undefined, name); }}
                   className="px-4 py-3 text-sm text-slate-300 hover:bg-indigo-600/20 hover:text-indigo-300 cursor-pointer flex justify-between items-center group/item transition-colors"
                 >
                   <span>{name}</span>
                   <button 
                     type="button"
                     onClick={(e) => removeFromHistory(e, name)}
                     className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-red-400 transition-all"
                   >
                     <X className="w-3 h-3" />
                   </button>
                 </div>
               ))}
             </div>
           )}
        </form>
      </div>

      <main className="max-w-[1600px] mx-auto p-6 mt-4">
        {loading && !data && (
           <div className="flex flex-col items-center py-40 animate-pulse">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
              <p className="text-slate-500 font-medium">正在讀取角色資料...</p>
           </div>
        )}

        {error && (
           <div className="max-w-md mx-auto mt-20 p-6 bg-red-950/20 border border-red-900 rounded-xl text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <h3 className="text-red-400 font-bold mb-1">讀取失敗</h3>
              <p className="text-red-300/80 text-sm mb-4">{error}</p>
              
              <div className="flex flex-col gap-2 justify-center sm:flex-row">
                <button onClick={() => handleSearch()} className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 rounded text-white text-sm transition-colors">
                  重試
                </button>
                
                {(error.includes('429') || error.includes('Rate limited')) && (
                  <>
                    <button 
                      onClick={() => { setApiKey('DEMO_MODE'); setCharacterName('DemoHero'); handleSearch(undefined, 'DemoHero', 'DEMO_MODE'); }}
                      className="px-4 py-2 bg-indigo-900/40 hover:bg-indigo-900/60 rounded text-white text-sm transition-colors"
                    >
                      切換至演示模式
                    </button>
                    <button 
                      onClick={() => { setApiKey(null); localStorage.removeItem('nexon_api_key'); }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white text-sm transition-colors"
                    >
                      更換 API Key
                    </button>
                  </>
                )}
              </div>
           </div>
        )}

        {data && !loading && (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUMN 1: Profile & Meta (Span 3) */}
            <div className="lg:col-span-3 space-y-4">
               <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden shadow-xl relative group">
                  {/* Background Art - Dynamic based on Job */}
                  <div className="h-32 bg-slate-800 relative overflow-hidden">
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-30 grayscale mix-blend-overlay transition-all duration-700 group-hover:scale-110 group-hover:opacity-40 group-hover:grayscale-0"
                        style={{ backgroundImage: `url('https://maplestory.io/api/GMS/248/map/${getJobBackgroundMap(data.basic.character_class)}/render/back')` }}
                      ></div>
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#161b22]"></div>
                  </div>

                  <div className="px-5 relative -mt-16 flex flex-col items-center pb-5">
                      {/* Avatar */}
                      <div className="w-32 h-32 rounded-full bg-[#0a0c10] border-4 border-[#1f242e] shadow-2xl overflow-hidden flex items-center justify-center mb-3 relative z-10 group-hover:scale-105 transition-transform duration-500">
                          <img src={data.basic.character_image} alt="Character" className="w-[150%] h-[150%] object-cover mt-8" />
                      </div>

                      <div className="flex items-center justify-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold text-white">{data.basic.character_name}</h2>
                        <button 
                          onClick={() => setShowShareModal(true)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/30 rounded-full transition-colors"
                          title="分享角色"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-400 mb-6">
                         <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {data.stat.pop || 0}</span>
                         <span className="text-slate-600">|</span>
                         <span>{data.basic.character_guild_name || '無公會'}</span>
                         <span className="text-slate-600">|</span>
                         <span className="text-indigo-400">{data.basic.world_name}</span>
                      </div>

                      {/* Level & Class */}
                      <div className="w-full mb-4 p-3 bg-[#0d1117]/80 backdrop-blur-sm rounded-lg border border-slate-800">
                         <div className="flex justify-between items-baseline mb-1">
                            <span className="text-sm font-bold text-white">{data.basic.character_class} <span className="text-xs font-normal text-slate-500">({data.basic.character_class_level === '6' ? '6轉' : data.basic.character_class_level + '轉'})</span></span>
                            <span className="text-xs text-slate-500">{data.basic.character_exp_rate}%</span>
                         </div>
                         <div className="text-2xl font-mono font-bold text-white mb-2">LV. {data.basic.character_level}</div>
                         {/* Exp Bar Visual */}
                         <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: `${Math.min(parseFloat(data.basic.character_exp_rate), 100)}%` }} />
                         </div>
                      </div>

                      {/* Meta Details */}
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
                            <span className="text-slate-300 font-mono">{data.unionArtifact?.union_artifact_crystal?.reduce((acc, curr) => acc + curr.level, 0) || 0}</span>
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

                      {/* Radar Chart */}
                      <div className="mb-6">
                        <StatRadarChart data={data} />
                      </div>

                      {/* AI Button */}
                       <button 
                        onClick={handleAiAnalyze}
                        disabled={analyzing}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 hover:translate-y-[-1px]"
                       >
                         {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                         {aiAnalysis ? '重新分析' : 'AI 健檢'}
                       </button>
                   </div>
               </div>
            </div>

            {/* COLUMN 2: Stats (Span 4) */}
            <div className="lg:col-span-4 space-y-6">
               <div className="bg-[#161b22] border border-slate-800 rounded-xl p-5 h-full flex flex-col">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <Sword className="w-4 h-4" /> 焦點屬性
                  </h3>

                  {/* Combat Power (Highlight) */}
                  <div className="bg-[#0d1117] border border-slate-700/50 rounded-lg p-3 mb-4">
                     <div className="text-xs text-slate-500 mb-1">戰鬥力</div>
                     <div className="text-xl font-bold text-indigo-400 font-mono tracking-tight">
                        {formatBigNumber(getStatVal('Combat Power'))}
                     </div>
                  </div>

                  {/* Focus Stats List */}
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

                  {/* Inner Ability */}
                  <div className="mb-6">
                     <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" /> 內在潛能
                     </h3>
                     <div className="space-y-2">
                        {data.ability.ability_info.map((a, i) => (
                           <div key={i} className={`p-2.5 rounded text-xs font-medium border ${getAbilityStyle(a.ability_grade)} shadow-sm`}>
                              {a.ability_value}
                           </div>
                        ))}
                     </div>
                  </div>
                  
                  {/* Expandable Detail Stats */}
                  <div className="mt-auto">
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
               </div>
            </div>

            {/* COLUMN 3: Equipment (Span 5) */}
            <div className="lg:col-span-5 space-y-6">
               <EquipmentGrid equipment={data.equipment} characterImage={data.basic.character_image} />
            </div>

          </div>

          {/* AI Response Area */}
          {aiAnalysis && (
             <div ref={aiResultRef} className="bg-[#161b22] border border-indigo-500/30 rounded-xl p-5 animate-in fade-in slide-in-from-top-2 shadow-lg shadow-indigo-900/10 mt-6">
                <h3 className="text-indigo-400 font-bold text-base mb-3 flex items-center gap-2 border-b border-indigo-500/20 pb-2">
                   <Wand2 className="w-5 h-5" /> AI 角色分析報告
                </h3>
                <div 
                   className="text-sm text-slate-300 leading-relaxed ai-markdown-content"
                   dangerouslySetInnerHTML={{ 
                      __html: new MarkdownIt({ 
                         html: true, 
                         breaks: true,
                         linkify: true
                      }).render(aiAnalysis) 
                   }}
                />
                <style>{`
                   .ai-markdown-content ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
                   .ai-markdown-content ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
                   .ai-markdown-content h1, .ai-markdown-content h2, .ai-markdown-content h3, .ai-markdown-content h4 { 
                      font-weight: bold; 
                      color: #818cf8; 
                      margin-top: 1.2em; 
                      margin-bottom: 0.6em; 
                   }
                   .ai-markdown-content p { margin-bottom: 0.8em; }
                   .ai-markdown-content strong { color: #c7d2fe; font-weight: 700; }
                   .ai-markdown-content li { margin-bottom: 0.3em; }
                   .ai-markdown-content hr { border-color: #4f46e5; opacity: 0.3; margin: 1.5em 0; }
                   
                   /* Table Styles */
                   .ai-markdown-content table { width: 100%; border-collapse: collapse; margin-bottom: 1em; font-size: 0.9em; }
                   .ai-markdown-content th, .ai-markdown-content td { border: 1px solid #374151; padding: 8px 12px; text-align: left; }
                   .ai-markdown-content th { background-color: #1e293b; color: #a5b4fc; font-weight: 600; }
                   .ai-markdown-content tr:nth-child(even) { background-color: #1e293b; }
                   .ai-markdown-content tr:hover { background-color: #334155; }
                `}</style>
                <div className="mt-4 pt-3 border-t border-indigo-500/20 flex justify-between items-center">
                   <span className="text-[10px] text-slate-500">Generated by Google Gemini</span>
                   <button 
                     onClick={() => setShowKeySettings(true)}
                     className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors bg-indigo-950/30 px-2 py-1 rounded hover:bg-indigo-900/50"
                   >
                     <Settings className="w-3 h-3" />
                     設定模型 / API Key
                   </button>
                </div>
             </div>
          )}

          {/* Extended Details Section */}
          <CharacterDetails data={data} />

          {showShareModal && (
            <ShareModal 
              characterName={data.basic.character_name} 
              onClose={() => setShowShareModal(false)} 
            />
          )}
        </>
        )}

        {!data && !loading && !error && (
           <div className="text-center mt-32 opacity-50">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Search className="w-8 h-8 text-slate-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-300 mb-2">開始查詢</h2>
              <p className="text-slate-500 max-w-sm mx-auto">輸入角色名稱，查看新楓之谷的詳細數據與裝備。</p>
           </div>
        )}
      </main>
    </div>
  );
};

export default App;
