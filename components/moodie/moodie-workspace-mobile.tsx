"use client";

import { History, Plus } from "lucide-react";
import { MoodieComposer } from "@/components/moodie/moodie-composer";
import { MoodieConversationList } from "@/components/moodie/moodie-conversation-list";
import { MoodieThread } from "@/components/moodie/moodie-thread";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import type { MoodieWorkspaceSharedProps } from "@/components/moodie/moodie-workspace-types";

function isConversationLocked(lockedUntil: string | null | undefined) {
  return Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now());
}

interface MoodieWorkspaceMobileProps extends MoodieWorkspaceSharedProps {
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
}

export function MoodieWorkspaceMobile({
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
  historyOpen,
  onHistoryOpenChange,
  onSelectConversation,
  onStartRename,
  onEditTitleChange,
  onRenameSubmit,
  onRenameCancel,
  onDeleteConversation,
  onSendMessage,
  onQuickPrompt,
  onNewConversation,
}: MoodieWorkspaceMobileProps) {
  const activeConversationLocked = isConversationLocked(activeConversation?.locked_until);
  const hasMessages = Boolean((activeConversation?.messages.length ?? 0) > 0 || pendingPrompt);

  return (
    <section className="entrance entrance-1 flex h-full min-h-0 flex-1 flex-col lg:hidden">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border border-border/70 bg-bg-base shadow-sm">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-white/90 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 w-10 rounded-xl px-0 text-text-secondary"
              onClick={() => onHistoryOpenChange(true)}
              aria-label="Mở lịch sử chat"
            >
              <History className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="text-overline text-text-secondary">Moodie Online</span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-xl px-0 text-text-secondary"
            onClick={onNewConversation}
            aria-label="Tạo chat mới"
          >
            <Plus className="h-4 w-4" />
          </Button>
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
          onSend={onSendMessage}
        />
      </div>

      <Drawer
        isOpen={historyOpen}
        onClose={() => onHistoryOpenChange(false)}
        title="Lịch sử chat"
      >
        <div className="space-y-4">
          <Button
            type="button"
            className="w-full justify-center gap-2 rounded-2xl"
            onClick={() => {
              onNewConversation();
              onHistoryOpenChange(false);
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Cuộc hội thoại mới</span>
          </Button>

          <MoodieConversationList
            conversations={conversations}
            activeId={activeConversationId}
            loadingConversationId={loadingConversationId}
            editingConversationId={editingConversationId}
            editingTitle={editingTitle}
            onSelect={(conversationId) => {
              onSelectConversation(conversationId);
              onHistoryOpenChange(false);
            }}
            onStartRename={onStartRename}
            onEditTitleChange={onEditTitleChange}
            onRenameSubmit={onRenameSubmit}
            onRenameCancel={onRenameCancel}
            onDelete={onDeleteConversation}
          />
        </div>
      </Drawer>
    </section>
  );
}
