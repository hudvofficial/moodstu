"use client";

import { lazy, Suspense, useMemo, useState } from "react";
import { Bot, Check, ChevronLeft, ChevronRight, Copy, FileText, Info, Pencil, RefreshCw, Sparkles, Square, ThumbsDown, ThumbsUp, Trash2, Volume2, X } from "lucide-react";
import { MoodieActionPreviews } from "@/components/moodie/moodie-action-previews";
import { MoodieBackgroundRunStatus } from "@/components/moodie/moodie-background-run-status";
import { MoodieExecutionSummary } from "@/components/moodie/moodie-execution-summary";
import { MoodieMessageParts } from "@/components/moodie/moodie-message-parts";
import { MoodieResponseContent } from "@/components/moodie/moodie-response-content";
import { MoodieThinkingState } from "@/components/moodie/moodie-thinking-state";
import { MoodieWidgetRenderer } from "@/components/moodie/moodie-widget-renderer";
import { upgradeMoodieMessageMeta } from "@/lib/moodie/response-metadata";
import { normalizeMoodieDisplayText } from "@/lib/moodie/ux-helpers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MoodieMessage, MoodieMessagePart, MoodieTurnActivity } from "@/types/moodie";

const MoodieSourceDrawer = lazy(() => import("@/components/moodie/moodie-source-drawer").then((module) => ({ default: module.MoodieSourceDrawer })));

interface MoodieMessageBubbleProps {
  message: MoodieMessage;
  pending?: boolean;
  activeLeaf?: boolean;
  statusLabel?: string | null;
  activities?: MoodieTurnActivity[];
  streamedParts?: Array<{ id: string; part: MoodieMessagePart }>;
  onQuickPrompt?: (prompt: string) => void;
  onRegenerate?: () => void;
  onContinue?: () => void;
  onDelete?: () => void;
  onEditResend?: (content: string) => void;
  onFeedback?: (rating: -1 | 1) => Promise<void>;
  branch?: { index: number; total: number; onPrevious?: () => void; onNext?: () => void };
}

export function MoodieMessageBubble({ message, pending, activeLeaf = true, statusLabel, activities, streamedParts, onQuickPrompt, onRegenerate, onContinue, onDelete, onEditResend, onFeedback, branch }: MoodieMessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  const metadata = useMemo(() => upgradeMoodieMessageMeta(message.metadata), [message.metadata]);
  const parts = metadata?.parts || [];
  const widgets = metadata?.widgets || [];
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [feedback, setFeedback] = useState<-1 | 1 | null>(metadata?.feedback?.rating || null);
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  async function copyMessage() {
    await navigator.clipboard.writeText(message.content.trim());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function toggleSpeech() {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.lang = "vi-VN";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  async function rate(rating: -1 | 1) {
    if (!onFeedback || feedbackPending) return;
    const previous = feedback;
    setFeedbackPending(true);
    setFeedback(rating);
    try { await onFeedback(rating); } catch { setFeedback(previous); } finally { setFeedbackPending(false); }
  }

  const suppressTables = parts.some((part) => part.type === "table");
  const suppressMetrics = parts.some((part) => part.type === "metric_grid") || widgets.some((widget) => widget.type === "kpi_cards");

  if (!isAssistant) {
    return (
      <article
        className="group relative flex w-full animate-fade-in-up outline-none transition-[padding] focus-within:pb-8 md:focus-within:pb-0"
        style={{ contentVisibility: "auto", containIntrinsicSize: "auto 96px" }}
        tabIndex={pending ? -1 : 0}
        onPointerDown={(event) => { if (!pending) event.currentTarget.focus(); }}
      >
        <div className="relative flex-auto w-0 max-w-full pl-1">
          {!pending ? (
            <div className="flex justify-end pr-2 text-xs">
              <time dateTime={message.created_at} className="mb-0.5 text-[0.65rem] font-medium text-gray-400 invisible transition group-hover:visible group-focus-within:visible">
                {formatUserMessageTime(message.created_at)}
              </time>
            </div>
          ) : null}

          <div className="w-full">
            <div className="flex justify-end pb-1">
              <div className="max-w-[90%] rounded-3xl bg-gray-50 px-4 py-1.5 text-left text-sm leading-6 text-text-primary">
                {editing ? (
                  <div className="space-y-2 py-1">
                    <Textarea value={editValue} onChange={(event) => setEditValue(event.target.value)} rows={3} className="min-w-[280px] bg-white" autoFocus />
                    <div className="flex justify-end gap-1.5">
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); setEditValue(message.content); }}><X className="mr-1 h-3.5 w-3.5" />Hủy</Button>
                      <Button type="button" size="sm" disabled={!editValue.trim()} onClick={() => { onEditResend?.(editValue.trim()); setEditing(false); }}><Check className="mr-1 h-3.5 w-3.5" />Gửi lại</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    {metadata?.contexts?.length ? <div className="flex flex-wrap gap-1">{metadata.contexts.map((context) => <span key={context.id} className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 text-micro text-primary"><Sparkles className="h-3 w-3" />{context.label}</span>)}</div> : null}
                    {metadata?.attachments?.length ? <div className="flex flex-wrap justify-end gap-1">{metadata.attachments.map((attachment) => <span key={attachment.id} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-white/70 px-2 py-1 text-micro text-text-secondary"><FileText className="h-3 w-3 text-primary" /><span className="max-w-40 truncate">{attachment.name}</span></span>)}</div> : null}
                    {pending ? <p className="mt-2 text-caption text-text-muted">Đang gửi...</p> : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          {!pending ? (
            <div className="pointer-events-none absolute right-0 top-full z-10 flex justify-end text-gray-600 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 md:pointer-events-auto md:static md:opacity-100">
              <div className="flex items-center md:invisible md:transition md:group-hover:visible md:group-focus-within:visible">
                {branch && branch.total > 1 ? <div className="flex self-center items-center" dir="ltr"><IconButton label="Phiên bản trước" disabled={!branch.onPrevious} onClick={branch.onPrevious}><ChevronLeft /></IconButton><span className="min-w-fit text-sm font-semibold tracking-widest text-gray-600">{branch.index + 1}/{branch.total}</span><IconButton label="Phiên bản sau" disabled={!branch.onNext} onClick={branch.onNext}><ChevronRight /></IconButton></div> : null}
                {onEditResend ? <IconButton label="Chỉnh sửa và gửi lại" onClick={() => setEditing(true)}><Pencil /></IconButton> : null}
                {message.content ? <IconButton label="Sao chép tin nhắn" onClick={() => void copyMessage()}>{copied ? <Check /> : <Copy />}</IconButton> : null}
              </div>
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article className={`group flex w-full ${isAssistant ? "justify-start" : "justify-end"} ${!isAssistant && !pending ? "pb-7" : ""} ${isAssistant ? "" : "animate-fade-in-up"}`} style={{ contentVisibility: "auto", containIntrinsicSize: "auto 160px" }} data-moodie-answer-surface={isAssistant ? message.request_id || message.id : undefined} data-moodie-answer-state={isAssistant ? pending ? "streaming" : "completed" : undefined}>
      <div className={`flex min-w-0 gap-2.5 ${isAssistant ? "w-full" : "max-w-[90%] flex-row-reverse"}`}>
        {isAssistant ? <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-text-inverse"><Bot className="h-3.5 w-3.5" /></div> : null}
        <div className={`min-w-0 max-w-full ${isAssistant ? "w-full space-y-3" : "relative"}`}>
          {pending && isAssistant ? <MoodieThinkingState statusLabel={statusLabel} activities={activities} streamedText={message.content} parts={streamedParts} /> : null}
          <div className={`max-w-full text-left leading-6 ${isAssistant ? "w-full py-1 text-sm text-text-primary" : "rounded-3xl bg-black/[0.035] px-4 py-1.5 text-[15px] text-text-primary"}`}>
            {isAssistant ? pending ? null : <MoodieResponseContent content={message.content} suppressMetrics={suppressMetrics} suppressTables={suppressTables} /> : editing ? (
              <div className="space-y-2 py-1"><Textarea value={editValue} onChange={(event) => setEditValue(event.target.value)} rows={3} className="min-w-[280px] bg-white" autoFocus /><div className="flex justify-end gap-1.5"><Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); setEditValue(message.content); }}><X className="mr-1 h-3.5 w-3.5" />Hủy</Button><Button type="button" size="sm" disabled={!editValue.trim()} onClick={() => { onEditResend?.(editValue.trim()); setEditing(false); }}><Check className="mr-1 h-3.5 w-3.5" />Gửi lại</Button></div></div>
            ) : <div className="space-y-2"><div className="break-words whitespace-pre-wrap">{message.content}</div>{metadata?.contexts?.length ? <div className="flex flex-wrap gap-1">{metadata.contexts.map((context) => <span key={context.id} className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 text-micro text-primary"><Sparkles className="h-3 w-3" />{context.label}</span>)}</div> : null}{metadata?.attachments?.length ? <div className="flex flex-wrap gap-1">{metadata.attachments.map((attachment) => <span key={attachment.id} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-white/70 px-2 py-1 text-micro text-text-secondary"><FileText className="h-3 w-3 text-primary" /><span className="max-w-40 truncate">{attachment.name}</span></span>)}</div> : null}</div>}
            {pending && !isAssistant ? <p className="mt-2 text-caption text-text-muted">Đang gửi...</p> : null}
          </div>

          {!pending && !isAssistant ? <time dateTime={message.created_at} className="pointer-events-none absolute bottom-full right-2 mb-0.5 whitespace-nowrap text-[10px] font-medium text-text-muted opacity-100 transition-opacity duration-150 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">{formatUserMessageTime(message.created_at)}</time> : null}
          {!pending && !isAssistant ? <div className="absolute right-0 top-full mt-0.5 flex h-8 items-center opacity-100 transition-opacity duration-150 md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100">{onEditResend ? <IconButton label="Chỉnh sửa và gửi lại" onClick={() => setEditing(true)}><Pencil /></IconButton> : null}<IconButton label="Sao chép tin nhắn" onClick={() => void copyMessage()}>{copied ? <Check /> : <Copy />}</IconButton></div> : null}
          {!pending && isAssistant && parts.length ? <MoodieMessageParts parts={parts} /> : !pending && isAssistant && widgets.length ? <MoodieWidgetRenderer widgets={widgets} /> : null}
          {!pending && isAssistant && metadata?.background_runs?.length ? <div className="space-y-2">{metadata.background_runs.map((run) => <MoodieBackgroundRunStatus key={run.id} reference={run} />)}</div> : null}
          {!pending && isAssistant && metadata?.actions?.length ? <MoodieActionPreviews actions={metadata.actions} /> : null}
          {isAssistant ? <MoodieExecutionSummary activities={metadata?.activity_history} sources={metadata?.sources_v2} trace={metadata?.trace} timestamp={message.created_at} pending={pending} onOpenSources={() => setSourcesOpen(true)} /> : null}

          {!pending && isAssistant ? (
            <div className="flex min-h-8 flex-wrap items-center gap-0.5 border-t border-border/50 pt-1">
              {branch && branch.total > 1 ? <div className="mr-1 inline-flex items-center gap-0.5 text-micro text-text-muted"><IconButton label="Phiên bản trước" disabled={!branch.onPrevious} onClick={branch.onPrevious}><ChevronLeft /></IconButton><span>{branch.index + 1}/{branch.total}</span><IconButton label="Phiên bản sau" disabled={!branch.onNext} onClick={branch.onNext}><ChevronRight /></IconButton></div> : null}
              <IconButton label="Sao chép câu trả lời" onClick={() => void copyMessage()}>{copied ? <Check /> : <Copy />}</IconButton>
              <IconButton label={speaking ? "Dừng đọc" : "Đọc câu trả lời"} onClick={toggleSpeech}>{speaking ? <Square /> : <Volume2 />}</IconButton>
              <IconButton label="Thông tin câu trả lời" onClick={() => setDetailsOpen((value) => !value)}><Info /></IconButton>
              {onFeedback ? <><IconButton label="Phản hồi hữu ích" disabled={feedbackPending} active={feedback === 1} onClick={() => void rate(1)}><ThumbsUp /></IconButton><IconButton label="Phản hồi chưa tốt" disabled={feedbackPending} active={feedback === -1} onClick={() => void rate(-1)}><ThumbsDown /></IconButton></> : null}
              {onContinue ? <IconButton label="Tiếp tục câu trả lời" onClick={onContinue}><ChevronRight /></IconButton> : null}
              {onRegenerate ? <IconButton label="Tạo lại câu trả lời" onClick={onRegenerate}><RefreshCw /></IconButton> : null}
              {onDelete ? <IconButton label="Xóa câu trả lời" onClick={onDelete}><Trash2 /></IconButton> : null}
            </div>
          ) : null}

          {detailsOpen && metadata?.trace ? <div className="rounded-xl border border-border bg-bg-subtle p-3 text-caption text-text-secondary"><div className="grid gap-1 sm:grid-cols-2"><p><strong>Engine:</strong> {metadata.trace.engine}</p><p><strong>Thời gian:</strong> {metadata.trace.duration_ms}ms</p><p><strong>Công cụ:</strong> {metadata.trace.tool_call_count}</p><p><strong>Model steps:</strong> {metadata.trace.model_steps}</p></div></div> : null}

          {isAssistant && activeLeaf && metadata?.follow_ups?.length && onQuickPrompt ? <section className="mt-3"><h3 className="mb-1 text-sm font-medium text-text-primary">Hỏi tiếp</h3>{metadata.follow_ups.map((prompt) => { const display = normalizeMoodieDisplayText(prompt); return <Button key={prompt} type="button" unstyled className="flex w-full items-center border-b border-border/50 py-2.5 text-left text-sm text-text-secondary last:border-b-0 hover:text-text-primary" onClick={() => onQuickPrompt(display)}><span className="truncate">{display}</span></Button>; })}</section> : null}
        </div>
      </div>
      <Suspense fallback={null}><MoodieSourceDrawer open={sourcesOpen} sources={metadata?.sources_v2 || []} onClose={() => setSourcesOpen(false)} /></Suspense>
    </article>
  );
}

function formatUserMessageTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const time = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(date);
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return `Hôm nay lúc ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Hôm qua lúc ${time}`;
  const day = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  return `${day} lúc ${time}`;
}

function IconButton({ label, children, onClick, disabled, active }: { label: string; children: React.ReactElement<{ className?: string }>; onClick?: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <Button
      type="button"
      unstyled
      className={`inline-flex h-7 min-h-0 w-7 min-w-0 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent p-0 transition-colors duration-150 ${active ? "text-primary" : "text-text-muted"} hover:bg-black/5 hover:text-text-primary focus-visible:bg-black/5 focus-visible:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 active:scale-95 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[2]`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}
