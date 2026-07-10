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

function getSummary(trace: MoodieTrace) {
  if (trace.engine === "core_fallback") return "Phản hồi dự phòng";
  if (trace.tool_call_count > 0) return "Đã tra dữ liệu • " + trace.tool_call_count + " nguồn";
  return "Đã trả lời";
}

export function MoodieDebugPanel({ trace }: MoodieDebugPanelProps) {
  const [open, setOpen] = useState(false);
  const hasTechnicalDetail = trace.tool_call_count > 0 || trace.verifier_corrections > 0 || Boolean(trace.error) || trace.fallback_used;

  return (
    <div className="flex min-h-6 flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
      <span>{getSummary(trace)}</span>
      <span aria-hidden="true">•</span>
      <span>{formatDuration(trace.duration_ms)}</span>
      {hasTechnicalDetail ? <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 gap-1 px-1 text-[11px] text-text-muted hover:text-text-primary"
        onClick={() => setOpen((value) => !value)}
      >
        <Wrench className="h-3.5 w-3.5" />
        {open ? "Ẩn chi tiết" : "Chi tiết"}
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </Button> : null}

      {open ? (
        <div className="basis-full rounded-xl border border-border bg-bg-subtle px-3 py-2.5 text-caption text-text-secondary">
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
