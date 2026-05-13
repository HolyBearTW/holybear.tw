import { useState, useEffect, useRef, useMemo } from 'react';
import { analyzeCharacter } from '../services/geminiService';
import { DashboardData } from '../types';

const DEFAULT_GEMINI_KEY = ''; 

export const useAiAnalysis = (
  data: DashboardData | null,
  setError: (error: string | null) => void
) => {
  const [geminiKey, setGeminiKey] = useState<string | null>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_key') || null : null;
  });

  const [geminiModel, setGeminiModel] = useState<string>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_model') || 'gemini-3.1-flash-lite' : 'gemini-3.1-flash-lite';
  });

  const [showKeySettings, setShowKeySettings] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); 
  const [progressMessage, setProgressMessage] = useState<string>(''); 
  const [dropRateWarningData, setDropRateWarningData] = useState<{ drop: number, meso: number } | null>(null);
  
  const aiResultRef = useRef<HTMLDivElement>(null);

  const isHighScore = useMemo(() => {
    if (!aiAnalysis) return false;
    const ratingMatch = aiAnalysis.match(/戰力評級[^0-9]*(\d+(\.\d+)?)/);
    if (ratingMatch) {
      return parseFloat(ratingMatch[1]) > 10;
    }
    const allScores = [...aiAnalysis.matchAll(/(\d+(\.\d+)?)分/g)].map(m => parseFloat(m[1]));
    const maxScore = Math.max(0, ...allScores.filter(s => s < 20)); 
    return maxScore > 10;
  }, [aiAnalysis]);

  useEffect(() => {
    let interval: any;
    if (analyzing) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [analyzing]);

  useEffect(() => {
    if ((aiAnalysis || analyzing) && aiResultRef.current) {
      setTimeout(() => {
        aiResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [aiAnalysis, analyzing]);

  const handleAiAnalyze = async (overrideIgnoreWarnings?: boolean | any) => {
    if (!data) return;
    const ignoreWarnings = typeof overrideIgnoreWarnings === 'boolean' ? overrideIgnoreWarnings : false;
    
    const keyToUse = geminiKey || DEFAULT_GEMINI_KEY;
    
    setDropRateWarningData(null);    
    setProgressMessage('');
    setAnalyzing(true);
    setAiAnalysis(null);
    setError(null);

    try {
      const result = await analyzeCharacter(data, keyToUse, geminiModel, ignoreWarnings, (msg) => {
          setProgressMessage(msg);
      });
      
      console.log("[App.tsx] Analyze Result Received (Length):", result?.length);

      if (result && result.startsWith('WARNING_DROP_RATE_TOO_HIGH')) {
        const [_, drop, meso] = result.split('|');
        setDropRateWarningData({ 
            drop: parseFloat(drop) || 0, 
            meso: parseFloat(meso) || 0
        });
        setAnalyzing(false);
        return;
      }

      const isQuotaError = result && (
        result.includes('Rate Limit Exceeded') || 
        result.includes('Resource has been exhausted') ||
        result.includes('Quota exceeded')
      );

      const isShortErrorWith429 = result && result.length < 500 && result.includes('429');

      if (isQuotaError || isShortErrorWith429) {
        setError('⚠️ **AI 額度已達上限 (Rate Limit Exceeded)**\n\nAI 額度暫時耗盡。請點擊下方的「**設定模型 / API Key**」按鈕，填入或更換另一組您自己的 Google Gemini API Key 即可繼續免費使用。\n\n👉 [取得免費 API Key (Google AI Studio)](https://aistudio.google.com/app/apikey)');
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
        setError('⚠️ **AI 額度已達上限 (Rate Limit Exceeded)**\n\nAI 額度暫時耗盡。請點擊下方的「**設定模型 / API Key**」按鈕，填入或更換另一組您自己的 Google Gemini API Key 即可繼續免費使用。\n\n👉 [取得免費 API Key (Google AI Studio)](https://aistudio.google.com/app/apikey)');
      } else {
        setError(`⚠️ **AI 分析錯誤**\n\n${errorMessage || '發生未預期的連線錯誤，請稍後再試。'}`);
      }
      setAiAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  };

  return {
    geminiKey, setGeminiKey,
    geminiModel, setGeminiModel,
    showKeySettings, setShowKeySettings,
    aiAnalysis, setAiAnalysis,
    analyzing, setAnalyzing,
    elapsedTime, setElapsedTime,
    progressMessage, setProgressMessage,
    dropRateWarningData, setDropRateWarningData,
    aiResultRef, isHighScore, handleAiAnalyze
  };
};
