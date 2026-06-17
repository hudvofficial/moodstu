"use client";

import { type ReactNode, useState, useEffect } from "react";
import { type DesktopBreakpoint, useDeviceTier } from "@/hooks/use-mobile";

interface TierSwitchProps {
  /** Content for phone (<768px) */
  phone: ReactNode;
  /** Content for tablet (768-1023px). Falls back to `desktop` if omitted. */
  tablet?: ReactNode;
  /** Content for desktop (default ≥1024px; use desktopAt="xl" for dense operational tablet-wide views) */
  desktop: ReactNode;
  desktopAt?: DesktopBreakpoint;
  /**
   * SSR / pre-mount fallback. Shown until client JS determines the tier.
   * Default: `null` (renders nothing — invisible for auth-gated SaaS pages).
   * Pass a skeleton if above-the-fold content needs instant SSR paint.
   */
  fallback?: ReactNode;
}

/**
 * Render exactly ONE tier based on viewport width. Zero DOM waste after mount.
 *
 * SSR-safe: renders `fallback` (default null) until mount, then the correct tier.
 * No wrapper divs — children go directly into parent layout (flex/grid safe).
 *
 * ```tsx
 * <TierSwitch
 *   phone={<MobileCards data={data} />}
 *   desktop={<DesktopTable data={data} />}
 * />
 * // tablet omitted → falls back to desktop (table shows from 768px+)
 * ```
 */
export function TierSwitch({ phone, tablet, desktop, desktopAt = "lg", fallback = null }: TierSwitchProps) {
  const tier = useDeviceTier(desktopAt);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return <>{fallback}</>;

  switch (tier) {
    case "phone": return <>{phone}</>;
    case "tablet": return <>{tablet ?? desktop}</>;
    case "desktop": return <>{desktop}</>;
  }
}
