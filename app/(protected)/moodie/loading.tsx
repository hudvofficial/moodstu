export default function MoodieLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0">
      <div className="hidden h-full min-h-0 lg:flex">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-border/70 bg-bg-base shadow-sm">
          <div className="h-16 shrink-0 animate-pulse border-b border-border/70 bg-bg-hover/70" />
          <div className="flex-1 animate-pulse bg-white/60" />
          <div className="h-24 shrink-0 animate-pulse border-t border-border/70 bg-bg-hover/60" />
        </div>
        <div className="w-72 shrink-0 border-l border-border/70 bg-white/70 animate-pulse" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
        <div className="h-16 shrink-0 animate-pulse border-b border-border/70 bg-bg-hover/70" />
        <div className="flex-1 animate-pulse bg-white/60" />
        <div className="h-24 shrink-0 animate-pulse border-t border-border/70 bg-bg-hover/60" />
      </div>
    </div>
  );
}
