"use client";

import * as React from "react";
import { BREAKPOINTS, mediaQueries } from "@/lib/breakpoints";

/**
 * Hook: useIsMobile
 * Returns true when viewport width < 1024px (Tailwind lg: breakpoint)
 *
 * Aligned with CSS max-lg: utilities for consistency.
 * Use for: Showing/hiding mobile-specific UI, bottom nav, mobile header behavior
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(mediaQueries.belowDesktop);
    const onChange = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.lg);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < BREAKPOINTS.lg);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/**
 * Hook: useIsTablet
 * Returns true when viewport is 640px-1023px (sm: to lg:)
 *
 * Use for: Tablet-specific layouts, compact sidebars
 */
export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(mediaQueries.tablet);
    const onChange = () => {
      setIsTablet(window.innerWidth >= BREAKPOINTS.sm && window.innerWidth < BREAKPOINTS.lg);
    };
    mql.addEventListener("change", onChange);
    setIsTablet(window.innerWidth >= BREAKPOINTS.sm && window.innerWidth < BREAKPOINTS.lg);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isTablet;
}

/**
 * Hook: useIsSmallMobile
 * Returns true when viewport width < 640px (pure mobile)
 *
 * Use for: Extra compact layouts, very small screen optimizations
 */
export function useIsSmallMobile() {
  const [isSmallMobile, setIsSmallMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(mediaQueries.mobile);
    const onChange = () => {
      setIsSmallMobile(window.innerWidth < BREAKPOINTS.sm);
    };
    mql.addEventListener("change", onChange);
    setIsSmallMobile(window.innerWidth < BREAKPOINTS.sm);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isSmallMobile;
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
export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = React.useState<DeviceTier>("desktop");

  React.useEffect(() => {
    const compute = (): DeviceTier => {
      const w = window.innerWidth;
      if (w < BREAKPOINTS.md) return "phone";
      if (w < BREAKPOINTS.lg) return "tablet";
      return "desktop";
    };
    const onChange = () => setTier(compute());
    const mqlMd = window.matchMedia(mediaQueries.tabletUp);
    const mqlLg = window.matchMedia(mediaQueries.desktop);
    mqlMd.addEventListener("change", onChange);
    mqlLg.addEventListener("change", onChange);
    setTier(compute());
    return () => {
      mqlMd.removeEventListener("change", onChange);
      mqlLg.removeEventListener("change", onChange);
    };
  }, []);

  return tier;
}
