// ═══════════════════════════════════════════
// Contract Detail — Loading Skeleton
// Phase 04a: Shimmer animation while data loads
// ═══════════════════════════════════════════

export default function ContractDetailLoading() {
  return (
    <div className="main-container animate-pulse">
      {/* Top Action Bar skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-bg-hover rounded-lg" />
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-bg-hover rounded-xl" />
          <div className="h-9 w-9 bg-bg-hover rounded-xl" />
          <div className="h-9 w-24 bg-bg-hover rounded-xl max-lg:hidden" />
        </div>
      </div>

      {/* Summary Card skeleton */}
      <div className="card-base p-4 lg:p-6 space-y-3">
        <div className="h-5 w-48 bg-bg-hover rounded" />
        <div className="h-4 w-64 bg-bg-hover rounded" />
        <div className="flex gap-3 mt-2">
          <div className="h-6 w-20 bg-bg-hover rounded-full" />
          <div className="h-6 w-24 bg-bg-hover rounded-full" />
        </div>
      </div>

      {/* Main Grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 lg:gap-6">
        {/* Left column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="card-base p-4 lg:p-6 space-y-3">
            <div className="h-4 w-40 bg-bg-hover rounded" />
            <div className="h-4 w-full bg-bg-hover rounded" />
            <div className="h-4 w-3/4 bg-bg-hover rounded" />
          </div>
          <div className="card-base p-4 lg:p-6 space-y-3">
            <div className="h-4 w-36 bg-bg-hover rounded" />
            <div className="h-20 w-full bg-bg-hover rounded" />
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card-base p-4 lg:p-6 space-y-3">
            <div className="h-4 w-28 bg-bg-hover rounded" />
            <div className="h-16 w-full bg-bg-hover rounded" />
          </div>
          <div className="card-base p-4 lg:p-6 space-y-3">
            <div className="h-4 w-32 bg-bg-hover rounded" />
            <div className="h-12 w-full bg-bg-hover rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
