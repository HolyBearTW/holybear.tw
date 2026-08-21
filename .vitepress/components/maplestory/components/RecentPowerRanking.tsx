import React from 'react';
import { Crown } from 'lucide-react';
import { SERVER_ICONS } from '../constants';
import {
  fetchMaplerHousePowerRanking,
  MaplerHousePowerRankingEntry,
} from '../services/maplerhouseService';

interface RecentPowerRankingProps {
  onSelectCharacter: (name: string) => void;
}

const RecentPowerRanking: React.FC<RecentPowerRankingProps> = ({ onSelectCharacter }) => {
  const [items, setItems] = React.useState<MaplerHousePowerRankingEntry[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageInput, setPageInput] = React.useState('1');
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
      <div className="maple-ranking-panel max-w-xl mx-auto mt-6 bg-[#161b22] border border-slate-800 rounded-xl shadow-lg p-4 text-sm text-slate-400">
        正在載入近期戰力排名...
      </div>
    );
  }

  if (error || items.length === 0) {
    return null;
  }

  return (
    <div className="maple-ranking-panel max-w-xl mx-auto mt-6 bg-[#161b22] border border-slate-800 rounded-xl shadow-lg p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-200">
        <Crown className="w-4 h-4 text-yellow-400" />
        近期戰力排名
      </h3>
      <div className="space-y-1">
        {items.map((item, idx) => {
          const rank = (page - 1) * 10 + idx + 1;
          const crownTier = rank === 1 ? 'is-gold' : rank === 2 ? 'is-silver' : rank === 3 ? 'is-bronze' : null;
          return (
            <button
              key={item.characterName}
              type="button"
              onClick={() => onSelectCharacter(item.characterName)}
              className="w-full text-left flex items-center gap-3 py-1.5 px-2 rounded hover:bg-slate-800/70 transition-colors"
            >
            <span
              className={`flex w-5 shrink-0 items-center justify-center text-center text-xs font-mono ${crownTier ? `maple-ranking-crown ${crownTier}` : 'text-slate-500'}`}
              title={crownTier ? `第 ${rank} 名` : undefined}
            >
              {crownTier ? <Crown className="h-4 w-4 fill-current" aria-hidden="true" /> : rank}
              {crownTier && <span className="sr-only">第 {rank} 名</span>}
            </span>
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-800 shrink-0">
              <img
                alt={item.characterName}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-cover"
                src={item.characterImage}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                {SERVER_ICONS[item.worldName] ? (
                  <img alt={item.worldName} width={14} height={14} className="shrink-0" src={SERVER_ICONS[item.worldName]} />
                ) : null}
                <p className="text-xs font-semibold truncate text-slate-200">{item.characterName}</p>
              </div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">{item.worldName}・Lv.{item.level}・{item.jobName}</div>
              <div className="text-xs text-slate-400 mt-0.5">{item.combatPower.toLocaleString()}</div>
            </div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3 text-xs text-slate-400">
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
