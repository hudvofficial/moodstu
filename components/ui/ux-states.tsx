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
}

export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  actionLabel,
  onAction,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in duration-700",
      className
    )}>
      <div className="w-20 h-20 bg-bg-hover rounded-full flex items-center justify-center mb-6 border border-border/50">
        <Icon className="w-10 h-10 text-text-muted" strokeWidth={1.5} />
      </div>
      <h3 className="text-h3 mb-2" style={{ width: "100%" }}>{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed mb-8" style={{ maxWidth: "24rem", width: "100%" }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          variant="secondary"
          className="rounded-md px-8 h-11"
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
