import { Skeleton } from "@/components/ui/skeleton";

function ContractRowSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_0.8fr_1.2fr_1fr_0.5fr] items-center gap-4 px-4 py-3">
      <Skeleton className="h-4 w-24" />
      <div className="flex items-center gap-2">
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="ml-auto h-4 w-24" />
      <Skeleton className="ml-auto h-5 w-20 rounded-md" />
      <Skeleton className="mx-auto h-6 w-16 rounded-md" />
      <Skeleton className="h-8 w-full rounded-md" />
      <Skeleton className="h-6 w-24 rounded-full" />
      <Skeleton className="ml-auto size-8 rounded-md" />
    </div>
  );
}

function ContractCardSkeleton() {
  return (
    <div className="card-base p-4">
      <div className="mb-2 flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <Skeleton className="mb-2 h-5 w-2/3" />
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="mb-3 h-9 w-full rounded-md" />
      <div className="mb-2 flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-1 w-full rounded-full" />
    </div>
  );
}

export function ContractsListSkeleton() {
  return (
    <div className="main-container gap-3!">
      <div className="flex items-center justify-between gap-4 rounded-xl bg-bg-card px-5 py-3 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2 rounded-lg bg-bg-hover/60 px-3 py-2">
              <Skeleton className="size-7 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="hidden h-10 w-36 rounded-md md:block" />
      </div>

      <div className="md:hidden flex flex-nowrap items-center gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>

      <div className="hidden items-center justify-between gap-3 md:flex">
        <div className="flex min-w-0 flex-1 gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-32 rounded-full" />
          ))}
        </div>
        <div className="flex shrink-0 gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-28 rounded-md" />
          ))}
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-bg-card shadow-xs md:block">
        <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_0.8fr_1.2fr_1fr_0.5fr] gap-4 border-b border-border bg-bg-hover/50 px-4 py-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className="h-3 w-full" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, index) => (
          <ContractRowSkeleton key={index} />
        ))}
      </div>

      <div className="md:hidden flex flex-col gap-3 pt-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <ContractCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
