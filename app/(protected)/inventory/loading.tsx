export default function InventoryLoading() {
  return (
    <div className="main-container gap-3!">
      {/* Stats bar skeleton */}
      <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
        <div className="flex items-center gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="skeleton w-8 h-8 rounded-lg" />
              <div className="space-y-1">
                <div className="skeleton-text w-12 h-3" />
                <div className="skeleton-text w-8 h-4" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden lg:flex gap-2">
          <div className="skeleton w-32 h-10 rounded-xl" />
          <div className="skeleton w-28 h-10 rounded-xl" />
          <div className="skeleton w-28 h-10 rounded-xl" />
        </div>
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton w-24 h-9 rounded-full" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="card-base overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <div className="skeleton w-20 h-4" />
            <div className="skeleton w-40 h-4" />
            <div className="skeleton w-16 h-4" />
            <div className="skeleton w-24 h-4" />
            <div className="skeleton w-20 h-6 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
