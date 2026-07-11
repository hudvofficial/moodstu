"use client";

import { Bot, Menu, SquarePen } from "lucide-react";
import { MoodieComposer } from "@/components/moodie/moodie-composer";
import { MoodieConversationList } from "@/components/moodie/moodie-conversation-list";
import { MoodieFilters } from "@/components/moodie/moodie-filters";
import { MoodieThread } from "@/components/moodie/moodie-thread";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import type { MoodieWorkspaceSharedProps } from "@/components/moodie/moodie-workspace-types";

interface MoodieWorkspaceMobileProps extends MoodieWorkspaceSharedProps {
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
  onOpenVoiceMode?: () => void;
}

function isConversationLocked(lockedUntil: string | null | undefined) {
  return Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now());
}

export function MoodieWorkspaceMobile({
  conversations,
  activeConversation,
  activeConversationId,
  scope,
  search,
  counts,
  loadingConversationId,
  editingConversationId,
  editingTitle,
  pendingPrompt,
  isSending,
  streamStatus,
  turnActivities,
  streamedText,
  streamedParts,
  capabilities,
  suggestions,
  historyOpen,
  onHistoryOpenChange,
  onSelectConversation,
  onScopeChange,
  onSearchChange,
  onStartRename,
  onEditTitleChange,
  onRenameSubmit,
  onRenameCancel,
  onDeleteConversation,
  onSendMessage,
  onStopGeneration,
  onRegenerateMessage,
  onEditMessage,
  onQuickPrompt,
  onNewConversation,
  onOpenVoiceMode,
}: MoodieWorkspaceMobileProps) {
  const activeConversationLocked = isConversationLocked(activeConversation?.locked_until);
  const hasMessages = Boolean((activeConversation?.messages.length ?? 0) > 0 || pendingPrompt);

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col bg-white lg:hidden">
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between bg-white/85 px-2 backdrop-blur-md">
        <Button type="button" variant="ghost" size="sm" className="h-10 w-10 rounded-xl px-0 text-text-secondary" onClick={() => onHistoryOpenChange(true)} aria-label="Mở lịch sử chat">
          <Menu className="h-4 w-4" />
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-text-inverse"><Bot className="h-3.5 w-3.5" /></div>
          <div className="min-w-0 text-left"><p className="truncate text-sm font-semibold text-text-primary">Moodie</p>{hasMessages ? <p className="max-w-40 truncate text-micro text-text-muted">{activeConversation?.title || "Chat mới"}</p> : null}</div>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-10 w-10 rounded-xl px-0 text-text-secondary" onClick={onNewConversation} aria-label="Tạo chat mới">
          <SquarePen className="h-4 w-4" />
        </Button>
      </header>

      <MoodieThread conversation={activeConversation} capabilities={capabilities} suggestions={suggestions} pendingPrompt={pendingPrompt} loading={isSending} statusLabel={streamStatus} activities={turnActivities} streamedText={streamedText} streamedParts={streamedParts} onRegenerateMessage={onRegenerateMessage} onEditMessage={onEditMessage} onQuickPrompt={onQuickPrompt} />
      <MoodieComposer disabled={activeConversationLocked} loading={isSending} hasMessages={hasMessages} capabilities={capabilities} draftKey={activeConversationId} suggestionChips={suggestions} onSuggestionClick={onQuickPrompt} onSend={onSendMessage} onStop={onStopGeneration} onOpenVoiceMode={onOpenVoiceMode} />

      <Drawer isOpen={historyOpen} onClose={() => onHistoryOpenChange(false)} title="Moodie">
        <div className="space-y-4 pb-6">
          <Button type="button" variant="ghost" className="h-10 w-full justify-start gap-3 rounded-xl border border-border bg-white px-3" onClick={() => { onNewConversation(); onHistoryOpenChange(false); }}>
            <SquarePen className="h-4 w-4" />Tạo chat mới
          </Button>
          <MoodieFilters scope={scope} search={search} counts={counts} variant="embedded" onScopeChange={onScopeChange} onSearchChange={onSearchChange} />
          <MoodieConversationList conversations={conversations} activeId={activeConversationId} loadingConversationId={loadingConversationId} editingConversationId={editingConversationId} editingTitle={editingTitle} onSelect={(conversationId) => { onSelectConversation(conversationId); onHistoryOpenChange(false); }} onStartRename={onStartRename} onEditTitleChange={onEditTitleChange} onRenameSubmit={onRenameSubmit} onRenameCancel={onRenameCancel} onDelete={onDeleteConversation} />
        </div>
      </Drawer>
    </section>
  );
}
