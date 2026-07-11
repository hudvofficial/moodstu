"use client";

import { ChevronDown, ChevronUp, Wrench } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MoodieTrace } from "@/types/moodie";

interface MoodieDebugPanelProps {
  trace: MoodieTrace;
}

function formatDuration(milliseconds: number) {
  return milliseconds >= 1000
    ? (milliseconds / 1000).toFixed(1) + "s"
    : milliseconds + "ms";
}

export function MoodieDebugPanel({ trace }: MoodieDebugPanelProps) {
  const [open, setOpen] = useState(false);
  const hasTechnicalDetail = trace.tool_call_count > 0 || trace.verifier_corrections > 0 || Boolean(trace.error) || trace.fallback_used;
  if (!hasTechnicalDetail) return null;

  const summary = trace.error
    ? "Có lỗi xử lý"
    : trace.fallback_used
      ? "Đã dùng xử lý dự phòng"
      : trace.tool_call_count > 0
        ? `Đã tra ${trace.tool_call_count} nguồn`
        : "Đã điều chỉnh câu trả lời";

  return (
    <div className="text-caption text-text-muted">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`h-7 gap-1.5 px-1.5 text-caption hover:text-text-primary ${trace.error ? "text-danger" : "text-text-muted"}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <Wrench className="h-3.5 w-3.5" />
        {summary} · {formatDuration(trace.duration_ms)}
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </Button>

      {open ? (
        <div className="mt-1 rounded-xl border border-border bg-bg-subtle px-3 py-2.5 text-caption text-text-secondary">
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            <p><strong>Engine:</strong> {trace.engine}</p>
            <p><strong>Intent:</strong> {trace.route_intent || "general"}</p>
            <p><strong>Thời gian:</strong> {formatDuration(trace.duration_ms)}</p>
            <p><strong>Công cụ:</strong> {trace.tool_call_count}</p>
            {trace.provider_latency_ms !== undefined ? (
              <p><strong>Model:</strong> {formatDuration(trace.provider_latency_ms)}</p>
            ) : null}
            {trace.verifier_corrections > 0 ? (
              <p><strong>Điều chỉnh:</strong> {trace.verifier_corrections}</p>
            ) : null}
          </div>
          {trace.error ? (
            <p className="mt-2 rounded-lg bg-danger/10 px-2 py-1.5 text-danger">{trace.error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
