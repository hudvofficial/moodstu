"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Circle, Database, Loader2, Wrench, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MoodieActivityEntry, MoodieMessageSourceV2, MoodieTrace } from "@/types/moodie";
import { getMoodieToolDisplayLabel } from "@/lib/moodie/response-metadata";

function formatDuration(milliseconds?: number) {
  if (milliseconds === undefined) return null;
  return milliseconds >= 1000 ? `${(milliseconds / 1000).toFixed(1)}s` : `${milliseconds}ms`;
}

export function getMoodieElapsedDuration(activities: MoodieActivityEntry[], trace?: MoodieTrace) {
  if (trace?.duration_ms !== undefined) return trace.duration_ms;
  const starts = activities.map((item) => Date.parse(item.started_at)).filter(Number.isFinite);
  const ends = activities.map((item) => Date.parse(item.completed_at || item.started_at)).filter(Number.isFinite);
  if (!starts.length || !ends.length) return 0;
  return Math.max(0, Math.max(...ends) - Math.min(...starts));
}

export function MoodieExecutionSummary({
  activities = [],
  sources = [],
  trace,
  timestamp,
  pending = false,
  onOpenSources,
}: {
  activities?: MoodieActivityEntry[];
  sources?: MoodieMessageSourceV2[];
  trace?: MoodieTrace;
  timestamp?: string;
  pending?: boolean;
  onOpenSources?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const duration = getMoodieElapsedDuration(activities, trace);
  const failed = activities.some((item) => item.state === "failed") || Boolean(trace?.error);
  const completedTools = activities.filter((item) => item.kind === "tool" && item.state === "completed").length;
  const citationCount = sources.filter((source) => source.kind === "web" || source.kind === "document").length;
  const hasDatabaseData = sources.some((source) => source.kind === "database" || source.kind === "internal");
  const hasExecutionDetails = activities.length > 0 || sources.length > 0 || Boolean(trace?.tool_call_count);
  const sourceActionLabel = citationCount === sources.length
    ? `Xem ${citationCount} nguồn tham chiếu`
    : citationCount === 0
      ? `Xem dữ liệu tham chiếu · ${sources.length} mục`
      : `Xem nguồn và dữ liệu tham chiếu · ${sources.length} mục`;
  const summary = failed
    ? "Có bước xử lý gặp lỗi"
    : citationCount > 0
      ? `Đã tra ${citationCount} nguồn`
      : hasDatabaseData
        ? "Đã tra dữ liệu"
      : completedTools > 0
        ? `Đã dùng ${completedTools} công cụ`
        : pending
          ? "Moodie đang xử lý"
          : "Đã hoàn tất";
  const timeLabel = useMemo(() => timestamp
    ? new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp))
    : null, [timestamp]);

  if (!pending && !hasExecutionDetails) {
    return null;
  }

  return (
    <section className="text-caption text-text-muted" aria-label="Quá trình xử lý của Moodie">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <Button type="button" unstyled className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded-lg border-0 bg-transparent px-1.5 text-caption text-text-muted transition-colors hover:bg-black/5 hover:text-text-primary focus-visible:bg-black/5 focus-visible:outline-none" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          {pending ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Wrench className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{summary}</span>
          {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        </Button>
        {timeLabel ? <time className="shrink-0 text-micro text-text-muted" dateTime={timestamp}>{timeLabel}</time> : null}
      </div>

      {open ? (
        <div className="mt-1 pl-1">
          {duration > 0 ? <p className="px-1.5 pb-1 text-micro tabular-nums text-text-muted">Thời gian xử lý: {formatDuration(duration)}</p> : null}
          <ol className="space-y-1.5 border-l border-border py-1.5 pl-3">
            {activities.map((activity) => (
              <li key={activity.id} className="flex items-start gap-2 text-caption text-text-secondary">
                {activity.state === "failed" ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" /> : activity.state === "completed" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-primary text-primary" />}
                <span className="min-w-0 flex-1">{activity.kind === "tool" ? getMoodieToolDisplayLabel(activity.tool_name, activity.state, activity.label) : activity.label}</span>
              </li>
            ))}
          </ol>
          {sources.length > 0 ? (
            <Button type="button" unstyled className="mt-1 flex min-h-8 w-full items-center gap-2 rounded-lg border-0 bg-transparent px-1.5 py-1.5 text-left text-caption text-text-secondary outline-none transition-colors hover:bg-black/5 hover:text-text-primary focus-visible:bg-black/5 focus-visible:ring-2 focus-visible:ring-primary/20" onClick={onOpenSources}>
              <Database className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{sourceActionLabel}</span>
              <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
