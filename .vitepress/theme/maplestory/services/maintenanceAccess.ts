export const BYPASS_STORAGE_KEY = 'holybear_bypass_key';
export const MAINTENANCE_LOCK_EVENT = 'holybear:maintenance-lock';

export const readSavedBypassKey = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(BYPASS_STORAGE_KEY) || '';
};

export const saveBypassKey = (key: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BYPASS_STORAGE_KEY, key);
};

export const clearBypassKey = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(BYPASS_STORAGE_KEY);
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
