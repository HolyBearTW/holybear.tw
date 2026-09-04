import { describe, expect, it } from 'vitest';
import { isCharacterFresh, normalizeCharacterName, validateCanonicalSources } from '../../functions/_shared/character-repository';
import { parseRankingFilters } from '../../functions/_shared/ranking-repository';
import type { PublicCharacter } from '../../functions/_shared/models';
import { canonicalizeChampionRoster } from '../../functions/_shared/union-fingerprint';
import { singleParam } from '../../functions/_shared/http';

const character = (updatedAt: string): PublicCharacter => ({
  ocid: 'ocid-1',
  characterName: '聖小熊',
  normalizedName: '聖小熊',
  worldName: '艾麗亞',
  jobName: '主教',
  level: 290,
  combatPower: 123,
  characterImage: '',
  guildName: null,
  accountGroupId: null,
  firstSeenAt: updatedAt,
  lastSeenAt: updatedAt,
  nexonUpdatedAt: updatedAt,
  createdAt: updatedAt,
  updatedAt,
});

describe('character domain helpers', () => {
  it('decodes Unicode Pages route parameters', () => {
    expect(singleParam('%E6%B8%AC%E8%A9%A6%E8%A7%92%E8%89%B2')).toBe('測試角色');
  });
  it('normalizes names without treating them as the primary identity', () => {
    expect(normalizeCharacterName('  Ａbc  ')).toBe('ａbc');
    expect(normalizeCharacterName('E\u0301')).toBe('é');
  });

  it('uses the configured freshness duration', () => {
    const now = Date.parse('2026-09-04T00:15:00.000Z');
    expect(isCharacterFresh(character('2026-09-04T00:05:00.000Z'), 900, now)).toBe(true);
    expect(isCharacterFresh(character('2026-09-03T23:59:59.000Z'), 900, now)).toBe(false);
  });

  it('rejects canonical writes that do not include a successful NEXON source', () => {
    expect(() => validateCanonicalSources([{ source: 'maplerhouse' }])).toThrow(/NEXON/);
    expect(() => validateCanonicalSources([{ source: 'maplerhouse' }, { source: 'nexon' }])).not.toThrow();
  });
});

describe('ranking filters', () => {
  it('parses supported filters and caps page size', () => {
    const filters = parseRankingFilters(new URL('https://example.test/api?page=2&pageSize=999&world=艾麗亞&job=主教&minLevel=260'));
    expect(filters).toEqual({ page: 2, pageSize: 100, world: '艾麗亞', job: '主教', minLevel: 260 });
  });

  it('uses safe pagination defaults', () => {
    expect(parseRankingFilters(new URL('https://example.test/api?page=-1&pageSize=nope'))).toEqual({
      page: 1,
      pageSize: 10,
      world: undefined,
      job: undefined,
      minLevel: undefined,
    });
  });
});

describe('union account signals', () => {
  it('canonicalizes a sufficiently identifying champion roster', () => {
    const first = canonicalizeChampionRoster({ union_champion: [
      { champion_name: '角色B', champion_grade: 'S', champion_class: '主教' },
      { champion_name: '角色A', champion_grade: 'A', champion_class: '英雄' },
    ] });
    const second = canonicalizeChampionRoster({ union_champion: [
      { champion_name: '角色A', champion_grade: 'A', champion_class: '英雄' },
      { champion_name: '角色B', champion_grade: 'S', champion_class: '主教' },
    ] });
    expect(first).toBe(second);
  });

  it('does not create a signal from union level or a single roster member', () => {
    expect(canonicalizeChampionRoster({ union_champion: [
      { champion_name: '角色A', champion_grade: 'A', champion_class: '英雄' },
    ] })).toBeNull();
    expect(canonicalizeChampionRoster({ union_level: 9000 } as never)).toBeNull();
  });
});
