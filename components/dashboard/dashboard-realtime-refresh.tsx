"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { invalidateDashboardCache } from "@/app/actions/dashboard-cache";
import { createClient } from "@/lib/supabase/client";
import type { DashboardVisibility } from "@/types/dashboard";

const TABLE_VISIBILITY_MAP: Record<string, keyof DashboardVisibility> = {
  contracts: "canViewContracts",
  contract_events: "canViewContracts",
  payments: "canViewFinancials",
  receipts: "canViewFinancials",
  payment_plans: "canViewFinancials",
  schedules: "canViewCalendar",
  work_tasks: "canViewCalendar",
};

const DASHBOARD_REALTIME_DEBOUNCE_MS = 800;

interface DashboardRealtimeRefreshProps {
  visibility: DashboardVisibility;
}

export function DashboardRealtimeRefresh({ visibility }: DashboardRealtimeRefreshProps) {
  const refreshTimerRef = useRef<number | null>(null);
  const pendingRefreshRef = useRef<Promise<void> | null>(null);
  const changedTablesRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  const flushRefreshRef = useRef<() => void>(() => {});

  // Only subscribe to tables the user has visibility for
  const subscribedTables = useMemo(() => {
    return Object.entries(TABLE_VISIBILITY_MAP)
      .filter(([, visibilityKey]) => visibility[visibilityKey])
      .map(([table]) => table);
  }, [visibility]);

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
        if (mountedRef.current) {
          window.dispatchEvent(
            new CustomEvent("dashboard:cache-invalidated", {
              detail: { changedTables },
            }),
          );
        }
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
  }, []);

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

    // No tables to subscribe to
    if (subscribedTables.length === 0) return;

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let disposed = false;

    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (disposed || !session) return;

      channel = supabase.channel("dashboard-realtime");
      for (const table of subscribedTables) {
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
  }, [scheduleRefresh, subscribedTables]);

  return null;
}
