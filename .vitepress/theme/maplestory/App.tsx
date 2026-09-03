import React, { useState } from 'react';
import ApiKeyModal from './components/ApiKeyModal';
import SearchForm, { SearchStatus, SearchEmptyState } from './components/SearchForm';
import UpdateLogBoard from './components/UpdateLogBoard';
import HeroHeader from './components/HeroHeader';
import KeySettingsModal from './components/KeySettingsModal';
import RecentPowerRanking from './components/RecentPowerRanking';

import { useMapleSearch } from './hooks/useMapleSearch';
import { useAiAnalysis } from './hooks/useAiAnalysis';
import { useCharacterStats } from './hooks/useCharacterStats';

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

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('nexon_api_key') || (import.meta as any).env?.VITE_NEXON_API_KEY || null : null;
  });
  
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
      {!apiKey && (
        <ApiKeyModal 
          defaultNexonKey={apiKey || ''}
          defaultGeminiKey={geminiKey || ''}
          defaultOpenAiKey={openAiKey || ''}
          onSave={(nexonKey, geminiKey, openAiKey) => {
            setApiKey(nexonKey);
            localStorage.setItem('nexon_api_key', nexonKey);
            if (geminiKey) {
              setGeminiKey(geminiKey);
              localStorage.setItem('gemini_api_key', geminiKey);
            }
            if (openAiKey) {
              setOpenAiKey(openAiKey);
              localStorage.setItem('openai_api_key', openAiKey);
            }
          }} 
        />
      )}

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
            setApiKey(null); 
            localStorage.removeItem('nexon_api_key'); 
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

export default App;
