"use client";

import * as React from "react";
import { BREAKPOINTS, mediaQueries } from "@/lib/breakpoints";

export type DesktopBreakpoint = "lg" | "xl";

function subscribeToQuery(query: string, onStoreChange: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function useMediaQueryValue(query: string, getValue: () => boolean) {
  return React.useSyncExternalStore(
    (onStoreChange) => subscribeToQuery(query, onStoreChange),
    getValue,
    () => false,
  );
}

/**
 * Hook: useIsMobile
 * Returns true when viewport width < 1024px (Tailwind lg: breakpoint)
 *
 * Aligned with CSS max-lg: utilities for consistency.
 * Use for: Showing/hiding mobile-specific UI, bottom nav, mobile header behavior
 */
export function useIsMobile() {
  return useMediaQueryValue(
    mediaQueries.belowDesktop,
    () => window.innerWidth < BREAKPOINTS.lg,
  );
}

/**
 * Hook: useIsTablet
 * Returns true when viewport is 640px-1023px (sm: to lg:)
 *
 * Use for: Tablet-specific layouts, compact sidebars
 */
export function useIsTablet() {
  return useMediaQueryValue(
    mediaQueries.tablet,
    () => window.innerWidth >= BREAKPOINTS.sm && window.innerWidth < BREAKPOINTS.lg,
  );
}

/**
 * Hook: useIsSmallMobile
 * Returns true when viewport width < 640px (pure mobile)
 *
 * Use for: Extra compact layouts, very small screen optimizations
 */
export function useIsSmallMobile() {
  return useMediaQueryValue(
    mediaQueries.mobile,
    () => window.innerWidth < BREAKPOINTS.sm,
  );
}

/** 3-tier device classification — xem quy ước ở lib/breakpoints.ts */
export type DeviceTier = "phone" | "tablet" | "desktop";

/**
 * Hook: useDeviceTier (3-tier convention 768/1024)
 * Returns 'phone' (<768px) | 'tablet' (768-1023px) | 'desktop' (>=1024px).
 *
 * SSR-safe: trả "desktop" cho tới khi mount (khớp default của useIsMobile=false).
 * ⚠️ CSS-first: ưu tiên Tailwind md:/lg:; chỉ dùng hook này khi BUỘC swap component bằng JS.
 * Component swap-by-JS nên gate bằng `mounted` để tránh hydration flash (xem calendar-wrapper).
 */
export function useDeviceTier(desktopAt: DesktopBreakpoint = "lg"): DeviceTier {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      const mqlMd = window.matchMedia(mediaQueries.tabletUp);
      const mqlDesktop = window.matchMedia(
        desktopAt === "xl" ? mediaQueries.largeDesktop : mediaQueries.desktop,
      );
      mqlMd.addEventListener("change", onStoreChange);
      mqlDesktop.addEventListener("change", onStoreChange);
      return () => {
        mqlMd.removeEventListener("change", onStoreChange);
        mqlDesktop.removeEventListener("change", onStoreChange);
      };
    },
    () => {
      const w = window.innerWidth;
      const desktopCutoff = desktopAt === "xl" ? BREAKPOINTS.xl : BREAKPOINTS.lg;
      if (w < BREAKPOINTS.md) return "phone";
      if (w < desktopCutoff) return "tablet";
      return "desktop";
    },
    () => "desktop",
  );
}
