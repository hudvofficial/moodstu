import { SkeletonCard } from "@/components/ui/skeleton";

export default function FinanceSmartDashboardLoading() {
  return (
    <main className="main-container gap-4!">
      <SkeletonCard className="h-32" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SkeletonCard className="h-44" />
        <SkeletonCard className="h-44" />
        <SkeletonCard className="h-44" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SkeletonCard className="h-80 xl:col-span-2" />
        <SkeletonCard className="h-80" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </div>
    </main>
  );
}
