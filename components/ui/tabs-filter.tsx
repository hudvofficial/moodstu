"use client";

import { cn } from "@/lib/utils";

interface Tab {
  label: string;
  value: string;
  count?: number;
}

interface TabsFilterProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
  /** "tabs" = segmented control (default), "pills" = flat pills for inline scroll */
  variant?: "tabs" | "pills";
}

/**
 * TabsFilter — Shared filter component with 2 variants:
 * - tabs: Segmented control with bg-elevated container + shadow (desktop, employees)
 * - pills: Flat pills, no container, no own scroll — sits inside parent scroll (contracts mobile)
 */
export function TabsFilter({
  tabs, activeTab, onChange, className = "", variant = "tabs",
}: TabsFilterProps) {
  const isPills = variant === "pills";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2",
        // Container — only tabs variant gets background + own scroll
        !isPills && "bg-elevated p-1 rounded-md shadow-xs",
        !isPills && "max-lg:flex max-lg:overflow-x-auto max-lg:scrollbar-hide",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0",
              isPills
                ? isActive
                  ? "bg-primary text-white shadow-sm"
                  : "bg-elevated text-text-secondary border border-border hover:bg-hover hover:text-text-main"
                : isActive
                  ? "bg-surface shadow-sm text-text-main"
                  : "text-text-secondary hover:text-text-main hover:bg-surface/50"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn("ml-1", isActive ? "opacity-80" : "opacity-50")}>
                ({tab.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
