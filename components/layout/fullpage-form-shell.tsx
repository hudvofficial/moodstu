"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FullpageFormShellProps {
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
 * Header is handled by system header via HeaderSlotsContext (set in ContractForm).
 * This component only manages the body layout:
 * - Two-column grid on desktop (lg+):
 *     LEFT  — main form content (flex-1, scrollable)
 *     RIGHT — sticky panel: financial summary + actions
 * - Single column on mobile (< lg), right panel hidden
 */
export function FullpageFormShell({
  children,
  rightPanel,
  className,
}: FullpageFormShellProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex-1 max-w-5xl mx-auto w-full">
        <div className="pb-24 lg:pb-6" style={{ paddingTop: 'var(--spacing-main-y)' }}>
          {rightPanel ? (
            /* Two-column mode — same 8/4 grid as detail page */
            <div className="detail-grid xl:grid-cols-12 xl:gap-8 lg:grid-cols-10 lg:gap-6">
              {/* LEFT: main form sections (span-8 = 67%) */}
              <div className="detail-main space-y-6 min-w-0 xl:col-span-8 lg:col-span-6">
                {children}
              </div>

              {/* RIGHT: sticky panel (span-4 = 33%) — desktop only */}
              <div className="detail-sidebar hidden lg:flex xl:col-span-4 lg:col-span-4">
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
