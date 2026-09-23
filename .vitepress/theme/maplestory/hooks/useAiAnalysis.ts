import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { DashboardData } from '../types';
import { AI_MODEL_OPTIONS, DEFAULT_AI_MODEL, discoverAiModels, getRecommendedAiModel, isCompatibleAiModel, isOpenAiModel } from '../data/aiModels';
import type { AiModelOption } from '../data/aiModels';
import { createBossPlayerContext, readBossDamageAiSnapshot } from '../calculator/bossDamageCalculator';

const DEFAULT_GEMINI_KEY = ''; 

export const useAiAnalysis = (
  data: DashboardData | null,
  setError: (error: string | null) => void,
  error: string | null = null,
) => {
  const [geminiKey, setGeminiKey] = useState<string | null>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_key') || null : null;
  });

  const [openAiKey, setOpenAiKey] = useState<string | null>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('openai_api_key') || null : null;
  });

  const [compatibleAiKey, setCompatibleAiKey] = useState<string | null>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('compatible_ai_api_key') || null : null;
  });

  const [compatibleAiBaseUrl, setCompatibleAiBaseUrl] = useState<string>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('compatible_ai_base_url') || '' : '';
  });

  const [compatibleAiModel, setCompatibleAiModel] = useState<string>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('compatible_ai_model') || '' : '';
  });

  const [geminiModel, setGeminiModel] = useState<string>(() => {
    if (typeof localStorage === 'undefined') return DEFAULT_AI_MODEL;
    const savedModel = localStorage.getItem('gemini_model');
    if (savedModel) return savedModel;
    return getRecommendedAiModel(
      Boolean(localStorage.getItem('gemini_api_key')),
      Boolean(localStorage.getItem('openai_api_key')),
    );
  });

  const [showKeySettings, setShowKeySettings] = useState(false);
  const [modelRefresh, setModelRefresh] = useState(0);
  const lastDiscoveryKeys = useRef({ google: geminiKey, openai: openAiKey });
  const [discoveredModels, setDiscoveredModels] = useState<Partial<Record<'google' | 'openai', AiModelOption[]>>>({});
  const [modelSyncStatus, setModelSyncStatus] = useState<Partial<Record<'google' | 'openai', 'loading' | 'ok' | 'failed'>>>({});
  const modelOptions = useMemo(() => AI_MODEL_OPTIONS.filter(option => option.provider === 'compatible').concat(
    discoveredModels.google ?? AI_MODEL_OPTIONS.filter(option => option.provider === 'google'),
    discoveredModels.openai ?? AI_MODEL_OPTIONS.filter(option => option.provider === 'openai'),
  ), [discoveredModels]);

  useEffect(() => {
    if (showKeySettings) setModelRefresh(current => current + 1);
  }, [showKeySettings]);

  useEffect(() => {
    const controllers: AbortController[] = [];
    let cancelled = false;
    const timer = window.setTimeout(() => {
      for (const [provider, key] of [['google', geminiKey], ['openai', openAiKey]] as const) {
        if (lastDiscoveryKeys.current[provider] !== key) {
          lastDiscoveryKeys.current[provider] = key;
          setDiscoveredModels(current => ({ ...current, [provider]: undefined }));
        }
        if (!key) {
          setDiscoveredModels(current => ({ ...current, [provider]: undefined }));
          setModelSyncStatus(current => ({ ...current, [provider]: undefined }));
          continue;
        }
        const controller = new AbortController();
        controllers.push(controller);
        setModelSyncStatus(current => ({ ...current, [provider]: 'loading' }));
        const timeout = window.setTimeout(() => controller.abort(), 10000);
        void discoverAiModels(provider, key, controller.signal).then(options => {
          if (controller.signal.aborted || options.length === 0) throw new Error('沒有適用的文字模型');
          setDiscoveredModels(current => ({ ...current, [provider]: options }));
          setModelSyncStatus(current => ({ ...current, [provider]: 'ok' }));
          setGeminiModel(selected => {
            const selectedProvider = isOpenAiModel(selected) ? 'openai' : 'google';
            if (selectedProvider !== provider || options.some(option => option.id === selected)) return selected;
            const replacement = options.find(option => option.id === (provider === 'google' ? DEFAULT_AI_MODEL : getRecommendedAiModel(false, true)))?.id || options[0].id;
            localStorage.setItem('gemini_model', replacement);
            return replacement;
          });
        }).catch(() => {
          if (!cancelled) {
            setModelSyncStatus(current => ({ ...current, [provider]: 'failed' }));
          }
        }).finally(() => window.clearTimeout(timeout));
      }
    }, 600);
    return () => { cancelled = true; window.clearTimeout(timer); controllers.forEach(controller => controller.abort()); };
  }, [geminiKey, openAiKey, modelRefresh]);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); 
  const [progressMessage, setProgressMessage] = useState<string>(''); 
  const [dropRateWarningData, setDropRateWarningData] = useState<{ drop: number, meso: number } | null>(null);
  
  const aiResultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('gemini_model')) return;
    setGeminiModel(getRecommendedAiModel(Boolean(geminiKey), Boolean(openAiKey)));
  }, [geminiKey, openAiKey]);

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
    const hasAiError = Boolean(error && (error.includes('AI') || error.includes('Quota')));
    if ((aiAnalysis || analyzing || hasAiError || dropRateWarningData) && aiResultRef.current) {
      let attempts = 0;
      const scrollToResult = () => {
        const result = aiResultRef.current;
        if (!result) return;
        result.scrollIntoView({ behavior: attempts === 0 ? 'smooth' : 'auto', block: 'start' });
      };

      // The panel is lazy-loaded and can mount after the state update. Retry
      // briefly so the click always lands on the visible AI status/result area.
      scrollToResult();
      const retryTimer = window.setInterval(() => {
        attempts += 1;
        scrollToResult();
        if (attempts >= 12 || aiResultRef.current) window.clearInterval(retryTimer);
      }, 80);
      return () => window.clearInterval(retryTimer);
    }
  }, [aiAnalysis, analyzing, dropRateWarningData, error]);

  const handleAiAnalyze = useCallback(async (overrideIgnoreWarnings?: boolean | any) => {
    if (!data) return;
    const ignoreWarnings = typeof overrideIgnoreWarnings === 'boolean' ? overrideIgnoreWarnings : false;
    
    const keyToUse = geminiKey || DEFAULT_GEMINI_KEY;
    
    setDropRateWarningData(null);    
    setProgressMessage('');
    setAnalyzing(true);
    setAiAnalysis(null);
    setError(null);

    try {
      const bossDamageSnapshot = readBossDamageAiSnapshot(data.basic.character_name, createBossPlayerContext(data));
      if (!bossDamageSnapshot) {
        setError('⚠️ **AI 健檢缺少 BOSS 實測資料**\n\n請先開啟角色卡片下方的 **「BOSS 傷害計算機」**，選擇實際擊破的 BOSS 並輸入一場總時間與結束時剩餘時間。AI 健檢將直接使用該計算結果，不再用面板戰力猜測可攻略難度。');
        return;
      }

      // AI provider SDKs are large and are only needed after the user starts an analysis.
      const { analyzeCharacter } = await import('../services/geminiService');
      const result = await analyzeCharacter(data, bossDamageSnapshot, keyToUse, openAiKey || '', {
        apiKey: compatibleAiKey || '',
        baseUrl: compatibleAiBaseUrl,
        model: compatibleAiModel,
      }, geminiModel, ignoreWarnings, (msg) => {
          setProgressMessage(msg);
      }, modelOptions);
      
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
        setError(isCompatibleAiModel(geminiModel)
          ? '⚠️ **AI 自訂服務額度已達上限 (Rate Limit Exceeded)**\n\n請檢查第三方服務的額度、速率限制或 API Key。'
          : isOpenAiModel(geminiModel)
          ? '⚠️ **OpenAI 額度已達上限 (Rate Limit Exceeded)**\n\n請檢查 OpenAI API 額度或更換 API Key。\n\n👉 [前往 OpenAI Platform 管理 API Key](https://platform.openai.com/api-keys)'
          : '⚠️ **AI 額度已達上限 (Rate Limit Exceeded)**\n\nAI 額度暫時耗盡。請點擊下方的「**設定模型 / API Key**」按鈕，填入或更換另一組您自己的 Google Gemini API Key 即可繼續免費使用。\n\n👉 [取得免費 API Key (Google AI Studio)](https://aistudio.google.com/app/apikey)');
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
        setError(isCompatibleAiModel(geminiModel)
          ? '⚠️ **AI 自訂服務額度已達上限 (Rate Limit Exceeded)**\n\n請檢查第三方服務的額度、速率限制或 API Key。'
          : isOpenAiModel(geminiModel)
          ? '⚠️ **OpenAI 額度已達上限 (Rate Limit Exceeded)**\n\n請檢查 OpenAI API 額度或更換 API Key。\n\n👉 [前往 OpenAI Platform 管理 API Key](https://platform.openai.com/api-keys)'
          : '⚠️ **AI 額度已達上限 (Rate Limit Exceeded)**\n\nAI 額度暫時耗盡。請點擊下方的「**設定模型 / API Key**」按鈕，填入或更換另一組您自己的 Google Gemini API Key 即可繼續免費使用。\n\n👉 [取得免費 API Key (Google AI Studio)](https://aistudio.google.com/app/apikey)');
      } else {
        setError(`⚠️ **AI 分析錯誤**\n\n${errorMessage || '發生未預期的連線錯誤，請稍後再試。'}`);
      }
      setAiAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  }, [data, geminiKey, openAiKey, compatibleAiKey, compatibleAiBaseUrl, compatibleAiModel, geminiModel, modelOptions, setError]);

  return {
    geminiKey, setGeminiKey,
    openAiKey, setOpenAiKey,
    compatibleAiKey, setCompatibleAiKey,
    compatibleAiBaseUrl, setCompatibleAiBaseUrl,
    compatibleAiModel, setCompatibleAiModel,
    geminiModel, setGeminiModel,
    modelOptions, modelSyncStatus,
    showKeySettings, setShowKeySettings,
    aiAnalysis, setAiAnalysis,
    analyzing, setAnalyzing,
    elapsedTime, setElapsedTime,
    progressMessage, setProgressMessage,
    dropRateWarningData, setDropRateWarningData,
    aiResultRef, isHighScore, handleAiAnalyze
  };
};
