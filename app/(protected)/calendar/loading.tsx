export default function CalendarLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-bg-card shadow-md">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="skeleton h-7 w-44 rounded-lg" />
          <div className="flex gap-2">
            <div className="skeleton h-9 w-20 rounded-lg" />
            <div className="skeleton h-9 w-20 rounded-lg" />
          </div>
        </div>
        <div className="grid flex-1 grid-cols-7 gap-px bg-border/50 p-px">
          {Array.from({ length: 35 }, (_, index) => (
            <div key={index} className="bg-bg-card p-2">
              <div className="skeleton mb-3 h-4 w-8" />
              <div className="space-y-2">
                <div className="skeleton h-5 w-full rounded" />
                {index % 3 === 0 ? <div className="skeleton h-5 w-3/4 rounded" /> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
