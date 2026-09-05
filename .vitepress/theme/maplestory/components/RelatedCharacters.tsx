import React from 'react';
import { ChevronLeft, ChevronRight, Search, User, Users } from 'lucide-react';
import { findRelatedCharacters } from '../services/aliasService';
import type { RelatedCharacter } from '../services/aliasService';
import type { DashboardData } from '../types';
import CharacterAvatar from './CharacterAvatar';
import { fetchHolyBearAlts, fetchHolyBearRankingSnapshot } from '../services/holyBearService';

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
const formatPower = (value: string) => {
  const power = Number(value || 0);
  if (!Number.isFinite(power) || power <= 0) return '0';
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

const fromD1Alt = (character: Awaited<ReturnType<typeof fetchHolyBearAlts>>['alts'][number]): RelatedCharacter => ({
  characterName: character.characterName,
  worldName: character.worldName,
  characterClass: character.jobName,
  characterLevel: character.level,
  characterImage: character.characterImage,
  characterPower: String(character.combatPower),
  maxCharacterPower: String(character.combatPower),
  combatPowerRank: null,
  characterGuildName: character.guildName,
  characterDateCreate: null,
});

const mergeRelatedCharacters = (d1Members: RelatedCharacter[], staticMembers: RelatedCharacter[]) => {
  const merged = new Map<string, RelatedCharacter>();
  for (const member of staticMembers) {
    merged.set(member.characterName.normalize('NFC').toLocaleLowerCase('zh-TW'), member);
  }
  for (const member of d1Members) {
    const key = member.characterName.normalize('NFC').toLocaleLowerCase('zh-TW');
    const fallback = merged.get(key);
    merged.set(key, {
      ...fallback,
      ...member,
      characterDateCreate: fallback?.characterDateCreate ?? member.characterDateCreate,
    });
  }
  return [...merged.values()];
};

const RelatedCharacters: React.FC<RelatedCharactersProps> = ({
  data,
  onSelectCharacter,
}) => {
  const currentCharacterName = data.basic.character_name;
  const [members, setMembers] = React.useState<RelatedCharacter[]>([]);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [page, setPage] = React.useState(1);
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
    setPage(1);

    Promise.allSettled([
      fetchHolyBearAlts(currentCharacterName, controller.signal),
      findRelatedCharacters(data, controller.signal),
    ])
      .then((results) => {
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        const d1Members = results[0].status === 'fulfilled'
          ? results[0].value.alts.map(fromD1Alt)
          : [];
        const staticMembers = results[1].status === 'fulfilled' ? results[1].value : [];
        if (d1Members.length === 0 && staticMembers.length === 0
          && results.every((result) => result.status === 'rejected')) {
          const failure = results.find((result) => result.status === 'rejected');
          throw failure?.reason ?? new Error('分身資料目前無法取得');
        }
        return mergeRelatedCharacters(d1Members, staticMembers);
      })
      .then(async (result) => {
        const rankingSnapshot = await fetchHolyBearRankingSnapshot();
        const resolvedMembers = result.filter((member) => (
          member.characterName
          && member.characterName !== currentCharacterName
        )).map((member) => ({
          ...member,
          // Never display a rank carried by the alias discovery dataset.
          // Only the HolyBear D1-derived snapshot is authoritative here.
          combatPowerRank: rankingSnapshot.get(
            member.characterName.normalize('NFC').toLocaleLowerCase('zh-TW'),
          ) ?? null,
        }));
        setMembers(resolvedMembers);
        setStatus(resolvedMembers.length > 0 ? 'ready' : 'empty');
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setMembers([]);
        setStatus('error');
      });

    return () => controller.abort();
  }, [currentCharacterName, data.unionChampion, data.unionRaider]);

  const pageCount = Math.max(1, Math.ceil(members.length / pageSize));

  React.useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  if (status === 'empty') return null;

  const pageCharacters = members.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section className="maple-related-characters rounded-xl border border-slate-800 bg-[#161b22] p-4 shadow-xl sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Users className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-100">分身</h2>
        </div>
        {status === 'ready' && (
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-cyan-300">共發現 {members.length} 個分身</span>
            {pageCount > 1 && (
              <nav className="flex items-center gap-1" aria-label="分身頁數">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-slate-700 p-1.5 text-slate-300 transition hover:border-cyan-500/60 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="上一頁"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`h-7 min-w-7 rounded-md px-2 text-xs font-bold transition ${
                      pageNumber === page
                        ? 'bg-cyan-500 text-slate-950'
                        : 'border border-slate-700 text-slate-400 hover:border-cyan-500/60 hover:text-cyan-300'
                    }`}
                    aria-label={`第 ${pageNumber} 頁`}
                    aria-current={pageNumber === page ? 'page' : undefined}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  disabled={page === pageCount}
                  className="rounded-md border border-slate-700 p-1.5 text-slate-300 transition hover:border-cyan-500/60 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="下一頁"
                >
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </nav>
            )}
          </div>
        )}
      </div>

      <p className="mb-3 text-[11px] text-slate-500">依公開聯盟資料推定，並非 NEXON 官方 Account ID。</p>

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
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="min-w-0 truncate text-sm font-bold text-slate-100">{character.characterName}</span>
                {character.combatPowerRank && (
                  <span
                    className="shrink-0 text-[10px] font-bold text-amber-300"
                    title="近期戰力排行"
                    aria-label={`近期戰力排行第 ${character.combatPowerRank} 名`}
                  >
                    #{character.combatPowerRank}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-300">
                Lv.{character.characterLevel} · {character.characterClass}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-cyan-300/80">
                {character.characterGuildName || '無公會'}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] leading-tight text-slate-400">
                <span className="whitespace-nowrap">{formatPower(character.maxCharacterPower)}</span>
                <span className="whitespace-nowrap">{formatCreateDate(character.characterDateCreate)}</span>
              </span>
            </span>
            <Search className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-cyan-300" aria-hidden="true" />
          </button>
        ))}
      </div>}

    </section>
  );
};

export default React.memo(RelatedCharacters);
