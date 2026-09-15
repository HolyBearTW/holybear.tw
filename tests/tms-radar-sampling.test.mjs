import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  assertCandidateUniverseIntegrity,
  assertRankingPageIntegrity,
  finalizeRadarReference,
  prepareRadarCandidates,
  selectStratifiedRadarSamples,
  shouldRefreshRadarCache,
} from '../scripts/lib/tms-radar-sampling.mjs';

test('keeps every entry when a job is below the cap', () => {
  const entries = [
    { name: 'A', job: '英雄' },
    { name: 'B', job: '英雄' },
    { name: 'C', job: '主教' },
  ];
  assert.deepEqual(selectStratifiedRadarSamples(entries, 3), entries);
});

test('spreads capped samples across the complete ranked range', () => {
  const entries = Array.from({ length: 10 }, (_, index) => ({ name: String(index), job: '英雄' }));
  const selected = selectStratifiedRadarSamples(entries, 4);
  assert.deepEqual(selected.map((entry) => entry.name), ['0', '3', '6', '9']);
});

test('applies the cap independently to each job', () => {
  const entries = [
    ...Array.from({ length: 6 }, (_, index) => ({ name: `A${index}`, job: '英雄' })),
    ...Array.from({ length: 6 }, (_, index) => ({ name: `B${index}`, job: '主教' })),
  ];
  const selected = selectStratifiedRadarSamples(entries, 2);
  assert.deepEqual(selected.map((entry) => entry.name), ['A0', 'A5', 'B0', 'B5']);
});

test('applies a 500 cap per job instead of across the complete source', () => {
  const entries = [
    ...Array.from({ length: 700 }, (_, index) => ({ name: `A${index}`, job: '英雄' })),
    ...Array.from({ length: 800 }, (_, index) => ({ name: `B${index}`, job: '主教' })),
  ];
  const prepared = prepareRadarCandidates(entries, 500);
  assert.equal(prepared.sourceCount, 1500);
  assert.equal(prepared.sampledSourceCount, 1000);
  assert.equal(prepared.sampledCharacters.filter((entry) => entry.job === '英雄').length, 500);
  assert.equal(prepared.sampledCharacters.filter((entry) => entry.job === '主教').length, 500);
});

test('counts source characters before stratified sampling', () => {
  const entries = Array.from({ length: 1200 }, (_, index) => ({ name: `A${index}`, job: '英雄' }));
  const prepared = prepareRadarCandidates(entries, 500);
  assert.equal(prepared.sourceCount, 1200);
  assert.equal(prepared.sampledSourceCount, 500);
});

test('keeps the original timestamp and object when only generatedAt would change', () => {
  const previous = { generatedAt: 'old', sourceCount: 10, jobs: { 英雄: { sampleSize: 1 } } };
  const result = finalizeRadarReference(previous, { sourceCount: 10, jobs: { 英雄: { sampleSize: 1 } } }, 'new');
  assert.equal(result.changed, false);
  assert.equal(result.reference, previous);
  assert.equal(result.reference.generatedAt, 'old');
});

test('updates generatedAt only when the radar payload changes', () => {
  const previous = { generatedAt: 'old', sourceCount: 10, jobs: {} };
  const result = finalizeRadarReference(previous, { sourceCount: 11, jobs: {} }, 'new');
  assert.equal(result.changed, true);
  assert.equal(result.reference.generatedAt, 'new');
  assert.equal(result.reference.sourceCount, 11);
});

test('manual force refresh bypasses a fresh cache TTL', () => {
  assert.equal(shouldRefreshRadarCache({ forceRefresh: true, cachedAt: 900, now: 1000, cacheTtlMs: 500 }), true);
});

test('normal scheduled refresh respects a fresh cache TTL', () => {
  assert.equal(shouldRefreshRadarCache({ forceRefresh: false, cachedAt: 900, now: 1000, cacheTtlMs: 500 }), false);
  assert.equal(shouldRefreshRadarCache({ forceRefresh: false, cachedAt: 100, now: 1000, cacheTtlMs: 500 }), true);
});

test('workflow exposes force_refresh only to manual runs and keeps scheduled TTL configuration', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/update-tms-radar-reference.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_dispatch:\s+inputs:\s+force_refresh:/);
  assert.match(workflow, /RADAR_FORCE_REFRESH:.*github\.event_name == 'workflow_dispatch'.*inputs\.force_refresh/);
  assert.match(workflow, /schedule:\s+- cron:/);
  assert.match(workflow, /RADAR_CACHE_TTL_DAYS: 21/);
});

test('rejects degraded, inconsistent, and sharply reduced candidate sources', () => {
  assert.throws(
    () => assertRankingPageIntegrity({ degraded: true }, 1, 100),
    /degraded or unavailable/,
  );
  assert.throws(
    () => assertRankingPageIntegrity({ page: 1, pageSize: 100, total: 101, totalPages: 1, items: Array(100) }, 1, 100),
    /inconsistent totalPages/,
  );
  assert.throws(
    () => assertCandidateUniverseIntegrity({
      sourceCount: 1288,
      fetchedCount: 1288,
      expectedTotal: 1288,
      previousSourceCount: 112096,
      minimumSourceCount: 100000,
    }),
    /below the required minimum|shrank/,
  );
});
