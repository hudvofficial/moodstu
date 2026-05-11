"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { invalidateDashboardCache } from "@/app/actions/dashboard-cache";
import { createClient } from "@/lib/supabase/client";

const DASHBOARD_REALTIME_TABLES = [
  "contracts",
  "payments",
  "receipts",
  "payment_plans",
  "contract_events",
  "schedules",
  "work_tasks",
] as const;

const DASHBOARD_REALTIME_DEBOUNCE_MS = 800;

export function DashboardRealtimeRefresh() {
  const router = useRouter();
  const refreshTimerRef = useRef<number | null>(null);
  const pendingRefreshRef = useRef<Promise<void> | null>(null);
  const changedTablesRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  const flushRefreshRef = useRef<() => void>(() => {});

  const flushRefresh = useCallback(() => {
    if (pendingRefreshRef.current) return;

    const changedTables = Array.from(changedTablesRef.current);
    changedTablesRef.current.clear();

    pendingRefreshRef.current = invalidateDashboardCache(changedTables)
      .catch((error) => {
        console.warn("[dashboard-realtime] cache invalidation failed", error);
      })
      .finally(() => {
        pendingRefreshRef.current = null;
        if (mountedRef.current) router.refresh();
        if (
          mountedRef.current &&
          changedTablesRef.current.size > 0 &&
          !refreshTimerRef.current
        ) {
          refreshTimerRef.current = window.setTimeout(() => {
            refreshTimerRef.current = null;
            flushRefreshRef.current();
          }, DASHBOARD_REALTIME_DEBOUNCE_MS);
        }
      });
  }, [router]);

  useEffect(() => {
    flushRefreshRef.current = flushRefresh;
  }, [flushRefresh]);

  const scheduleRefresh = useCallback((table: string) => {
    changedTablesRef.current.add(table);
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      flushRefresh();
    }, DASHBOARD_REALTIME_DEBOUNCE_MS);
  }, [flushRefresh]);

  useEffect(() => {
    mountedRef.current = true;

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let disposed = false;

    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (disposed || !session) return;

      channel = supabase.channel("dashboard-realtime");
      for (const table of DASHBOARD_REALTIME_TABLES) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => scheduleRefresh(table),
        );
      }

      channel.subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[dashboard-realtime] channel status=${status}`);
        }
      });
    };

    void setup();

    return () => {
      disposed = true;
      mountedRef.current = false;
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [scheduleRefresh]);

  return null;
}
