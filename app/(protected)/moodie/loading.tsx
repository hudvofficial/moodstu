import { LoaderCircle } from "lucide-react";

export default function MoodieLoading() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-bg-base">
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white px-5 py-4 text-sm text-text-secondary shadow-sm">
        <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
        <span>Đang mở Moodie...</span>
      </div>
    </div>
  );
}
