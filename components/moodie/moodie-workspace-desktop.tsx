"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { PanelRightClose, PanelRightOpen, SquarePen } from "lucide-react";
import { MoodieComposer } from "@/components/moodie/moodie-composer";
import { MoodieConversationList } from "@/components/moodie/moodie-conversation-list";
import { MoodieFilters } from "@/components/moodie/moodie-filters";
import { MoodieThread } from "@/components/moodie/moodie-thread";
import { Button } from "@/components/ui/button";
import type { MoodieWorkspaceSharedProps } from "@/components/moodie/moodie-workspace-types";

const MoodieMemoryPanel = dynamic(
  () => import("@/components/moodie/moodie-memory-panel").then((module) => module.MoodieMemoryPanel),
  { ssr: false },
);

interface MoodieWorkspaceDesktopProps extends MoodieWorkspaceSharedProps {
  onOpenVoiceMode?: () => void;
}

function isConversationLocked(lockedUntil: string | null | undefined) {
  return Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now());
}

export function MoodieWorkspaceDesktop({
  conversations, activeConversation, activeConversationId, scope, search, counts,
  loadingConversationId, editingConversationId, editingTitle, pendingPrompt,
  isSending, streamStatus, turnActivities, streamedText, streamedParts, capabilities, suggestions, onSelectConversation,
  onScopeChange, onSearchChange, onStartRename, onEditTitleChange, onRenameSubmit,
  onRenameCancel, onDeleteConversation, onSendMessage, onStopGeneration, onRegenerateMessage, onEditMessage, onQuickPrompt, onNewConversation, onOpenVoiceMode,
}: MoodieWorkspaceDesktopProps) {
  const [sidebarVisible, setSidebarVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("moodie:sidebar:v1") !== "collapsed";
  });
  const activeConversationLocked = isConversationLocked(activeConversation?.locked_until);
  const hasMessages = Boolean((activeConversation?.messages.length ?? 0) > 0 || pendingPrompt);

  function toggleSidebar() {
    setSidebarVisible((currentValue) => {
      const nextValue = !currentValue;
      window.localStorage.setItem("moodie:sidebar:v1", nextValue ? "expanded" : "collapsed");
      return nextValue;
    });
  }

  return (
    <section className="hidden h-full min-h-0 flex-1 bg-white lg:flex">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
        <header className="relative z-20 grid h-14 shrink-0 grid-cols-[1fr_minmax(0,2fr)_1fr] items-center border-b border-border/50 bg-white/90 px-4 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-text-inverse"><span className="text-xs font-semibold">M</span></div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-text-primary">Moodie</p><p className="truncate text-micro text-text-muted">Trợ lý vận hành Studio</p></div>
          </div>
          <div className="min-w-0 px-4 text-center">{hasMessages ? <p className="truncate text-caption font-medium text-text-secondary">{activeConversation?.title || "Cuộc trò chuyện mới"}</p> : <p className="text-caption text-text-muted">Sẵn sàng hỗ trợ Studio</p>}</div>
          <div className="flex items-center justify-end gap-1">
            <Button type="button" variant="ghost" size="sm" className="h-9 gap-2 rounded-xl px-3 text-text-secondary hover:bg-bg-subtle hover:text-text-primary" onClick={onNewConversation} aria-label="Tạo chat mới"><SquarePen className="h-4 w-4" /><span className="text-caption font-medium">Chat mới</span></Button>
            {!sidebarVisible ? <Button type="button" variant="ghost" size="sm" className="h-9 w-9 rounded-xl px-0 text-text-secondary" onClick={toggleSidebar} aria-label="Mở lịch sử chat"><PanelRightOpen className="h-4 w-4" /></Button> : null}
          </div>
        </header>

        <MoodieThread conversation={activeConversation} capabilities={capabilities} suggestions={suggestions} pendingPrompt={pendingPrompt} loading={isSending} statusLabel={streamStatus} activities={turnActivities} streamedText={streamedText} streamedParts={streamedParts} onRegenerateMessage={onRegenerateMessage} onEditMessage={onEditMessage} onQuickPrompt={onQuickPrompt} />
        <MoodieComposer disabled={activeConversationLocked} loading={isSending} hasMessages={hasMessages} capabilities={capabilities} draftKey={activeConversationId} suggestionChips={suggestions} onSuggestionClick={onQuickPrompt} onSend={onSendMessage} onStop={onStopGeneration} onOpenVoiceMode={onOpenVoiceMode} />
      </div>

      {sidebarVisible ? (
        <aside className="flex min-h-0 w-80 shrink-0 flex-col border-l border-border/60 bg-white">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 px-4">
            <div><p className="text-sm font-semibold text-text-primary">Lịch sử</p><p className="text-micro text-text-muted">{counts.all} cuộc trò chuyện</p></div>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 rounded-lg px-0 text-text-muted hover:text-text-primary" onClick={toggleSidebar} aria-label="Thu gọn lịch sử chat"><PanelRightClose className="h-4 w-4" /></Button>
          </div>
          <div className="px-3 py-3">
            <MoodieFilters scope={scope} search={search} counts={counts} variant="embedded" onScopeChange={onScopeChange} onSearchChange={onSearchChange} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            <MoodieConversationList conversations={conversations} activeId={activeConversationId} loadingConversationId={loadingConversationId} editingConversationId={editingConversationId} editingTitle={editingTitle} onSelect={onSelectConversation} onStartRename={onStartRename} onEditTitleChange={onEditTitleChange} onRenameSubmit={onRenameSubmit} onRenameCancel={onRenameCancel} onDelete={onDeleteConversation} />
          </div>
          <MoodieMemoryPanel />
        </aside>
      ) : null}
    </section>
  );
}
