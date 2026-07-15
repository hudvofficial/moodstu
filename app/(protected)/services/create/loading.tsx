import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function CreateServiceLoading() {
  return (
    <div className="main-container">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>

      <div className="pb-24 lg:pb-6" style={{ paddingTop: "var(--space-main-y)" }}>
        <div className="detail-grid">
          <div className="detail-main space-y-6 min-w-0">
            <SkeletonCard className="rounded-soft-2xl" />
            <SkeletonCard className="rounded-soft-2xl" />
            <SkeletonCard className="rounded-soft-2xl" />
          </div>
          <div className="detail-sidebar hidden lg:flex">
            <div className="sticky top-[72px] space-y-4 w-full">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
