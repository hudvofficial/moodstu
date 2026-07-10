"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Edit3,
  Loader2,
  LockKeyhole,
  MessageSquare,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MoodieConversationSummary } from "@/types/moodie";

interface MoodieConversationListProps {
  conversations: MoodieConversationSummary[];
  activeId: string | null;
  loadingConversationId?: string | null;
  editingConversationId: string | null;
  editingTitle: string;
  onSelect: (conversationId: string) => void;
  onStartRename: (conversation: MoodieConversationSummary) => void;
  onEditTitleChange: (value: string) => void;
  onRenameSubmit: (conversationId: string) => void;
  onRenameCancel: () => void;
  onDelete: (conversation: MoodieConversationSummary) => void;
}

export function MoodieConversationList({
  conversations,
  activeId,
  loadingConversationId,
  editingConversationId,
  editingTitle,
  onSelect,
  onStartRename,
  onEditTitleChange,
  onRenameSubmit,
  onRenameCancel,
  onDelete,
}: MoodieConversationListProps) {
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTs(Date.now()), 15_000);
    return () => window.clearInterval(intervalId);
  }, []);

  if (conversations.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center px-6 py-8 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageSquare className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-text-primary">Chưa có lịch sử chat</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {conversations.map((conversation) => {
        const isActive = conversation.id === activeId;
        const isLocked = Boolean(
          conversation.locked_until &&
            new Date(conversation.locked_until).getTime() > nowTs,
        );
        const isEditing = conversation.id === editingConversationId;
        const isLoading = conversation.id === loadingConversationId;

        return (
          <div
            key={conversation.id}
            className={`group/conversation relative rounded-lg transition-colors ${
              isActive ? "bg-primary/[0.07] text-primary" : "hover:bg-bg-subtle"
            }`}
          >
            <div className="flex min-h-10 items-center gap-1 px-2 py-1.5">
              {isActive ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" /> : null}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(conversation.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(conversation.id);
                  }
                }}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center ${
                    isActive
                      ? "text-primary"
                      : "text-text-muted group-hover/conversation:text-text-secondary"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>

                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editingTitle}
                        onChange={(event) => onEditTitleChange(event.target.value)}
                        autoFocus
                        unstyled
                        className="h-10"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            onRenameSubmit(conversation.id);
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            onRenameCancel();
                          }
                        }}
                      />

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          onClick={() => onRenameSubmit(conversation.id)}
                          variant="ghost"
                          className="icon-btn h-8 w-8 rounded-full"
                          aria-label="Lưu tên mới"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={onRenameCancel}
                          variant="ghost"
                          className="icon-btn h-8 w-8 rounded-full"
                          aria-label="Hủy đổi tên"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={`truncate text-[13px] leading-5 ${
                        isActive ? "text-primary" : "text-text-primary"
                      }`}
                    >
                      {conversation.title}
                    </p>
                  )}
                </div>
              </div>

              {!isEditing ? (
                <div className={`flex shrink-0 items-center gap-0.5 transition-opacity ${
                  isActive
                    ? "opacity-100"
                    : "opacity-0 group-hover/conversation:opacity-100 group-focus-within/conversation:opacity-100"
                }`}>
                  {isLoading ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : null}

                  {isLocked ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-warning">
                      <LockKeyhole className="h-4 w-4" />
                    </div>
                  ) : null}

                  <Button
                    type="button"
                    onClick={() => onStartRename(conversation)}
                    variant="ghost"
                    className="icon-btn h-7 w-7 rounded-md text-text-muted hover:text-primary"
                    aria-label="Đổi tên hội thoại"
                    title="Đổi tên"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    type="button"
                    onClick={() => onDelete(conversation)}
                    variant="ghost"
                    className="icon-btn h-7 w-7 rounded-md text-text-muted hover:bg-error/10 hover:text-error"
                    aria-label="Xóa hội thoại"
                    title="Xóa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
