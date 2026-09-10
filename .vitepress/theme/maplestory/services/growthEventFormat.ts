import type { GrowthHistoryEvent } from './growthTypes';

const positiveInteger = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export const formatDojangTime = (value: unknown) => {
  const seconds = positiveInteger(value);
  if (seconds === null) return null;
  return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
};

export const formatDojangRecord = (floorValue: unknown, timeValue: unknown) => {
  const floor = positiveInteger(floorValue);
  const time = formatDojangTime(timeValue);
  if (floor === null || time === null) return null;
  return `${floor}樓 ${time}`;
};

export const formatGrowthEventValue = (
  event: GrowthHistoryEvent,
  side: 'before' | 'after',
) => {
  const value = side === 'before' ? event.from : event.to;
  if (!value) return '無';
  if (event.type === 'liberation') {
    return ({
      '0': '未完成',
      '1': '創世',
      '2': '命運一階',
      false: '未完成',
      true: '已完成',
    } as Record<string, string>)[value] || value;
  }
  if (event.type !== 'dojang') return value;

  const details = event.dojang;
  if (details) {
    const record = side === 'before'
      ? formatDojangRecord(details.beforeFloor, details.beforeTime)
      : formatDojangRecord(details.afterFloor, details.afterTime);
    if (record) return record;
  }

  const legacySeconds = /^(\d+)秒$/.exec(value);
  return legacySeconds ? formatDojangTime(legacySeconds[1]) || value : value;
};
