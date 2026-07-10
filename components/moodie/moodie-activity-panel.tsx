"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { MoodieActivityStage } from "@/lib/moodie/ux-helpers";

interface MoodieActivityPanelProps {
  stages: MoodieActivityStage[];
}

export function MoodieActivityPanel({ stages }: MoodieActivityPanelProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/90 px-4 py-3 shadow-xs">
      <div className="flex flex-wrap gap-3">
        {stages.map((stage) => (
          <div key={stage.label} className="inline-flex items-center gap-2 text-caption text-text-secondary">
            {stage.state === "done" ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : stage.state === "active" ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Circle className="h-4 w-4 text-text-muted" />
            )}
            <span>{stage.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
