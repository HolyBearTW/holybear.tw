import { afterEach, describe, expect, it, vi } from 'vitest';
import { canUseProductionCounters } from '../../.vitepress/components/production-data-origin';

const mocks = vi.hoisted(() => ({
  mounted: undefined,
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(async () => ({ exists: () => false })),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  increment: vi.fn((value) => value),
}));
vi.mock('../../.vitepress/components/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => mocks);
vi.mock('vue', () => ({ ref: (value) => ({ value }), onMounted: (callback) => { mocks.mounted = callback; }, watch: vi.fn() }));

import { incrementAndGetViews } from '../../.vitepress/components/view-count';
import { useVote } from '../../.vitepress/components/useVote';

afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe('production Firebase counter isolation', () => {
  it.each([
    'https://hash.holybear-tw.pages.dev', 'https://branch.holybear-tw.pages.dev',
    'https://preview.example.com', 'http://localhost:8794', 'https://holybear.tw.evil.example',
  ])('never reads or writes production counters on %s', async (origin) => {
    vi.stubGlobal('window', { location: { origin } });
    expect(canUseProductionCounters()).toBe(false);
    expect(await incrementAndGetViews('unit-test-only')).toBe(0);
    const votes = useVote({ value: 'unit-test-only' });
    await mocks.mounted();
    await votes.vote('up');
    await votes.unvote('down');
    expect(votes.loading.value).toBe(false);
    for (const fn of [mocks.doc, mocks.getDoc, mocks.setDoc, mocks.updateDoc]) expect(fn).not.toHaveBeenCalled();
  });

  it.each(['https://holybear.tw', 'https://www.holybear.tw', 'https://holybear-tw.pages.dev'])(
    'preserves production view counting, voting and unvoting on %s', async (origin) => {
      vi.stubGlobal('window', { location: { origin } });
      expect(canUseProductionCounters()).toBe(true);
      expect(await incrementAndGetViews('unit-test-only')).toBe(1);
      expect(mocks.setDoc).toHaveBeenCalledWith({}, { count: 1 });
      const votes = useVote({ value: 'unit-test-only' });
      await mocks.mounted();
      expect(mocks.setDoc).toHaveBeenCalledWith({}, { up: 0, down: 0 });
      await votes.vote('up');
      expect(mocks.updateDoc).toHaveBeenCalledWith({}, { up: 1 });
      await votes.unvote('down');
      expect(mocks.updateDoc).toHaveBeenCalledWith({}, { down: -1 });
    },
  );

  it('does not use production counters during SSR', async () => {
    vi.stubGlobal('window', undefined);
    expect(canUseProductionCounters()).toBe(false);
    expect(await incrementAndGetViews('unit-test-only')).toBe(0);
    expect(mocks.doc).not.toHaveBeenCalled();
  });
});
