/* eslint-disable react/forbid-elements -- SSOT UI component (search bar) uses native elements internally */
"use client";

import { Search, X } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ placeholder = "Tìm kiếm...", value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base pl-10 pr-9"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-bg-hover transition-colors"
        >
          <X className="w-3.5 h-3.5 text-text-muted" />
        </button>
      )}
    </div>
  );
}
