export default function ExpenseDetailLoading() {
  return (
    <div className="main-container mx-auto w-full max-w-4xl gap-4!">
      <div className="skeleton h-6 w-44 rounded-lg" />
      <div className="card-elevated space-y-5 p-6 lg:p-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="skeleton size-12 rounded" />
            <div className="space-y-2">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-64" />
            </div>
          </div>
          <div className="skeleton h-8 w-24 rounded-full" />
        </div>
        <div className="space-y-2 text-center">
          <div className="skeleton mx-auto h-8 w-40" />
          <div className="skeleton mx-auto h-4 w-56" />
        </div>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="grid grid-cols-12 gap-3 border-b border-dashed border-border pb-3">
            <div className="skeleton col-span-3 h-4" />
            <div className="skeleton col-span-9 h-5" />
          </div>
        ))}
      </div>
    </div>
  );
}
