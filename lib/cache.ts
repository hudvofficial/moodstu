/**
 * ⚡ Server-Side Data Cache
 * Source: V1 lib/cache.ts (198 lines) — proven pattern
 *
 * - Lần 1: fetch từ Supabase (100-500ms) → cache kết quả
 * - Lần 2-N (trong TTL): trả cache NGAY (<1ms)
 * - Hết TTL: fetch mới, cache lại
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

 
const cache = new Map<string, CacheEntry<any>>();

// Hit Rate Monitor (dev only)
const isDev = process.env.NODE_ENV === "development";
let hitCount = 0;
let missCount = 0;

function logHitRate() {
  if (!isDev) return;
  const total = hitCount + missCount;
  if (total > 0 && total % 50 === 0) {
    const rate = Math.round((hitCount / total) * 100);
    console.log(`📊 [Cache Rate] ${rate}% HIT (${hitCount}/${total})`);
  }
}

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiry) cache.delete(key);
    }
  }, 5 * 60 * 1000);
}

/**
 * Cache wrapper cho async function
 *
 * @example
 * const stats = await cachedQuery('dashboard-stats', () => getDashboardStats(), 30)
 */
export async function cachedQuery<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 30,
): Promise<T> {
  // Dev Mode: skip cache for instant feedback
  if (isDev) return await fn();

  const now = Date.now();
  const existing = cache.get(key);

  if (existing && now < existing.expiry) {
    hitCount++;
    logHitRate();
    return existing.data;
  }

  missCount++;

  try {
    const data = await fn();
    cache.set(key, { data, expiry: now + ttlSeconds * 1000 });
    return data;
  } catch (error: unknown) {
    // Next.js Dynamic Usage error — rethrow silently
    const errObj = error as Record<string, unknown>;
    if (
      errObj?.digest === "DYNAMIC_SERVER_USAGE" ||
      (error instanceof Error && error.message?.includes("Dynamic server usage"))
    ) {
      throw error;
    }
    console.error(`❌ [Cache Error] "${key}":`, error);
    throw error;
  }
}

/**
 * Invalidate cache by pattern
 *
 * @example
 * invalidateCache('contracts')  // All keys containing 'contracts'
 * invalidateCache()             // Clear all
 */
export function invalidateCache(pattern?: string) {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

/**
 * Stale-While-Revalidate pattern
 * Returns stale data immediately while fetching fresh data in background
 *
 * @example
 * const stats = await swrQuery('dashboard-stats', fetchStats, 30, 60)
 * // 0-30s: fresh cache
 * // 30-60s: serve stale + background revalidate
 * // >60s: must wait for fresh fetch
 */
export async function swrQuery<T>(
  key: string,
  fn: () => Promise<T>,
  freshSeconds: number = 30,
  staleSeconds: number = 60,
): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key);

  if (existing) {
    const age = now - (existing.expiry - freshSeconds * 1000);

    // Fresh → return immediately
    if (now < existing.expiry) return existing.data;

    // Stale but within tolerance → return stale + background refresh
    if (age < staleSeconds * 1000) {
      fn()
        .then((newData) => {
          cache.set(key, { data: newData, expiry: Date.now() + freshSeconds * 1000 });
        })
        .catch(() => {}); // Silent fail

      return existing.data;
    }
  }

  // No cache or too old → must wait
  const data = await fn();
  cache.set(key, { data, expiry: now + freshSeconds * 1000 });
  return data;
}
