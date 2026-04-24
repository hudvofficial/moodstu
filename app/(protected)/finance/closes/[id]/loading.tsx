import { SkeletonCard } from "@/components/ui/skeleton";

export default function CloseDetailLoading() {
  return (
    <div className="main-container gap-4!">
      <div className="skeleton h-6 w-48 rounded-lg" />
      <SkeletonCard className="h-28" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SkeletonCard className="h-36" />
        <SkeletonCard className="h-36" />
        <SkeletonCard className="h-36" />
      </div>
      <SkeletonCard className="h-80" />
    </div>
  );
}
