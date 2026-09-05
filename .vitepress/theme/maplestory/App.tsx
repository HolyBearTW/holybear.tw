import React, { useState } from 'react';
import { Construction } from 'lucide-react';
import SearchForm, { SearchStatus, SearchEmptyState } from './components/SearchForm';
import UpdateLogBoard from './components/UpdateLogBoard';
import HeroHeader from './components/HeroHeader';
import KeySettingsModal from './components/KeySettingsModal';
import RecentPowerRanking from './components/RecentPowerRanking';

import { useMapleSearch } from './hooks/useMapleSearch';
import { useAiAnalysis } from './hooks/useAiAnalysis';
import { useCharacterStats } from './hooks/useCharacterStats';
import { preloadAliasIndex } from './services/aliasService';
import { mapleAsset } from './assets';
import {
  BYPASS_STORAGE_KEY,
  BYPASS_EXPIRY_STORAGE_KEY,
  lockMaintenanceView,
  MAINTENANCE_LOCK_EVENT,
  readBypassExpiresAt,
  readSavedBypassKey,
  saveBypassKey,
  validateMaintenanceBypass,
} from './services/maintenanceAccess';

const loadMainDashboard = () => import('./components/MainDashboard');
const loadCharacterGrowthHistory = () => import('./components/CharacterGrowthHistory');
const loadAiAnalysisPanel = () => import('./components/AiAnalysisPanel');
const loadCharacterDetails = () => import('./components/CharacterDetails');

const MainDashboard = React.lazy(loadMainDashboard);
const CharacterGrowthHistory = React.lazy(loadCharacterGrowthHistory);
const AiAnalysisPanel = React.lazy(loadAiAnalysisPanel);
const CharacterDetails = React.lazy(loadCharacterDetails);
const ShareModal = React.lazy(() => import('./components/ShareModal'));

const preloadResultSections = () => Promise.allSettled([
  loadMainDashboard(),
  loadCharacterGrowthHistory(),
  loadAiAnalysisPanel(),
  loadCharacterDetails(),
  preloadAliasIndex(),
]);

const ResultLoading = () => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 350);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return (
  <div className="my-4 flex min-h-28 items-center justify-center rounded-xl border border-slate-800 bg-[#161b22]/80 px-4 text-sm font-medium text-slate-400">
    <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-cyan-400/25 border-t-cyan-400" aria-hidden="true" />
    正在準備角色分析介面…
  </div>
  );
};

const AuthorizedApp: React.FC<{ bypassKey: string }> = ({ bypassKey }) => {
  const apiKey = bypassKey;
  
  const [error, setError] = useState<string | null>(null);

  const {
    characterName, setCharacterName,
    selectedDate, setSelectedDate,
    data, setData,
    loading,
    isScanningBest,
    searchHistory, setSearchHistory,
    showHistory, setShowHistory,
    favorites,
    searchInputRef,
    handleSearch, handleBestSearch,
    removeFromHistory, toggleFavorite
  } = useMapleSearch(apiKey, () => {}, setError);

  const {
    geminiKey, setGeminiKey,
    openAiKey, setOpenAiKey,
    compatibleAiKey, setCompatibleAiKey,
    compatibleAiBaseUrl, setCompatibleAiBaseUrl,
    compatibleAiModel, setCompatibleAiModel,
    geminiModel, setGeminiModel,
    showKeySettings, setShowKeySettings,
    aiAnalysis,
    analyzing,
    elapsedTime,
    progressMessage,
    dropRateWarningData, setDropRateWarningData,
    aiResultRef, isHighScore, handleAiAnalyze
  } = useAiAnalysis(data, setError);

  const {
    showDetailStats, setShowDetailStats,
    abilityPreset, setAbilityPreset,
    showShareModal, setShowShareModal,
    getStatVal, detailedStats, getAbilityStyle, currentAbilityInfo
  } = useCharacterStats(data);

  // Keep the first result paint responsive. The primary dashboard renders at once,
  // while the much larger detail tree is prepared as interruptible background work.
  const deferredData = React.useDeferredValue(data);
  const deferredDetailsData = deferredData === data ? deferredData : null;

  React.useEffect(() => {
    if (!loading) return;
    void preloadResultSections();
  }, [loading]);

  return (
    <div className="min-h-screen bg-transparent text-slate-200 font-sans">
      {/* Key Settings Modal */}
      <KeySettingsModal 
        show={showKeySettings}
        onClose={() => setShowKeySettings(false)}
        geminiKey={geminiKey}
        setGeminiKey={setGeminiKey}
        openAiKey={openAiKey}
        setOpenAiKey={setOpenAiKey}
        compatibleAiKey={compatibleAiKey}
        setCompatibleAiKey={setCompatibleAiKey}
        compatibleAiBaseUrl={compatibleAiBaseUrl}
        setCompatibleAiBaseUrl={setCompatibleAiBaseUrl}
        compatibleAiModel={compatibleAiModel}
        setCompatibleAiModel={setCompatibleAiModel}
        geminiModel={geminiModel}
        setGeminiModel={setGeminiModel}
      />

      {/* Search Section */}
      <div className="max-w-[1600px] mx-auto px-6 pt-8 pb-4 flex flex-col items-center gap-6 relative">
        {/* NEW: 全域設定按鈕 (右上角) */}
        <HeroHeader 
          apiKey={apiKey} 
          onShowKeySettings={() => setShowKeySettings(true)} 
          onClearApiKey={() => { 
            lockMaintenanceView();
            setData(null);
            setCharacterName('');
          }} 
        />

        <SearchForm 
          apiKey={apiKey}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          characterName={characterName}
          setCharacterName={setCharacterName}
          handleSearch={handleSearch}
          handleBestSearch={handleBestSearch}
          loading={loading}
          isScanningBest={isScanningBest}
          data={data}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          searchHistory={searchHistory}
          setSearchHistory={setSearchHistory}
          removeFromHistory={removeFromHistory}
          setShowHistory={setShowHistory}
          showHistory={showHistory}
          searchInputRef={searchInputRef}
        />
      </div>

      <main className={`max-w-[1600px] mx-auto px-6 pb-6 ${!data && !loading && !error ? 'pt-0 mt-0' : 'pt-6 mt-4'}`}>
        <SearchStatus 
          loading={loading}
          isScanningBest={isScanningBest}
          data={data}
          error={error}
          handleSearch={handleSearch}
        />

        {data && !loading && (
          <>
            <React.Suspense fallback={<ResultLoading />}>
            <MainDashboard
              data={data}
              apiKey={apiKey || ''}
              loading={loading}
              isScanningBest={isScanningBest}
              showDetailStats={showDetailStats}
              setShowDetailStats={setShowDetailStats}
              getStatVal={getStatVal}
              detailedStats={detailedStats}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              setShowShareModal={setShowShareModal}
              analyzing={analyzing}
              handleAiAnalyze={handleAiAnalyze}
              aiAnalysis={aiAnalysis}
              abilityPreset={abilityPreset}
              setAbilityPreset={setAbilityPreset}
              currentAbilityInfo={currentAbilityInfo}
              getAbilityStyle={getAbilityStyle}
              onSelectCharacter={(name) => {
                setCharacterName(name);
                void handleSearch(undefined, name);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
            </React.Suspense>

            <React.Suspense fallback={null}>
            <CharacterGrowthHistory data={data} apiKey={apiKey || ''} />
            </React.Suspense>

            <React.Suspense fallback={null}>
            <AiAnalysisPanel
              analyzing={analyzing}
              aiAnalysis={aiAnalysis}
              error={error}
              dropRateWarningData={dropRateWarningData}
              isHighScore={isHighScore}
              aiResultRef={aiResultRef}
              handleAiAnalyze={handleAiAnalyze}
              setShowKeySettings={setShowKeySettings}
              setDropRateWarningData={setDropRateWarningData}
              geminiModel={geminiModel}
              elapsedTime={elapsedTime}
              progressMessage={progressMessage}
            />
            </React.Suspense>

          {deferredDetailsData && (
            <React.Suspense fallback={null}>
              <CharacterDetails
                data={deferredDetailsData}
                apiKey={apiKey || ''} // 傳入 apiKey
              />
            </React.Suspense>
          )}
          {showShareModal && (
            <React.Suspense fallback={null}>
              <ShareModal characterName={data.basic.character_name} onClose={() => setShowShareModal(false)} />
            </React.Suspense>
          )}
          </>
        )}

        {!data && !loading && !error && (
          <>
            <SearchEmptyState />
            <RecentPowerRanking
              queryName={characterName}
              onSelectCharacter={(name) => { setCharacterName(name); handleSearch(undefined, name); }}
            />
          </>
        )}
      </main>
          {(!data && !loading && !error) && (
            <UpdateLogBoard />
          )}
          <style>{`
            .custom-vp-tip-danger {
               box-sizing: border-box;
               max-width: 28rem;
               margin-left: 1rem;
               margin-right: 1rem;
               padding-left: 1rem;
               padding-right: 1rem;
               display: block;
            }
            .custom-vp-tip {
              background: rgba(0,255,238,0.12);
              /* #00FFEE 主題色系 */
              box-sizing: border-box;
              width: calc(100% - 3rem);
              max-width: 28rem;
              margin-left: auto;
              margin-right: auto;
              padding-left: 1rem;
              padding-right: 1rem;
              display: block;
              border-left: 4px solid #00FFEE;
              color: #b8fff9;
            }
            @media (min-width: 640px) {
              .custom-vp-tip-danger,
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

const MaintenanceView: React.FC<{
  onUnlock: (key: string) => Promise<void>;
  unlocking: boolean;
  unlockError: string;
}> = ({ onUnlock, unlocking, unlockError }) => {
  const clickCount = React.useRef(0);
  const resetTimer = React.useRef<number | null>(null);

  React.useEffect(() => () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
  }, []);

  const handleTitleClick = () => {
    clickCount.current += 1;
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => {
      clickCount.current = 0;
    }, 3000);

    if (clickCount.current < 5) return;
    clickCount.current = 0;
    const enteredKey = window.prompt('請輸入維護專用密碼')?.trim();
    if (enteredKey) void onUnlock(enteredKey);
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-[1600px] flex-col items-center justify-center px-6 py-16 text-slate-200">
      <div
        className="mb-8 flex select-none items-center gap-3 rounded-lg"
        onClick={handleTitleClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleTitleClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="新楓之谷戰力分析"
      >
        <span className="flex h-12 w-12 items-center justify-center">
          <img
            src={mapleAsset('Maple_Icon.webp')}
            alt=""
            className="h-12 w-12 object-contain"
            decoding="async"
          />
        </span>
        <h1 className="maple-hero-title m-0 text-2xl font-bold text-white">新楓之谷戰力分析</h1>
      </div>
      <section className="maple-maintenance-card w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-[#161b22]/95 px-6 py-10 text-center shadow-2xl shadow-black/20 backdrop-blur-sm sm:px-10 sm:py-12">
        <div className="maple-maintenance-icon mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-400/10 text-amber-300 shadow-lg shadow-amber-950/20" aria-hidden="true">
          <Construction className="h-7 w-7" strokeWidth={1.8} />
        </div>
        <h2 className="maple-maintenance-heading m-0 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          系統維護與架構重構中
        </h2>
        <p className="maple-maintenance-copy mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
          戰力分析與相關角色工具目前暫停服務，進行後端架構升級與最佳化，敬請見諒。
        </p>
        {unlocking && <p className="mt-4 text-sm font-medium text-cyan-400">正在驗證密碼…</p>}
        {!unlocking && unlockError && <p className="mt-4 text-sm font-medium text-rose-400">{unlockError}</p>}
      </section>
    </main>
  );
};

const getInitialBypassKey = () => {
  if (typeof window === 'undefined') return '';
  return readSavedBypassKey();
};

const App: React.FC = () => {
  const [bypassKey, setBypassKey] = useState(getInitialBypassKey);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  const unlock = React.useCallback(async (key: string) => {
    setUnlocking(true);
    setUnlockError('');
    try {
      if (!await validateMaintenanceBypass(key)) {
        setUnlockError('密碼錯誤或已失效，請重新輸入。');
        return;
      }
      saveBypassKey(key);
      setBypassKey(key);
    } catch {
      setUnlockError('無法連線至驗證服務，請稍後再試。');
    } finally {
      setUnlocking(false);
    }
  }, []);

  React.useEffect(() => {
    const url = new URL(window.location.href);
    const queryKey = url.searchParams.get('bypass_key')?.trim();
    if (queryKey) {
      url.searchParams.delete('bypass_key');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      void unlock(queryKey);
    }

    const handleMaintenanceLock = () => setBypassKey('');
    const handleStorage = (event: StorageEvent) => {
      if (event.key === BYPASS_STORAGE_KEY || event.key === BYPASS_EXPIRY_STORAGE_KEY) {
        setBypassKey(readSavedBypassKey());
      }
    };
    window.addEventListener(MAINTENANCE_LOCK_EVENT, handleMaintenanceLock);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(MAINTENANCE_LOCK_EVENT, handleMaintenanceLock);
      window.removeEventListener('storage', handleStorage);
    };
  }, [unlock]);

  React.useEffect(() => {
    if (!bypassKey) return;
    const remaining = readBypassExpiresAt() - Date.now();
    if (remaining <= 0) {
      lockMaintenanceView();
      return;
    }
    const timer = window.setTimeout(lockMaintenanceView, remaining);
    return () => window.clearTimeout(timer);
  }, [bypassKey]);

  return bypassKey
    ? <AuthorizedApp bypassKey={bypassKey} />
    : <MaintenanceView onUnlock={unlock} unlocking={unlocking} unlockError={unlockError} />;
};

export default App;
