"use client";

import { useState } from "react";
import { Menu, Plus } from "lucide-react";
import { MoodieComposer } from "@/components/moodie/moodie-composer";
import { MoodieConversationList } from "@/components/moodie/moodie-conversation-list";
import { MoodieThread } from "@/components/moodie/moodie-thread";
import { Button } from "@/components/ui/button";
import type { MoodieWorkspaceSharedProps } from "@/components/moodie/moodie-workspace-types";

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
      <div className="flex h-full min-h-0 flex-1 overflow-hidden border border-border/70 bg-bg-base shadow-sm">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border/70 bg-white/90 px-5 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 w-11 rounded-xl px-0 text-text-secondary"
                onClick={() => setSidebarVisible((currentValue) => !currentValue)}
                aria-label="Bật tắt lịch sử chat"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-overline text-text-secondary">Moodie Online</span>
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
            onQuickPrompt={onQuickPrompt}
          />

          <MoodieComposer
            disabled={activeConversationLocked}
            loading={isSending}
            hasMessages={hasMessages}
            capabilities={capabilities}
            onSend={onSendMessage}
          />
        </div>

        {sidebarVisible ? (
          <aside className="flex min-h-0 w-72 shrink-0 flex-col border-l border-border/70 bg-white">
            <div className="shrink-0 border-b border-border/70 px-4 py-4">
              <p className="text-overline text-text-secondary">Lịch sử chat</p>
            </div>

            <div className="shrink-0 px-3 py-3">
              <Button
                type="button"
                className="w-full justify-center gap-2 rounded-2xl"
                onClick={onNewConversation}
              >
                <Plus className="h-4 w-4" />
                <span>Cuộc hội thoại mới</span>
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
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
          </aside>
        ) : null}
      </div>
    </section>
  );
}
