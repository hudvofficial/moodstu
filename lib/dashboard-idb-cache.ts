/**
 * IndexedDB Cache for Dashboard Data
 * Provides instant render with stale data while fresh data fetches in background
 */

import { get, set, del } from "idb-keyval";

const CACHE_KEY_PREFIX = "dashboard";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface CachedDashboardData {
  data: unknown;
  timestamp: number;
  version: string;
}

/**
 * Get cached dashboard section data
 */
export async function getCachedDashboardSection(
  section: string
): Promise<unknown | null> {
  try {
    const key = `${CACHE_KEY_PREFIX}:${section}`;
    const cached = (await get(key)) as CachedDashboardData | undefined;

    if (!cached) return null;

    const age = Date.now() - cached.timestamp;

    // If expired, delete and return null
    if (age > CACHE_TTL) {
      await del(key);
      return null;
    }

    return cached.data;
  } catch (error) {
    console.warn("[dashboard-idb] Failed to get cached data:", error);
    return null;
  }
}

/**
 * Set cached dashboard section data
 */
export async function setCachedDashboardSection(
  section: string,
  data: unknown
): Promise<void> {
  try {
    const key = `${CACHE_KEY_PREFIX}:${section}`;
    const cached: CachedDashboardData = {
      data,
      timestamp: Date.now(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    };

    await set(key, cached);
  } catch (error) {
    console.warn("[dashboard-idb] Failed to cache data:", error);
  }
}

/**
 * Clear all cached dashboard data
 */
export async function clearDashboardCache(): Promise<void> {
  try {
    const sections = ["critical", "revenue", "services", "events", "payments"];
    await Promise.all(
      sections.map((section) => del(`${CACHE_KEY_PREFIX}:${section}`))
    );
  } catch (error) {
    console.warn("[dashboard-idb] Failed to clear cache:", error);
  }
}

/**
 * Get cache age for a section (in seconds)
 */
export async function getCacheAge(section: string): Promise<number | null> {
  try {
    const key = `${CACHE_KEY_PREFIX}:${section}`;
    const cached = (await get(key)) as CachedDashboardData | undefined;

    if (!cached) return null;

    return Math.floor((Date.now() - cached.timestamp) / 1000);
  } catch {
    return null;
  }
}
