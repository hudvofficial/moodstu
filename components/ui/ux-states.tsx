"use client";

import { LucideIcon, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  actionLabel,
  onAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center animate-in fade-in duration-700",
      compact ? "py-8 px-4" : "py-20 px-4",
      className
    )}>
      <div className={cn(
        "bg-bg-hover rounded-full flex items-center justify-center border border-border/50",
        compact ? "mb-4 h-12 w-12" : "mb-6 h-20 w-20",
      )}>
        <Icon
          className={cn(compact ? "h-6 w-6" : "h-10 w-10", "text-text-muted")}
          strokeWidth={1.5}
        />
      </div>
      <h3 className={cn(compact ? "text-body font-semibold mb-1" : "text-h3 mb-2")} style={{ width: "100%" }}>
        {title}
      </h3>
      <p
        className={cn(
          "text-text-muted leading-relaxed",
          compact ? "text-caption mb-0" : "text-sm mb-8",
        )}
        style={{ maxWidth: compact ? "20rem" : "24rem", width: "100%" }}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          variant="secondary"
          className={cn("rounded-md", compact ? "mt-4 h-10 px-6" : "h-11 px-8")}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// --- Skeleton ---

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-bg-hover border border-border/50", className)}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 bg-bg-card rounded-xl shadow-sm flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <Skeleton className="w-24 h-5" />
        <Skeleton className="w-16 h-8 rounded-lg" />
      </div>
      <Skeleton className="w-48 h-8" />
      <div className="flex gap-2">
         <Skeleton className="w-20 h-5" />
         <Skeleton className="w-20 h-5" />
      </div>
    </div>
  );
}
