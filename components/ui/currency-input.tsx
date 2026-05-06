/* eslint-disable react/forbid-elements -- SSOT UI component (currency input) uses native input internally */
"use client";

import React, { useState, useRef, useCallback } from "react";
import { cn, CURRENCY_SYMBOL } from "@/lib/utils";

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  error?: string;
  suffix?: string;
  emptyWhenZero?: boolean;
}

/** Format số → chuỗi VND: 1000000 → "1.000.000" */
function formatVND(val: number, emptyWhenZero = false): string {
  if (isNaN(val) || val === 0) return emptyWhenZero ? "" : "0";
  return new Intl.NumberFormat("vi-VN").format(val);
}

/**
 * CurrencyInput — Logic V1, styling V2
 *
 * Features:
 * - Auto-format dấu chấm hàng nghìn (Intl.NumberFormat)
 * - Shortcut: gõ "k" / "." / "," / "+" → ×1.000
 * - Shortcut: gõ "m" → ×1.000.000
 * - Focus → tự select all text
 * - Anti-flicker: không re-render khi đang focus
 */
export function CurrencyInput({
  value,
  onChange,
  label,
  error,
  suffix = CURRENCY_SYMBOL,
  emptyWhenZero = false,
  className,
  placeholder,
  ...props
}: CurrencyInputProps) {
  // Local editing state — chỉ dùng khi đang focus
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const isFocusedRef = useRef(false);

  // Display: nếu đang edit → dùng local, không → format từ prop
  const displayValue = editingValue !== null ? editingValue : formatVND(value, emptyWhenZero);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value.toLowerCase();

      // Shortcut: k, ., ,, + → thêm 000
      if (
        raw.endsWith("k") ||
        raw.endsWith(".") ||
        raw.endsWith(",") ||
        raw.endsWith("+")
      ) {
        raw = raw.slice(0, -1) + "000";
      } else if (raw.endsWith("m")) {
        // Shortcut: m → thêm 000000
        raw = raw.slice(0, -1) + "000000";
      }

      const digits = raw.replace(/\D/g, "");
      const num = digits === "" ? 0 : parseInt(digits, 10);

      setEditingValue(formatVND(num, emptyWhenZero));
      onChange(num);
    },
    [emptyWhenZero, onChange],
  );

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    setEditingValue(formatVND(value, emptyWhenZero));
    // Select all after React re-render
    requestAnimationFrame(() => e.target.select());
  }, [emptyWhenZero, value]);

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false;
    setEditingValue(null); // Drop local state → hiện format từ prop
  }, []);

  return (
    <div className="flex flex-col w-full">
      {label && <label className="label-base">{label}</label>}
      <div className="relative group">
        <input
          {...props}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder ?? (emptyWhenZero ? "" : "0")}
          className={cn(
            "input-base text-right pr-16 font-semibold",
            error && "input-error",
            className,
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption font-bold text-text-primary uppercase tracking-tight bg-border px-1.5 py-0.5 rounded-sm border border-border pointer-events-none group-focus-within:text-interactive group-focus-within:bg-interactive-light transition-colors">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

/* eslint-enable react/forbid-elements */
