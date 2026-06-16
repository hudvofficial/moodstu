"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { MODULES } from "@/lib/navigation";
import { ROLE_PERMISSIONS, type Role } from "@/types/roles";
import { prewarmRouteData, debugPrefetch } from "@/lib/navigation-data-prefetch";

const WARMUP_ORDER = [
  "/dashboard",
  "/contracts",
  "/calendar",
  "/crm/leads",
  "/finance",
  "/services",
  "/inventory",
  "/employees",
  "/dresses",
  "/printing",
  "/reports",
  "/productivity",
  "/settings",
  "/moodie",
];

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

function scheduleIdle(callback: () => void) {
  const w = window as IdleWindow;

  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(callback, { timeout: 2000 });
    return () => w.cancelIdleCallback?.(id);
  }

  const id = window.setTimeout(callback, 800);
  return () => window.clearTimeout(id);
}

function shouldSkipWarmup() {
  const nav = navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };

  const connection = nav.connection;
  if (connection?.saveData) return true;

  const effectiveType = connection?.effectiveType;
  if (effectiveType === "slow-2g" || effectiveType === "2g") return true;

  return false;
}

export function NavigationWarmup({ role }: { role: Role }) {
  const router = useRouter();
  const pathname = usePathname();

  const hrefs = React.useMemo(() => {
    const allowed = new Set(ROLE_PERMISSIONS[role] || []);
    const moduleHrefs = MODULES.filter((item) => allowed.has(item.id)).map(
      (item) => item.href,
    );

    return ["/dashboard", ...moduleHrefs]
      .filter((href, index, list) => list.indexOf(href) === index)
      .filter((href) => pathname !== href && !pathname.startsWith(`${href}/`))
      .sort((a, b) => WARMUP_ORDER.indexOf(a) - WARMUP_ORDER.indexOf(b));
  }, [pathname, role]);

  React.useEffect(() => {
    if (hrefs.length === 0) return;
    if (shouldSkipWarmup()) return;

    let cancelled = false;
    let cancelIdle: (() => void) | undefined;
    const timeoutIds: number[] = [];

    const startId = window.setTimeout(() => {
      cancelIdle = scheduleIdle(() => {
        hrefs.slice(0, 4).forEach((href, index) => {
          const id = window.setTimeout(() => {
            if (!cancelled) {
              debugPrefetch("navigation-warmup", href);
              router.prefetch(href);
              if (index === 0) prewarmRouteData(href);
            }
          }, index * 200);
          timeoutIds.push(id);
        });
      });
    }, 3000);

    return () => {
      cancelled = true;
      window.clearTimeout(startId);
      cancelIdle?.();
      timeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, [hrefs, router]);

  return null;
}
