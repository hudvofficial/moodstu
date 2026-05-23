"use client";

/**
 * ExpandableFAB - Floating Action Button with expandable sub-actions
 * Mobile-only, expands upward to show multiple actions
 */

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptic";

interface FABAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "primary" | "success" | "warning" | "error";
}

interface ExpandableFABProps {
  mainAction: FABAction;
  subActions: FABAction[];
  className?: string;
}

const variantColors = {
  primary: "bg-primary hover:bg-primary/90",
  success: "bg-success hover:bg-success/90",
  warning: "bg-warning hover:bg-warning/90",
  error: "bg-error hover:bg-error/90",
};

export function ExpandableFAB({
  mainAction,
  subActions,
  className,
}: ExpandableFABProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    haptic("medium");
    setIsExpanded(!isExpanded);
  };

  const handleSubActionClick = (action: FABAction) => {
    haptic("light");
    action.onClick();
    setIsExpanded(false);
  };

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-40 animate-in fade-in duration-200"
          onClick={toggleExpand}
        />
      )}

      {/* FAB Container */}
      <div className={cn("lg:hidden fixed bottom-24 right-4 z-50", className)}>
        <div className="flex flex-col items-end gap-3">
          {/* Sub-actions (expand upward) */}
          {isExpanded && (
            <div className="flex flex-col items-end gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
              {subActions.map((action, index) => {
                const Icon = action.icon;
                const variant = action.variant || "primary";
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 animate-in slide-in-from-right-2 fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Label */}
                    <span className="bg-bg-card px-3 py-2 rounded-lg shadow-md text-sm font-medium text-text-primary whitespace-nowrap">
                      {action.label}
                    </span>
                    {/* Button */}
                    <button
                      onClick={() => handleSubActionClick(action)}
                      aria-label={action.label}
                      className={cn(
                        "flex items-center justify-center size-12 rounded-full text-white shadow-lg hover:scale-105 active:scale-95 transition-all",
                        variantColors[variant]
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Main FAB */}
          <button
            onClick={isExpanded ? toggleExpand : mainAction.onClick}
            onContextMenu={(e) => {
              e.preventDefault();
              if (subActions.length > 0) toggleExpand();
            }}
            aria-label={isExpanded ? "Đóng" : mainAction.label}
            className={cn(
              "flex items-center justify-center size-14 rounded-full bg-primary text-white shadow-float hover:scale-105 active:scale-95 transition-all",
              isExpanded && "rotate-45"
            )}
          >
            {isExpanded ? (
              <X className="w-7 h-7" />
            ) : (
              <mainAction.icon className="w-7 h-7" />
            )}
          </button>

          {/* Long-press hint (optional) */}
          {!isExpanded && subActions.length > 0 && (
            <p className="text-[10px] text-text-muted mt-1 animate-pulse">
              Giữ để xem thêm
            </p>
          )}
        </div>
      </div>
    </>
  );
}
