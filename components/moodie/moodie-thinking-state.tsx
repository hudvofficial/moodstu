"use client";

import { Bot, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { MoodieMessageParts } from "@/components/moodie/moodie-message-parts";
import { MoodieResponseContent } from "@/components/moodie/moodie-response-content";
import type { MoodieMessagePart, MoodieTurnActivity } from "@/types/moodie";

interface MoodieThinkingStateProps {
  statusLabel?: string | null;
  activities?: MoodieTurnActivity[];
  streamedText?: string;
  parts?: Array<{ id: string; part: MoodieMessagePart }>;
}

export function MoodieThinkingState({ statusLabel, activities = [], streamedText = "", parts = [] }: MoodieThinkingStateProps) {
  const visibleActivities = activities.slice(-4);

  return (
    <article className="flex w-full justify-start animate-fade-in-up" aria-live="polite">
      <div className="flex min-w-0 w-full gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-text-inverse">
          <Bot className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1 space-y-3 py-1">
          {visibleActivities.length > 0 ? (
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-muted">
              {visibleActivities.map((activity) => (
                <div key={activity.id} className="inline-flex min-w-0 items-center gap-1.5">
                  {activity.state === "error" ? (
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-danger" />
                  ) : activity.state === "done" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                  )}
                  <span className="truncate">{activity.label}</span>
                  {activity.durationMs !== undefined ? <span className="text-micro text-text-muted">{activity.durationMs}ms</span> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="inline-flex min-h-8 items-center gap-2 text-xs text-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>{statusLabel || "Moodie đang bắt đầu xử lý"}</span>
            </div>
          )}

          {streamedText ? <MoodieResponseContent content={streamedText} /> : null}
          {parts.length > 0 ? <MoodieMessageParts parts={parts.map((item) => item.part)} /> : null}
        </div>
      </div>
    </article>
  );
}
