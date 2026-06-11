/* Credit Cards Loading — Skeleton UI */
export default function CreditCardsLoading() {
  return (
    <div className="main-container py-6 lg:py-10 animate-pulse">
      <div className="h-8 w-56 bg-bg-hover rounded mb-6" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card-base p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 bg-bg-hover rounded" />
              <div className="h-8 w-12 bg-bg-hover rounded" />
            </div>
            <div className="h-4 w-40 bg-bg-hover rounded" />
            <div className="h-3 w-24 bg-bg-hover rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
