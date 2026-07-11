"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Database, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  deleteMoodieConversation,
  renameMoodieConversation,
} from "@/app/actions/moodie-mutations";
import { getMoodieConversationDetail, getMoodieTurnStatus } from "@/app/actions/moodie-queries";
import { MoodieVoiceOverlay } from "@/components/moodie/moodie-voice-overlay";
import { MoodieWorkspaceDesktop } from "@/components/moodie/moodie-workspace-desktop";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSetHeaderSlots } from "@/contexts/header-slots-context";
import { useMoodieTurn } from "@/hooks/use-moodie-turn";
import { getSmartMoodieFollowUps } from "@/lib/moodie/follow-up-suggestions";
import { sortMoodieConversations } from "@/lib/moodie/records";
import { sendMoodieStreamingMessage } from "@/lib/moodie/stream-client";
import type {
  MoodieComposerSubmission,
  MoodieConversationDetail,
  MoodieConversationScope,
  MoodieConversationSummary,
  MoodiePageData,
} from "@/types/moodie";

const MoodieWorkspaceMobile = dynamic(
  () => import("@/components/moodie/moodie-workspace-mobile").then((module) => module.MoodieWorkspaceMobile),
  { ssr: false },
);

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
    active_leaf_message_id: conversation.active_leaf_message_id || null,
  };
}

export function MoodiePageClient({ initialData }: MoodiePageClientProps) {
  const router = useRouter();
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
  const moodieTurn = useMoodieTurn();
  const streamStatus = moodieTurn.state.statusLabel;
  const [historyOpen, setHistoryOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [, startTransition] = useTransition();
  const setHeaderSlots = useSetHeaderSlots();

  const activeConversation = activeConversationId
    ? conversationCache[activeConversationId] || null
    : null;
  const setupReady = initialData.setup.ready;
  const smartSuggestions = getSmartMoodieFollowUps({
    conversation: activeConversation,
    defaultSuggestions: initialData.suggestions,
  });

  useEffect(() => {
    const turnId = window.localStorage.getItem("moodie:active-turn:v1");
    if (!turnId) return;
    let cancelled = false;
    let timeoutId: number | undefined;
    const poll = async () => {
      const result = await getMoodieTurnStatus({ turn_id: turnId });
      if (cancelled) return;
      if (!result.success) {
        window.localStorage.removeItem("moodie:active-turn:v1");
        return;
      }
      if (result.data.status === "completed") {
        window.localStorage.removeItem("moodie:active-turn:v1");
        router.refresh();
        return;
      }
      if (result.data.status === "failed" || result.data.status === "cancelled") {
        window.localStorage.removeItem("moodie:active-turn:v1");
        if (result.data.error) toast.error(result.data.error);
        return;
      }
      timeoutId = window.setTimeout(poll, 2000);
    };
    poll().catch(() => {});
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [router]);

  useEffect(() => {
    setHeaderSlots({
      hideHeader: true,
      hideSearch: true,
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

  async function handleSendMessage(input: MoodieComposerSubmission | string, regenerateFromMessageId?: string, editFromMessageId?: string) {
    if (isSending) return;
    const submission: MoodieComposerSubmission = typeof input === "string"
      ? { content: input, attachments: [], contexts: [] }
      : input;

    setPendingPrompt(regenerateFromMessageId || editFromMessageId ? null : submission.content);
    setIsSending(true);
    const signal = moodieTurn.start();

    let result;
    try {
      result = await sendMoodieStreamingMessage({
        conversationId: activeConversationId,
        content: submission.content,
        attachments: submission.attachments,
        contexts: submission.contexts,
        regenerateFromMessageId,
        editFromMessageId,
        signal,
        onEvent: moodieTurn.receive,
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error(error instanceof Error ? error.message : "Moodie không thể trả lời");
      }
      setPendingPrompt(null);
      setIsSending(false);
      moodieTurn.release();
      return;
    }

    setPendingPrompt(null);
    setIsSending(false);
    moodieTurn.release();

    const detail = result.conversation;
    if (result.memoryProposed) {
      toast.success("Moodie đã phát hiện một ghi nhớ mới đang chờ bạn duyệt.");
    }
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
      toast.error("Tiêu đề không được để trống");
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
    });

    if (!result.success) {
      toast.error(result.error);
      return false;
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

    return true;
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
              onClick={() => router.refresh()}
            >
              <RefreshCw className="h-4 w-4" />
              <span>{"T\u1ea3i l\u1ea1i sau khi migrate"}</span>
            </Button>
          </div>
        </section>
      ) : (
        <>
          <MoodieWorkspaceDesktop
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
            streamStatus={streamStatus}
            turnActivities={moodieTurn.state.activities}
            streamedText={moodieTurn.state.streamedText}
            streamedParts={moodieTurn.state.parts}
            capabilities={initialData.capabilities}
            suggestions={smartSuggestions}
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
            onStopGeneration={moodieTurn.stop}
            onRegenerateMessage={(messageId, content) => { handleSendMessage(content, messageId).catch(() => {}); }}
            onEditMessage={(messageId, content) => { handleSendMessage(content, undefined, messageId).catch(() => {}); }}
            onQuickPrompt={(prompt) => {
              handleSendMessage(prompt).catch(() => {});
            }}
            onNewConversation={handleNewConversation}
            onOpenVoiceMode={() => setVoiceMode(true)}
          />

          <MoodieWorkspaceMobile
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
            streamStatus={streamStatus}
            turnActivities={moodieTurn.state.activities}
            streamedText={moodieTurn.state.streamedText}
            streamedParts={moodieTurn.state.parts}
            capabilities={initialData.capabilities}
            suggestions={smartSuggestions}
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
            onStopGeneration={moodieTurn.stop}
            onRegenerateMessage={(messageId, content) => { handleSendMessage(content, messageId).catch(() => {}); }}
            onEditMessage={(messageId, content) => { handleSendMessage(content, undefined, messageId).catch(() => {}); }}
            onQuickPrompt={(prompt) => {
              handleSendMessage(prompt).catch(() => {});
            }}
            onNewConversation={handleNewConversation}
            onOpenVoiceMode={() => setVoiceMode(true)}
          />

          <MoodieVoiceOverlay
            open={voiceMode}
            onClose={() => setVoiceMode(false)}
            streamedText={moodieTurn.state.streamedText}
            status={moodieTurn.state.stage}
            onSendVoiceMessage={(text) => handleSendMessage(text)}
            onStopGeneration={moodieTurn.stop}
          />

          <ConfirmDialog
            isOpen={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => {
              if (deleteTarget) {
                return confirmDelete(deleteTarget);
              }
              return false;
            }}
            title="Xóa hội thoại Moodie"
            message={`Bạn chắc chắn muốn xóa "${
              deleteTarget?.title || "hội thoại này"
            }"? Toàn bộ tin nhắn trong hội thoại sẽ bị xóa vĩnh viễn.`}
            confirmLabel="Xóa hội thoại"
          />
        </>
      )}
    </div>
  );
}
