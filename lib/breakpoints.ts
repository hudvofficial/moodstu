/**
 * Centralized Breakpoint System
 *
 * SSOT for responsive breakpoints across the entire app.
 * Matches Tailwind CSS default breakpoints for consistency.
 *
 * Usage:
 * - JS/TS: import { BREAKPOINTS, mediaQueries } from '@/lib/breakpoints'
 * - CSS: Use Tailwind utilities (sm:, md:, lg:, xl:)
 */

export const BREAKPOINTS = {
  /** Mobile: 0-639px */
  sm: 640,
  /** Tablet: 640-1023px */
  md: 768,
  /** Desktop: 1024px+ (Tailwind lg:) */
  lg: 1024,
  /** Large Desktop: 1280px+ */
  xl: 1280,
  /** Extra Large: 1536px+ */
  "2xl": 1536,
} as const;

/**
 * Media query helpers for useMediaQuery hooks
 */
export const mediaQueries = {
  /** Mobile only: max-width 639px */
  mobile: `(max-width: ${BREAKPOINTS.sm - 1}px)`,
  /** Tablet: 640-1023px */
  tablet: `(min-width: ${BREAKPOINTS.sm}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  /** Desktop: 1024px+ */
  desktop: `(min-width: ${BREAKPOINTS.lg}px)`,
  /** Mobile + Tablet: max-width 1023px (before lg:) */
  belowDesktop: `(max-width: ${BREAKPOINTS.lg - 1}px)`,
  /** Touch devices (typically mobile/tablet) */
  touch: "(hover: none) and (pointer: coarse)",
  /** Landscape orientation on small screens */
  landscapeSmall: "(orientation: landscape) and (max-height: 600px)",
} as const;

/**
 * Legacy aliases for backwards compatibility
 * @deprecated Use BREAKPOINTS.lg instead
 */
export const MOBILE_BREAKPOINT = BREAKPOINTS.lg; // Changed from 768 to 1024
export const TABLET_BREAKPOINT = BREAKPOINTS.lg; // Kept at 1024 for desktop threshold
