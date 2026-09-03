import React from 'react';
import { Crown, Loader2 } from 'lucide-react';
import { SERVER_ICONS } from '../constants';
import {
  fetchMaplerHouseCharacterRank,
  fetchMaplerHousePowerRanking,
  MaplerHouseCharacterRank,
  MaplerHousePowerRankingEntry,
} from '../services/maplerhouseService';
import CharacterAvatar from './CharacterAvatar';

interface RecentPowerRankingProps {
  onSelectCharacter: (name: string) => void;
  queryName?: string;
}

const RecentPowerRanking: React.FC<RecentPowerRankingProps> = ({ onSelectCharacter, queryName = '' }) => {
  const [items, setItems] = React.useState<MaplerHousePowerRankingEntry[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageInput, setPageInput] = React.useState('1');
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [queryRank, setQueryRank] = React.useState<MaplerHouseCharacterRank | null>(null);
  const [queryRankStatus, setQueryRankStatus] = React.useState<'idle' | 'loading' | 'found' | 'not-found' | 'error'>('idle');

  React.useEffect(() => {
    const name = queryName.trim();
    if (!name) {
      setQueryRank(null);
      setQueryRankStatus('idle');
      return;
    }

    let active = true;
    setQueryRank(null);
    setQueryRankStatus('loading');
    const timer = window.setTimeout(() => {
      fetchMaplerHouseCharacterRank(name)
        .then((result) => {
          if (!active) return;
          setQueryRank(result);
          setQueryRankStatus(result ? 'found' : 'not-found');
        })
        .catch(() => {
          if (!active) return;
          setQueryRank(null);
          setQueryRankStatus('error');
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [queryName]);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchMaplerHousePowerRanking(page)
      .then((rankingPage) => {
        if (!active) return;
        setItems(rankingPage.items);
        setTotal(rankingPage.total);
        setTotalPages(rankingPage.totalPages);
        setPageInput(String(rankingPage.page));
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : '讀取排行榜失敗';
        setError(message);
        setItems([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page]);

  const goToPage = (event: React.FormEvent) => {
    event.preventDefault();
    const requestedPage = Number.parseInt(pageInput, 10);
    const nextPage = Number.isFinite(requestedPage)
      ? Math.min(Math.max(requestedPage, 1), totalPages)
      : page;
    setPageInput(String(nextPage));
    setPage(nextPage);
  };

  if (loading) {
    return (
      <div
        className="maple-ranking-panel mx-auto mt-6 flex min-h-44 w-full max-w-2xl flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#161b22] p-4 text-sm text-slate-400 shadow-lg sm:p-6"
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-12 w-12 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/15" aria-hidden="true" />
          <Loader2 className="relative h-7 w-7 animate-spin text-cyan-400" aria-hidden="true" />
        </span>
        <span className="mt-3 font-semibold text-slate-300">正在載入近期戰力排名...</span>
        <span className="mt-1 text-xs text-slate-500">正在整理最新的角色名次</span>
      </div>
    );
  }

  if (error || items.length === 0) {
    return null;
  }

  return (
    <div className="maple-ranking-panel mx-auto mt-6 w-full max-w-2xl rounded-xl border border-slate-800 bg-[#161b22] p-4 shadow-lg sm:p-6">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-200">
        <Crown className="w-4 h-4 text-yellow-400" />
        近期戰力排名
      </h3>
      {queryRankStatus !== 'idle' && (
        <div className="maple-ranking-query-card mb-4 rounded-lg border border-slate-500/60 bg-white/35 px-3 py-2 text-sm text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/35 dark:text-slate-300">
          {queryRankStatus === 'loading' && '正在查詢目前輸入角色的排名...'}
          {queryRankStatus === 'found' && queryRank && (
            <button
              type="button"
              onClick={() => onSelectCharacter(queryRank.entry.characterName)}
              className="flex w-full items-center gap-3 text-left transition hover:brightness-110"
            >
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-200 ring-1 ring-cyan-600/50 dark:bg-slate-800 dark:ring-cyan-300/50">
                <CharacterAvatar
                  characterName={queryRank.entry.characterName}
                  characterClass={queryRank.entry.jobName}
                  characterImage={queryRank.entry.characterImage}
                  alt={queryRank.entry.characterName}
                  className="absolute left-1/2 top-1/2 z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2 object-cover"
                  loading="eager"
                  decoding="async"
                />
              </span>
                <span className="min-w-0 flex-1">
                <span className="maple-ranking-query-name flex items-center gap-1 whitespace-nowrap font-semibold text-slate-800 dark:text-slate-100">
                  {SERVER_ICONS[queryRank.entry.worldName] ? <img src={SERVER_ICONS[queryRank.entry.worldName]} alt="" width={14} height={14} className="shrink-0" aria-hidden="true" /> : null}
                  <span className="truncate">{queryRank.entry.characterName}</span>
                </span>
                <span className="maple-ranking-query-meta mt-0.5 block text-xs text-slate-600 dark:text-slate-400">
                  第 {queryRank.rank.toLocaleString()} / {queryRank.total.toLocaleString()} 名・戰力 {queryRank.entry.combatPower.toLocaleString()}
                </span>
              </span>
            </button>
          )}
          {queryRankStatus === 'not-found' && '目前輸入角色未列入近期戰力排名'}
          {queryRankStatus === 'error' && '目前輸入角色排名暫時無法取得'}
        </div>
      )}
      <div className="flex flex-col items-center gap-5">
        {page === 1 && (
        <div className="grid w-full grid-cols-3 items-end gap-3 sm:gap-6">
          {[items[1], items[0], items[2]].map((item) => {
            if (!item) return null;
            const rank = items.indexOf(item) + 1;
            const crownTier = rank === 1 ? 'is-gold' : rank === 2 ? 'is-silver' : 'is-bronze';
            const podiumClass = rank === 1
              ? 'order-2 -translate-y-2 border-yellow-300/45 bg-yellow-400/[0.1]'
              : rank === 2
                ? 'order-1 border-slate-200/35 bg-slate-200/[0.08]'
                : 'order-3 border-orange-400/35 bg-orange-400/[0.08]';
            return (
              <button
                key={item.characterName}
                type="button"
                onClick={() => onSelectCharacter(item.characterName)}
                title={`${item.characterName}｜${item.combatPower.toLocaleString()}`}
                className={`maple-ranking-podium-card maple-ranking-podium-${rank} flex min-w-0 flex-col items-center rounded-xl border px-1.5 py-2 text-center transition hover:brightness-110 sm:px-2 ${podiumClass}`}
              >
                <Crown className={`maple-ranking-crown ${crownTier} mb-1 h-4 w-4 fill-current ${rank === 1 ? 'h-5 w-5' : ''}`} aria-hidden="true" />
                <div className={`relative overflow-hidden rounded-full bg-slate-800 ${rank === 1 ? 'h-20 w-20 sm:h-24 sm:w-24' : 'h-16 w-16 sm:h-20 sm:w-20'}`}>
                  <CharacterAvatar
                    characterName={item.characterName}
                    characterClass={item.jobName}
                    characterImage={item.characterImage}
                    alt={item.characterName}
                    className={`absolute left-1/2 top-1/2 z-10 object-cover -translate-x-1/2 -translate-y-1/2 ${rank === 1 ? 'h-40 w-40 sm:h-48 sm:w-48' : 'h-32 w-32 sm:h-40 sm:w-40'}`}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />
                </div>
                <div className="mt-1 flex w-full min-w-0 items-center justify-center gap-1">
                  {SERVER_ICONS[item.worldName] ? <img alt={item.worldName} width={12} height={12} className="shrink-0" src={SERVER_ICONS[item.worldName]} decoding="async" /> : null}
                  <p className="whitespace-nowrap text-xs font-bold leading-3 text-slate-200">{item.characterName}</p>
                </div>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-300">{item.combatPower.toLocaleString()}</p>
              </button>
            );
          })}
        </div>
        )}
        <div className={page === 1
          ? 'flex w-full flex-wrap items-start justify-center gap-x-2 gap-y-3 overflow-visible sm:flex-nowrap sm:justify-between sm:gap-x-1 sm:gap-y-0'
          : 'grid w-full grid-cols-5 items-start gap-x-2 gap-y-4 sm:gap-x-4'}>
          {items.slice(page === 1 ? 3 : 0).map((item, idx) => {
            const rank = (page - 1) * 10 + (page === 1 ? idx + 4 : idx + 1);
            return (
              <React.Fragment key={item.characterName}>
                {page === 1 && idx === 4 && <span className="basis-full h-0 sm:hidden" aria-hidden="true" />}
                <button
                  type="button"
                  onClick={() => onSelectCharacter(item.characterName)}
                  title={`${rank}. ${item.characterName}｜${item.combatPower.toLocaleString()}`}
                  className={`group flex min-w-0 flex-col items-center gap-1 text-center transition hover:-translate-y-0.5 ${page === 1 ? 'w-auto min-w-10 sm:min-w-12' : 'w-full'}`}
                >
                <span className="relative block h-12 w-12 overflow-hidden rounded-full bg-slate-800 ring-1 ring-slate-500/40 transition group-hover:ring-cyan-300/70 sm:h-14 sm:w-14">
                  <CharacterAvatar
                    characterName={item.characterName}
                    characterClass={item.jobName}
                    characterImage={item.characterImage}
                    alt={item.characterName}
                    className="absolute left-1/2 top-1/2 z-10 h-28 w-28 -translate-x-1/2 -translate-y-1/2 object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-slate-950/75 text-[9px] font-bold leading-3 text-slate-100">{rank}</span>
                </span>
                <span className={`flex items-center justify-center gap-0.5 whitespace-nowrap leading-3 text-slate-300 ${page === 1 ? 'text-[9px] sm:text-[10px]' : 'text-[11px]'}`}>
                  {SERVER_ICONS[item.worldName] ? <img alt="" width={10} height={10} className="shrink-0" src={SERVER_ICONS[item.worldName]} aria-hidden="true" /> : null}
                  {item.characterName}
                </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-sm text-slate-300">
        <span>共 {total.toLocaleString()} 名・第 {page} / {totalPages} 頁</span>
        <form onSubmit={goToPage} className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded border border-slate-700 px-2 py-1 transition-colors hover:border-indigo-400 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            上一頁
          </button>
          <label htmlFor="recent-power-ranking-page" className="sr-only">輸入排行榜頁次</label>
          <input
            id="recent-power-ranking-page"
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            className="maple-ranking-page-input w-16 rounded border px-2 py-1 text-center outline-none"
          />
          <button
            type="submit"
            className="maple-ranking-go-button rounded bg-indigo-600 px-2 py-1 font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            前往
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="rounded border border-slate-700 px-2 py-1 transition-colors hover:border-indigo-400 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一頁
          </button>
        </form>
      </div>
    </div>
  );
};

export default RecentPowerRanking;
