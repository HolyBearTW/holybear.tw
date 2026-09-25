import React from 'react';
import { Database, Info, Loader2 } from 'lucide-react';
import {
  createGrowthProfile,
  fetchGrowthSiteKey,
  fetchGrowthHistoryStatus,
  GrowthHistoryStatus,
} from '../services/growthService';

type TurnstileWidget = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    appearance?: 'interaction-only';
    callback: (token: string) => void;
    'expired-callback'?: () => void;
    'error-callback'?: () => void;
  }) => string;
  reset?: (widgetId?: string) => void;
  remove?: (widgetId?: string) => void;
};

type TurnstileWindow = Window & { turnstile?: TurnstileWidget };

const loadTurnstileScript = () => new Promise<void>((resolve, reject) => {
  const existing = document.querySelector<HTMLScriptElement>('script[data-hb-turnstile]');
  if (existing) {
    if ((window as TurnstileWindow).turnstile) resolve();
    else {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('turnstile_script_failed')), { once: true });
    }
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.defer = true;
  script.dataset.hbTurnstile = 'true';
  script.onload = () => resolve();
  script.onerror = () => reject(new Error('turnstile_script_failed'));
  document.head.appendChild(script);
});

interface GrowthTrackerProps {
  ocid: string;
  characterName: string;
  onTrackingComplete?: () => void;
  createButtonRef?: React.Ref<HTMLButtonElement>;
  onTrackingStatusChange?: (status: 'loading' | 'tracked' | 'untracked' | 'unavailable') => void;
}

const isCreating = (status: GrowthHistoryStatus | null) => {
  return status?.job?.status === 'pending' || status?.job?.status === 'running';
};

const parseStatusDate = (value?: string | null) => {
  if (!value) return null;
  const timestamp = Date.parse(`${value.split('T')[0]}T00:00:00Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const calculateCreationProgress = (status: GrowthHistoryStatus | null) => {
  if (typeof status?.progress === 'number' && Number.isFinite(status.progress)) {
    return Math.max(0, Math.min(100, status.progress));
  }
  const start = parseStatusDate(status?.historyStartDate);
  const end = parseStatusDate(status?.availableEndDate);
  const processed = parseStatusDate(status?.job?.lastProcessedDate);
  if (start === null || end === null || processed === null || end <= start) return null;
  return Math.max(0, Math.min(100, ((processed - start) / (end - start)) * 100));
};

const formatGrowthTrackerError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : '';
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return '成長檔案服務暫時無法連線，請稍後再試';
  }
  return message || fallback;
};

const GrowthTracker: React.FC<GrowthTrackerProps> = ({
  ocid,
  characterName,
  onTrackingComplete,
  createButtonRef,
  onTrackingStatusChange,
}) => {
  const [status, setStatus] = React.useState<GrowthHistoryStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showNote, setShowNote] = React.useState(false);
  const [siteKey, setSiteKey] = React.useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = React.useState('');
  const [captchaState, setCaptchaState] = React.useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const [captchaActive, setCaptchaActive] = React.useState(false);
  const captchaRef = React.useRef<HTMLDivElement>(null);
  const widgetIdRef = React.useRef<string | null>(null);
  const pendingGenerateRef = React.useRef(false);
  const startingGenerateRef = React.useRef(false);
  const completionNotifiedRef = React.useRef(false);

  const notifyTrackingComplete = React.useCallback(() => {
    if (completionNotifiedRef.current) return;
    completionNotifiedRef.current = true;
    window.dispatchEvent(new CustomEvent('maple-growth-profile-updated', { detail: { ocid } }));
    onTrackingComplete?.();
  }, [ocid, onTrackingComplete]);

  const loadStatus = React.useCallback(async () => {
    const result = await fetchGrowthHistoryStatus(ocid);
    setStatus(result);
    return result;
  }, [ocid]);

  React.useEffect(() => {
    let active = true;
    completionNotifiedRef.current = false;
    setStatus(null);
    setLoading(true);
    setSubmitted(false);
    setError(null);
    setShowNote(false);
    setSiteKey(null);
    setTurnstileToken('');
    setCaptchaState('idle');
    setCaptchaActive(false);
    pendingGenerateRef.current = false;
    startingGenerateRef.current = false;

    fetchGrowthHistoryStatus(ocid)
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch((err: unknown) => {
        if (active) setError(formatGrowthTrackerError(err, '無法確認成長檔案狀態'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [ocid]);

  const resetCaptcha = React.useCallback(() => {
    setTurnstileToken('');
    const turnstile = (window as TurnstileWindow).turnstile;
    if (widgetIdRef.current && turnstile?.reset) turnstile.reset(widgetIdRef.current);
  }, []);

  React.useEffect(() => {
    if (!captchaActive || siteKey || captchaState !== 'loading') return undefined;
    let cancelled = false;
    fetchGrowthSiteKey()
      .then(async (configuredSiteKey) => {
        if (cancelled) return;
        if (!configuredSiteKey) {
          pendingGenerateRef.current = false;
          setCaptchaState('unavailable');
          setSubmitting(false);
          setError('目前無法準備安全驗證，請稍後再試');
          return;
        }
        setSiteKey(configuredSiteKey);
        await loadTurnstileScript();
        if (!cancelled) setCaptchaState('ready');
      })
      .catch(() => {
        if (!cancelled) {
          pendingGenerateRef.current = false;
          setCaptchaState('unavailable');
          setSiteKey(null);
          setSubmitting(false);
          setError('目前無法準備安全驗證，請稍後再試');
        }
      });
    return () => { cancelled = true; };
  }, [captchaActive, captchaState, siteKey]);

  const submitWithToken = React.useCallback(async (token: string) => {
    if (!pendingGenerateRef.current || !token) return;
    pendingGenerateRef.current = false;
    setTurnstileToken(token);
    setCaptchaActive(false);
    setCaptchaState('idle');
    setSiteKey(null);
    try {
      await createGrowthProfile(ocid, token);
      setSubmitted(true);
      window.dispatchEvent(new CustomEvent('maple-growth-profile-updated', { detail: { ocid } }));
      const result = await loadStatus();
      if (result.tracked && !isCreating(result)) {
        notifyTrackingComplete();
      }
    } catch (err) {
      setError(formatGrowthTrackerError(err, '生成成長檔案失敗'));
    } finally {
      resetCaptcha();
      setSubmitting(false);
    }
  }, [loadStatus, notifyTrackingComplete, ocid, resetCaptcha]);

  React.useEffect(() => {
    if (!captchaActive || captchaState !== 'ready' || !siteKey || !captchaRef.current || widgetIdRef.current) {
      return undefined;
    }
    const turnstile = (window as TurnstileWindow).turnstile;
    if (!turnstile) {
      pendingGenerateRef.current = false;
      setCaptchaState('unavailable');
      setSiteKey(null);
      setSubmitting(false);
      setError('目前無法準備安全驗證，請稍後再試');
      return undefined;
    }
    widgetIdRef.current = turnstile.render(captchaRef.current, {
      sitekey: siteKey,
      appearance: 'interaction-only',
      callback: (token) => {
        setTurnstileToken(token);
        setError(null);
        void submitWithToken(token);
      },
      'expired-callback': () => {
        pendingGenerateRef.current = false;
        setTurnstileToken('');
        setSubmitting(false);
        setError('安全驗證已過期，請重新驗證');
      },
      'error-callback': () => {
        pendingGenerateRef.current = false;
        setTurnstileToken('');
        setSubmitting(false);
        setError('安全驗證暫時無法完成，請重新嘗試');
      },
    });
    return () => {
      if (widgetIdRef.current && turnstile.remove) turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [captchaActive, captchaState, siteKey, submitWithToken]);

  React.useEffect(() => {
    if (loading) {
      onTrackingStatusChange?.('loading');
    } else if (status) {
      onTrackingStatusChange?.(status.tracked ? 'tracked' : 'untracked');
    } else {
      onTrackingStatusChange?.('unavailable');
    }
  }, [loading, onTrackingStatusChange, status]);

  React.useEffect(() => {
    if (!isCreating(status)) return;

    const timer = window.setInterval(() => {
      loadStatus()
        .then((result) => {
          setError(null);
          if (result.tracked && !isCreating(result)) {
            notifyTrackingComplete();
          }
        })
        .catch((err: unknown) => {
          setError(formatGrowthTrackerError(err, '無法更新成長檔案狀態'));
        });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [loadStatus, notifyTrackingComplete, status]);

  const handleCreate = async () => {
    if (submitting || startingGenerateRef.current) return;
    startingGenerateRef.current = true;
    setError(null);
    try {
      // Recheck immediately after the user's click so a stale untracked view
      // cannot start verification for a profile created in another tab.
      const latest = await loadStatus();
      if (latest.tracked) return;

      pendingGenerateRef.current = true;
      setSubmitting(true);
      setCaptchaActive(true);
      if (widgetIdRef.current) {
        setCaptchaState('ready');
        const turnstile = (window as TurnstileWindow).turnstile;
        if (turnstile?.reset) turnstile.reset(widgetIdRef.current);
      } else {
        setCaptchaState('loading');
      }
    } catch (err) {
      pendingGenerateRef.current = false;
      setError(formatGrowthTrackerError(err, '無法確認成長檔案狀態'));
      setSubmitting(false);
    } finally {
      startingGenerateRef.current = false;
    }
  };

  if (loading || (status?.tracked && !submitted && !isCreating(status))) return null;

  const creating = isCreating(status) || (submitting && !captchaActive);
  const isInitialBackfill = !status?.lastSyncedDate;
  const creationProgress = creating ? calculateCreationProgress(status) : null;
  const dailyProgress = status?.dailyLimit
    ? `今日已送出 ${status.dailySubmitted ?? 0} / ${status.dailyLimit}`
    : null;

  const note = (
    <div className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2">
      <button
        type="button"
        aria-label="顯示成長檔案說明"
        aria-expanded={showNote}
        onMouseEnter={() => setShowNote(true)}
        onMouseLeave={() => setShowNote(false)}
        onFocus={() => setShowNote(true)}
        onBlur={() => setShowNote(false)}
        onClick={() => setShowNote(true)}
        className={`maple-growth-note-button flex h-7 w-7 items-center justify-center rounded-full transition-colors focus-visible:outline-none ${creating ? 'maple-growth-note-button-progress' : ''} ${showNote
          ? creating
            ? 'bg-emerald-700/75 text-white'
            : 'bg-amber-700/75 text-white'
          : creating
            ? 'text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700 focus-visible:bg-emerald-100 focus-visible:text-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-800/40 dark:hover:text-emerald-300'
            : 'text-amber-100/85 hover:bg-amber-700/70 hover:text-white focus-visible:bg-amber-700/70 focus-visible:text-white'
        }`}
      >
        <Info className="h-4 w-4" />
      </button>
      {showNote && (
        <div
          role="note"
          className="maple-growth-create-tooltip absolute bottom-full right-0 z-50 mb-2 w-[min(18rem,calc(100vw-3rem))] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-left text-xs leading-5 text-slate-700 shadow-xl shadow-slate-900/15 backdrop-blur-sm dark:border-slate-700 dark:bg-black/95 dark:text-slate-300 dark:shadow-black/50"
        >
          <p>{`由本站使用 NEXON 官方歷史資料為 ${characterName} 建立永久追蹤；建立後會由伺服器每日自動更新。`}</p>
          {creating && isInitialBackfill && (
            <p className="mt-1 text-slate-500">生成會在背景自動進行，可以關閉此頁面，稍後再回來查看。</p>
          )}
          {dailyProgress && <p className="maple-growth-create-tooltip-meta mt-1 text-slate-500">{dailyProgress}</p>}
        </div>
      )}
    </div>
  );

  if (creating || submitted || status?.tracked) {
    return (
      <div className="relative mb-2.5 w-full">
        <div className="maple-growth-progress-card flex min-h-10 w-full items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-10 py-2 text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-300">
          {creating ? (
            <div className="flex w-full max-w-44 flex-col items-center gap-1.5">
              <div className="maple-growth-progress-header flex w-full items-center justify-between gap-2 text-[11px]">
                <span>{isInitialBackfill ? '正在生成成長檔案' : '資料更新中'}</span>
                {creationProgress !== null && <span className="maple-growth-progress-percent">{Math.round(creationProgress)}%</span>}
              </div>
              <div className="maple-growth-progress-track h-1.5 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950">
                {creationProgress !== null ? (
                  <div
                    className="maple-growth-progress-fill h-full rounded-full bg-emerald-400 transition-[width] duration-500"
                    style={{ width: `${creationProgress}%` }}
                  />
                ) : (
                  <div className="maple-growth-progress-fill h-full w-1/2 animate-pulse rounded-full bg-emerald-400" />
                )}
              </div>
              {status?.job?.lastProcessedDate && (
                <span className="maple-growth-progress-date text-[10px] text-emerald-600/80 dark:text-emerald-400/70">
                  {isInitialBackfill ? '已處理至' : '目前已同步至'} {status.job.lastProcessedDate.replace(/-/g, '/')}
                </span>
              )}
              {status?.job?.phase && status?.currentProcessingDate && (
                <span className="maple-growth-progress-meta text-[10px] text-emerald-600/80 dark:text-emerald-400/70">
                  {status.job.phase === 'basic' ? '基本資料' : '武陵資料'} · 正在處理 {status.currentProcessingDate.replace(/-/g, '/')}
                </span>
              )}
              {isInitialBackfill && (
                <span className="maple-growth-progress-hint text-center text-[10px] leading-4 text-emerald-700/80 dark:text-emerald-300/70">
                  可以關閉此頁面；資料會在背景每分鐘分批處理，通常幾分鐘到 30 分鐘內完成，完成後再回來查看。
                </span>
              )}
            </div>
          ) : '成長檔案已建立。'}
        </div>
        {note}
      </div>
    );
  }

  return (
    <div className="mb-2.5 w-full">
      <div className="relative w-full">
        <button
          ref={createButtonRef}
          type="button"
          disabled={creating || submitting || !ocid}
          onClick={handleCreate}
          className="maple-growth-create-button flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-10 py-2 text-sm font-bold text-white shadow-lg shadow-amber-900/25 transition-all hover:translate-y-[-1px] hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
          {submitting ? '正在驗證並生成...' : '生成成長檔案'}
        </button>
        {captchaActive && <div ref={captchaRef} className="mt-1 flex min-h-0 justify-center" aria-live="polite" />}
        {captchaActive && captchaState === 'loading' && <p className="mt-1 text-center text-[10px] text-slate-400">正在準備安全驗證…</p>}
        {captchaActive && captchaState === 'unavailable' && <p className="mt-1 text-center text-[10px] text-rose-400">目前無法準備安全驗證，請稍後再試。</p>}
        {note}
      </div>
      {error && <p role="alert" className="mt-1.5 text-[10px] text-rose-400">{error}</p>}
    </div>
  );
};

export default GrowthTracker;
