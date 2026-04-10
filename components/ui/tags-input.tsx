"use client";

import React, { useState, KeyboardEvent, useRef } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagsInputProps {
  label?: string;
  placeholder?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
  className?: string;
}

export function TagsInput({ label, placeholder, value = [], onChange, error, className }: TagsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !value.includes(newTag)) {
        onChange([...value, newTag]);
      }
      setInputValue("");
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      // Optional: remove last tag on backspace
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className={cn("w-full min-w-0", className)}>
      {label && <label className="label-base">{label}</label>}
      <div 
        className={cn(
          "input-base h-auto min-h-[42px] py-1.5 px-2 flex flex-wrap gap-2 items-center cursor-text transition-colors",
          error && "input-error"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="neutral" className="flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 animate-in zoom-in-95 duration-200">
            <span className="text-xs truncate max-w-[150px]">{tag}</span>
            {/* eslint-disable-next-line react/forbid-elements -- UI primitive: native button required inside TagsInput */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="text-text-muted hover:text-text-primary grow-0 shrink-0 focus:outline-none transition-colors rounded-full"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        {/* eslint-disable-next-line react/forbid-elements -- UI primitive: native input required inside TagsInput */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] outline-none bg-transparent border-none p-0 text-sm text-text-primary placeholder:text-text-muted"
        />
      </div>
      {error ? (
        <p className="error-text">{error}</p>
      ) : (
        <p className="text-micro text-text-muted mt-1">Mẹo: Nhấn Enter hoặc dấu phẩy (,) để thêm tag</p>
      )}
    </div>
  );
}
