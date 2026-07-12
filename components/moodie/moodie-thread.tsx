"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { submitMoodieFeedback } from "@/app/actions/moodie-mutations";
import { MoodieEmptyState } from "@/components/moodie/moodie-empty-state";
import { MoodieMessageBubble } from "@/components/moodie/moodie-message-bubble";
import { Button } from "@/components/ui/button";
import type { MoodieCapability, MoodieConversationDetail, MoodieMessage, MoodieMessagePart, MoodieTurnActivity } from "@/types/moodie";
import { findMoodieLatestDescendantLeaf, groupMoodieAssistantSiblings, groupMoodieRoleSiblings } from "@/lib/moodie/branch-tree";

interface MoodieThreadProps {
  conversation: MoodieConversationDetail | null;
  capabilities: MoodieCapability[];
  suggestions: string[];
  pendingPrompt: string | null;
  loading?: boolean;
  requestId?: string | null;
  statusLabel?: string | null;
  activities?: MoodieTurnActivity[];
  streamedText?: string;
  streamedParts?: Array<{ id: string; part: MoodieMessagePart }>;
  onRegenerateMessage?: (messageId: string, content: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onContinueMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onQuickPrompt: (prompt: string) => void;
}

export function MoodieThread({ conversation, capabilities, suggestions, pendingPrompt, loading, requestId, statusLabel, activities, streamedText, streamedParts, onRegenerateMessage, onEditMessage, onContinueMessage, onDeleteMessage, onQuickPrompt }: MoodieThreadProps) {
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
  }, [conversation?.messages.length, loading, pendingPrompt, streamedText?.length, streamedParts?.length, scrollElementToBottom]);

  const allMessages = useMemo(() => conversation?.messages || [], [conversation?.messages]);
  const byId = useMemo(() => new Map(allMessages.map((message) => [message.id, message])), [allMessages]);
  const assistantSiblingGroups = useMemo(() => groupMoodieAssistantSiblings(allMessages), [allMessages]);
  const userSiblingGroups = useMemo(() => groupMoodieRoleSiblings(allMessages, "user"), [allMessages]);
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
  const optimisticRequestId = requestId || "pending-assistant-message";
  const hasPersistedTurn = requestId ? branchMessages.some((message) => message.request_id === requestId && message.role === "assistant") : false;
  const optimisticAssistant: MoodieMessage | null = loading && !hasPersistedTurn ? {
    id: optimisticRequestId,
    role: "assistant",
    content: streamedText || "",
    metadata: null,
    parent_message_id: pendingMessage?.id || effectiveLeafId,
    request_id: optimisticRequestId,
    status: "streaming",
    created_at: new Date().toISOString(),
  } : null;
  const messages = [...branchMessages, ...(pendingMessage ? [pendingMessage] : []), ...(optimisticAssistant ? [optimisticAssistant] : [])];

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
                ? assistantSiblingGroups.get(message.parent_message_id || "root") || []
                : userSiblingGroups.get(message.parent_message_id || "root") || [];
              const branchIndex = siblings.findIndex((candidate) => candidate.id === message.id);
              const parentUser = message.parent_message_id ? byId.get(message.parent_message_id) : undefined;
              const optimistic = message === optimisticAssistant;
              const reactKey = message.role === "assistant" && message.request_id ? `assistant:${message.request_id}` : message.id;
              return <MoodieMessageBubble
                key={reactKey}
                message={message}
                pending={message.id === "pending-user-message" || optimistic}
                statusLabel={optimistic ? statusLabel : undefined}
                activities={optimistic ? activities : undefined}
                streamedParts={optimistic ? streamedParts : undefined}
                activeLeaf={message.role === "assistant" && message.id === effectiveLeafId}
                onQuickPrompt={onQuickPrompt}
                onRegenerate={message.role === "assistant" && parentUser?.role === "user" && onRegenerateMessage ? () => onRegenerateMessage(parentUser.id, parentUser.content) : undefined}
                onContinue={message.role === "assistant" && onContinueMessage ? () => onContinueMessage(message.id) : undefined}
                onDelete={message.role === "assistant" && onDeleteMessage ? () => onDeleteMessage(message.id) : undefined}
                onEditResend={message.role === "user" && !pendingPrompt && onEditMessage ? (content) => onEditMessage(message.id, content) : undefined}
                onFeedback={message.role === "assistant" && conversation ? async (rating) => {
                  const result = await submitMoodieFeedback({ conversation_id: conversation.id, message_id: message.id, rating });
                  if (!result.success) throw new Error(result.error);
                  toast.success("Cảm ơn bạn đã phản hồi cho Moodie");
                } : undefined}
                branch={siblings.length > 1 ? {
                  index: branchIndex,
                  total: siblings.length,
                  onPrevious: branchIndex > 0 ? () => setSelectedLeafId(findMoodieLatestDescendantLeaf(allMessages, siblings[branchIndex - 1].id)) : undefined,
                  onNext: branchIndex < siblings.length - 1 ? () => setSelectedLeafId(findMoodieLatestDescendantLeaf(allMessages, siblings[branchIndex + 1].id)) : undefined,
                } : undefined}
              />;
            })}
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
