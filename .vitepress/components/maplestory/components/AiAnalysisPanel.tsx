import React from 'react';
import { Crown, Star, Wand2, Sparkles, Loader2, AlertTriangle, AlertCircle, RefreshCw, ThumbsUp, ArrowRight, Settings } from 'lucide-react';
import { BorderBeam } from 'border-beam';
import MarkdownIt from 'markdown-it';

interface AiAnalysisPanelProps {
    aiResultRef: React.RefObject<HTMLDivElement>;
    analyzing: boolean;
    aiAnalysis: string | null;
    error: string | null;
    dropRateWarningData?: { drop: number; meso: number } | null;
    isHighScore: boolean;
    elapsedTime: number;
    progressMessage: string;
    handleAiAnalyze: (overrideIgnoreWarnings?: boolean) => void;
    geminiModel: string;
    setShowKeySettings: (show: boolean) => void;
    setDropRateWarningData: (data: { drop: number; meso: number } | null) => void;
}

const md = new MarkdownIt({ breaks: true, html: true });

const getModelDisplayName = (id: string) => {
  if (id.includes('3.5-flash')) return 'Gemini 3.5 Flash (最新高速)';
    if (id.includes('3.1-pro-preview')) return 'Gemini 3.1 Pro (最新旗艦)';
    if (id.includes('3.1-flash-lite')) return 'Gemini 3.1 Flash (最新極速)';
    if (id.includes('3-pro-preview')) return 'Gemini 3.0 Pro (最新高階)';
    if (id.includes('2.5-flash')) return 'Gemini 2.5 Flash (穩定首選)';
    if (id.includes('2.5-pro')) return 'Gemini 2.5 Pro (生產級別)';
    return id;
};

const getEstimatedWaitTime = (id: string) => {
  if (id.includes('3.5-flash')) return '20~90';
    if (id.includes('flash-preview')) return '30~120';
    if (id.includes('flash')) return '30~120';
    if (id.includes('pro')) return '60~120';
    return '15~45';
};

const AiAnalysisPanel: React.FC<AiAnalysisPanelProps> = ({
    aiResultRef,
    analyzing,
    aiAnalysis,
    error,
    dropRateWarningData,
    isHighScore,
    elapsedTime,
    progressMessage,
    handleAiAnalyze,
    geminiModel,
    setShowKeySettings,
    setDropRateWarningData
}) => {
    return (
        <>
            {/* AI Response Area */}
           {/* Fix: Always show container if we have result OR analyzing OR specific error OR warning. Button is now always visible inside. */}
           <div ref={aiResultRef} className={`relative transition-all duration-700 ${!analyzing && !aiAnalysis && !error?.includes('AI') && !dropRateWarningData ? 'hidden' : 'block'} 
             ${isHighScore ? 'bg-gradient-to-br from-[#1c1f33] to-[#2a1b3d] border-2 border-amber-400/50 shadow-[0_0_40px_rgba(251,191,36,0.15)]' : 'bg-[#161b22] border border-indigo-500/30 shadow-lg'} 
             rounded-xl p-5 mt-6`}>
               
               {/* High Score Background Glow */}
               {isHighScore && (
                 <div className="absolute inset-0 pointer-events-none z-0">
                    <BorderBeam colorVariant="sunset" size="md">
                       <div className="w-full h-full rounded-xl" />
                    </BorderBeam>
                 </div>
               )}

               <h3 className={`relative font-bold text-base mb-3 flex items-center justify-between border-b pb-2 ${isHighScore ? 'text-amber-400 border-amber-500/30' : 'text-indigo-400 border-indigo-500/20'}`}>
                 <div className="flex items-center gap-2 relative z-10">
                    {isHighScore ? (
                        <div className="relative">
                            <Crown className="w-5 h-5 text-amber-400 animate-pulse" />
                            <div className="absolute -top-1 -right-1 animate-[ping_1.5s_infinite]"><Star className="w-2 h-2 text-yellow-200" fill="currentColor" /></div>
                        </div>
                    ) : <Wand2 className="w-5 h-5" />} 
                    
                    <span className="relative">
                        {isHighScore ? 'AI 權威戰力評鑑 (突破極限)' : 'AI 角色分析報告'}
                        {isHighScore && (
                            <>
                                <div className="absolute -top-3 -right-4 animate-[bounce_2s_infinite]"><Sparkles className="w-4 h-4 text-yellow-300" /></div>
                                <div className="absolute -bottom-2 -left-2 rotate-12 animate-pulse"><Star className="w-2 h-2 text-amber-500" fill="currentColor"/></div>
                                <div className="absolute top-1/2 -right-8 -translate-y-1/2 animate-[spin_4s_linear_infinite]"><Sparkles className="w-3 h-3 text-yellow-100" /></div>
                                <div className="absolute -top-4 left-1/2 animate-[pulse_1s_infinite]"><Star className="w-1.5 h-1.5 text-yellow-200" /></div>
                            </>
                        )}
                    </span>
                 </div>
                 {isHighScore && (
                     <div className="flex gap-0.5 opacity-80">
                         {[...Array(5)].map((_, i) => (
                             <Star key={i} className="w-3 h-3 text-amber-400 animate-[bounce_1.5s_infinite]" style={{ animationDelay: `${i * 0.1}s` }} fill="currentColor" />
                         ))}
                     </div>
                 )}
               </h3>
               
               {analyzing ? (
                 <div className="flex flex-col items-center py-20 animate-pulse">
                   <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                   <p className="text-slate-500 font-medium">AI 正在分析裝備與數據...</p>
                   <p className="text-xs text-indigo-400 mt-2 font-bold tracking-wide flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> 
                      正在使用 {getModelDisplayName(geminiModel)}
                   </p>
                   {progressMessage && (
                       <p className="text-xs text-amber-400/80 mt-1 animate-pulse">
                         {progressMessage}
                       </p>
                   )}
                   <p className="text-indigo-300/70 text-sm mt-3 font-mono bg-indigo-950/20 px-4 py-1.5 rounded-full border border-indigo-500/20">
                     已耗時: <span className="text-indigo-400 font-bold">{elapsedTime}</span> 秒 <span className="text-slate-600 mx-1">|</span> 預計等待: {getEstimatedWaitTime(geminiModel)} 秒
                   </p>
                 </div>
               ) : dropRateWarningData ? (
                 <div className="p-5 bg-yellow-950/20 border border-yellow-600/50 rounded-lg text-yellow-200 mb-4 animate-in fade-in slide-in-from-bottom-2">
                     <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        檢測到您目前穿著練功/打寶裝備
                     </h4>
                     <p className="text-slate-300 mb-4 text-sm leading-relaxed">
                        系統偵測到您的掉寶率為 <span className="text-yellow-400 font-bold">{dropRateWarningData.drop}%</span> / 
                        楓幣率為 <span className="text-yellow-400 font-bold">{dropRateWarningData.meso}%</span>，已超過打王裝備的合理判斷範圍 (150%)。
                        <br/><br/>
                        <span className="text-slate-400 text-xs">
                            註：已自動扣除豪華真實符文與神器的預估被動數值，但數值仍過高。
                            這會導致戰力評估失準，建議更換為全輸出的『打王裝備 (Bossing Gear)』後再重新進行分析。
                        </span>
                     </p>
                     <div className="flex gap-3">
                         <button 
                            onClick={() => setDropRateWarningData(null)}
                            className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700/80 text-slate-300 rounded text-sm transition-colors"
                         >
                             取消 (更換裝備)
                         </button>
                         <button 
                            onClick={() => handleAiAnalyze(true)}
                            className="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-600/50 text-yellow-200 rounded text-sm transition-colors flex items-center gap-2"
                         >
                             仍然繼續分析
                             <ArrowRight className="w-4 h-4" />
                         </button>
                     </div>
                 </div>
               ) : (
                 <>
                   {error && (error.includes('AI') || error.includes('Quota')) ? (
  <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-lg text-red-300 text-sm mb-4">
    {/* 加入 Markdown 渲染與 CSS 樣式修正 */}
    <div 
      className="leading-relaxed [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>a]:underline [&>a]:font-bold"
      dangerouslySetInnerHTML={{ 
        __html: new MarkdownIt({ html: true, breaks: true, linkify: true }).render(error) 
      }} 
    />
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
                     
                     <div className="flex items-center gap-2">
                       <button 
                        onClick={handleAiAnalyze}
                        disabled={analyzing}
                        className="text-[10px] flex items-center gap-1 transition-colors px-2 py-1 rounded text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                        <RefreshCw className={`w-3 h-3 ${analyzing ? 'animate-spin' : ''}`} />
                        重新分析
                       </button>

                       <button 
                        onClick={() => setShowKeySettings(true)}
                        className="text-[10px] flex items-center gap-1 transition-colors px-2 py-1 rounded text-indigo-400 hover:text-indigo-300 bg-indigo-950/30 hover:bg-indigo-900/50"
                       >
                        <Settings className="w-3 h-3" />
                        設定模型 / API Key
                       </button>
                     </div>
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

          
        </>
    );
};

export default AiAnalysisPanel;
