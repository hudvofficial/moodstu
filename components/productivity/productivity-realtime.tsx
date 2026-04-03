"use client";

import { useRealtime } from "@/hooks/use-realtime";

export function ProductivityRealtimeBindings({
  overviewKey,
  detailKey,
}: {
  overviewKey: string;
  detailKey: string | null;
}) {
  useRealtime("work_tasks", detailKey ? [overviewKey, detailKey] : [overviewKey]);
  useRealtime("employees", [overviewKey]);

  return detailKey ? <ProductivityDetailRealtime detailKey={detailKey} /> : null;
}

function ProductivityDetailRealtime({ detailKey }: { detailKey: string }) {
  useRealtime("contracts", [detailKey]);
  useRealtime("customers", [detailKey]);
  useRealtime("contract_events", [detailKey]);
  return null;
}
