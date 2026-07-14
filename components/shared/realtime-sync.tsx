"use client";

import { useRealtimeSignal } from "@/hooks/use-realtime-signal";

interface Props {
  sourceTable: string;
  cacheKeys?: string[];
  prefixes?: string | string[];
  debounceMs?: number;
}

/**
 * Invisible realtime bridge. Prefer SWR keys/prefixes so table changes do not
 * fall back to a full route refresh.
 */
export function RealtimeSync({ sourceTable, cacheKeys, prefixes, debounceMs }: Props) {
  useRealtimeSignal(sourceTable, { cacheKeys, prefixes, debounceMs });
  return null;
}
