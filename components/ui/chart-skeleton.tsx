/**
 * ChartSkeleton - Loading placeholder for chart components
 * Provides visual feedback while charts lazy-load
 */

interface ChartSkeletonProps {
  height?: number;
  className?: string;
}

export function ChartSkeleton({ height = 300, className = "" }: ChartSkeletonProps) {
  return (
    <div
      className={`w-full rounded-lg bg-bg-hover/30 animate-pulse ${className}`}
      style={{ height: `${height}px` }}
      aria-label="Loading chart..."
    >
      <div className="flex items-center justify-center h-full">
        <div className="text-text-muted text-sm">Loading...</div>
      </div>
    </div>
  );
}

/**
 * TableSkeleton - Loading placeholder for table components
 */

interface TableSkeletonProps {
  rows?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, className = "" }: TableSkeletonProps) {
  return (
    <div className={`w-full space-y-2 ${className}`} aria-label="Loading table...">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 rounded bg-bg-hover/30 animate-pulse"
          style={{ animationDelay: `${i * 50}ms` }}
        />
      ))}
    </div>
  );
}
