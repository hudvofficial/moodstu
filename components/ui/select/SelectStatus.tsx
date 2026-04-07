"use client";

/**
 * ═══════════════════════════════════════════════════════════
 * SelectStatus — Inline status editor (Radix-based)
 * ═══════════════════════════════════════════════════════════
 *
 * Dùng cho: inline status update trong list rows / detail blocks.
 * NOT for filter bars (dùng SelectPill cho đó).
 *
 * Features:
 *   ✅ Color dot indicator (match status color)
 *   ✅ Async-friendly (loading state khi onUpdate chạy)
 *   ✅ Radix portal (không bị cắt bởi overflow:hidden)
 *   ✅ Keyboard nav + screen reader built-in
 *
 * API tương thích 100% StatusSelect cũ:
 *   current, options: StatusOption[], onUpdate, disabled, size
 *
 * Usage:
 *   <SelectStatus
 *     current={r.status}
 *     options={RESERVATION_STATUS_OPTIONS}
 *     onUpdate={async (newStatus) => { ... }}
 *   />
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useCallback } from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { ChevronDown, Check, ChevronUp } from "lucide-react";

// ── Types (same as StatusSelect) ─────────────────────────────
export interface StatusOption {
  value: string;
  label: string;
  color: string; // CSS color string for dot indicator
}

interface SelectStatusProps {
  current: string;
  options: StatusOption[];
  onUpdate: (newStatus: string) => Promise<void>;
  disabled?: boolean;
  size?: "sm" | "md";
  /** "default" = form input style (width:100%), "compact" = inline pill (auto width) */
  variant?: "default" | "compact";
}

// ── Component ─────────────────────────────────────────────────
export function SelectStatus({
  current,
  options,
  onUpdate,
  disabled = false,
  size = "sm",
  variant = "default",
}: SelectStatusProps) {
  const [loading, setLoading] = useState(false);

  const currentOption = options.find((o) => o.value === current);
  const dotColor = currentOption?.color || "var(--color-border)";
  const currentLabel = currentOption?.label || current;

  const handleChange = useCallback(
    async (newStatus: string) => {
      if (newStatus === current) return;
      setLoading(true);
      try {
        await onUpdate(newStatus);
      } finally {
        setLoading(false);
      }
    },
    [current, onUpdate]
  );

  // Size classes for trigger
  const isCompact = variant === "compact";

  const triggerSizeClass = isCompact
    ? "text-xs px-2 py-0.5 min-w-0"
    : size === "sm"
      ? "text-xs px-2 py-1 min-w-25"
      : "text-sm px-3 py-1.5 min-w-30";

  const dotSizeClass = size === "sm" || isCompact ? "w-1.5 h-1.5" : "w-2 h-2";

  const isDisabled = disabled || loading;

  // Compact: pill style (auto width, no input-base)
  // Default: form style (width 100%, input-base)
  const triggerBaseClass = isCompact
    ? "flex items-center gap-1.5 cursor-pointer border border-border rounded-full bg-bg-card hover:bg-bg-hover transition-colors h-7 w-auto shrink-0"
    : "input-base flex items-center gap-1.5 cursor-pointer";

  return (
    <RadixSelect.Root
      value={current}
      onValueChange={handleChange}
      disabled={isDisabled}
    >
      <RadixSelect.Trigger
        className={[
          triggerBaseClass,
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isCompact ? "rounded-full" : "rounded-md",
          "appearance-none",
          triggerSizeClass,
        ].join(" ")}
        aria-label="Cập nhật trạng thái"
      >
        {/* Color dot */}
        <span
          className={`${dotSizeClass} rounded-full shrink-0`}
          style={{ background: dotColor }}
        />

        {/* Current label */}
        <RadixSelect.Value>
          {loading ? "Đang lưu..." : currentLabel}
        </RadixSelect.Value>

        {/* Chevron */}
        <RadixSelect.Icon asChild>
          <ChevronDown className="w-3 h-3 shrink-0 text-text-muted ml-auto" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      {/* Dropdown */}
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="select-content"
        >
          <RadixSelect.ScrollUpButton className="select-scroll-btn">
            <ChevronUp className="w-4 h-4" />
          </RadixSelect.ScrollUpButton>

          <RadixSelect.Viewport className="select-viewport">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className="select-item"
              >
                <div className="flex items-center gap-2">
                  {/* Color dot in dropdown item */}
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: opt.color }}
                  />
                  <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                </div>
                <RadixSelect.ItemIndicator className="select-item-indicator">
                  <Check className="w-3.5 h-3.5" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>

          <RadixSelect.ScrollDownButton className="select-scroll-btn">
            <ChevronDown className="w-4 h-4" />
          </RadixSelect.ScrollDownButton>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
