"use client";

/**
 * ═══════════════════════════════════════════════════════════
 * useListFilters — Universal List Filter Hook (nuqs-powered)
 * ═══════════════════════════════════════════════════════════
 *
 * Giải quyết: router.push lag (200-800ms) → instant tab switch
 *
 * Cách hoạt động:
 *   1. Filter state SYNC với URL params (shareable, F5-proof)
 *   2. Dùng nuqs để update URL INSTANT (không gây server re-render)
 *   3. SWR tự detect key thay đổi → fetch data ngầm
 *
 * Dùng cho tất cả modules:
 *   Contracts: useContractFilters (wraps useListFilters)
 *   CRM:       useCRMFilters      (wraps useListFilters)
 *   Finance:   useFinanceFilters  (wraps useListFilters)
 *   ...
 *
 * Usage:
 *   const { params, setParam, setParams, resetParams } = useListFilters({
 *     status: "all",
 *     sort:   "newest",
 *     q:      "",
 *     page:   "1",
 *   })
 * ═══════════════════════════════════════════════════════════
 */

import { useQueryStates, parseAsString } from "nuqs";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────
/** Default values config — string values only (URL params are strings) */
export type FilterDefaults = Record<string, string>;

export type FilterParams<T extends FilterDefaults> = {
  [K in keyof T]: string;
};

export interface UseListFiltersReturn<T extends FilterDefaults> {
  /** Current filter values (typed to config keys) */
  params: FilterParams<T>;
  /** Set a single param instantly (instant URL sync, no lag) */
  setParam: (key: keyof T, value: string) => void;
  /** Set multiple params at once (1 URL push for all changes) */
  setParams: (updates: Partial<FilterParams<T>>) => void;
  /** Reset all params to their default values */
  resetParams: () => void;
  /** True when any param differs from default (filters are active) */
  hasActiveFilters: boolean;
}

// ── Hook ──────────────────────────────────────────────────────
export function useListFilters<T extends FilterDefaults>(
  defaults: T
): UseListFiltersReturn<T> {
  const pathname = usePathname();
  const mountedPathRef = useRef(pathname);
  // Build nuqs parsers from defaults (all treated as string URL params)
  const parsers = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(defaults).map(([key, defaultVal]) => [
          key,
          parseAsString.withDefault(defaultVal),
        ])
      ) as { [K in keyof T]: ReturnType<typeof parseAsString.withDefault> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // defaults object reference should be stable (pass literal)
  );

  useEffect(() => {
    mountedPathRef.current = pathname;
  }, [pathname]);

  // nuqs useQueryStates — manages all params together, 1 URL push per batch
  const [queryState, setQueryState] = useQueryStates(parsers, {
    // shallow: true → URL changes but does NOT trigger server component re-render
    // This is the key to instant navigation!
    shallow: true,
    // scroll: false → page does not scroll to top on filter change
    scroll: false,
  });

  // Current params (cast to correct type)
  const params = queryState as FilterParams<T>;

  const safeSetQueryState = useCallback(
    (updates: Parameters<typeof setQueryState>[0]) => {
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        if (currentPath !== mountedPathRef.current) {
          return;
        }
      }

      setQueryState(updates);
    },
    [setQueryState]
  );

  // Set a single param
  const setParam = useCallback(
    (key: keyof T, value: string) => {
      safeSetQueryState({ [key]: value } as Partial<typeof queryState>);
    },
    [safeSetQueryState]
  );

  // Set multiple params at once (batched → 1 URL push)
  const setParams = useCallback(
    (updates: Partial<FilterParams<T>>) => {
      safeSetQueryState(updates as Partial<typeof queryState>);
    },
    [safeSetQueryState]
  );

  // Reset all to defaults
  const resetParams = useCallback(() => {
    // nuqs: setting to null resets to defaultValue
    const nulls = Object.fromEntries(
      Object.keys(defaults).map((key) => [key, null])
    );
    safeSetQueryState(nulls as Parameters<typeof setQueryState>[0]);
  }, [defaults, safeSetQueryState]);

  // Check if any filter is non-default
  const hasActiveFilters = useMemo(
    () =>
      Object.entries(defaults).some(
        ([key, defaultVal]) => params[key] !== defaultVal
      ),
    [params, defaults]
  );

  return {
    params,
    setParam,
    setParams,
    resetParams,
    hasActiveFilters,
  };
}
