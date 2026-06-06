/**
 * ChartSkeleton - Branded loading placeholder for chart components
 * Uses bar-shaped placeholders with staggered animation for visual polish
 */

interface ChartSkeletonProps {
  height?: number;
  className?: string;
}

export function ChartSkeleton({ height = 300, className = "" }: ChartSkeletonProps) {
  return (
    <div
      className={`card-base p-5 ${className}`}
      style={{ height: `${height}px` }}
      aria-label="Đang tải biểu đồ..."
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="icon-box bg-bg-hover animate-pulse" />
        <div className="h-5 w-40 bg-bg-hover rounded animate-pulse" />
      </div>
      <div className="flex items-end gap-3" style={{ height: `${height - 100}px` }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-bg-hover rounded-t animate-pulse"
            style={{
              height: `${25 + ((i * 17 + 13) % 60)}%`,
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
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
    <div className={`w-full space-y-2 ${className}`} aria-label="Đang tải bảng...">
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
