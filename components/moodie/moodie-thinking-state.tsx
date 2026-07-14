"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { MoodieMessageParts } from "@/components/moodie/moodie-message-parts";
import { MoodieResponseContent } from "@/components/moodie/moodie-response-content";
import { Button } from "@/components/ui/button";
import { getMoodieActivityDetailLabel, presentMoodieActivity } from "@/lib/moodie/activity-presentation";
import type { MoodieMessagePart, MoodieTurnActivity } from "@/types/moodie";

interface MoodieThinkingStateProps {
  statusLabel?: string | null;
  activities?: MoodieTurnActivity[];
  streamedText?: string;
  parts?: Array<{ id: string; part: MoodieMessagePart }>;
}

export function MoodieThinkingState({ statusLabel, activities = [], streamedText = "", parts = [] }: MoodieThinkingStateProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const startedAtRef = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const presentation = presentMoodieActivity(activities);
  const phaseLabel = presentation.phaseLabel || statusLabel || "Đang hiểu yêu cầu";

  useEffect(() => {
    const updateElapsed = () => setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    const intervalId = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="flex w-full justify-start" aria-live="polite" data-moodie-activity-status>
      <div className="min-w-0 w-full">
        <div className="min-w-0">
          {presentation.expandable ? (
            <Button
              type="button"
              unstyled
              className="flex min-h-8 max-w-full items-center gap-2 bg-transparent px-0 text-left text-sm text-text-muted outline-none transition-colors hover:text-text-primary focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-primary/20"
              onClick={() => setHistoryOpen((value) => !value)}
              aria-expanded={historyOpen}
              aria-label="Mở hoặc đóng các bước Moodie đang thực hiện"
            >
              <MoodieActivityIcon failed={presentation.failed} completed={presentation.completed} />
              <span className="min-w-0 truncate">{phaseLabel}</span>
              {elapsedSeconds > 0 ? <span className="shrink-0 text-micro tabular-nums text-text-muted/80">{elapsedSeconds}s</span> : null}
              {historyOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            </Button>
          ) : (
            <div className="flex min-h-8 max-w-full items-center gap-2 text-sm text-text-muted" role="status">
              <MoodieActivityIcon failed={presentation.failed} completed={presentation.completed} />
              <span className="min-w-0 truncate">{phaseLabel}</span>
              {elapsedSeconds > 0 ? <span className="shrink-0 text-micro tabular-nums text-text-muted/80">{elapsedSeconds}s</span> : null}
            </div>
          )}

          {historyOpen && presentation.expandable ? (
            <div className="mt-0.5 max-w-2xl pl-0.5">
              {presentation.details.map((activity, index) => (
                <div key={activity.id} className="flex items-stretch gap-2 text-sm text-text-muted">
                  <div className="flex w-3 shrink-0 flex-col items-center">
                    <span className={`mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full ${activity.state === "error" ? "bg-danger" : activity.state === "done" ? "bg-text-muted/70" : "bg-primary"}`} />
                    {index < presentation.details.length - 1 ? <span className="my-0.5 w-px flex-1 bg-border" /> : null}
                  </div>
                  <div className={`min-w-0 flex-1 py-1.5 leading-5 ${activity.state === "active" ? "text-text-primary" : ""}`}>
                    <span>{getMoodieActivityDetailLabel(activity)}</span>
                    {activity.durationMs !== undefined ? <span className="ml-1.5 text-micro tabular-nums text-text-muted">{formatActivityDuration(activity.durationMs)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {streamedText ? <div className="mt-3"><MoodieResponseContent content={streamedText} /></div> : null}
          {parts.length > 0 ? <div className="mt-3"><MoodieMessageParts parts={parts.map((item) => item.part)} /></div> : null}
        </div>
      </div>
    </div>
  );
}

function formatActivityDuration(durationMs: number) {
  return durationMs >= 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${durationMs}ms`;
}

function MoodieActivityIcon({ failed, completed }: { failed: boolean; completed: boolean }) {
  if (failed) return <CircleX className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />;
  if (completed) return <CircleCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />;
  return <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-primary/80 motion-reduce:animate-none" aria-hidden="true" style={{ animationDuration: "1.4s" }} />;
}
