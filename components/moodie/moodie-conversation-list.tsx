"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, LockKeyhole, MessageSquare, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
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

function groupLabel(dateValue: string, nowTs: number) {
  const date = new Date(dateValue);
  const today = new Date(nowTs);
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.floor((startToday - startDate) / 86_400_000);
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  if (days < 7) return "7 ngày qua";
  if (days < 30) return "30 ngày qua";
  return "Cũ hơn";
}

export function MoodieConversationList({ conversations, activeId, loadingConversationId, editingConversationId, editingTitle, onSelect, onStartRename, onEditTitleChange, onRenameSubmit, onRenameCancel, onDelete }: MoodieConversationListProps) {
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTs(Date.now()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const groups = useMemo(() => {
    const grouped = new Map<string, MoodieConversationSummary[]>();
    for (const conversation of conversations) {
      const label = groupLabel(conversation.updated_at || conversation.created_at, nowTs);
      grouped.set(label, [...(grouped.get(label) || []), conversation]);
    }
    return [...grouped.entries()];
  }, [conversations, nowTs]);

  if (conversations.length === 0) {
    return <div className="px-4 py-10 text-center"><MessageSquare className="mx-auto h-5 w-5 text-text-muted" /><p className="mt-3 text-caption text-text-muted">Chưa có cuộc trò chuyện</p></div>;
  }

  return (
    <div className="space-y-4 pb-3">
      {groups.map(([label, items]) => (
        <section key={label}>
          <p className="px-2 pb-1.5 text-micro font-medium text-text-muted">{label}</p>
          <div className="space-y-0.5">
            {items.map((conversation) => {
              const isActive = conversation.id === activeId;
              const isEditing = conversation.id === editingConversationId;
              const isLoading = conversation.id === loadingConversationId;
              const isLocked = Boolean(conversation.locked_until && new Date(conversation.locked_until).getTime() > nowTs);

              return (
                <div key={conversation.id} className={`group relative rounded-xl transition ${isActive ? "bg-bg-hover" : "hover:bg-bg-subtle"}`}>
                  {isEditing ? (
                    <div className="p-2">
                      <Input value={editingTitle} onChange={(event) => onEditTitleChange(event.target.value)} autoFocus unstyled className="h-9 rounded-lg border border-border bg-white px-2 text-sm" onKeyDown={(event) => { if (event.key === "Enter") onRenameSubmit(conversation.id); if (event.key === "Escape") onRenameCancel(); }} />
                      <div className="mt-1 flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 px-0" onClick={onRenameCancel}><X className="h-3.5 w-3.5" /></Button>
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 px-0 text-primary" onClick={() => onRenameSubmit(conversation.id)}><Check className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button type="button" unstyled className="flex min-h-10 w-full items-center gap-2.5 rounded-xl py-2 pl-3 pr-9 text-left" onClick={() => onSelect(conversation.id)}>
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" /> : isLocked ? <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-warning" /> : <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-text-primary" : "text-text-muted"}`} />}
                        <span className={`truncate text-sm ${isActive ? "font-medium text-text-primary" : "text-text-secondary"}`}>{conversation.title || "Cuộc trò chuyện mới"}</span>
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-lg px-0 text-text-muted opacity-70 hover:opacity-100" onClick={() => setOpenMenuId((current) => current === conversation.id ? null : conversation.id)} aria-label="Tùy chọn cuộc trò chuyện">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      {openMenuId === conversation.id ? (
                        <div className="absolute right-1 top-9 z-30 w-36 rounded-xl border border-border bg-white p-1 shadow-lg">
                          <Button type="button" unstyled className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-caption text-text-secondary hover:bg-bg-subtle" onClick={() => { setOpenMenuId(null); onStartRename(conversation); }}><Pencil className="h-3.5 w-3.5" />Đổi tên</Button>
                          <Button type="button" unstyled className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-caption text-danger hover:bg-danger/5" onClick={() => { setOpenMenuId(null); onDelete(conversation); }}><Trash2 className="h-3.5 w-3.5" />Xóa</Button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
