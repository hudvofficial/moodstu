import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-bg-base/50 p-2 sm:p-4">
      <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-border/40 overflow-hidden">
        {/* Header + Actions */}
        <div className="p-4 sm:p-5 border-b border-border/40 bg-white dark:bg-zinc-900 flex justify-between items-center z-10">
          <div>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-60 mt-1" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border/30 bg-bg-muted/20">
          <div className="flex gap-3">
            <Skeleton className="h-10 w-full md:w-64" />
            <Skeleton className="h-10 w-32 hidden sm:block" />
            <Skeleton className="h-10 w-32 hidden sm:block" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
