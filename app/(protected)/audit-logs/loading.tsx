/* Audit Logs Loading — Skeleton UI */
export default function AuditLogsLoading() {
  return (
    <div className="main-container py-6 lg:py-10 animate-pulse">
      {/* Header */}
      <div className="h-8 w-48 bg-bg-hover rounded mb-6" />

      {/* Log rows skeleton */}
      <div className="card-base divide-y divide-border">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-4">
            <div className="w-8 h-8 rounded-full bg-bg-hover shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-28 bg-bg-hover rounded" />
                <div className="h-3 w-16 bg-bg-hover rounded" />
              </div>
              <div className="h-3 w-64 bg-bg-hover rounded" />
              <div className="h-3 w-32 bg-bg-hover rounded" />
            </div>
            <div className="h-3 w-20 bg-bg-hover rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
