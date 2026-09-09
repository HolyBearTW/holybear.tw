/// <reference lib="dom" />

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BYPASS_EXPIRY_STORAGE_KEY,
  BYPASS_STORAGE_KEY,
  BYPASS_TTL_MS,
  readSavedBypassKey,
  saveBypassKey,
  validateMaintenanceBypass,
} from '../../.vitepress/theme/maplestory/services/maintenanceAccess';

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe('maintenance browser access expiry', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime('2026-09-10T00:00:00.000Z');
    vi.stubGlobal('window', {
      localStorage: storage,
      location: { href: 'https://holybear.tw/maplestory/', origin: 'https://holybear.tw' },
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps a valid key for 23 hours 59 minutes', () => {
    expect(BYPASS_TTL_MS).toBe(24 * 60 * 60 * 1000);
    saveBypassKey('valid-key');
    vi.advanceTimersByTime((23 * 60 + 59) * 60 * 1000);
    expect(readSavedBypassKey()).toBe('valid-key');
  });

  it('expires and clears a key at 24 hours', () => {
    saveBypassKey('valid-key');
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(readSavedBypassKey()).toBe('');
    expect(storage.getItem(BYPASS_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(BYPASS_EXPIRY_STORAGE_KEY)).toBeNull();
  });

  it('rejects an invalid key without extending its saved expiry', async () => {
    saveBypassKey('valid-key');
    const originalExpiry = storage.getItem(BYPASS_EXPIRY_STORAGE_KEY);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ maintenance: true }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    )));

    await expect(validateMaintenanceBypass('invalid-key')).resolves.toBe(false);
    expect(originalExpiry).not.toBeNull();
    expect(storage.getItem(BYPASS_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(BYPASS_EXPIRY_STORAGE_KEY)).toBeNull();
  });
});
