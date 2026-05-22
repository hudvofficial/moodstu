"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { prewarmDashboardCritical } from "@/lib/api/dashboard";

/**
 * Prefetch dashboard critical data on hover/focus
 * Use in sidebar link to /dashboard for instant navigation
 */
export function useDashboardPrefetch() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  const prefetch = () => {
    // Prefetch RSC payload
    router.prefetch("/dashboard");

    // Prewarm critical data cache
    void prewarmDashboardCritical().catch(() => {
      // Silent fail - not critical for navigation
    });
  };

  return prefetch;
}
