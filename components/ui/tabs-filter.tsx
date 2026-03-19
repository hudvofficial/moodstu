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
}

/**
 * TabsFilter — V1 FilterChips variant="tabs" exact copy
 * Segmented control: container with bg-elevated + border, active has bg-surface + shadow
 */
export function TabsFilter({ tabs, activeTab, onChange, className = "" }: TabsFilterProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 bg-elevated p-1 rounded-lg shadow-xs",
        "max-lg:flex max-lg:overflow-x-auto max-lg:scrollbar-hide",
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
              isActive
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
