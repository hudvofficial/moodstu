"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { submitMoodieFeedback } from "@/app/actions/moodie-mutations";
import { MoodieEmptyState } from "@/components/moodie/moodie-empty-state";
import { MoodieMessageBubble } from "@/components/moodie/moodie-message-bubble";
import { MoodieThinkingState } from "@/components/moodie/moodie-thinking-state";
import { Button } from "@/components/ui/button";
import type { MoodieCapability, MoodieConversationDetail, MoodieMessage, MoodieMessagePart, MoodieTurnActivity } from "@/types/moodie";

interface MoodieThreadProps {
  conversation: MoodieConversationDetail | null;
  capabilities: MoodieCapability[];
  suggestions: string[];
  pendingPrompt: string | null;
  loading?: boolean;
  statusLabel?: string | null;
  activities?: MoodieTurnActivity[];
  streamedText?: string;
  streamedParts?: Array<{ id: string; part: MoodieMessagePart }>;
  onRegenerateMessage?: (messageId: string, content: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onQuickPrompt: (prompt: string) => void;
}

export function MoodieThread({ conversation, capabilities, suggestions, pendingPrompt, loading, statusLabel, activities, streamedText, streamedParts, onRegenerateMessage, onEditMessage, onQuickPrompt }: MoodieThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [selectedLeafId, setSelectedLeafId] = useState<string | null>(conversation?.active_leaf_message_id || null);


  const scrollElementToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
  }, []);

  const jumpToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    scrollElementToBottom(behavior);
    nearBottomRef.current = true;
    setShowJumpToLatest(false);
  }, [scrollElementToBottom]);

  useEffect(() => {
    if (pendingPrompt) {
      scrollElementToBottom("smooth");
      return;
    }
    if (!nearBottomRef.current) return;
    const frame = window.requestAnimationFrame(() => scrollElementToBottom("auto"));
    return () => window.cancelAnimationFrame(frame);
  }, [conversation?.messages.length, loading, pendingPrompt, scrollElementToBottom]);

  const allMessages = conversation?.messages || [];
  const byId = new Map(allMessages.map((message) => [message.id, message]));
  const effectiveLeafId = selectedLeafId && byId.has(selectedLeafId) ? selectedLeafId : conversation?.active_leaf_message_id || null;
  const branchMessages = effectiveLeafId && byId.has(effectiveLeafId)
    ? (() => {
        const branch: MoodieMessage[] = [];
        let current = byId.get(effectiveLeafId);
        while (current) {
          branch.push(current);
          current = current.parent_message_id ? byId.get(current.parent_message_id) : undefined;
        }
        return branch.reverse();
      })()
    : allMessages;

  const pendingMessage: MoodieMessage | null = pendingPrompt ? {
    id: "pending-user-message",
    role: "user",
    content: pendingPrompt,
    metadata: null,
    created_at: new Date().toISOString(),
  } : null;
  const messages = [...branchMessages, ...(pendingMessage ? [pendingMessage] : [])];

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
      <div
        ref={scrollRef}
        className="h-full overflow-x-hidden overflow-y-auto scroll-smooth px-4 pb-6 sm:px-6"
        onScroll={(event) => {
          const element = event.currentTarget;
          const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
          nearBottomRef.current = isNearBottom;
          setShowJumpToLatest(!isNearBottom);
        }}
      >
        {messages.length === 0 ? (
          <MoodieEmptyState capabilities={capabilities} suggestions={suggestions} onSuggestionClick={onQuickPrompt} />
        ) : (
          <div className="mx-auto w-full max-w-5xl space-y-3 pb-4 pt-3">
            {messages.map((message) => {
              const siblings = message.role === "assistant"
                ? allMessages.filter((candidate) => candidate.role === "assistant" && candidate.parent_message_id === message.parent_message_id).sort((left, right) => (left.revision || 1) - (right.revision || 1))
                : [];
              const branchIndex = siblings.findIndex((candidate) => candidate.id === message.id);
              const parentUser = message.parent_message_id ? byId.get(message.parent_message_id) : undefined;
              return <MoodieMessageBubble
                key={message.id}
                message={message}
                pending={message.id === "pending-user-message"}
                onQuickPrompt={onQuickPrompt}
                onRegenerate={message.role === "assistant" && parentUser?.role === "user" && onRegenerateMessage ? () => onRegenerateMessage(parentUser.id, parentUser.content) : undefined}
                onEditResend={message.role === "user" && !pendingPrompt && onEditMessage ? (content) => onEditMessage(message.id, content) : undefined}
                onFeedback={message.role === "assistant" && conversation ? async (rating) => {
                  const result = await submitMoodieFeedback({ conversation_id: conversation.id, message_id: message.id, rating });
                  if (!result.success) throw new Error(result.error);
                  toast.success("Cảm ơn bạn đã phản hồi cho Moodie");
                } : undefined}
                branch={siblings.length > 1 ? {
                  index: branchIndex,
                  total: siblings.length,
                  onPrevious: branchIndex > 0 ? () => setSelectedLeafId(siblings[branchIndex - 1].id) : undefined,
                  onNext: branchIndex < siblings.length - 1 ? () => setSelectedLeafId(siblings[branchIndex + 1].id) : undefined,
                } : undefined}
              />;
            })}
            {loading ? <MoodieThinkingState statusLabel={statusLabel} activities={activities} streamedText={streamedText} parts={streamedParts} /> : null}
          </div>
        )}
      </div>

      {messages.length > 0 && showJumpToLatest ? (
        <Button type="button" variant="ghost" size="sm" className="absolute bottom-3 left-1/2 h-9 -translate-x-1/2 gap-2 rounded-full border border-border bg-white px-3 text-caption text-text-secondary shadow-md hover:bg-white" onClick={() => jumpToBottom("smooth")}>
          <ArrowDown className="h-3.5 w-3.5" />
          Tin mới nhất
        </Button>
      ) : null}
    </div>
  );
}
