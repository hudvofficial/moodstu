"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { Database, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  deleteMoodieConversation,
  renameMoodieConversation,
  sendMoodieMessage,
} from "@/app/actions/moodie-mutations";
import { getMoodieConversationDetail } from "@/app/actions/moodie-queries";
import { MoodieWorkspaceDesktop } from "@/components/moodie/moodie-workspace-desktop";
import { MoodieWorkspaceMobile } from "@/components/moodie/moodie-workspace-mobile";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSetHeaderSlots } from "@/contexts/header-slots-context";
import { sortMoodieConversations } from "@/lib/moodie/records";
import type {
  MoodieConversationDetail,
  MoodieConversationScope,
  MoodieConversationSummary,
  MoodiePageData,
} from "@/types/moodie";

interface MoodiePageClientProps {
  initialData: MoodiePageData;
}

function isLocked(conversation: MoodieConversationSummary) {
  return Boolean(
    conversation.locked_until &&
    new Date(conversation.locked_until).getTime() > Date.now(),
  );
}

function toSummary(
  conversation: MoodieConversationSummary | MoodieConversationDetail,
): MoodieConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    last_message_preview: conversation.last_message_preview,
    message_count: conversation.message_count,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    locked_until: conversation.locked_until,
    locked_by: conversation.locked_by,
    version: conversation.version,
  };
}

export function MoodiePageClient({ initialData }: MoodiePageClientProps) {
  const [conversations, setConversations] = useState(initialData.conversations);
  const [conversationCache, setConversationCache] = useState<
    Record<string, MoodieConversationDetail>
  >(
    initialData.activeConversation
      ? { [initialData.activeConversation.id]: initialData.activeConversation }
      : {},
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialData.activeConversation?.id || null,
  );
  const [scope, setScope] = useState<MoodieConversationScope>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(
    null,
  );
  const [editingConversationId, setEditingConversationId] = useState<string | null>(
    null,
  );
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<MoodieConversationSummary | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [, startTransition] = useTransition();
  const setHeaderSlots = useSetHeaderSlots();

  const activeConversation = activeConversationId
    ? conversationCache[activeConversationId] || null
    : null;
  const setupReady = initialData.setup.ready;

  useEffect(() => {
    setHeaderSlots({
      hideSearch: true,
      subtitleOverride: "Tr\u1ee3 l\u00fd AI th\u00f4ng minh",
    });

    return () => setHeaderSlots({});
  }, [setHeaderSlots]);

  const filteredConversations = conversations.filter((conversation) => {
    if (scope === "active" && isLocked(conversation)) return false;
    if (scope === "locked" && !isLocked(conversation)) return false;

    const query = deferredSearch.trim().toLowerCase();
    if (!query) return true;

    const haystack =
      `${conversation.title} ${conversation.last_message_preview || ""}`.toLowerCase();
    return haystack.includes(query);
  });

  const counts = {
    all: conversations.length,
    active: conversations.filter((conversation) => !isLocked(conversation)).length,
    locked: conversations.filter((conversation) => isLocked(conversation)).length,
  };

  const stats = {
    ...initialData.stats,
    totalConversations: conversations.length,
    totalMessages: conversations.reduce(
      (sum, conversation) => sum + conversation.message_count,
      0,
    ),
    lockedConversations: counts.locked,
    skillCount: initialData.capabilities.length,
  };

  async function openConversation(conversationId: string) {
    if (conversationCache[conversationId]) {
      startTransition(() => {
        setActiveConversationId(conversationId);
      });
      return;
    }

    setLoadingConversationId(conversationId);
    const result = await getMoodieConversationDetail({
      conversation_id: conversationId,
    });
    setLoadingConversationId(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    startTransition(() => {
      setConversationCache((current) => ({
        ...current,
        [conversationId]: result.data,
      }));
      setActiveConversationId(conversationId);
    });
  }

  async function handleSendMessage(content: string) {
    if (isSending) return;

    setPendingPrompt(content);
    setIsSending(true);

    const result = await sendMoodieMessage({
      conversation_id: activeConversationId,
      content,
    });

    setPendingPrompt(null);
    setIsSending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    const detail = result.data.conversation;
    startTransition(() => {
      setConversationCache((current) => ({ ...current, [detail.id]: detail }));
      setConversations((current) =>
        sortMoodieConversations([
          toSummary(detail),
          ...current.filter((conversation) => conversation.id !== detail.id),
        ]),
      );
      setActiveConversationId(detail.id);
      setHistoryOpen(false);
    });
  }

  function handleNewConversation() {
    startTransition(() => {
      setActiveConversationId(null);
      setEditingConversationId(null);
      setEditingTitle("");
      setPendingPrompt(null);
      setHistoryOpen(false);
    });
  }

  function handleStartRename(conversation: MoodieConversationSummary) {
    setEditingConversationId(conversation.id);
    setEditingTitle(conversation.title);
  }

  async function handleRenameSubmit(conversationId: string) {
    const target = conversations.find(
      (conversation) => conversation.id === conversationId,
    );
    const nextTitle = editingTitle.trim();

    if (!target || !nextTitle) {
      toast.error("Ti\u00eau \u0111\u1ec1 kh\u00f4ng \u0111\u01b0\u1ee3c \u0111\u1ec3 tr\u1ed1ng");
      return;
    }

    const result = await renameMoodieConversation({
      conversation_id: conversationId,
      title: nextTitle,
      expected_updated_at: target.updated_at,
    });

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    startTransition(() => {
      setConversations((current) =>
        sortMoodieConversations(
          current.map((conversation) =>
            conversation.id === conversationId ? result.data : conversation,
          ),
        ),
      );
      setConversationCache((current) => {
        const detail = current[conversationId];
        if (!detail) return current;

        return {
          ...current,
          [conversationId]: {
            ...detail,
            title: result.data.title,
            updated_at: result.data.updated_at,
            version: result.data.version,
          },
        };
      });
      setEditingConversationId(null);
      setEditingTitle("");
    });
  }

  async function confirmDelete(conversation: MoodieConversationSummary) {
    const result = await deleteMoodieConversation({
      conversation_id: conversation.id,
      expected_updated_at: conversation.updated_at,
    });

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    const nextConversations = conversations.filter(
      (item) => item.id !== conversation.id,
    );

    startTransition(() => {
      setConversations(nextConversations);
      setConversationCache((current) => {
        const next = { ...current };
        delete next[conversation.id];
        return next;
      });
      setEditingConversationId(null);
      setEditingTitle("");
      setDeleteTarget(null);
    });

    if (activeConversationId === conversation.id) {
      const nextConversation = nextConversations[0];
      if (nextConversation) {
        await openConversation(nextConversation.id);
      } else {
        startTransition(() => {
          setActiveConversationId(null);
        });
      }
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {!setupReady ? (
        <section className="card-base mx-2 my-4 px-5 py-5 entrance entrance-0 md:mx-6 md:my-6">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 py-6 text-center lg:py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10 text-warning">
              <Database className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-h2">
                {"Moodie c\u1ea7n kh\u1edfi t\u1ea1o d\u1eef li\u1ec7u"}
              </h2>
              <p className="mx-auto max-w-2xl text-body text-text-secondary">
                {initialData.setup.message ||
                  "Database hi\u1ec7n t\u1ea1i ch\u01b0a c\u00f3 c\u00e1c b\u1ea3ng c\u1ea7n thi\u1ebft cho Moodie. Ch\u1ea1y migration r\u1ed3i t\u1ea3i l\u1ea1i trang \u0111\u1ec3 ti\u1ebfp t\u1ee5c."}
              </p>
            </div>

            {initialData.setup.migrationPath ? (
              <div className="w-full max-w-2xl rounded-2xl border border-dashed border-border bg-bg-card px-4 py-4 text-left">
                <p className="text-overline text-text-secondary">
                  {"Migration c\u1ea7n ch\u1ea1y"}
                </p>
                <code className="mt-2 block break-all font-mono text-body-sm text-text-main">
                  {initialData.setup.migrationPath}
                </code>
              </div>
            ) : null}

            <Button
              type="button"
              className="gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
              <span>{"T\u1ea3i l\u1ea1i sau khi migrate"}</span>
            </Button>
          </div>
        </section>
      ) : (
        <>
          <MoodieWorkspaceDesktop
            stats={stats}
            conversations={filteredConversations}
            activeConversation={activeConversation}
            activeConversationId={activeConversationId}
            scope={scope}
            search={search}
            counts={counts}
            loadingConversationId={loadingConversationId}
            editingConversationId={editingConversationId}
            editingTitle={editingTitle}
            pendingPrompt={pendingPrompt}
            isSending={isSending}
            capabilities={initialData.capabilities}
            suggestions={initialData.suggestions}
            onSelectConversation={(conversationId) => {
              openConversation(conversationId).catch(() => {});
            }}
            onScopeChange={setScope}
            onSearchChange={setSearch}
            onStartRename={handleStartRename}
            onEditTitleChange={setEditingTitle}
            onRenameSubmit={(conversationId) => {
              handleRenameSubmit(conversationId).catch(() => {});
            }}
            onRenameCancel={() => {
              setEditingConversationId(null);
              setEditingTitle("");
            }}
            onDeleteConversation={setDeleteTarget}
            onSendMessage={handleSendMessage}
            onQuickPrompt={(prompt) => {
              handleSendMessage(prompt).catch(() => {});
            }}
            onNewConversation={handleNewConversation}
          />

          <MoodieWorkspaceMobile
            stats={stats}
            conversations={filteredConversations}
            activeConversation={activeConversation}
            activeConversationId={activeConversationId}
            scope={scope}
            search={search}
            counts={counts}
            loadingConversationId={loadingConversationId}
            editingConversationId={editingConversationId}
            editingTitle={editingTitle}
            pendingPrompt={pendingPrompt}
            isSending={isSending}
            capabilities={initialData.capabilities}
            suggestions={initialData.suggestions}
            historyOpen={historyOpen}
            onHistoryOpenChange={setHistoryOpen}
            onSelectConversation={(conversationId) => {
              openConversation(conversationId).catch(() => {});
            }}
            onScopeChange={setScope}
            onSearchChange={setSearch}
            onStartRename={handleStartRename}
            onEditTitleChange={setEditingTitle}
            onRenameSubmit={(conversationId) => {
              handleRenameSubmit(conversationId).catch(() => {});
            }}
            onRenameCancel={() => {
              setEditingConversationId(null);
              setEditingTitle("");
            }}
            onDeleteConversation={setDeleteTarget}
            onSendMessage={handleSendMessage}
            onQuickPrompt={(prompt) => {
              handleSendMessage(prompt).catch(() => {});
            }}
            onNewConversation={handleNewConversation}
          />

          <ConfirmDialog
            isOpen={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => {
              if (deleteTarget) {
                confirmDelete(deleteTarget).catch(() => {});
              }
            }}
            title="X\u00f3a h\u1ed9i tho\u1ea1i Moodie"
            message={`B\u1ea1n ch\u1eafc ch\u1eafn mu\u1ed1n x\u00f3a "${
              deleteTarget?.title || "h\u1ed9i tho\u1ea1i n\u00e0y"
            }"? H\u00e0nh \u0111\u1ed9ng n\u00e0y s\u1ebd x\u00f3a lu\u00f4n to\u00e0n b\u1ed9 l\u1ecbch s\u1eed tin nh\u1eafn c\u1ee7a bu\u1ed5i chat.`}
            confirmLabel="X\u00f3a h\u1ed9i tho\u1ea1i"
          />
        </>
      )}
    </div>
  );
}
