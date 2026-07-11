"use client";

import { ArrowUpRight, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MoodieCapability } from "@/types/moodie";

interface MoodieEmptyStateProps {
  capabilities: MoodieCapability[];
  suggestions: string[];
  onSuggestionClick: (prompt: string) => void;
}

export function MoodieEmptyState({ capabilities, suggestions, onSuggestionClick }: MoodieEmptyStateProps) {
  const visibleSuggestions = suggestions.slice(0, 4);

  return (
    <div className="mx-auto grid min-h-full w-full max-w-3xl content-center justify-items-center py-10 sm:py-16">
      <div className="mb-9 grid w-full justify-items-center text-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-text-inverse shadow-sm">
          <Bot className="h-5 w-5" />
        </div>
        <h1 className="text-h2 text-text-primary sm:text-h1">Hôm nay mình bắt đầu từ đâu?</h1>
        <p className="mt-2 text-sm leading-6 text-text-muted" style={{ width: "min(100%, 560px)" }}>
          Moodie hiểu ngữ cảnh Studio, lịch, hợp đồng, tài chính, gallery và các công cụ đã được cấp quyền.
        </p>
        {capabilities.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-micro text-text-muted" style={{ width: "min(100%, 640px)" }}>
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="min-w-0 text-center">{capabilities.slice(0, 4).map((capability) => capability.label).join(" · ")}</span>
          </div>
        ) : null}
      </div>

      {visibleSuggestions.length > 0 ? (
        <div className="divide-y divide-border/60 border-y border-border/60" style={{ width: "min(100%, 640px)" }}>
          {visibleSuggestions.map((suggestion) => (
            <Button key={suggestion} type="button" unstyled className="group flex w-full items-center justify-between gap-4 px-1 py-3.5 text-left text-sm text-text-secondary transition hover:text-text-primary" onClick={() => onSuggestionClick(suggestion)}>
              <span>{suggestion}</span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
