type CacheEntry = { value: any; expiresAt: number };

const store = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = Number(process.env.CACHE_TTL_MS || 30000); // 30s default

export function getCached<T = any>(key: string): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function setCached(key: string, value: any, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearCache() {
  store.clear();
}
