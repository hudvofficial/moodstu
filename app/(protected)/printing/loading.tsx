export default function PrintingLoading() {
  return (
    <div className="main-container gap-3!">
      <div className="flex gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex-1 h-16 bg-surface rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-10 bg-surface rounded-lg animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-20 bg-surface rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
