import React, { useState } from 'react';
import ApiKeyModal from './components/ApiKeyModal';
import ShareModal from './components/ShareModal';
import CharacterDetails from './components/CharacterDetails';
import { getStatBreakdown } from './services/statCalculator';
import SearchForm, { SearchStatus, SearchEmptyState } from './components/SearchForm';
import MainDashboard from './components/MainDashboard';
import AiAnalysisPanel from './components/AiAnalysisPanel';
import UpdateLogBoard from './components/UpdateLogBoard';
import HeroHeader from './components/HeroHeader';
import KeySettingsModal from './components/KeySettingsModal';

import { useMapleSearch } from './hooks/useMapleSearch';
import { useAiAnalysis } from './hooks/useAiAnalysis';
import { useCharacterStats } from './hooks/useCharacterStats';

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
    historyData,
    searchInputRef,
    handleSearch, handleBestSearch,
    removeFromHistory, toggleFavorite
  } = useMapleSearch(apiKey, () => {}, setError);

  const {
    geminiKey, setGeminiKey,
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
        />
      )}

      {/* Key Settings Modal */}
      <KeySettingsModal 
        show={showKeySettings}
        onClose={() => setShowKeySettings(false)}
        geminiKey={geminiKey}
        setGeminiKey={setGeminiKey}
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

      <main className="max-w-[1600px] mx-auto p-6 mt-4">
        <SearchStatus 
          loading={loading}
          isScanningBest={isScanningBest}
          data={data}
          error={error}
          handleSearch={handleSearch}
        />

        {data && !loading && (
          <>
          <MainDashboard 
            data={data}
            loading={loading}
            isScanningBest={isScanningBest}
            showDetailStats={showDetailStats}
            setShowDetailStats={setShowDetailStats}
            getStatVal={getStatVal}
            getStatBreakdown={getStatBreakdown}
            detailedStats={detailedStats}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            setShowShareModal={setShowShareModal}
            historyData={historyData}
            analyzing={analyzing}
            handleAiAnalyze={handleAiAnalyze}
            aiAnalysis={aiAnalysis}
            abilityPreset={abilityPreset}
            setAbilityPreset={setAbilityPreset}
            currentAbilityInfo={currentAbilityInfo}
            getAbilityStyle={getAbilityStyle}
          />

           <AiAnalysisPanel 
            analyzing={analyzing}
            aiAnalysis={aiAnalysis}
            error={error}
            dropRateWarningData={dropRateWarningData}
            isHighScore={isHighScore}
            aiResultRef={aiResultRef}
            handleAiAnalysis={handleAiAnalyze}
            setShowKeySettings={setShowKeySettings}
            setDropRateWarningData={setDropRateWarningData}
            geminiModel={geminiModel}
            elapsedTime={elapsedTime}
            progressMessage={progressMessage}
          />

          <CharacterDetails 
           data={data} 
           apiKey={apiKey || ''} // 傳入 apiKey
          />
          {showShareModal && <ShareModal characterName={data.basic.character_name} onClose={() => setShowShareModal(false)} />}
          </>
        )}

        {!data && !loading && !error && (
          <SearchEmptyState />
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
