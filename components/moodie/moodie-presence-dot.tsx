export function MoodiePresenceDot({ live, className = "" }: { live: boolean; className?: string }) {
  return (
    <span className={`relative inline-flex h-3 w-3 shrink-0 items-center justify-center ${className}`} aria-label={live ? "Moodie đã kết nối model" : "Moodie chưa kết nối model"} role="status">
      {live ? <span className="absolute h-3 w-3 rounded-full bg-success/35 animate-ping motion-reduce:animate-none" style={{ animationDuration: "1.6s" }} aria-hidden="true" /> : null}
      <span className={`relative h-2 w-2 rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.9)] ${live ? "bg-success animate-pulse motion-reduce:animate-none" : "bg-primary"}`} style={live ? { animationDuration: "1.6s" } : undefined} aria-hidden="true" />
    </span>
  );
}
