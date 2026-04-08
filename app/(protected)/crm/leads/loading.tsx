import { Skeleton } from "@/components/ui/skeleton";

export default function LeadsLoading() {
  return (
    <div className="main-container gap-3! p-0!">
      <div className="flex flex-col sm:flex-row gap-4 w-full bg-bg-card rounded-xl p-3 shadow-xs border border-border/40">
        <Skeleton className="h-10 w-full sm:w-1/4 rounded-lg" />
        <Skeleton className="h-10 w-full sm:w-1/4 rounded-lg" />
        <Skeleton className="h-10 w-full sm:w-1/4 rounded-lg" />
        <Skeleton className="h-10 w-full sm:w-1/4 rounded-lg" />
      </div>
      
      <Skeleton className="h-12 w-full rounded-xl bg-bg-card" />
      
      <Skeleton className="h-[400px] w-full rounded-xl bg-bg-card flex-1" />
    </div>
  );
}
