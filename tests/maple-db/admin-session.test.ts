import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminSession } from '../../.vitepress/theme/composables/useAdminSession';

const session = useAdminSession();
beforeEach(() => { session.logout(); });
afterEach(() => { session.logout(); vi.unstubAllGlobals(); });

describe('shared in-memory admin session', () => {
  it('shares a verified login across both dashboards and retains the requested CSV content type', async () => {
    const mockFetch = vi.fn(async () => Response.json({ authenticated: true }));
    vi.stubGlobal('fetch', mockFetch);
    await session.login('survey-password');
    const otherPage = useAdminSession();
    expect(otherPage.authenticated.value).toBe(true);
    await otherPage.request('/api/admin/survey?format=csv', { headers: { accept: 'text/csv' } });
    const [path, options] = mockFetch.mock.calls.at(-1)! as unknown as [string, RequestInit];
    expect(path).toBe('/api/admin/survey?format=csv');
    expect(new Headers(options.headers).get('authorization')).toBe('Bearer survey-password');
    expect(new Headers(options.headers).get('accept')).toBe('text/csv');
    expect(options.cache).toBe('no-store');
    otherPage.logout();
    expect(session.authenticated.value).toBe(false);
  });

  it('keeps a rejected password unauthenticated', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({}, { status: 401 })));
    await expect(session.login('wrong')).rejects.toThrow('管理密碼不正確');
    expect(session.authenticated.value).toBe(false);
  });

  it('does not accept a static-page fallback as successful password verification', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Static fallback</html>', { headers: { 'content-type': 'text/html' } })));
    await expect(session.login('password')).rejects.toThrow('無法驗證管理密碼');
    expect(session.authenticated.value).toBe(false);
  });

  it('clears the shared session when an administrator password stops being accepted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ authenticated: true })).mockResolvedValueOnce(Response.json({}, { status: 401 })));
    await session.login('old-password');
    await expect(session.request('/api/admin/growth')).rejects.toThrow('管理密碼不正確');
    expect(session.authenticated.value).toBe(false);
  });

  it('preserves a valid session on a temporary data-service error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ authenticated: true })).mockResolvedValueOnce(Response.json({ error: { message: '暫時無法使用' } }, { status: 503 })));
    await session.login('password');
    await expect(session.request('/api/admin/growth')).rejects.toThrow('暫時無法使用');
    expect(session.authenticated.value).toBe(true);
  });

  it('discards a data response that arrives after logout', async () => {
    let resolveResponse!: (value: Response) => void;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ authenticated: true })).mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveResponse = resolve; })));
    await session.login('password');
    const pending = session.request('/api/admin/growth');
    session.logout();
    resolveResponse(Response.json({ reports: ['private'] }));
    await expect(pending).rejects.toThrow('已登出');
    expect(session.authenticated.value).toBe(false);
  });
});
