/* eslint-disable react/forbid-elements -- SSOT UI component (pagination) uses native buttons internally */
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
  compact?: boolean;
  /**
   * Visual variant.
   * - "default" (default): generic ghost/page-number style. Used by most pages.
   * - "footer": table-footer look — subtle white bg + light border per button,
   *              active filled with `primary`. Designed for the
   *              contracts table footer; safe to reuse elsewhere.
   */
  variant?: "default" | "footer";
}

export function Pagination({
  page,
  totalPages,
  onChange,
  className,
  compact = false,
  variant = "default",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getVisiblePages(page, totalPages);
  const isFooter = variant === "footer";

  // ── Shared class fragments per variant ──
  const sizeCls = compact ? "min-w-8 h-8 text-xs" : "min-w-9 h-9 text-sm";
  const arrowSizeCls = compact ? "size-8 p-1" : "p-2";
  const arrowIconCls = compact ? "w-3.5 h-3.5" : "w-4 h-4";

  const arrowCls = isFooter
    ? // footer: subtle rounded buttons (white bg + light border)
      // cursor-pointer: bắt buộc — Tailwind v4 bỏ reset cursor:pointer cho <button>,
      // nhánh default có nhờ .btn (buttons.css), nhánh footer không dùng .btn.
      cn(
        "rounded-md border border-border bg-bg-card text-text-primary",
        "hover:bg-bg-hover disabled:opacity-30",
        "cursor-pointer disabled:cursor-not-allowed",
        "flex items-center justify-center transition-colors",
        arrowSizeCls,
      )
    : // default: existing ghost behavior
      cn(
        "btn btn-ghost disabled:opacity-30 flex items-center justify-center",
        arrowSizeCls,
      );

  const pageBtnCls = (isActive: boolean) =>
    isFooter
      ? cn(
          "rounded-md font-semibold transition-colors flex items-center justify-center cursor-pointer",
          sizeCls,
          isActive
            ? // footer active: primary filled — cùng token với .btn-primary
              "bg-primary text-white border border-primary shadow-sm"
            : // footer inactive: white bg + light border
              "bg-bg-card border border-border text-text-primary hover:bg-bg-hover",
        )
      : cn(
          // default: existing behavior — unchanged
          "rounded-md font-semibold transition-all flex items-center justify-center cursor-pointer",
          sizeCls,
          isActive
            ? "bg-primary text-white shadow-sm"
            : "text-text-secondary hover:bg-bg-hover",
        );

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Trang trước"
        className={arrowCls}
      >
        <ChevronLeft className={arrowIconCls} />
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dot-${i}`} className="px-2 text-text-muted">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            aria-current={page === p ? "page" : undefined}
            aria-label={`Trang ${p}`}
            className={pageBtnCls(page === p)}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Trang sau"
        className={arrowCls}
      >
        <ChevronRight className={arrowIconCls} />
      </button>
    </div>
  );
}

/** Generate visible page numbers with ellipsis */
function getVisiblePages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  if (current <= 3) return [1, 2, 3, 4, "...", total];
  if (current >= total - 2) return [1, "...", total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

/* eslint-enable react/forbid-elements */
