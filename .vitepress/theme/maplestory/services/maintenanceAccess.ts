export const BYPASS_STORAGE_KEY = 'holybear_bypass_key';
export const BYPASS_EXPIRY_STORAGE_KEY = 'holybear_bypass_expires_at';
export const MAINTENANCE_LOCK_EVENT = 'holybear:maintenance-lock';
export const BYPASS_TTL_MS = 30 * 60 * 1000;

const removeSavedBypass = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(BYPASS_STORAGE_KEY);
  window.localStorage.removeItem(BYPASS_EXPIRY_STORAGE_KEY);
};

export const readSavedBypassKey = () => {
  if (typeof window === 'undefined') return '';
  const key = window.localStorage.getItem(BYPASS_STORAGE_KEY) || '';
  const expiresAt = Number(window.localStorage.getItem(BYPASS_EXPIRY_STORAGE_KEY));
  if (!key || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    removeSavedBypass();
    return '';
  }
  return key;
};

export const saveBypassKey = (key: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BYPASS_STORAGE_KEY, key);
  window.localStorage.setItem(BYPASS_EXPIRY_STORAGE_KEY, String(Date.now() + BYPASS_TTL_MS));
};

export const clearBypassKey = () => {
  removeSavedBypass();
};

export const readBypassExpiresAt = () => {
  if (typeof window === 'undefined') return 0;
  const expiresAt = Number(window.localStorage.getItem(BYPASS_EXPIRY_STORAGE_KEY));
  return Number.isFinite(expiresAt) ? expiresAt : 0;
};

export const lockMaintenanceView = () => {
  clearBypassKey();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(MAINTENANCE_LOCK_EVENT));
  }
};

export const maintenanceFetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  key = readSavedBypassKey(),
) => {
  const headers = new Headers(init.headers || {});
  const requestUrl = typeof window === 'undefined'
    ? null
    : new URL(input instanceof Request ? input.url : input.toString(), window.location.href);
  if (key && requestUrl?.origin === window.location.origin) {
    headers.set('x-bypass-key', key);
  }
  const response = await fetch(input, { ...init, headers });

  if (response.status === 401 || response.status === 503) {
    lockMaintenanceView();
  }
  return response;
};

export const validateMaintenanceBypass = async (key: string) => {
  const response = await maintenanceFetch('/api/maintenance/validate', {
    method: 'POST',
    cache: 'no-store',
    headers: { accept: 'application/json', 'x-bypass-key': key },
  }, key);
  return response.ok;
};
