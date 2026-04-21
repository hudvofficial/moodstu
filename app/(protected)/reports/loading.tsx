import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="main-container gap-4!">
      <Skeleton className="h-5 w-36" />

      <div className="card-base p-5">
        <Skeleton className="h-12 w-full" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <SkeletonCard className="h-80 xl:col-span-3" />
        <SkeletonCard className="h-80 xl:col-span-2" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </div>
    </div>
  );
}
