"use client";

import { ArrowUpDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

// ═══════════════════════════════════════════
// GallerySortDropdown — Sort images by name/date
// Phase 1: Header UX Enhancement
// ═══════════════════════════════════════════

export type SortOption = "name-asc" | "name-desc" | "date-asc" | "date-desc";

interface GallerySortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "name-asc", label: "Tên A → Z" },
  { key: "name-desc", label: "Tên Z → A" },
  { key: "date-desc", label: "Mới nhất" },
  { key: "date-asc", label: "Cũ nhất" },
];

export default function GallerySortDropdown({ value, onChange }: GallerySortDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeLabel = SORT_OPTIONS.find((o) => o.key === value)?.label || "Sắp xếp";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost flex items-center gap-1.5"
        style={{ padding: "4px 10px", fontSize: "var(--font-size-caption)" }}
      >
        <ArrowUpDown size={14} />
        <span className="hidden sm:inline">{activeLabel}</span>
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1 min-w-40 py-1"
          style={{
            background: "var(--color-bg-card)",
            borderRadius: "var(--radius-lg, 12px)",
            boxShadow: "0 4px 24px var(--color-black-10)",
            zIndex: 30,
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className="w-full text-left px-3 py-2 flex items-center justify-between transition-colors"
              style={{
                fontSize: "var(--font-size-body-sm, 13px)",
                color: value === opt.key ? "var(--color-primary)" : "var(--color-text-primary)",
                background: value === opt.key ? "var(--color-bg-hover)" : "transparent",
                fontWeight: value === opt.key ? 600 : 400,
              }}
              onMouseEnter={(e) => { if (value !== opt.key) (e.target as HTMLElement).style.background = "var(--color-bg-hover)"; }}
              onMouseLeave={(e) => { if (value !== opt.key) (e.target as HTMLElement).style.background = "transparent"; }}
            >
              <span>{opt.label}</span>
              {value === opt.key && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
