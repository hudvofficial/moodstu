"use client";

import dynamic from "next/dynamic";
import { History, Menu, SquarePen } from "lucide-react";
import { MoodieComposer } from "@/components/moodie/moodie-composer";
import { MoodieConversationList } from "@/components/moodie/moodie-conversation-list";
import { MoodieFilters } from "@/components/moodie/moodie-filters";
import { MoodiePresenceDot } from "@/components/moodie/moodie-presence-dot";
import { MoodieThread } from "@/components/moodie/moodie-thread";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { useOpenMobileNavigation } from "@/contexts/mobile-navigation-context";
import type { MoodieWorkspaceSharedProps } from "@/components/moodie/moodie-workspace-types";

const MoodieMemoryPanel = dynamic(
  () => import("@/components/moodie/moodie-memory-panel").then((module) => module.MoodieMemoryPanel),
  { ssr: false },
);

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
  streamRequestId,
  streamStatus,
  turnActivities,
  streamedText,
  streamedParts,
  capabilities,
  suggestions,
  providerReady,
  modelOptions,
  selectedModel,
  onModelChange,
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
  onContinueMessage,
  onDeleteMessage,
  onQuickPrompt,
  onNewConversation,
  onOpenVoiceMode,
}: MoodieWorkspaceMobileProps) {
  const openMobileNavigation = useOpenMobileNavigation();
  const activeConversationLocked = isConversationLocked(activeConversation?.locked_until);
  const hasMessages = Boolean((activeConversation?.messages.length ?? 0) > 0 || pendingPrompt);

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col bg-white lg:hidden">
      <header className="relative z-20 grid h-14 shrink-0 grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-center border-b border-border/50 bg-white/90 px-2 backdrop-blur-md">
        <Button type="button" unstyled className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary focus-visible:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20" onClick={openMobileNavigation} aria-label="Mở menu Mood Studio">
          <Menu className="h-[18px] w-[18px] stroke-[2.25]" />
        </Button>
        <div className="flex min-w-0 items-center justify-center gap-2">
          <MoodiePresenceDot live={providerReady} />
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-semibold leading-4 text-text-primary">Moodie</p>
            <p className="max-w-44 truncate text-[10px] leading-4 text-text-muted">{hasMessages ? activeConversation?.title || "Chat mới" : "Trợ lý vận hành Studio"}</p>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <Button type="button" unstyled className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary focus-visible:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20" onClick={onNewConversation} aria-label="Tạo chat mới">
            <SquarePen className="h-[18px] w-[18px] stroke-[2.25]" />
          </Button>
          <Button type="button" unstyled className="relative flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary focus-visible:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20" onClick={() => onHistoryOpenChange(true)} aria-label="Mở lịch sử chat">
            <History className="h-[18px] w-[18px] stroke-[2.25]" />
            {conversations.length > 0 ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> : null}
          </Button>
        </div>
      </header>

      <MoodieThread conversation={activeConversation} capabilities={capabilities} suggestions={suggestions} pendingPrompt={pendingPrompt} loading={isSending} requestId={streamRequestId} statusLabel={streamStatus} activities={turnActivities} streamedText={streamedText} streamedParts={streamedParts} onRegenerateMessage={onRegenerateMessage} onEditMessage={onEditMessage} onContinueMessage={onContinueMessage} onDeleteMessage={onDeleteMessage} onQuickPrompt={onQuickPrompt} />
      <MoodieComposer disabled={activeConversationLocked} loading={isSending} hasMessages={hasMessages} capabilities={capabilities} draftKey={activeConversationId} suggestionChips={suggestions} modelOptions={modelOptions} selectedModel={selectedModel} onModelChange={onModelChange} onSuggestionClick={onQuickPrompt} onSend={onSendMessage} onStop={onStopGeneration} onOpenVoiceMode={onOpenVoiceMode} />

      <Drawer isOpen={historyOpen} onClose={() => onHistoryOpenChange(false)} title="Moodie">
        <div className="space-y-4 pb-6">
          <Button type="button" variant="ghost" className="h-10 w-full justify-start gap-3 rounded-xl border border-border bg-white px-3" onClick={() => { onNewConversation(); onHistoryOpenChange(false); }}>
            <SquarePen className="h-4 w-4" />Tạo chat mới
          </Button>
          <MoodieFilters scope={scope} search={search} counts={counts} variant="embedded" onScopeChange={onScopeChange} onSearchChange={onSearchChange} />
          <MoodieConversationList conversations={conversations} activeId={activeConversationId} loadingConversationId={loadingConversationId} editingConversationId={editingConversationId} editingTitle={editingTitle} onSelect={(conversationId) => { onSelectConversation(conversationId); onHistoryOpenChange(false); }} onStartRename={onStartRename} onEditTitleChange={onEditTitleChange} onRenameSubmit={onRenameSubmit} onRenameCancel={onRenameCancel} onDelete={onDeleteConversation} />
          <MoodieMemoryPanel />
        </div>
      </Drawer>
    </section>
  );
}
