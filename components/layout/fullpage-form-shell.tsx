"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TwoColumnGridProps {
  /** LEFT column - main content */
  children: React.ReactNode;
  /** RIGHT sticky panel */
  rightPanel: React.ReactNode;
  /** Extra className for the grid root */
  className?: string;
}

interface FullpageFormShellProps {
  /** LEFT column — main form sections (S1, S2, S3, S6...) */
  children: React.ReactNode;
  /** RIGHT sticky panel — financial summary + actions (desktop only) */
  rightPanel?: React.ReactNode;
  /** Extra className for the root div */
  className?: string;
}

/**
 * TwoColumnGrid - Shared 2-column responsive grid.
 * Dung boi ca FullpageFormShell (EDIT/CREATE) va DesktopLayout (DETAIL).
 * lg: 10-col 6/4 | xl: 12-col 8/4
 */
export function TwoColumnGrid({ children, rightPanel, className }: TwoColumnGridProps) {
  return (
    <div className={cn("detail-grid xl:grid-cols-12 xl:gap-8 lg:grid-cols-10 lg:gap-6", className)}>
      <div className="detail-main space-y-6 min-w-0 xl:col-span-8 lg:col-span-6">
        {children}
      </div>
      <div className="detail-sidebar detail-sidebar-sticky hidden lg:flex xl:col-span-4 lg:col-span-4">
        {rightPanel}
      </div>
    </div>
  );
}

/**
 * FullpageFormShell — Shared layout for fullpage forms.
 *
 * Header is handled by system header via HeaderSlotsContext (set in ContractForm).
 * This component only manages the body layout.
 *
 * -- 4-TIER RESPONSIVE LAYOUT (3-tier alignment - 20/06/2026) --
 *
 * | Tier          | Width range | Container            | Grid                     | Right panel |
 * |---------------|-------------|----------------------|--------------------------|-------------|
 * | phone         | < 768       | full                 | single col               | hidden      |
 * | tablet        | 768 - 1023  | max-w-2xl (672)      | single col               | hidden      |
 * | desktop       | 1024 - 1279 | max-w-5xl (1024)     | 2-col 10 grid, ratio 6/4 | sticky      |
 * | large-desktop | 1280 - 1535 | max-w-7xl (1280)     | 2-col 12 grid, ratio 8/4 | sticky      |
 * | ultra-wide    | >= 1536     | max-w-[110rem] (1760) | 2-col 12 grid, ratio 8/4 | sticky      |
 *
 * 3-tier alignment: chuyển sang shared token `.detail-shell-page` +
 * `.detail-sidebar-sticky` trong `app/styles/layout.css` để DETAIL/EDIT/CREATE
 * cùng dùng chung breakpoints. DETAIL dùng className tương tự qua
 * `detail-layout-sections.tsx`.
 *
 * - Phone + tablet: single column + FormActions fixed bottom (handled by caller)
 * - Desktop and up: 2-column with sticky financial panel on the right
 */
export function FullpageFormShell({
  children,
  rightPanel,
  className,
}: FullpageFormShellProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Container width responsive theo shared token `.detail-shell-page`
            - phone (<768): full width
            - tablet (768-1023): max-w-2xl (672) + px-6
            - desktop (1024-1279): max-w-5xl (1024)
            - large desktop (1280-1535): max-w-7xl (1280)
            - ultra-wide (>=1536): max-w-[110rem] (1760)
       */}
      <div className="detail-shell-page flex-1">
        <div className="pb-24 lg:pb-6" style={{ paddingTop: 'var(--spacing-main-y)' }}>
          {rightPanel ? (
            <TwoColumnGrid
              rightPanel={
                <div className="space-y-4 w-full">
                  {rightPanel}
                </div>
              }
            >
              {children}
            </TwoColumnGrid>
          ) : (
            /* Single-column mode (no rightPanel) - phone + tablet dung detail-shell-page cap */
            <div className="space-y-6">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
