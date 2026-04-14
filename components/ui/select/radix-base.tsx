"use client";

/**
 * ═══════════════════════════════════════════════════════════
 * Radix Select Base — Mood Studio V2 Design System
 * ═══════════════════════════════════════════════════════════
 *
 * Shared Radix UI primitive used by:
 *   • SelectForm   → replaces SimpleSelect (form fields)
 *   • SelectPill   → NEW compact filter pills (list toolbars)
 *   • SelectGrouped → replaces GroupedSelect (grouped options)
 *
 * Why Radix:
 *   ✅ WCAG keyboard nav built-in (Arrow/Enter/Esc/Tab)
 *   ✅ Screen reader support out of the box
 *   ✅ Portal built-in (no overflow:hidden issues)
 *   ✅ Zero custom position/scroll/click-outside logic
 *   ✅ ~7kb gzipped — minimal bundle impact
 * ═══════════════════════════════════════════════════════════
 */

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { forwardRef } from "react";

// ── Types ────────────────────────────────────────────────────
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectOptionGroup {
  group: string;
  options: SelectOption[];
}

// ── Re-export root primitives for variant components ─────────
export const SelectRoot = RadixSelect.Root;
export const SelectValue = RadixSelect.Value;
export const SelectPortal = RadixSelect.Portal;
export const SelectGroup = RadixSelect.Group;
export const SelectLabel = RadixSelect.Label;
export const SelectSeparator = RadixSelect.Separator;
export const SelectTrigger = RadixSelect.Trigger;
export const SelectIcon = RadixSelect.Icon;

// ── Shared Dropdown Content ───────────────────────────────────
// Used by all variants — controls the dropdown panel styling
export const SelectContent = forwardRef<
  React.ElementRef<typeof RadixSelect.Content>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Content>
>(({ children, className = "", ...props }, ref) => (
  <RadixSelect.Portal>
    <RadixSelect.Content
      ref={ref}
      position="popper"
      sideOffset={4}
      className={`select-content ${className}`}
      {...props}
    >
      <RadixSelect.ScrollUpButton className="select-scroll-btn">
        <ChevronUp className="w-4 h-4" />
      </RadixSelect.ScrollUpButton>

      <RadixSelect.Viewport className="select-viewport">
        {children}
      </RadixSelect.Viewport>

      <RadixSelect.ScrollDownButton className="select-scroll-btn">
        <ChevronDown className="w-4 h-4" />
      </RadixSelect.ScrollDownButton>
    </RadixSelect.Content>
  </RadixSelect.Portal>
));
SelectContent.displayName = "SelectContent";

// ── Shared Item ───────────────────────────────────────────────
export const SelectItem = forwardRef<
  React.ElementRef<typeof RadixSelect.Item>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Item>
>(({ children, className = "", ...props }, ref) => (
  <RadixSelect.Item
    ref={ref}
    className={`select-item ${className}`}
    {...props}
  >
    <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    <RadixSelect.ItemIndicator className="select-item-indicator">
      <Check className="w-3.5 h-3.5" />
    </RadixSelect.ItemIndicator>
  </RadixSelect.Item>
));
SelectItem.displayName = "SelectItem";

// ── Helper: Render flat options list ─────────────────────────
export function renderOptions(options: SelectOption[], emptyText: string = "Không có dữ liệu") {
  if (!options || options.length === 0) {
    return (
      <div className="py-3 px-2 text-center text-sm text-text-muted italic select-none">
        {emptyText}
      </div>
    );
  }
  return options.map((opt) => (
    <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
      {opt.label}
    </SelectItem>
  ));
}

// ── Helper: Render grouped options list ──────────────────────
export function renderGroupedOptions(groups: SelectOptionGroup[], emptyText: string = "Không có dữ liệu") {
  if (!groups || groups.length === 0) {
    return (
      <div className="py-3 px-2 text-center text-sm text-text-muted italic select-none">
        {emptyText}
      </div>
    );
  }
  return groups.map((g, i) => (
    <SelectGroup key={i}>
      <SelectLabel className="select-group-label">{g.group}</SelectLabel>
      {renderOptions(g.options)}
      {i < groups.length - 1 && <SelectSeparator className="select-separator" />}
    </SelectGroup>
  ));
}
