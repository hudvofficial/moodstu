"use client";

/**
 * ═══════════════════════════════════════════════════════════
 * SelectForm — Form field dropdown (replaces SimpleSelect)
 * ═══════════════════════════════════════════════════════════
 *
 * API: 100% identical to SimpleSelect — zero breaking change
 * Internal: Radix UI (keyboard nav, screen reader, portal built-in)
 *
 * Usage:
 *   <SelectForm
 *     label="Xưởng in"
 *     value={labId || ""}
 *     onChange={(v) => setLabId(v || null)}
 *     options={labs.map((l) => ({ value: l.id, label: l.name }))}
 *     placeholder="Chọn lab"
 *   />
 * ═══════════════════════════════════════════════════════════
 */

import * as RadixSelect from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import {
  SelectContent,
  renderOptions,
  type SelectOption,
} from "./radix-base";

// ── Props (identical to old SimpleSelect) ─────────────────────
interface SelectFormProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────
export function SelectForm({
  value,
  onChange,
  options,
  label,
  placeholder = "Chọn...",
  error,
  disabled = false,
  className = "",
}: SelectFormProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && <label className="label-base">{label}</label>}

      <RadixSelect.Root
        value={value || undefined}
        onValueChange={onChange}
        disabled={disabled}
      >
        {/* Trigger — styled as input-base */}
        <RadixSelect.Trigger
          className={`
            input-base w-full flex items-center justify-between gap-2
            cursor-pointer text-left data-disabled:opacity-50 data-disabled:cursor-not-allowed
            ${error ? "border-error focus:ring-error/20" : ""}
          `}
          aria-label={label}
        >
          <RadixSelect.Value
            placeholder={
              <span className="text-text-muted text-sm font-medium">
                {placeholder}
              </span>
            }
          >
            {value
              ? options.find((o) => o.value === value)?.label
              : undefined}
          </RadixSelect.Value>
          <RadixSelect.Icon asChild>
            <ChevronDown className="w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        {/* Dropdown */}
        <SelectContent>
          {renderOptions(options)}
        </SelectContent>
      </RadixSelect.Root>

      {error && <p className="error-text mt-1">{error}</p>}
    </div>
  );
}
