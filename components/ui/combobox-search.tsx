"use client";

/**
 * ═══════════════════════════════════════════════════════════
 * ComboboxSearch — Searchable dropdown (text input + filter list)
 * Portal-based dropdown to escape modal overflow:hidden
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X, ChevronDown } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxSearchProps {
  options: ComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function ComboboxSearch({
  options,
  onChange,
  placeholder = "Tìm và chọn...",
  label,
  error,
  disabled = false,
  className = "",
}: ComboboxSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options by query (case-insensitive, match anywhere)
  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  // Clamp highlight index
  const safeHighlightIndex = Math.min(highlightIndex, Math.max(filtered.length - 1, 0));

  // Update dropdown position when open
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [isOpen, query]);

  // Close on click outside (check both container and portal dropdown)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectItem = useCallback(
    (value: string) => {
      const found = options.find((o) => o.value === value);
      if (found) {
        setQuery(found.label);
        setIsOpen(false);
        onChange(value);
      }
    },
    [options, onChange]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[safeHighlightIndex]) {
          selectItem(filtered[safeHighlightIndex].value);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleClear = () => {
    setQuery("");
    setIsOpen(true);
    inputRef.current?.focus();
  };

  // Portal dropdown
  const dropdown =
    isOpen && !disabled && typeof window !== "undefined"
      ? createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-9999 max-h-[220px] overflow-y-auto rounded-xl bg-card border border-border shadow-lg animate-fade-in"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
            }}
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-text-muted">
                Không tìm thấy kết quả
              </p>
            ) : (
              filtered.map((option, idx) => (
                <button
                  key={option.value}
                  type="button"
                  className={`
                    w-full text-left px-3 py-2.5 text-sm transition-colors
                    ${
                      idx === safeHighlightIndex
                        ? "bg-primary/10 text-primary"
                        : "text-text hover:bg-surface-hover"
                    }
                  `}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onClick={() => selectItem(option.value)}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && <label className="label-base">{label}</label>}

      {/* Input trigger */}
      <div
        ref={triggerRef}
        className={`
          input-base w-full flex items-center gap-2 cursor-text
          ${error ? "border-error focus-within:ring-error/20" : ""}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        <Search className="w-4 h-4 text-text-muted shrink-0" />
        <input
          ref={inputRef}
          type="text"
          className="flex-1 bg-transparent outline-none text-sm text-text placeholder:text-text-muted"
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="p-0.5 rounded-full hover:bg-surface-hover transition-colors"
            aria-label="Xóa"
          >
            <X className="w-3.5 h-3.5 text-text-muted" />
          </button>
        )}
        <ChevronDown
          className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Portal dropdown */}
      {dropdown}

      {error && <p className="error-text mt-1">{error}</p>}
    </div>
  );
}
