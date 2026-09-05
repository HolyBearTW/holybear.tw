import { describe, expect, it, vi } from 'vitest';
import { onRequest } from '../../functions/api/_middleware';
import {
  hasValidMaintenanceBypass,
  isMaintenanceProtectedPath,
} from '../../functions/_shared/maintenance-bypass';

const env = { MAINTENANCE_BYPASS_KEY: 'deployment-secret' } as never;

describe('maintenance bypass middleware', () => {
  it('protects every public MapleStory data API group', () => {
    expect(isMaintenanceProtectedPath('/api/nexon/id')).toBe(true);
    expect(isMaintenanceProtectedPath('/api/characters/test')).toBe(true);
    expect(isMaintenanceProtectedPath('/api/rankings/combat-power')).toBe(true);
    expect(isMaintenanceProtectedPath('/api/health')).toBe(false);
    expect(isMaintenanceProtectedPath('/api/admin/import/status')).toBe(false);
  });

  it('accepts only the configured header value', () => {
    const valid = new Request('https://holybear.tw/api/nexon/id', {
      headers: { 'x-bypass-key': 'deployment-secret' },
    });
    const invalid = new Request('https://holybear.tw/api/nexon/id', {
      headers: { 'x-bypass-key': 'wrong-secret' },
    });
    expect(hasValidMaintenanceBypass(valid, env)).toBe(true);
    expect(hasValidMaintenanceBypass(invalid, env)).toBe(false);
    expect(hasValidMaintenanceBypass(valid, {} as never)).toBe(false);
  });

  it('returns the maintenance payload without entering the route', async () => {
    const next = vi.fn(async () => new Response('downstream'));
    const response = await onRequest({
      env,
      request: new Request('https://holybear.tw/api/nexon/id'),
      next,
    } as never);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ maintenance: true, message: '系統維護中' });
  });

  it('continues only after successful authentication', async () => {
    const next = vi.fn(async () => new Response('downstream'));
    const response = await onRequest({
      env,
      request: new Request('https://holybear.tw/api/characters/test', {
        headers: { 'x-bypass-key': 'deployment-secret' },
      }),
      next,
    } as never);

    expect(next).toHaveBeenCalledOnce();
    expect(await response.text()).toBe('downstream');
  });
});
