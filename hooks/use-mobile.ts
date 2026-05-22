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
