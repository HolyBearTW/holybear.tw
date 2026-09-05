import assert from 'node:assert/strict';
import test from 'node:test';
import { selectStratifiedRadarSamples } from '../scripts/lib/tms-radar-sampling.mjs';

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
