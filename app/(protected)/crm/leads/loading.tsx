import { Skeleton } from "@/components/ui/skeleton";

export default function LeadsLoading() {
  return (
    <div className="main-container gap-3! overflow-x-hidden">
      <div className="card-base flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-border/40 bg-bg-card px-3 py-2"
            >
              <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-12 rounded-md" />
                <Skeleton className="h-3 w-24 max-w-full rounded-md" />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      <div className="hidden items-center justify-between gap-3 lg:flex">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      <div className="space-y-2 lg:hidden">
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-9 w-24 shrink-0 rounded-full"
            />
          ))}
        </div>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
          ))}
        </div>

        <div className="hidden min-w-0 flex-col gap-4 lg:flex">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
