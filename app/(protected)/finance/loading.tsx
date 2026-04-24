import { SkeletonCard } from "@/components/ui/skeleton";

export default function FinanceLoading() {
  return (
    <div className="main-container gap-4!">
      <SkeletonCard className="h-20" />
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-9">
        {Array.from({ length: 9 }, (_, index) => (
          <SkeletonCard key={index} className="h-24" />
        ))}
      </div>
      <SkeletonCard className="h-40" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SkeletonCard className="h-80 lg:col-span-3" />
        <SkeletonCard className="h-80 lg:col-span-2" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-64" />
      </div>
    </div>
  );
}
