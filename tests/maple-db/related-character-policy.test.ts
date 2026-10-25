import { describe, expect, it } from 'vitest';
import { classifyRelatedCharacters, type RelatedCharacterRecord } from '../../functions/_shared/related-character-policy';

const now = Date.parse('2026-10-25T00:00:00.000Z');
const member = (overrides: Partial<RelatedCharacterRecord> = {}): RelatedCharacterRecord => ({
  ocid: 'alt-ocid', characterName: '分身', worldName: '艾麗亞', jobName: '主教',
  level: 290, combatPower: 100, characterImage: 'image', guildName: null,
  metadataAvailable: true, isActive: true, lastCheckedAt: new Date(now).toISOString(),
  ...overrides,
});

describe('related character freshness and identity', () => {
  it('keeps known imported roles regardless of age or missing metadata timestamps, and separates only confirmed failures', () => {
    const result = classifyRelatedCharacters([
      member({ ocid: 'boundary', lastCheckedAt: new Date(now - 30 * 86_400_000).toISOString() }),
      member({ ocid: 'expired', lastCheckedAt: new Date(now - 30 * 86_400_000 - 1).toISOString() }),
      member({ ocid: 'missing-time', lastCheckedAt: null }),
      member({ ocid: 'future-time', lastCheckedAt: new Date(now + 1).toISOString() }),
      member({ ocid: 'invalid-time', lastCheckedAt: 'invalid' }),
      member({ ocid: 'unavailable', isActive: false }),
      member({ ocid: null, characterName: '尚未解析' }),
    ], 'main-ocid');
    expect(result.alts.map((alt) => alt.ocid)).toEqual(['boundary', 'expired', 'missing-time', 'future-time', 'invalid-time', null]);
    expect(result.unverifiedAlts.map((alt) => alt.ocid)).toEqual(['unavailable']);
    expect(result.unverifiedAlts[0].dataStatus).toBe('unavailable');
  });

  it('deduplicates renamed OCIDs using the latest canonical time and excludes self by OCID', () => {
    const result = classifyRelatedCharacters([
      member({ characterName: '舊名字', lastCheckedAt: '2026-09-01T00:00:00.000Z' }),
      member({ characterName: '新名字' }),
      member({ ocid: 'main-ocid', characterName: '主角色舊名' }),
      member({ ocid: null, characterName: '新名字' }),
    ], 'main-ocid');
    expect(result.alts.map((alt) => alt.characterName)).toEqual(['新名字']);
    expect(result.unverifiedAlts).toEqual([]);
  });

  it('does not merge different identified characters or unresolved names from different worlds', () => {
    const result = classifyRelatedCharacters([
      member({ ocid: 'first' }), member({ ocid: 'second' }),
      member({ ocid: null, characterName: '同名', worldName: '艾麗亞' }),
      member({ ocid: null, characterName: '同名', worldName: '普力特' }),
    ], 'main-ocid');
    expect(result.alts).toHaveLength(4);
    expect(result.unverifiedAlts).toHaveLength(0);
  });
});
