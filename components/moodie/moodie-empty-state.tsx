"use client";

import { useEffect, useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MOODIE_SKILL_HINT_MAP,
  MOODIE_SKILL_ICON_MAP,
} from "@/components/moodie/moodie-skill-meta";
import type { MoodieCapability } from "@/types/moodie";

interface MoodieEmptyStateProps {
  capabilities: MoodieCapability[];
  suggestions: string[];
  onSuggestionClick: (prompt: string) => void;
}

const GREETING_TEXT = "Xin chào! Moodie đây";
const FALLBACK_CARD_LABELS = [
  "Tài chính",
  "Tra cứu",
  "Nhân sự",
  "Moodie Core",
];

export function MoodieEmptyState({
  capabilities,
  suggestions,
  onSuggestionClick,
}: MoodieEmptyStateProps) {
  const [typedText, setTypedText] = useState("");
  const [activeCapabilityId, setActiveCapabilityId] = useState<string | null>(null);

  const featuredCapabilities = capabilities.slice(0, 5);
  const activeCapability =
    featuredCapabilities.find((capability) => capability.id === activeCapabilityId) || null;

  const overviewCards = (() => {
    const cards = featuredCapabilities
      .map((capability) => ({
        id: capability.id,
        title: capability.label || MOODIE_SKILL_HINT_MAP[capability.id],
        description: capability.description,
        prompt: capability.prompts[0] || "",
        icon: MOODIE_SKILL_ICON_MAP[capability.id] || MOODIE_SKILL_ICON_MAP.fallback,
      }))
      .filter((card) => card.prompt)
      .slice(0, 4);

    if (cards.length > 0) {
      return cards;
    }

    return suggestions.slice(0, 4).map((prompt, index) => ({
      id: `suggestion-${index}`,
      title: FALLBACK_CARD_LABELS[index] || "Moodie",
      description: prompt,
      prompt,
      icon: index === 3 ? Sparkles : Bot,
    }));
  })();

  const activePrompts = activeCapability?.prompts.slice(0, 4) || suggestions.slice(0, 4);

  useEffect(() => {
    let currentIndex = 0;

    const intervalId = window.setInterval(() => {
      currentIndex += 1;
      setTypedText(GREETING_TEXT.slice(0, currentIndex));

      if (currentIndex >= GREETING_TEXT.length) {
        window.clearInterval(intervalId);
      }
    }, 40);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-end px-4 pb-4 text-center lg:justify-center lg:px-8 lg:pb-0">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 lg:gap-7">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/12 blur-3xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-text-inverse shadow-sm">
            <Bot className="h-7 w-7" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-h1 text-text-primary">
            {typedText}
            <span className="ml-1 animate-pulse text-primary">|</span>
          </h2>
          <p className="text-body text-text-secondary">
            Em có thể giúp gì cho Studio hôm nay?
          </p>
        </div>

        {featuredCapabilities.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2">
            {featuredCapabilities.map((capability) => {
              const Icon =
                MOODIE_SKILL_ICON_MAP[capability.id] || MOODIE_SKILL_ICON_MAP.fallback;
              const isActive = capability.id === activeCapabilityId;

              return (
                <Button
                  key={capability.id}
                  type="button"
                  unstyled
                  onClick={() => setActiveCapabilityId(isActive ? null : capability.id)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-body-sm font-semibold transition ${
                    isActive
                      ? "border-primary bg-primary text-text-inverse shadow-xs"
                      : "border-border bg-white text-text-primary shadow-xs hover:border-primary/20 hover:bg-primary/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{capability.label}</span>
                </Button>
              );
            })}
          </div>
        ) : null}

        {activeCapability ? (
          <div className="flex flex-wrap justify-center gap-2">
            {activePrompts.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                unstyled
                onClick={() => onSuggestionClick(prompt)}
                className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-2 text-body-sm font-medium text-primary transition hover:border-primary/30 hover:bg-primary/10"
              >
                {prompt}
              </Button>
            ))}
          </div>
        ) : (
          <>
            <div className="grid w-full gap-3 lg:grid-cols-2">
              {overviewCards.map((card, index) => {
                const Icon = card.icon;
                const isHighlightCard = index === overviewCards.length - 1;

                return (
                  <Button
                    key={card.id}
                    type="button"
                    unstyled
                    onClick={() => onSuggestionClick(card.prompt)}
                    className={`group flex items-center gap-4 rounded-3xl px-5 py-4 text-left shadow-xs transition ${
                      isHighlightCard
                        ? "bg-primary text-text-inverse hover:opacity-95"
                        : "border border-border bg-white hover:border-primary/20 hover:bg-primary/5"
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                        isHighlightCard
                          ? "bg-white/15 text-text-inverse"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`text-overline ${
                          isHighlightCard ? "text-white/70" : "text-text-secondary"
                        }`}
                      >
                        {card.title}
                      </p>
                      <p
                        className={`mt-1 text-body font-semibold leading-7 ${
                          isHighlightCard ? "text-white" : "text-text-primary"
                        }`}
                      >
                        {card.description}
                      </p>
                    </div>
                  </Button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
