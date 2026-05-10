"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { invalidateDashboardCache } from "@/app/actions/dashboard-cache";
import { useRealtime } from "@/hooks/use-realtime";

const DASHBOARD_REALTIME_TABLES = [
  "contracts",
  "payments",
  "receipts",
  "payment_plans",
  "contract_events",
  "schedules",
  "work_tasks",
] as const;

function DashboardRealtimeTable({
  table,
  onChange,
}: {
  table: (typeof DASHBOARD_REALTIME_TABLES)[number];
  onChange: () => void;
}) {
  useRealtime(table, {
    debounceMs: 500,
    channelName: `dashboard-${table}`,
    onChange,
  });

  return null;
}

export function DashboardRealtimeRefresh() {
  const router = useRouter();
  const pendingRefreshRef = useRef<Promise<void> | null>(null);

  const handleChange = useCallback(() => {
    if (pendingRefreshRef.current) return;

    pendingRefreshRef.current = invalidateDashboardCache()
      .catch((error) => {
        console.warn("[dashboard-realtime] cache invalidation failed", error);
      })
      .finally(() => {
        pendingRefreshRef.current = null;
        router.refresh();
      });
  }, [router]);

  return (
    <>
      {DASHBOARD_REALTIME_TABLES.map((table) => (
        <DashboardRealtimeTable
          key={table}
          table={table}
          onChange={handleChange}
        />
      ))}
    </>
  );
}
