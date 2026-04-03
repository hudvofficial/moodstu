export default function ProductivityLoading() {
  return (
    <div className="main-container gap-3!">
      <div className="flex items-center justify-between gap-4 rounded-xl bg-bg-card px-5 py-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-6">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="skeleton h-8 w-8 rounded-lg" />
              <div className="space-y-1">
                <div className="skeleton h-3 w-14 rounded-full" />
                <div className="skeleton h-4 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-base flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2">
          {[1, 2, 3].map((index) => (
            <div key={index} className="skeleton h-9 w-24 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-11 w-full rounded-xl lg:max-w-sm" />
      </div>

      <div className="card-base overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-4">
            <div className="skeleton h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-40 rounded-full" />
              <div className="skeleton h-3 w-24 rounded-full" />
            </div>
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
