export default function PrintingLabsLoading() {
  return (
    <div className="main-container gap-3!">
      <div className="h-6 w-40 bg-surface rounded animate-pulse" />
      <div className="flex gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex-1 h-16 bg-surface rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-20 bg-surface rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

