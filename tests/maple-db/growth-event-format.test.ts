import { describe, expect, it } from 'vitest';
import {
  formatDojangRecord,
  formatDojangTime,
  formatGrowthEventValue,
} from '../../.vitepress/theme/maplestory/services/growthEventFormat';
import type { GrowthHistoryEvent } from '../../.vitepress/theme/maplestory/services/growthTypes';

const dojangEvent = (overrides: Partial<GrowthHistoryEvent> = {}): GrowthHistoryEvent => ({
  date: '2026-08-08',
  type: 'dojang',
  from: '701秒',
  to: '501秒',
  dojang: { beforeFloor: 100, beforeTime: 701, afterFloor: 100, afterTime: 501 },
  ...overrides,
});

describe('growth dojang event formatting', () => {
  it('formats raw record seconds as minutes and seconds', () => {
    expect(formatDojangTime(701)).toBe('11分41秒');
    expect(formatDojangTime(501)).toBe('8分21秒');
  });

  it('includes the floor for a same-floor time improvement', () => {
    const event = dojangEvent();
    expect(formatGrowthEventValue(event, 'before')).toBe('100樓 11分41秒');
    expect(formatGrowthEventValue(event, 'after')).toBe('100樓 8分21秒');
  });

  it('includes both records for a floor increase', () => {
    const event = dojangEvent({
      from: '98F',
      to: '100F',
      dojang: { beforeFloor: 98, beforeTime: 701, afterFloor: 100, afterTime: 701 },
    });
    expect(formatGrowthEventValue(event, 'before')).toBe('98樓 11分41秒');
    expect(formatGrowthEventValue(event, 'after')).toBe('100樓 11分41秒');
  });

  it('includes floor and time when both change', () => {
    const event = dojangEvent({
      from: '98F',
      to: '100F',
      dojang: { beforeFloor: 98, beforeTime: 701, afterFloor: 100, afterTime: 501 },
    });
    expect(formatGrowthEventValue(event, 'before')).toBe('98樓 11分41秒');
    expect(formatGrowthEventValue(event, 'after')).toBe('100樓 8分21秒');
  });

  it('formats a legacy seconds-only event without inventing a floor', () => {
    const event = dojangEvent({ dojang: undefined });
    expect(formatGrowthEventValue(event, 'before')).toBe('11分41秒');
    expect(formatGrowthEventValue(event, 'after')).toBe('8分21秒');
  });

  it('does not create records from null, zero, or invalid data', () => {
    expect(formatDojangTime(null)).toBeNull();
    expect(formatDojangTime(0)).toBeNull();
    expect(formatDojangTime(-1)).toBeNull();
    expect(formatDojangTime('invalid')).toBeNull();
    expect(formatDojangRecord(null, 701)).toBeNull();
    expect(formatDojangRecord(0, 701)).toBeNull();
    expect(formatDojangRecord(100, 0)).toBeNull();
    expect(formatDojangRecord(100, Number.NaN)).toBeNull();
  });
});

describe('growth liberation event formatting', () => {
  const liberationEvent = (from: string, to: string): GrowthHistoryEvent => ({
    date: '2025-12-07', type: 'liberation', from, to,
  });

  it('formats official stage-to-stage transitions without losing detail', () => {
    const event = liberationEvent('1', '2');
    expect(formatGrowthEventValue(event, 'before')).toBe('創世');
    expect(formatGrowthEventValue(event, 'after')).toBe('命運一階');
  });

  it('keeps legacy boolean events generic instead of inventing a stage', () => {
    const event = liberationEvent('false', 'true');
    expect(formatGrowthEventValue(event, 'before')).toBe('未完成');
    expect(formatGrowthEventValue(event, 'after')).toBe('已完成');
  });

  it('handles null-like and unknown stages without guessing', () => {
    expect(formatGrowthEventValue(liberationEvent('', 'future-stage'), 'before')).toBe('無');
    expect(formatGrowthEventValue(liberationEvent('', 'future-stage'), 'after')).toBe('future-stage');
  });
});
