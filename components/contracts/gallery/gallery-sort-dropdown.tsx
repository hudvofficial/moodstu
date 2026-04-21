"use client";

import { ArrowUpDown, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type SortOption = "manual" | "name-asc" | "name-desc" | "date-asc" | "date-desc";

interface GallerySortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "manual", label: "Tự chỉnh" },
  { key: "name-asc", label: "Tên A → Z" },
  { key: "name-desc", label: "Tên Z → A" },
  { key: "date-desc", label: "Mới nhất" },
  { key: "date-asc", label: "Cũ nhất" },
];

export default function GallerySortDropdown({ value, onChange }: GallerySortDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  const activeLabel = SORT_OPTIONS.find((option) => option.key === value)?.label || "Sắp xếp";

  return (
    <div ref={ref} className="relative">
      <Button
        unstyled
        onClick={() => setOpen((prev) => !prev)}
        className="btn-ghost flex h-9 items-center gap-1.5 px-3 text-caption font-semibold"
      >
        <ArrowUpDown size={14} />
        <span className="hidden min-[360px]:inline">{activeLabel}</span>
      </Button>

      {open && (
        <div className="card-base absolute right-0 top-full z-30 mt-2 min-w-40 py-1">
          {SORT_OPTIONS.map((option) => {
            const isActive = value === option.key;

            return (
              <Button
                key={option.key}
                unstyled
                onClick={() => {
                  onChange(option.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-body-sm transition-colors ${isActive ? "bg-bg-hover font-semibold text-primary" : "text-text-primary hover:bg-bg-hover"}`}
              >
                <span>{option.label}</span>
                {isActive && <Check size={14} />}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
