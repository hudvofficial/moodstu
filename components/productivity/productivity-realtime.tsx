"use client";

import { useRealtimeSignal } from "@/hooks/use-realtime-signal";

export function ProductivityRealtimeBindings({
  overviewKey,
  detailKey,
}: {
  overviewKey: string;
  detailKey: string | null;
}) {
  const cacheKeys = detailKey ? [overviewKey, detailKey] : [overviewKey];

  useRealtimeSignal("work_tasks", {
    cacheKeys,
    debounceMs: 1000,
  });
  // Tín hiệu qua realtime_signals (employees server-only) — signal là INSERT,
  // không filter op UPDATE được; employees đổi hiếm nên revalidate thừa không đáng kể.
  useRealtimeSignal("employees", {
    cacheKeys: [overviewKey],
    debounceMs: 2000,
  });
  return null;
}
