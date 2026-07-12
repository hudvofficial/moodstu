"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, RotateCcw, Square, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MoodieBackgroundRunRef } from "@/types/moodie";

type RunPayload = {
  id: string;
  status: string;
  progress: number;
  result?: { sources?: Array<{ id?: string; title?: string; url?: string; snippet?: string }> } | null;
  source_refs?: Array<{ id?: string; title?: string; url?: string; provider?: string }> | null;
  error?: string | null;
};

type RunEvent = { id?: string; event_type?: string; message?: string | null; sequence?: number };

const TERMINAL = new Set(["completed", "failed", "cancelled", "expired"]);

export function MoodieBackgroundRunStatus({ reference }: { reference: MoodieBackgroundRunRef }) {
  const [activeRunId, setActiveRunId] = useState(reference.id);
  const [run, setRun] = useState<RunPayload>({ id: reference.id, status: reference.status, progress: 0 });
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/moodie/runs?run_id=${encodeURIComponent(activeRunId)}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json() as { run?: RunPayload; events?: RunEvent[] };
    if (payload.run) setRun(payload.run);
    if (payload.events) setEvents(payload.events);
  }, [activeRunId]);

  useEffect(() => {
    void refresh();
    if (TERMINAL.has(run.status)) return;
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [refresh, run.status]);

  async function cancel() {
    setBusy(true);
    try {
      await fetch(`/api/moodie/runs/${encodeURIComponent(activeRunId)}/cancel`, { method: "POST" });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    setBusy(true);
    try {
      const response = await fetch(`/api/moodie/runs/${encodeURIComponent(activeRunId)}/retry`, { method: "POST" });
      const payload = await response.json() as { run?: RunPayload; error?: string };
      if (!response.ok || !payload.run) throw new Error(payload.error || "Không thể thử lại tác vụ");
      setActiveRunId(payload.run.id);
      setRun(payload.run);
      setEvents([]);
    } finally {
      setBusy(false);
    }
  }

  const sources = run.result?.sources || run.source_refs || [];
  const running = !TERMINAL.has(run.status);
  const canRetry = run.status === "failed" || run.status === "cancelled" || run.status === "expired";
  const latestProgressMessage = [...events].reverse().find((event) => event.message)?.message;
  return (
    <section className="rounded-xl border border-border bg-bg-subtle/70 p-3 sm:p-3.5" data-moodie-background-run={activeRunId}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {running ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" /> : run.status === "completed" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="h-4 w-4 shrink-0 text-danger" />}
            <p className="truncate text-sm font-medium text-text-primary">{reference.title}</p>
          </div>
          <p className="mt-1 text-xs text-text-muted">{running ? `Đang nghiên cứu · ${Math.max(0, Math.min(100, run.progress || 0))}%` : run.status === "completed" ? `Đã hoàn tất · ${sources.length} nguồn` : run.error || `Tác vụ ${run.status}`}</p>
          {latestProgressMessage && running ? <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{latestProgressMessage}</p> : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button type="button" unstyled onClick={() => void refresh()} className="rounded-lg p-2 text-text-muted hover:bg-bg-hover" aria-label="Làm mới tiến độ"><RefreshCw className="h-4 w-4" /></Button>
          {running ? <Button type="button" unstyled onClick={() => void cancel()} disabled={busy} className="rounded-lg p-2 text-text-muted hover:bg-bg-hover" aria-label="Huỷ nghiên cứu"><Square className="h-4 w-4" /></Button> : null}
          {canRetry ? <Button type="button" unstyled onClick={() => void retry()} disabled={busy} className="rounded-lg p-2 text-text-muted hover:bg-bg-hover" aria-label="Thử lại nghiên cứu"><RotateCcw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /></Button> : null}
        </div>
      </div>
      {running ? <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.max(4, Math.min(100, run.progress || 4))}%` }} /></div> : null}
      {run.status === "completed" && sources.length > 0 ? <div className="mt-3 space-y-1 border-t border-border/60 pt-2">{sources.slice(0, 8).map((source, index) => source.url ? <a key={source.id || source.url} href={source.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary"><span className="min-w-0 flex-1 truncate">{index + 1}. {source.title || new URL(source.url).hostname}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" /></a> : null)}</div> : null}
    </section>
  );
}
