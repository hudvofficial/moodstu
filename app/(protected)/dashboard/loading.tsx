import { SkeletonCard } from "@/components/ui/skeleton";

function QuickAccessSkeleton() {
  return (
    <div className="lg:hidden">
      <div className="grid grid-cols-5 gap-2 md:grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] md:gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 py-2">
            <div className="h-14 w-14 md:h-16 md:w-16 rounded-xl bg-bg-hover animate-pulse" />
            <div className="h-3 w-10 bg-bg-hover rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

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
      <div className="flex items-end gap-3 h-44">
        {[40, 60, 45, 80, 50, 70].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-bg-hover rounded-t animate-pulse"
            style={{
              height: `${h}%`,
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ListSkeleton({ className }: { className?: string }) {
  return (
    <div className={`card-base p-5 ${className || ""}`}>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-bg-hover animate-pulse" />
          <div className="h-5 w-32 bg-bg-hover rounded animate-pulse" />
        </div>
        <div className="h-4 w-16 bg-bg-hover rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg p-3 bg-bg-base/60">
            <div className="icon-box bg-bg-hover animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-3/4 bg-bg-hover rounded animate-pulse mb-1.5" />
              <div className="h-3 w-1/2 bg-bg-hover rounded animate-pulse" />
            </div>
            <div className="shrink-0 text-right">
              <div className="h-4 w-12 bg-bg-hover rounded animate-pulse mb-1" />
              <div className="h-3 w-16 bg-bg-hover rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="main-container">
      {/* Quick Access Grid (mobile only) */}
      <QuickAccessSkeleton />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <KPICardSkeleton key={index} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 mt-4">
        <ChartSkeleton className="lg:col-span-3" />
        <ChartSkeleton className="lg:col-span-2" />
      </div>

      {/* Lists Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mt-4">
        <ListSkeleton />
        <ListSkeleton />
      </div>
    </div>
  );
}
