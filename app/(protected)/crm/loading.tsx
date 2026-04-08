import { Skeleton } from "@/components/ui/skeleton";

export default function CRMLoading() {
  return (
    <div className="w-full h-full p-4 sm:p-5 flex flex-col gap-4">
      {/* Search and stats bar skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <Skeleton className="h-12 w-full sm:w-1/3 rounded-xl" />
        <Skeleton className="h-12 w-full sm:w-2/3 rounded-xl" />
      </div>
      
      {/* Filters skeleton */}
      <Skeleton className="h-10 w-full rounded-xl" />
      
      {/* Table/Cards skeleton */}
      <Skeleton className="h-[500px] w-full rounded-2xl flex-1" />
    </div>
  );
}
