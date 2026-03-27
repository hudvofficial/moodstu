"use client";

/**
 * 📡 RealtimeSync — Invisible client wrapper that subscribes to
 * Supabase Realtime changes on a given table.
 *
 * When any INSERT/UPDATE/DELETE occurs, the useRealtime hook triggers
 * router.refresh() → RSC re-renders → fresh data automatically.
 *
 * Usage: <RealtimeSync table="contracts" />
 * Zero DOM impact (renders null).
 */

import { useRealtime } from "@/hooks/use-realtime";

interface Props {
  table: string;
}

export function RealtimeSync({ table }: Props) {
  useRealtime(table);
  return null;
}
