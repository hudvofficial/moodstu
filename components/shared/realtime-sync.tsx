"use client";

import { useRealtime } from "@/hooks/use-realtime";

interface Props {
  table: string;
  cacheKeys?: string[];
  prefixes?: string | string[];
  filter?: string;
  debounceMs?: number;
}

/**
 * Invisible realtime bridge. Prefer SWR keys/prefixes so table changes do not
 * fall back to a full route refresh.
 */
export function RealtimeSync({ table, cacheKeys, prefixes, filter, debounceMs }: Props) {
  useRealtime(table, { cacheKeys, prefixes, filter, debounceMs });
  return null;
}
