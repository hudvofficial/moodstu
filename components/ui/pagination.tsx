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
}

export function Pagination({ page, totalPages, onChange, className, compact = false }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getVisiblePages(page, totalPages);

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className={cn("btn btn-ghost disabled:opacity-30 flex items-center justify-center", compact ? "size-8 p-1" : "p-2")}
      >
        <ChevronLeft className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dot-${i}`} className="px-2 text-text-muted">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={cn(
              "rounded-md font-semibold transition-all flex items-center justify-center",
              compact ? "min-w-8 h-8 text-xs" : "min-w-9 h-9 text-sm",
              page === p
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:bg-bg-hover"
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className={cn("btn btn-ghost disabled:opacity-30 flex items-center justify-center", compact ? "size-8 p-1" : "p-2")}
      >
        <ChevronRight className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
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
