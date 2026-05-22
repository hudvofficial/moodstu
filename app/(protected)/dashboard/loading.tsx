import { SkeletonCard } from "@/components/ui/skeleton";

function KPICardSkeleton() {
  return (
    <div className="card-base p-5 h-28">
      <div className="flex items-start justify-between mb-3">
        <div className="icon-box bg-bg-hover animate-pulse" />
        <div className="h-5 w-16 bg-bg-hover rounded animate-pulse" />
      </div>
      <div className="h-4 w-24 bg-bg-hover rounded mb-2 animate-pulse" />
      <div className="h-7 w-32 bg-bg-hover rounded animate-pulse" />
    </div>
  );
}

function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={`card-base p-5 ${className || ""}`}>
      <div className="flex items-center gap-2 mb-5">
        <div className="icon-box bg-bg-hover animate-pulse" />
        <div className="h-5 w-40 bg-bg-hover rounded animate-pulse" />
      </div>
      <div className="h-44 bg-bg-hover rounded animate-pulse" />
    </div>
  );
}

function ListSkeleton({ className }: { className?: string }) {
  return (
    <div className={`card-base p-5 ${className || ""}`}>
      <div className="flex items-center gap-2 mb-5">
        <div className="icon-box bg-bg-hover animate-pulse" />
        <div className="h-5 w-32 bg-bg-hover rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-3 bg-bg-hover rounded-full animate-pulse" />
            <div className="h-4 flex-1 bg-bg-hover rounded animate-pulse" />
            <div className="h-4 w-20 bg-bg-hover rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="main-container">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <KPICardSkeleton key={index} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <ChartSkeleton className="lg:col-span-3 h-80" />
        <ChartSkeleton className="lg:col-span-2 h-80" />
      </div>

      {/* Lists Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListSkeleton className="h-64" />
        <ListSkeleton className="h-64" />
      </div>
    </div>
  );
}
