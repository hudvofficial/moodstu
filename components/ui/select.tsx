"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  className?: string;
  searchable?: boolean;
}

export function CustomSelect({
  options,
  value,
  onChange,
  label,
  placeholder = "Chọn một mục...",
  error,
  className,
  searchable = true,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  // Close when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("flex flex-col w-full relative", className)} ref={containerRef}>
      {label && <label className="label-base">{label}</label>}
      
      {/* Trigger — dùng .input-base + .select-trigger SSOT */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "input-base select-trigger",
          isOpen && "ring-2 ring-primary/30",
          error && "input-error",
          !selectedOption && "text-text-muted"
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-text-muted shrink-0 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-bg-card rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {searchable && (
            <div className="p-3 bg-bg-base/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input
                  autoFocus
                  className="input-base pl-9 pr-4 py-2 text-xs"
                  placeholder="Tìm kiếm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <div className="max-h-60 overflow-y-auto p-1.5 scrollbar-hide">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-2.5 rounded-md text-sm transition-colors mb-0.5 last:mb-0",
                    value === option.value 
                      ? "bg-primary/10 text-primary font-semibold" 
                      : "text-text-secondary hover:bg-bg-hover"
                  )}
                >
                  {option.label}
                  {value === option.value && <Check className="w-3.5 h-3.5" />}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-text-muted">
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
