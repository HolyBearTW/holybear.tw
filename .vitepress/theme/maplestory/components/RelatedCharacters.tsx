import React from 'react';
import { Search, User, Users } from 'lucide-react';
import { fromD1Alt } from '../services/relatedCharacter';
import type { RelatedCharacter } from '../services/relatedCharacter';
import type { DashboardData } from '../types';
import CharacterAvatar from './CharacterAvatar';
import {
  fetchHolyBearAlts,
  fetchHolyBearCharacterRank,
  fetchHolyBearRankingSnapshot,
} from '../services/holyBearService';

interface RelatedCharactersProps {
  data: DashboardData;
  onSelectCharacter: (name: string) => void;
}

const getResponsivePageSize = () => {
  if (typeof window === 'undefined') return 5;
  if (window.innerWidth >= 1024) return 5;
  if (window.innerWidth >= 640) return 4;
  return 3;
};
const formatPower = (value: string | null) => {
  // D1 stores 0 until the canonical basic/stat sync has supplied combat power.
  if (value == null || value.trim() === '') return '戰力尚未同步';
  const power = Number(value);
  if (!Number.isFinite(power) || power <= 0) return '戰力尚未同步';
  if (power >= 100_000_000) {
    const yi = Math.floor(power / 100_000_000);
    const wan = Math.floor((power % 100_000_000) / 10_000);
    return `${yi}億${wan ? `${wan}萬` : ''}`;
  }
  if (power >= 10_000) return `${Math.floor(power / 10_000)}萬`;
  return Math.floor(power).toLocaleString();
};

const formatCreateDate = (value: string | null) => {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${year}/${Number(month)}/${Number(day)}` : '-';
};

const RelatedCharacters: React.FC<RelatedCharactersProps> = ({
  data,
  onSelectCharacter,
}) => {
  const currentCharacterName = data.basic.character_name;
  const [members, setMembers] = React.useState<RelatedCharacter[]>([]);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [resolutionPartial, setResolutionPartial] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [pageInput, setPageInput] = React.useState('1');
  const [pageSize, setPageSize] = React.useState(getResponsivePageSize);

  React.useEffect(() => {
    const updatePageSize = () => setPageSize(getResponsivePageSize());
    window.addEventListener('resize', updatePageSize);
    return () => window.removeEventListener('resize', updatePageSize);
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    setMembers([]);
    setStatus('loading');
    setResolutionPartial(false);
    setPage(1);
    setPageInput('1');

    fetchHolyBearAlts(currentCharacterName, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        setResolutionPartial(result.resolution?.status === 'partial');
        return result.alts.map(fromD1Alt);
      })
      .then(async (result) => {
        const rankingSnapshot = await fetchHolyBearRankingSnapshot();
        const filteredMembers = result.filter((member) => (
          member.characterName
          && member.characterName !== currentCharacterName
        ));
        const liveRanks = await Promise.allSettled(filteredMembers.map((member) => (
          fetchHolyBearCharacterRank(member.characterName)
        )));
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        const resolvedMembers = filteredMembers.map((member, index) => {
          const liveRank = liveRanks[index].status === 'fulfilled'
            ? liveRanks[index].value?.rank ?? null
            : null;
          return {
            ...member,
            // Prefer the live D1 rank because newly imported characters may not
            // exist in the periodically generated static snapshot yet.
            combatPowerRank: liveRank ?? rankingSnapshot.get(
              member.characterName.normalize('NFC').toLocaleLowerCase('zh-TW'),
            ) ?? null,
          };
        });
        setMembers(resolvedMembers);
        setStatus(resolvedMembers.length > 0 ? 'ready' : 'empty');
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setMembers([]);
        setStatus('error');
      });

    return () => controller.abort();
  }, [currentCharacterName]);

  const pageCount = Math.max(1, Math.ceil(members.length / pageSize));

  React.useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  React.useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const goToPage = (event: React.FormEvent) => {
    event.preventDefault();
    const requestedPage = Number.parseInt(pageInput, 10);
    const nextPage = Number.isFinite(requestedPage)
      ? Math.min(Math.max(requestedPage, 1), pageCount)
      : page;
    setPageInput(String(nextPage));
    setPage(nextPage);
  };

  if (status === 'empty') return null;

  const pageCharacters = members.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section className="maple-related-characters space-y-5 rounded-xl border border-slate-800 bg-[#161b22] p-4 shadow-xl sm:p-5">
      <header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <Users className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-100">分身</h2>
          </div>
          {status === 'ready' && (
            <span className="maple-related-count shrink-0 whitespace-nowrap text-xs text-cyan-300">共發現 {members.length} 個分身</span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">依公開聯盟資料推定，並非 NEXON 官方 Account ID。</p>
        {resolutionPartial && (
          <p className="mt-1 text-xs text-amber-300">部分官方資料暫時無法取得，已顯示目前可確認的分身；系統會自動重試。</p>
        )}
      </header>

      {status === 'loading' && (
        <div className="py-6 text-center text-sm text-slate-500">正在查詢分身...</div>
      )}

      {status === 'error' && (
        <div className="py-4 text-center text-sm text-slate-500">分身資料目前無法取得</div>
      )}

      {status === 'ready' && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {pageCharacters.map((character) => (
          <button
            key={character.characterName}
            type="button"
            onClick={() => onSelectCharacter(character.characterName)}
            className="maple-related-character group flex min-w-0 items-center gap-3 rounded-lg border border-slate-700/80 bg-[#0e141e] p-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-500/60 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            aria-label={`查詢分身 ${character.characterName}`}
          >
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-900/80">
              {character.characterImage ? (
                <CharacterAvatar characterName={character.characterName} characterClass={character.characterClass} characterImage={character.characterImage} alt="" className="relative z-10 h-full w-full object-contain" loading="lazy" />
              ) : (
                <User className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span
                  className="min-w-0 break-all text-sm font-bold leading-tight text-slate-100"
                  title={character.characterName}
                >
                  {character.characterName}
                </span>
                {character.combatPowerRank && (
                  <span
                    className="maple-related-rank shrink-0 text-[10px] font-bold text-amber-300"
                    title="近期戰力排行"
                    aria-label={`近期戰力排行第 ${character.combatPowerRank} 名`}
                  >
                    #{character.combatPowerRank}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-300">
                {character.metadataAvailable === false && character.characterLevel == null
                  ? `資料待補 · ${character.characterClass}`
                  : `Lv.${character.characterLevel} · ${character.characterClass}`}
              </span>
              <span className="maple-related-guild mt-0.5 block truncate text-[11px] text-cyan-300/80">
                {character.metadataAvailable === false && character.characterGuildName == null
                  ? '角色資料待補'
                  : character.characterGuildName || '無公會'}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] leading-tight text-slate-400">
                <span className="whitespace-nowrap">
                  {character.metadataAvailable === false && character.maxCharacterPower == null
                    ? '資料待補'
                    : formatPower(character.maxCharacterPower)}
                </span>
                {character.characterDateCreate && (
                  <span className="whitespace-nowrap">{formatCreateDate(character.characterDateCreate)}</span>
                )}
              </span>
            </span>
            <Search className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-cyan-300" aria-hidden="true" />
          </button>
        ))}
      </div>}

      {status === 'ready' && pageCount > 1 && (
        <nav className="maple-related-pagination flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-sm text-slate-300" aria-label="分身頁數">
          <span>第 {page} / {pageCount} 頁</span>
          <form onSubmit={goToPage} className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded border border-slate-700 px-2 py-1 transition-colors hover:border-indigo-400 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一頁
            </button>
            <label htmlFor="related-characters-page" className="sr-only">輸入分身頁次</label>
            <input
              id="related-characters-page"
              type="number"
              min={1}
              max={pageCount}
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
              disabled={page >= pageCount}
              onClick={() => setPage((current) => current + 1)}
              className="rounded border border-slate-700 px-2 py-1 transition-colors hover:border-indigo-400 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一頁
            </button>
          </form>
        </nav>
      )}

    </section>
  );
};

export default React.memo(RelatedCharacters);
