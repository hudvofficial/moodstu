"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CrmViewSwitchItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface CrmViewSwitchProps {
  items: CrmViewSwitchItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CrmViewSwitch({
  items,
  value,
  onChange,
  className,
}: CrmViewSwitchProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border/50 bg-bg-input p-1",
        className,
      )}
      role="tablist"
      aria-label="CRM view mode"
    >
      {items.map((item) => {
        const isActive = item.value === value;

        return (
          <Button
            key={item.value}
            unstyled
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-pressed={isActive}
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-text-muted transition-all",
              isActive
                ? "bg-bg-card text-primary shadow-sm"
                : "hover:bg-bg-card/60 hover:text-text-primary",
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="sr-only">{item.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
