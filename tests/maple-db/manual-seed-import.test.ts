import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseManualSeedPage, scanManualSeedDirectory } from '../../scripts/manual-seed-files.mjs';
import { canonicalSql, isD1QuotaError, pageStagingSql } from '../../scripts/run-manual-seed-import.mjs';

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))));

const payload = (page: number, totalPages = 3, names = [`角色${page}`]) => ({
  data: names.map((characterName, rank) => ({
    rank,
    characterName,
    worldName: '艾麗亞',
    characterClass: '主教',
    characterLevel: 290,
    characterPower: '1,234,567',
    characterImage: 'image',
  })),
  pagination: { page, limit: 100, total: totalPages * 100, totalPages },
  version: 768,
});

const tempDirectory = async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'manual-seed-test-'));
  directories.push(directory);
  return directory;
};

describe('manual seed files', () => {
  it('normalizes records and ignores source rank', () => {
    const parsed = parseManualSeedPage(payload(1), 1);
    expect(parsed.items[0]).toMatchObject({ characterName: '角色1', combatPower: 1_234_567 });
    expect(parsed.items[0]).not.toHaveProperty('rank');
  });

  it('reports missing, duplicate, malformed, and blank-name input', async () => {
    const directory = await tempDirectory();
    await writeFile(path.join(directory, 'page-000001.json'), JSON.stringify(payload(1)), 'utf8');
    await writeFile(path.join(directory, 'page-1.json'), JSON.stringify(payload(1)), 'utf8');
    await writeFile(path.join(directory, 'page-000003.json'), '{broken', 'utf8');
    const scan = await scanManualSeedDirectory(directory);
    expect(scan.duplicatePages[0].page).toBe(1);
    expect(scan.invalidFiles[0].filename).toBe('page-000003.json');
    expect(scan.missingPages).toEqual(['2']);
  });

  it('deduplicates names across pages during audit', async () => {
    const directory = await tempDirectory();
    await writeFile(path.join(directory, 'page-000001.json'), JSON.stringify(payload(1, 2, ['相同角色'])), 'utf8');
    await writeFile(path.join(directory, 'page-000002.json'), JSON.stringify(payload(2, 2, ['相同角色'])), 'utf8');
    const scan = await scanManualSeedDirectory(directory);
    expect(scan.rawRecords).toBe(2);
    expect(scan.uniqueCharacters).toBe(1);
    expect(scan.duplicateRecords).toBe(1);
  });

  it('checkpoints files/pages without declaring the incomplete source complete', () => {
    const parsed = parseManualSeedPage(payload(1, 2760), 1);
    const sql = pageStagingSql({ id: 5 }, parsed, [1], 'page-000001.json', 2760, 1000);
    expect(sql).toContain('"lastFile":"page-000001.json"');
    expect(sql).toContain('"manualPartialComplete":false');
    expect(sql).toContain('"overallComplete":false');
    expect(sql).toContain("'manual_seed'");
  });

  it('writes canonical character fields from NEXON output and keeps source provenance', () => {
    const sql = canonicalSql({
      id: 1, source_id: 'seed', observed_at: null, source_updated_at: null,
      world_name: '來源世界', job_name: '來源職業', level: 1, combat_power: 2,
    }, {
      ocid: 'official', characterName: '官方角色', normalizedName: '官方角色', worldName: '艾麗亞',
      jobName: '主教', level: 299, combatPower: 9_999_999, characterImage: 'official-image',
      guildName: '官方公會', observedAt: '2026-09-04T00:00:00Z',
    });
    expect(sql).toContain('9999999');
    expect(sql).toContain("'manual_seed'");
    expect(sql).toContain("'nexon'");
    expect(sql).not.toContain('rank');
  });

  it('recognizes the D1 daily row-read quota as a resumable pause', () => {
    expect(isD1QuotaError(new Error('exceeded D1 free tier daily row read limit [code: 7500]'))).toBe(true);
    expect(isD1QuotaError(new Error('unrelated network error'))).toBe(false);
  });
});
