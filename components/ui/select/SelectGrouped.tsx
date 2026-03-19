"use client";

/**
 * ═══════════════════════════════════════════════════════════
 * SelectGrouped — Radix Select with color-coded group headers
 * ═══════════════════════════════════════════════════════════
 *
 * Replaces GroupedSelect (custom click-outside + manual portal).
 * 
 * Benefits over old GroupedSelect:
 *   ✅ Radix portal (không bị cắt bởi overflow:hidden)
 *   ✅ Keyboard nav built-in (Arrow, Enter, Escape, Tab)
 *   ✅ No manual click-outside, no manual Escape handler
 *   ✅ Screen reader support
 *   ✅ Color-coded group headers (gold/rose/sky) — same design
 *
 * API tương thích 100% GroupedSelect cũ:
 *   value, onChange, groups, label, required, placeholder, className
 *
 * Usage:
 *   <SelectGrouped
 *     value={formData.service_type}
 *     onChange={(val) => updateField("service_type", val)}
 *     groups={SERVICE_TYPE_SELECT_GROUPS}
 *     label="Loại dịch vụ *"
 *   />
 * ═══════════════════════════════════════════════════════════
 */

import * as RadixSelect from "@radix-ui/react-select";
import { ChevronDown, ChevronUp, Check } from "lucide-react";

// ── Types ────────────────────────────────────────────────────
interface Option {
  value: string;
  label: string;
}

interface OptionGroup {
  groupName: string;
  color?: "gold" | "rose" | "sky";
  options: Option[];
}

interface SelectGroupedProps {
  value: string;
  onChange: (value: string) => void;
  groups: OptionGroup[];
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

// ── Color CSS map (matches design-system.css tokens) ─────────
const CSS_MAP: Record<string, { header: string; item: string }> = {
  gold: { header: "group-header-gold", item: "group-option-gold" },
  rose: { header: "group-header-rose", item: "group-option-rose" },
  sky:  { header: "group-header-sky",  item: "group-option-sky" },
};

// ── Component ─────────────────────────────────────────────────
export function SelectGrouped({
  value,
  onChange,
  groups,
  label,
  required,
  placeholder = "Chọn...",
  className = "",
}: SelectGroupedProps) {
  // Find display label for current value
  let currentLabel = placeholder;
  for (const group of groups) {
    const found = group.options.find((opt) => opt.value === value);
    if (found) {
      currentLabel = found.label;
      break;
    }
  }

  const isSelected = value && value !== "";

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <label className="label-base">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <RadixSelect.Root value={value || ""} onValueChange={onChange}>
        {/* Trigger — matches input-base style like GroupedSelect */}
        <RadixSelect.Trigger
          className="input-base w-full flex items-center justify-between gap-2 cursor-pointer text-left"
        >
          <span
            className={`block truncate text-sm font-medium ${
              isSelected ? "text-text-primary" : "text-text-muted"
            }`}
          >
            <RadixSelect.Value>{currentLabel}</RadixSelect.Value>
          </span>
          <RadixSelect.Icon asChild>
            <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        {/* Dropdown panel — Radix portal (auto thoát overflow) */}
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
              {groups.map((group, gIdx) => {
                const css = CSS_MAP[group.color || "gold"] || CSS_MAP.gold;
                return (
                  <RadixSelect.Group key={gIdx}>
                    {/* Color-coded group header */}
                    <RadixSelect.Label
                      className={[
                        "px-3 py-1.5 text-tiny font-bold uppercase tracking-widest",
                        "border-l-[3px] select-none",
                        gIdx > 0 ? "border-t border-border mt-0.5" : "",
                        css.header,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {group.groupName}
                    </RadixSelect.Label>

                    {/* Options */}
                    {group.options.map((opt) => (
                      <RadixSelect.Item
                        key={opt.value}
                        value={opt.value}
                        className={[
                          "select-item border-l-[3px]",
                          css.item,
                        ].join(" ")}
                      >
                        <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                        <RadixSelect.ItemIndicator className="select-item-indicator">
                          <Check className="w-3.5 h-3.5" />
                        </RadixSelect.ItemIndicator>
                      </RadixSelect.Item>
                    ))}

                    {/* Separator between groups */}
                    {gIdx < groups.length - 1 && (
                      <RadixSelect.Separator className="select-separator" />
                    )}
                  </RadixSelect.Group>
                );
              })}
            </RadixSelect.Viewport>

            <RadixSelect.ScrollDownButton className="select-scroll-btn">
              <ChevronDown className="w-4 h-4" />
            </RadixSelect.ScrollDownButton>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}
