/**
 * Centralized Breakpoint System
 *
 * SSOT for responsive breakpoints across the entire app.
 * Matches Tailwind CSS default breakpoints for consistency.
 *
 * ─── 3-TIER RESPONSIVE CONVENTION (chốt 2026-06-06, xem plans/260606-tablet-design-layer/PLAN.md) ───
 *   Phone   : < 768px   → base / max-md:  — 1 cột, card stack, bottom-sheet, bottom-nav
 *   Tablet  : 768–1023px → md:            — bảng/2 cột density desktop, modal căn giữa
 *   Desktop : ≥ 1024px  → lg:             — chrome full width (sidebar rộng, dashboard đa cột)
 *
 * QUY ƯỚC CLASS:
 *   • Bật layout desktop-density (bảng vs card, 1↔2 cột) → `hidden md:block` / `md:hidden`
 *   • Chrome cần full width (sidebar rộng, 3 cột)        → giữ `lg:`
 *   • Tinh chỉnh CHỈ tablet                               → `md:max-lg:`
 *   • Overlay/modal căn giữa                              → `sm:` (640px, đã ship 652fe95)
 *
 * Usage:
 * - JS/TS: import { BREAKPOINTS, mediaQueries } from '@/lib/breakpoints'; hoặc useDeviceTier()
 * - CSS: Use Tailwind utilities (md:, lg:) theo quy ước trên
 */

export const BREAKPOINTS = {
  /** sm tier: 640px (overlay/modal centering cutoff) */
  sm: 640,
  /** md tier: 768px — PHONE↔TABLET cutoff (layout density toggle) */
  md: 768,
  /** lg tier: 1024px — TABLET↔DESKTOP cutoff (full-width chrome) */
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
  /** Small-mobile only: max-width 639px (legacy — overlay/swipe gating) */
  mobile: `(max-width: ${BREAKPOINTS.sm - 1}px)`,
  /** @deprecated legacy 640-1023 band — dùng tabletOnly cho convention 3-tier mới */
  tablet: `(min-width: ${BREAKPOINTS.sm}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  /** Desktop: 1024px+ */
  desktop: `(min-width: ${BREAKPOINTS.lg}px)`,
  /** Mobile + Tablet: max-width 1023px (before lg:) — drives legacy useIsMobile */
  belowDesktop: `(max-width: ${BREAKPOINTS.lg - 1}px)`,
  // ─── 3-tier convention (768/1024) ───
  /** Phone only: < 768px */
  phoneOnly: `(max-width: ${BREAKPOINTS.md - 1}px)`,
  /** Tablet + up: >= 768px (layout density toggle) */
  tabletUp: `(min-width: ${BREAKPOINTS.md}px)`,
  /** Tablet only: 768-1023px */
  tabletOnly: `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
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
