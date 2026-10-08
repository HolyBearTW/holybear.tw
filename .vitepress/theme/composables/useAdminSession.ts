import { computed, shallowRef } from 'vue';

// Shared only by client-side navigation in the current page. Never persisted
// to browser storage, URLs, or cookies, and never populated during SSR.
const secret = shallowRef('');
const authenticated = computed(() => Boolean(secret.value));
let version = 0;

const logout = () => {
  version += 1;
  secret.value = '';
};

const authorizedFetch = async (path: string, password: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${password}`);
  if (!headers.has('accept')) headers.set('accept', 'application/json');
  const response = await fetch(path, { ...init, headers, cache: 'no-store' });
  if (!response.ok) {
    if (response.status === 401) throw new Error('管理密碼不正確或已失效，請重新登入。');
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || '無法讀取管理資料，請稍後再試。');
  }
  return response;
};

const login = async (password: string) => {
  const currentVersion = version;
  const response = await authorizedFetch('/api/admin/session', password);
  const body = await response.json().catch(() => null) as { authenticated?: boolean } | null;
  if (body?.authenticated !== true) throw new Error('無法驗證管理密碼，請稍後再試。');
  if (currentVersion !== version) throw new Error('登入已取消，請重新登入。');
  version += 1;
  secret.value = password;
};

const request = async (path: string, init: RequestInit = {}) => {
  if (!secret.value) throw new Error('請先登入管理後台。');
  const currentVersion = version;
  const password = secret.value;
  try {
    const response = await authorizedFetch(path, password, init);
    if (currentVersion !== version) throw new Error('已登出管理後台，請重新登入。');
    return response;
  } catch (error) {
    if (currentVersion === version && error instanceof Error
      && error.message === '管理密碼不正確或已失效，請重新登入。') logout();
    throw error;
  }
};

export const useAdminSession = () => ({ authenticated, login, logout, request });
