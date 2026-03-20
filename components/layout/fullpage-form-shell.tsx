"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { useScrollContainer } from "@/contexts/scroll-container";

interface FullpageFormShellProps {
  /** Left: breadcrumb/back button */
  breadcrumb: React.ReactNode;
  /** Right: badge, user info, etc. */
  headerRight?: React.ReactNode;
  /** LEFT column — main form sections (S1, S2, S3, S6...) */
  children: React.ReactNode;
  /** RIGHT sticky panel — financial summary + actions (desktop only) */
  rightPanel?: React.ReactNode;
  /** Extra className for the root div */
  className?: string;
}

/**
 * FullpageFormShell — Shared layout for fullpage forms.
 *
 * Width: 100% (same as main-container / detail pages)
 * Padding: synced with main-container (8px mobile → 8px/32px desktop)
 *
 * Provides:
 * - Sticky top header (breadcrumb + right slot)
 * - Two-column grid on desktop (lg+):
 *     LEFT  — main form content (flex-1, scrollable)
 *     RIGHT — sticky panel: financial summary + actions
 * - Single column on mobile (< lg), right panel hidden
 */
export function FullpageFormShell({
  breadcrumb,
  headerRight,
  children,
  rightPanel,
  className,
}: FullpageFormShellProps) {
  const scrollRef = useScrollContainer();
  const { isVisible } = useScrollDirection({ threshold: 60, containerRef: scrollRef });

  return (
    <div className={cn("flex flex-col", className)}>
      {/* ── Sticky Header — hides on scroll down (mobile only) ── */}
      <header className={cn(
        "sticky top-0 z-50 bg-bg-card/80 backdrop-blur-md border-b border-border-light transition-transform duration-300 ease-in-out",
        isVisible ? "translate-y-0" : "-translate-y-full lg:translate-y-0"
      )}>
        <div className="px-2 lg:px-8 h-16 flex items-center justify-between">
          {breadcrumb}
          {headerRight && (
            <div className="flex items-center gap-3">
              {headerRight}
            </div>
          )}
        </div>
      </header>

      {/* ── Scrollable Body ── */}
      <div className="flex-1">
        <div className="px-2 pt-2 pb-24 lg:px-8 lg:py-6 lg:pb-6">
          {rightPanel ? (
            /* Two-column mode — same 8/4 grid as detail page */
            <div className="detail-grid">
              {/* LEFT: main form sections (span-8 = 67%) */}
              <div className="detail-main space-y-6 min-w-0">
                {children}
              </div>

              {/* RIGHT: sticky panel (span-4 = 33%) — desktop only */}
              <div className="detail-sidebar hidden lg:flex">
                <div className="sticky top-[72px] space-y-4 w-full">
                  {rightPanel}
                </div>
              </div>
            </div>
          ) : (
            /* Single-column mode (no rightPanel) */
            <div className="space-y-6">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
