export default function ServicesLoading() {
  return (
    <div className="main-container gap-3!">
      {/* Stats skeleton */}
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 h-12 bg-surface rounded-xl animate-pulse" />
        ))}
      </div>
      {/* Filter skeleton */}
      <div className="h-10 bg-surface rounded-lg animate-pulse" />
      {/* Rows skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-14 bg-surface rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
