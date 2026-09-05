import { describe, expect, it } from 'vitest';
import { isCharacterFresh, normalizeCharacterName, validateCanonicalSources } from '../../functions/_shared/character-repository';
import { parseRankingFilters } from '../../functions/_shared/ranking-repository';
import type { PublicCharacter } from '../../functions/_shared/models';
import {
  canonicalizeChampionRoster,
  canonicalizeCompleteUnionRaider,
  canonicalizeRaiderPresets,
} from '../../functions/_shared/union-fingerprint';
import { singleParam } from '../../functions/_shared/http';
import { createAliasSignatureInputs } from '../../.vitepress/theme/maplestory/services/aliasFingerprint.js';

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

  it('canonicalizes union raider layouts independently of block order', () => {
    const blocks = Array.from({ length: 8 }, (_, index) => ({
      block_type: `類型${index}`,
      block_class: `職業${index}`,
      block_level: 200 + index,
      block_control_point: { x: index, y: index + 1 },
      block_position: [{ x: index + 1, y: index }, { x: index, y: index }],
    }));
    const first = canonicalizeRaiderPresets({
      union_raider_preset_1: { union_raider_stat: ['STR +5', 'DEX +5'], union_block: blocks },
    });
    const second = canonicalizeRaiderPresets({
      union_raider_preset_1: { union_raider_stat: ['DEX +5', 'STR +5'], union_block: [...blocks].reverse() },
    });
    expect(first).toEqual(second);
    expect(first).toHaveLength(1);
    expect(createAliasSignatureInputs({
      union_raider_preset_1: { union_raider_stat: ['STR +5', 'DEX +5'], union_block: blocks },
    }, undefined)).toContain(`raider-v1:${first[0]}`);
  });

  it('rejects small union raider layouts that are unsafe account signals', () => {
    expect(canonicalizeRaiderPresets({
      union_block: Array.from({ length: 7 }, () => ({ block_class: '主教' })),
    })).toEqual([]);
  });

  it('only matches complete union raider state when summary and every preset are identical', () => {
    const blocks = Array.from({ length: 8 }, (_, index) => ({
      block_type: `類型${index}`,
      block_class: `職業${index}`,
      block_level: 200 + index,
      block_control_point: { x: index, y: index + 1 },
      block_position: [{ x: index, y: index }],
    }));
    const raider = {
      use_preset_no: 1,
      union_raider_preset_1: { union_raider_stat: ['STR +5'], union_block: blocks },
      union_raider_preset_2: { union_raider_stat: ['DEX +5'], union_block: blocks },
    };
    const canonical = canonicalizeCompleteUnionRaider(
      { union_level: 9000, union_grade: '測試聯盟階級' },
      raider,
    );
    expect(canonical).toBe(canonicalizeCompleteUnionRaider(
      { union_level: 9000, union_grade: '測試聯盟階級' },
      raider,
    ));
    expect(canonical).not.toBe(canonicalizeCompleteUnionRaider(
      { union_level: 8999, union_grade: '測試聯盟階級' },
      raider,
    ));
    expect(canonical).not.toBe(canonicalizeCompleteUnionRaider(
      { union_level: 9000, union_grade: '測試聯盟階級' },
      { ...raider, use_preset_no: 2 },
    ));
    expect(canonical).not.toBe(canonicalizeCompleteUnionRaider(
      { union_level: 9000, union_grade: '測試聯盟階級' },
      {
        ...raider,
        union_raider_preset_2: { union_raider_stat: ['LUK +5'], union_block: blocks },
      },
    ));
  });
});
