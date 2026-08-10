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

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').trim();
const normalizedApiBaseUrl = apiBaseUrl.replace(/\/$/, '');

export const api = axios.create({
  baseURL: normalizedApiBaseUrl || '/api',
  headers: { 'Content-Type': 'application/json' },
});

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
  const { data } = await axios.post('/auth/refresh', { refreshToken });
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
