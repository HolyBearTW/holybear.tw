import { describe, expect, it, vi } from 'vitest';
import { onRequest } from '../../functions/api/_middleware';
import { onRequestPost as validateBypass } from '../../functions/api/maintenance/validate';
import {
  hasValidMaintenanceBypass,
  hasValidRadarAutomationAccess,
  isMaintenanceProtectedPath,
} from '../../functions/_shared/maintenance-bypass';

const env = {
  MAINTENANCE_BYPASS_KEY: 'deployment-secret',
  RADAR_AUTOMATION_KEY: 'radar-secret',
} as never;

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

  it('limits the radar automation key to GET ranking routes', () => {
    const ranking = new Request('https://holybear.tw/api/rankings/combat-power', {
      headers: { 'x-radar-automation-key': 'radar-secret' },
    });
    const character = new Request('https://holybear.tw/api/characters/test', {
      headers: { 'x-radar-automation-key': 'radar-secret' },
    });
    const nexon = new Request('https://holybear.tw/api/nexon/id', {
      headers: { 'x-radar-automation-key': 'radar-secret' },
    });
    const rankingPost = new Request('https://holybear.tw/api/rankings/combat-power', {
      method: 'POST',
      headers: { 'x-radar-automation-key': 'radar-secret' },
    });

    expect(hasValidRadarAutomationAccess(ranking, env)).toBe(true);
    expect(hasValidRadarAutomationAccess(character, env)).toBe(false);
    expect(hasValidRadarAutomationAccess(nexon, env)).toBe(false);
    expect(hasValidRadarAutomationAccess(rankingPost, env)).toBe(false);
  });

  it('allows the radar workflow through middleware without granting character access', async () => {
    const next = vi.fn(async () => new Response('ranking'));
    const rankingResponse = await onRequest({
      env,
      request: new Request('https://holybear.tw/api/rankings/combat-power', {
        headers: { 'x-radar-automation-key': 'radar-secret' },
      }),
      next,
    } as never);
    const characterResponse = await onRequest({
      env,
      request: new Request('https://holybear.tw/api/characters/test', {
        headers: { 'x-radar-automation-key': 'radar-secret' },
      }),
      next,
    } as never);

    expect(await rankingResponse.text()).toBe('ranking');
    expect(characterResponse.status).toBe(503);
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

  it('validates a key without entering any NEXON query route', async () => {
    const valid = await validateBypass({
      env,
      request: new Request('https://holybear.tw/api/maintenance/validate', {
        method: 'POST',
        headers: { 'x-bypass-key': 'deployment-secret' },
      }),
    } as never);
    const invalid = await validateBypass({
      env,
      request: new Request('https://holybear.tw/api/maintenance/validate', { method: 'POST' }),
    } as never);

    expect(valid.status).toBe(200);
    expect(await valid.json()).toEqual({ ok: true, expiresInSeconds: 1800 });
    expect(invalid.status).toBe(503);
  });
});
