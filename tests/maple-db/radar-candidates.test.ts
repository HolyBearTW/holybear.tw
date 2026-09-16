import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getRadarCandidates } from '../../functions/_shared/radar-candidate-repository';
import { onRequestGet } from '../../functions/api/radar/candidates';
import { selectStratifiedRadarSamples } from '../../scripts/lib/tms-radar-sampling.mjs';
import { createTestD1 } from './sqlite-d1';

let local: ReturnType<typeof createTestD1>;

const normalizeJob = (value: string) => value.replace(/[（）(),、\s]/g, '');

const addCharacter = (ocid: string, job: string, level: number, combatPower: number) => {
  local.sqlite.prepare(`
    INSERT INTO characters (
      ocid, character_name, normalized_name, world_name, job_name, level,
      combat_power, character_image, first_seen_at, last_seen_at
    ) VALUES (?, ?, ?, '艾麗亞', ?, ?, ?, '', '2026-09-16T00:00:00Z', '2026-09-16T00:00:00Z')
  `).run(ocid, ocid, ocid, job, level, combatPower);
};

beforeEach(() => {
  local = createTestD1();
  [1000, 900, 800, 700, 600, 500].forEach((power, index) => addCharacter(`hero-${index}`, '英雄', 280, power));
  [950, 850, 750, 650, 550, 450].forEach((power, index) => addCharacter(`bishop-${index}`, '主教', 280, power));
  [920, 620, 420].forEach((power, index) => addCharacter(`mage-${index}`, '大魔導士(火、毒)', 280, power));
  addCharacter('low-level', '英雄', 259, 9999);
});

afterEach(() => local.sqlite.close());

describe('radar candidate endpoint', () => {
  it('matches the existing per-job rank-distributed sampling set and order', async () => {
    const response = await getRadarCandidates(local.db, { minimumLevel: 260, samplesPerJob: 4 });
    const completeRanking = local.sqlite.prepare(`
      SELECT ocid, character_name AS name, world_name AS world, job_name AS job,
        level, combat_power AS combatPower, character_image AS avatar
      FROM characters WHERE level >= 260 AND job_name <> ''
      ORDER BY combat_power DESC, ocid ASC
    `).all() as Array<{ ocid: string; name: string; world: string; job: string; level: number; combatPower: number; avatar: string }>;
    const expected = selectStratifiedRadarSamples(completeRanking, 4, normalizeJob);

    expect(response.sourceCount).toBe(15);
    expect(response.sampledSourceCount).toBe(11);
    expect(response.candidates.map((candidate) => candidate.ocid)).toEqual(expected.map((candidate) => candidate.ocid));
    expect(response.jobs).toEqual([
      { job: '英雄', sourceCount: 6, sampledCount: 4 },
      { job: '主教', sourceCount: 6, sampledCount: 4 },
      { job: '大魔導士火毒', sourceCount: 3, sampledCount: 3 },
    ]);
  });

  it('requires the radar automation key and performs only read queries', async () => {
    const denied = await onRequestGet({
      env: { DB: local.db, RADAR_AUTOMATION_KEY: 'secret' },
      request: new Request('https://holybear.tw/api/radar/candidates'),
    } as never);
    expect(denied.status).toBe(401);

    const sql: string[] = [];
    const readOnlyDb = {
      prepare: (statement: string) => {
        sql.push(statement);
        return local.db.prepare(statement);
      },
    } as D1Database;
    const accepted = await onRequestGet({
      env: { DB: readOnlyDb, RADAR_AUTOMATION_KEY: 'secret' },
      request: new Request('https://holybear.tw/api/radar/candidates', {
        headers: { 'x-radar-automation-key': 'secret' },
      }),
    } as never);
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({
      schemaVersion: 1, degraded: false, partial: false, sourceCount: 15,
    });
    expect(sql.length).toBeGreaterThan(1);
    expect(sql.every((statement) => !/\b(?:INSERT|UPDATE|DELETE)\b/i.test(statement))).toBe(true);
    expect(sql.every((statement) => !/\bOFFSET\b/i.test(statement))).toBe(true);
  });

  it('returns an explicit degraded partial response when D1 fails', async () => {
    const response = await onRequestGet({
      env: {
        DB: { prepare: () => { throw new Error('D1 failed'); } },
        RADAR_AUTOMATION_KEY: 'secret',
      },
      request: new Request('https://holybear.tw/api/radar/candidates', {
        headers: { 'x-radar-automation-key': 'secret' },
      }),
    } as never);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ degraded: true, unavailable: true, partial: true });
  });
});
