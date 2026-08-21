import React from 'react';
import { Database, Info, Loader2 } from 'lucide-react';
import {
  createMaplerHouseGrowthProfile,
  fetchMaplerHouseHistoryStatus,
  MaplerHouseHistoryStatus,
} from '../services/maplerhouseService';

interface MaplerHouseGrowthTrackerProps {
  ocid: string;
  characterName: string;
  onTrackingComplete?: () => void;
}

const isCreating = (status: MaplerHouseHistoryStatus | null) => {
  return status?.job?.status === 'pending' || status?.job?.status === 'running';
};

const parseStatusDate = (value?: string | null) => {
  if (!value) return null;
  const timestamp = Date.parse(`${value.split('T')[0]}T00:00:00Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const calculateCreationProgress = (status: MaplerHouseHistoryStatus | null) => {
  const start = parseStatusDate(status?.historyStartDate);
  const end = parseStatusDate(status?.availableEndDate);
  const processed = parseStatusDate(status?.job?.lastProcessedDate);
  if (start === null || end === null || processed === null || end <= start) return null;
  return Math.max(0, Math.min(100, ((processed - start) / (end - start)) * 100));
};

const MaplerHouseGrowthTracker: React.FC<MaplerHouseGrowthTrackerProps> = ({
  ocid,
  characterName,
  onTrackingComplete,
}) => {
  const [status, setStatus] = React.useState<MaplerHouseHistoryStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showNote, setShowNote] = React.useState(false);
  const completionNotifiedRef = React.useRef(false);

  const notifyTrackingComplete = React.useCallback(() => {
    if (completionNotifiedRef.current) return;
    completionNotifiedRef.current = true;
    window.dispatchEvent(new CustomEvent('maple-growth-profile-updated', { detail: { ocid } }));
    onTrackingComplete?.();
  }, [ocid, onTrackingComplete]);

  const loadStatus = React.useCallback(async () => {
    const result = await fetchMaplerHouseHistoryStatus(ocid);
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

    fetchMaplerHouseHistoryStatus(ocid)
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : '無法確認成長檔案狀態');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [ocid]);

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
          setError(err instanceof Error ? err.message : '無法更新成長檔案狀態');
        });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [loadStatus, notifyTrackingComplete, status]);

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await createMaplerHouseGrowthProfile(ocid);
      setSubmitted(true);
      window.dispatchEvent(new CustomEvent('maple-growth-profile-updated', { detail: { ocid } }));
      const result = await loadStatus();
      if (result.tracked && !isCreating(result)) {
        notifyTrackingComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成成長檔案失敗');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (status?.tracked && !submitted && !isCreating(status))) return null;

  const creating = submitting || isCreating(status);
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
        className="maple-growth-note-button flex h-7 w-7 items-center justify-center rounded-full text-emerald-100/80 transition-colors hover:bg-emerald-700/70 hover:text-white focus-visible:bg-emerald-700/70 focus-visible:text-white focus-visible:outline-none"
      >
        <Info className="h-4 w-4" />
      </button>
      {showNote && (
        <div
          role="note"
          className="absolute bottom-full right-0 z-50 mb-2 w-[min(18rem,calc(100vw-3rem))] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-left text-xs leading-5 text-slate-700 shadow-xl shadow-slate-900/15 backdrop-blur-sm dark:border-slate-700 dark:bg-black/95 dark:text-slate-300 dark:shadow-black/50"
        >
          <p>將 {characterName} 的角色識別碼送至排行榜服務建立追蹤紀錄；之後才會逐步累積成長資料並納入近期排行榜。</p>
          {dailyProgress && <p className="mt-1 text-slate-500">{dailyProgress}</p>}
        </div>
      )}
    </div>
  );

  if (creating || submitted || status?.tracked) {
    return (
      <div className="relative mb-3 w-full">
        <div className="flex min-h-10 w-full items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-10 py-2 text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-300">
          {creating ? (
            <div className="flex w-full max-w-44 flex-col items-center gap-1.5">
              <div className="flex w-full items-center justify-between gap-2 text-[11px]">
                <span>正在生成成長檔案</span>
                {creationProgress !== null && <span>{Math.round(creationProgress)}%</span>}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950">
                {creationProgress !== null ? (
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-[width] duration-500"
                    style={{ width: `${creationProgress}%` }}
                  />
                ) : (
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-400" />
                )}
              </div>
              {status?.job?.lastProcessedDate && (
                <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/70">
                  已處理至 {status.job.lastProcessedDate.replace(/-/g, '/')}
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
    <div className="mb-3 w-full">
      <div className="relative w-full">
        <button
          type="button"
          disabled={creating || !ocid}
          onClick={handleCreate}
          className="maple-growth-create-button flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-10 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-900/20 transition-all hover:translate-y-[-1px] hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
          {creating ? '正在生成成長檔案...' : '生成成長檔案'}
        </button>
        {note}
      </div>
      {error && <p role="alert" className="mt-1.5 text-[10px] text-rose-400">{error}</p>}
    </div>
  );
};

export default MaplerHouseGrowthTracker;
