type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export const SHEETS_CACHE_TTLS = {
  inventory: 60_000,
  transactions: 60_000,
  corrections: 60_000,
  weeklyMenu: 5 * 60_000,
  dailyReportSettings: 5 * 60_000,
  dailyReportSource: 30_000,
} as const;

export type SheetsCacheKey = keyof typeof SHEETS_CACHE_TTLS | string;

export function invalidateSheetsCache(keys: SheetsCacheKey | SheetsCacheKey[]): void {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    cache.delete(key);
    inflight.delete(key);
  }
}

export function invalidateAllSheetsCache(): void {
  cache.clear();
  inflight.clear();
}

export async function cachedSheetsFetch<T>(
  key: SheetsCacheKey,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = fetcher()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise as Promise<T>;
}
