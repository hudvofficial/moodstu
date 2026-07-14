"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MoodieModelOption } from "@/types/moodie";

interface MoodieModelPickerProps {
  options: MoodieModelOption[];
  value?: string;
  disabled?: boolean;
  onChange?: (model: string) => void;
}

function formatModelName(model: string) {
  const shortName = model.split("/").at(-1) || model;
  return shortName
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function MoodieModelPicker({ options, value, disabled, onChange }: MoodieModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) || options[0];
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!selected) return null;

  return (
    <div ref={rootRef} className="relative mr-0.5 shrink-0">
      <Button
        type="button"
        unstyled
        disabled={disabled}
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
        className="inline-flex h-8 max-w-36 items-center gap-1.5 rounded-full bg-bg-subtle px-3 text-caption font-medium text-text-primary transition-colors hover:bg-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-48"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Model đang dùng: ${selected.label}`}
      >
        <span className="truncate">{formatModelName(selected.label)}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open ? (
        <div className="absolute bottom-[calc(100%+0.625rem)] right-0 z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border/80 bg-white p-1.5 text-left shadow-[0_18px_55px_rgba(31,24,20,0.16)]" role="dialog" aria-label="Chọn model Moodie">
          <div className="px-2.5 pb-1.5 pt-2">
            <p className="text-micro font-medium uppercase tracking-wide text-text-muted">Models</p>
          </div>

          {options.length > 8 ? (
            <label className="mx-1 mb-1.5 flex h-9 items-center gap-2 rounded-xl bg-bg-subtle px-2.5 text-text-muted focus-within:ring-2 focus-within:ring-primary/15">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm model..."
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
            </label>
          ) : null}

          <div className="max-h-[min(22rem,55vh)] overflow-y-auto overscroll-contain py-0.5" role="listbox" aria-label="Danh sách model">
            {filteredOptions.map((option) => {
              const active = option.value === selected.value;
              return (
                <Button
                  key={option.value}
                  type="button"
                  unstyled
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange?.(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${active ? "bg-bg-subtle" : "hover:bg-bg-subtle/70"}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-primary">{formatModelName(option.label)}</span>
                    <span className="block truncate text-micro text-text-muted">{option.value}</span>
                  </span>
                  {active ? <Check className="h-4 w-4 shrink-0 text-text-primary" /> : null}
                </Button>
              );
            })}
            {filteredOptions.length === 0 ? <p className="px-3 py-6 text-center text-caption text-text-muted">Không tìm thấy model phù hợp</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
