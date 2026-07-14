"use client";

import { ArrowUpRight, Sparkles } from "lucide-react";
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
    <div className="mx-auto grid min-h-full w-full max-w-3xl content-center justify-items-center px-1 py-8 sm:py-14">
      <div className="mb-6 grid w-full justify-items-center text-center sm:mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 text-caption font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          <span>Moodie</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">Mình có thể giúp gì cho bạn?</h1>
        <p className="mt-2 text-sm leading-6 text-text-muted" style={{ width: "min(100%, 520px)" }}>
          Hỏi về vận hành Studio hoặc bắt đầu bằng một gợi ý bên dưới.
        </p>
        {capabilities.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-micro text-text-muted" style={{ width: "min(100%, 600px)" }}>
            <span className="min-w-0 text-center">{capabilities.slice(0, 4).map((capability) => capability.label).join(" · ")}</span>
          </div>
        ) : null}
      </div>

      {visibleSuggestions.length > 0 ? (
        <div className="grid w-full gap-2 sm:grid-cols-2" style={{ width: "min(100%, 640px)" }}>
          {visibleSuggestions.map((suggestion) => (
            <Button key={suggestion} type="button" unstyled className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-bg-subtle/70 px-3.5 py-3 text-left text-sm leading-5 text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20" onClick={() => onSuggestionClick(suggestion)}>
              <span className="line-clamp-2">{suggestion}</span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
