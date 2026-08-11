import axios, { AxiosError } from 'axios';

const TOKEN_KEY = 'garuda_access_token';
const REFRESH_KEY = 'garuda_refresh_token';
const USER_KEY = 'garuda_user';

export const storage = {
  getAccess: () => localStorage.getItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  setSession: (user: unknown, access: string, refresh: string) => {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://garuda-studyhub-api.onrender.com' : '/api')).trim();
const normalizedApiBaseUrl = apiBaseUrl.replace(/\/$/, '');

export const api = axios.create({
  baseURL: normalizedApiBaseUrl || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Runtime detection: try candidate hosts to find a reachable backend and set api.defaults.baseURL.
// This helps when build-time env vars or platform rewrites are misconfigured.
export const apiReady: Promise<void> = (async () => {
  const candidates = [
    (import.meta.env.VITE_API_BASE_URL || '').trim(),
    'https://garuda-ai-studyhub.onrender.com',
    '/api',
  ].filter(Boolean);

  async function probe(url: string) {
    try {
      // Normalize: if url starts with '/', treat as relative
      const healthUrl = url.startsWith('/') ? `${url.replace(/\/$/, '')}/health` : `${url.replace(/\/$/, '')}/api/health`;
      const res = await fetch(healthUrl, { method: 'GET', credentials: 'include' });
      if (!res.ok) return false;
      // quick sanity check for JSON
      const text = await res.text();
      if (!text) return false;
      try { JSON.parse(text); } catch { /* not JSON but ok */ }
      api.defaults.baseURL = url.startsWith('/') ? url.replace(/\/$/, '') : (url.replace(/\/$/, '') + '/api');
      console.log('[api] selected baseURL:', api.defaults.baseURL);
      return true;
    } catch (e) {
      console.debug('[api] probe failed', url, e?.message || e);
      return false;
    }
  }

  for (const c of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await probe(c);
    if (ok) return;
  }

  // fallback: keep relative /api
  api.defaults.baseURL = normalizedApiBaseUrl || '/api';
  console.warn('[api] no remote backend detected, falling back to', api.defaults.baseURL);
})();

api.interceptors.request.use((config) => {
  const token = storage.getAccess();
  if (token) {
    if (!config.headers) config.headers = {} as any;
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = storage.getRefresh();
  if (!refreshToken) throw new Error('no refresh token');
  const { data } = await api.post('/auth/refresh', { refreshToken });
  const { accessToken, refreshToken: newRefresh, user } = data.data;
  storage.setSession(user, accessToken, newRefresh);
  return accessToken;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        refreshing = refreshing || refreshAccessToken().finally(() => (refreshing = null));
        const token = await refreshing;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        storage.clear();
        if (window.location.pathname !== '/login') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const responseData = err.response?.data;
    const data = typeof responseData === 'string' ? (() => {
      try {
        return JSON.parse(responseData);
      } catch {
        return responseData;
      }
    })() : responseData;

    if (data?.error?.details?.length) {
      return data.error.details.map((d: any) => d.message).join(', ');
    }
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
    if (typeof data === 'string' && data.trim()) return data;
    if (err.response?.statusText) return `${err.response.statusText} (${err.response.status})`;
    if (err.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?';
    return err.message || 'Something went wrong';
  }
  return (err as Error)?.message || 'Something went wrong';
}

export function handleError(err: unknown): string {
  return errorMessage(err);
}
