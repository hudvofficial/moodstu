"use client";

import { useRealtime } from "@/hooks/use-realtime";

export function ProductivityRealtimeBindings({
  overviewKey,
  detailKey,
}: {
  overviewKey: string;
  detailKey: string | null;
}) {
  const cacheKeys = detailKey ? [overviewKey, detailKey] : [overviewKey];

  useRealtime("work_tasks", {
    cacheKeys,
    debounceMs: 1000,
  });
  useRealtime("employees", {
    cacheKeys: [overviewKey],
    eventTypes: ["UPDATE"],
    debounceMs: 2000,
  });
  return null;
}
