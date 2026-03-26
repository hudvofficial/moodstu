export default function DressesLoading() {
  return (
    <div className="main-container">
      {/* Stats skeleton */}
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 h-16 skeleton" />
        ))}
      </div>
      {/* Filter skeleton */}
      <div className="h-10 skeleton" />
      {/* Card grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="skeleton-card">
            <div style={{ aspectRatio: "3/4" }} className="skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
