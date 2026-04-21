"use client";

import { useEffect, useRef } from "react";
import { MoodieEmptyState } from "@/components/moodie/moodie-empty-state";
import { MoodieMessageBubble } from "@/components/moodie/moodie-message-bubble";
import { MoodieThinkingState } from "@/components/moodie/moodie-thinking-state";
import type {
  MoodieCapability,
  MoodieConversationDetail,
  MoodieMessage,
} from "@/types/moodie";

interface MoodieThreadProps {
  conversation: MoodieConversationDetail | null;
  capabilities: MoodieCapability[];
  suggestions: string[];
  pendingPrompt: string | null;
  loading?: boolean;
  onQuickPrompt: (prompt: string) => void;
}

export function MoodieThread({
  conversation,
  capabilities,
  suggestions,
  pendingPrompt,
  loading,
  onQuickPrompt,
}: MoodieThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conversation?.messages.length, loading, pendingPrompt]);

  const pendingMessage: MoodieMessage | null = pendingPrompt
    ? {
        id: "pending-user-message",
        role: "user",
        content: pendingPrompt,
        metadata: null,
        created_at: new Date().toISOString(),
      }
    : null;

  const messages = [
    ...(conversation?.messages || []),
    ...(pendingMessage ? [pendingMessage] : []),
  ];

  if (!conversation && !pendingMessage) {
    return (
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 scroll-smooth overflow-x-hidden overflow-y-auto bg-linear-to-b from-white via-bg-base/70 to-bg-base px-4 py-6 lg:px-8"
      >
        <MoodieEmptyState
          capabilities={capabilities}
          suggestions={suggestions}
          onSuggestionClick={onQuickPrompt}
        />
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 scroll-smooth overflow-x-hidden overflow-y-auto bg-linear-to-b from-white via-bg-base/70 to-bg-base px-4 py-6 space-y-4 sm:space-y-5 lg:px-8"
    >
      {messages.map((message) => (
        <MoodieMessageBubble
          key={message.id}
          message={message}
          pending={message.id === "pending-user-message"}
          onQuickPrompt={onQuickPrompt}
        />
      ))}

      {loading ? <MoodieThinkingState /> : null}
    </div>
  );
}
