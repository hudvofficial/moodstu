"use client";

/**
 * ═══════════════════════════════════════════════════════════
 * SelectPill — Compact filter pill dropdown
 * ═══════════════════════════════════════════════════════════
 *
 * Dùng cho filter toolbar (list pages), NOT form fields.
 * Style: compact h-8 pill, active/inactive states.
 * Internal: Radix UI (keyboard nav, portal, screen reader built-in)
 *
 * Usage:
 *   <SelectPill
 *     value={filters.service}
 *     onChange={setService}
 *     defaultValue="all"
 *     placeholder="Dịch vụ"
 *     options={SERVICE_OPTIONS}
 *   />
 *
 * Active state auto-detects: value !== defaultValue
 * ═══════════════════════════════════════════════════════════
 */

import * as RadixSelect from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { SelectContent, renderOptions, type SelectOption } from "./radix-base";

// ── Props ─────────────────────────────────────────────────────
interface SelectPillProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Placeholder text shown when inactive (e.g. "Dịch vụ", "Sắp xếp") */
  placeholder?: string;
  /**
   * The "neutral" value — pill is inactive when value === defaultValue.
   * Defaults to "all".
   */
  defaultValue?: string;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────
export function SelectPill({
  value,
  onChange,
  options,
  placeholder = "Chọn",
  defaultValue = "all",
  className = "",
}: SelectPillProps) {
  const isActive = value !== defaultValue && value !== "";

  return (
    <RadixSelect.Root value={value} onValueChange={onChange}>
      <RadixSelect.Trigger
        className={[
          "select-trigger-pill",
          isActive ? "active" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={placeholder}
      >
        {/* Show placeholder when inactive, selected label when active */}
        <RadixSelect.Value>
          {isActive
            ? options.find((o) => o.value === value)?.label ?? placeholder
            : placeholder}
        </RadixSelect.Value>
        <RadixSelect.Icon asChild>
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <SelectContent>{renderOptions(options)}</SelectContent>
    </RadixSelect.Root>
  );
}
