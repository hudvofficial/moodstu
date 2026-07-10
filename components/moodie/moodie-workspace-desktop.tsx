"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { History, Plus } from "lucide-react";
import { MoodieComposer } from "@/components/moodie/moodie-composer";
import { MoodieConversationList } from "@/components/moodie/moodie-conversation-list";
import { MoodieThread } from "@/components/moodie/moodie-thread";
import { Button } from "@/components/ui/button";
import type { MoodieWorkspaceSharedProps } from "@/components/moodie/moodie-workspace-types";

const MoodieMemoryPanel = dynamic(
  () => import("@/components/moodie/moodie-memory-panel").then((module) => module.MoodieMemoryPanel),
  { ssr: false },
);

function isConversationLocked(lockedUntil: string | null | undefined) {
  return Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now());
}

export function MoodieWorkspaceDesktop({
  conversations,
  activeConversation,
  activeConversationId,
  loadingConversationId,
  editingConversationId,
  editingTitle,
  pendingPrompt,
  isSending,
  streamStatus,
  capabilities,
  suggestions,
  onSelectConversation,
  onStartRename,
  onEditTitleChange,
  onRenameSubmit,
  onRenameCancel,
  onDeleteConversation,
  onSendMessage,
  onQuickPrompt,
  onNewConversation,
}: MoodieWorkspaceSharedProps) {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const activeConversationLocked = isConversationLocked(activeConversation?.locked_until);
  const hasMessages = Boolean((activeConversation?.messages.length ?? 0) > 0 || pendingPrompt);

  return (
    <section className="hidden h-full entrance entrance-1 lg:flex lg:min-h-0 lg:flex-1">
      <div className="flex h-full min-h-0 flex-1 overflow-hidden border border-border/60 bg-white">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-white px-3">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`h-8 w-8 rounded-lg border px-0 shadow-xs transition-colors ${
                  sidebarVisible
                    ? "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
                    : "border-border bg-white text-text-secondary hover:border-primary/25 hover:bg-primary/5 hover:text-primary"
                }`}
                onClick={() => setSidebarVisible((currentValue) => !currentValue)}
                aria-label={sidebarVisible ? "Thu gọn lịch sử chat" : "Mở lịch sử chat"}
                aria-pressed={sidebarVisible}
                title={sidebarVisible ? "Thu gọn lịch sử chat" : "Mở lịch sử chat"}
              >
                <History className="h-4 w-4" strokeWidth={2} />
              </Button>

              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success ring-2 ring-success/15" />
                <span className="text-xs font-semibold text-text-secondary">Moodie</span>
              </div>
            </div>

            {hasMessages ? (
              <Button
                type="button"
                variant="ghost"
                className="gap-2 rounded-xl px-3 text-text-secondary hover:text-primary"
                onClick={onNewConversation}
              >
                <Plus className="h-4 w-4" />
                <span>Chat mới</span>
              </Button>
            ) : (
              <div className="w-11" />
            )}
          </div>

          <MoodieThread
            conversation={activeConversation}
            capabilities={capabilities}
            suggestions={suggestions}
            pendingPrompt={pendingPrompt}
            loading={isSending}
            statusLabel={streamStatus}
            onQuickPrompt={onQuickPrompt}
          />

          <MoodieComposer
            disabled={activeConversationLocked}
            loading={isSending}
            hasMessages={hasMessages}
            capabilities={capabilities}
            suggestionChips={suggestions}
            onSuggestionClick={onQuickPrompt}
            onSend={onSendMessage}
          />
        </div>

        {sidebarVisible ? (
          <aside className="flex min-h-0 w-64 shrink-0 flex-col border-l border-border/60 bg-white">
            <div className="shrink-0 px-3 pb-1 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Lịch sử chat</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2">
              <MoodieConversationList
                conversations={conversations}
                activeId={activeConversationId}
                loadingConversationId={loadingConversationId}
                editingConversationId={editingConversationId}
                editingTitle={editingTitle}
                onSelect={onSelectConversation}
                onStartRename={onStartRename}
                onEditTitleChange={onEditTitleChange}
                onRenameSubmit={onRenameSubmit}
                onRenameCancel={onRenameCancel}
                onDelete={onDeleteConversation}
              />
            </div>
            <MoodieMemoryPanel />
          </aside>
        ) : null}
      </div>
    </section>
  );
}
