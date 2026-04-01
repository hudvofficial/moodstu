/* ═══════════════════════════════════════════
   Settings Loading — Skeleton UI
   4 cards matching settings-view structure
   ═══════════════════════════════════════════ */

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-bg-base pb-24 lg:pb-12">
      {/* Header skeleton */}
      <div className="h-14 bg-bg-card" />

      <div className="px-4 py-4 lg:max-w-2xl lg:mx-auto space-y-4">
        {/* Profile card skeleton */}
        <div className="card-base p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-bg-hover" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 bg-bg-hover rounded" />
              <div className="h-3 w-48 bg-bg-hover rounded" />
            </div>
          </div>
        </div>

        {/* Notification prefs skeleton */}
        <div className="card-base p-4 animate-pulse">
          <div className="h-4 w-36 bg-bg-hover rounded mb-4" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-bg-hover rounded" />
                <div className="h-4 w-28 bg-bg-hover rounded" />
              </div>
              <div className="w-[51px] h-[31px] bg-bg-hover rounded-full" />
            </div>
          ))}
        </div>

        {/* Admin links skeleton */}
        <div className="card-base p-4 animate-pulse">
          <div className="h-4 w-40 bg-bg-hover rounded mb-4" />
          <div className="space-y-3">
            <div className="h-11 bg-bg-hover rounded" />
            <div className="h-11 bg-bg-hover rounded" />
          </div>
        </div>

        {/* Changelog skeleton */}
        <div className="card-base p-4 animate-pulse">
          <div className="h-4 w-24 bg-bg-hover rounded mb-4" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-bg-hover rounded" />
            <div className="h-3 w-3/4 bg-bg-hover rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
