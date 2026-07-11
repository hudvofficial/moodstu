"use client";

import { useState } from "react";
import { Bot, Check, ChevronLeft, ChevronRight, Copy, Database, FileText, Pencil, RefreshCw, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { MoodieDebugPanel } from "@/components/moodie/moodie-debug-panel";
import { MoodieActionPreviews } from "@/components/moodie/moodie-action-previews";
import { MoodieWidgetRenderer } from "@/components/moodie/moodie-widget-renderer";
import { MoodieMessageParts } from "@/components/moodie/moodie-message-parts";
import { MoodieResponseContent } from "@/components/moodie/moodie-response-content";
import { normalizeMoodieDisplayText } from "@/lib/moodie/ux-helpers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MoodieMessage } from "@/types/moodie";

interface MoodieMessageBubbleProps {
  message: MoodieMessage;
  pending?: boolean;
  onQuickPrompt?: (prompt: string) => void;
  onRegenerate?: () => void;
  onEditResend?: (content: string) => void;
  onFeedback?: (rating: -1 | 1) => Promise<void>;
  branch?: { index: number; total: number; onPrevious?: () => void; onNext?: () => void };
}

export function MoodieMessageBubble({
  message,
  pending,
  onQuickPrompt,
  onRegenerate,
  onEditResend,
  onFeedback,
  branch,
}: MoodieMessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  const parts = message.metadata?.parts || [];
  const widgets = message.metadata?.widgets || [];
  const suppressTables = parts.some((part) => part.type === "table");
  const suppressMetrics = parts.some((part) => part.type === "metric_grid") || widgets.some((widget) => widget.type === "kpi_cards");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [feedback, setFeedback] = useState<-1 | 1 | null>(null);

  async function copyMessage() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article
      className={`group flex w-full ${isAssistant ? "justify-start" : "justify-end"} ${!isAssistant && !pending ? "pb-7" : ""} animate-fade-in-up`}
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 160px" }}
    >
      <div
        className={`flex min-w-0 gap-2.5 ${
          isAssistant
            ? "w-full flex-row"
            : "max-w-[90%] flex-row-reverse"
        }`}
      >
        {isAssistant ? (
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-text-inverse">
            <Bot className="h-3.5 w-3.5" />
          </div>
        ) : null}

        <div className={`min-w-0 max-w-full ${isAssistant ? "w-full space-y-3.5" : "relative"}`}>
          <div
            className={`max-w-full text-left text-sm leading-6 ${
              isAssistant
                ? "w-full py-1 text-text-primary"
                : "rounded-3xl bg-bg-subtle px-4 py-1.5 text-text-primary"
            }`}
          >
            {isAssistant ? (
              <MoodieResponseContent content={message.content} suppressMetrics={suppressMetrics} suppressTables={suppressTables} />
            ) : (
              <div className="space-y-2">
                {editing ? (
                  <div className="space-y-2 py-1">
                    <Textarea value={editValue} onChange={(event) => setEditValue(event.target.value)} rows={3} className="min-w-[280px] bg-white" autoFocus />
                    <div className="flex justify-end gap-1.5">
                      <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => { setEditing(false); setEditValue(message.content); }}><X className="h-3.5 w-3.5" />Hủy</Button>
                      <Button type="button" size="sm" className="h-8 gap-1.5" disabled={!editValue.trim()} onClick={() => { onEditResend?.(editValue.trim()); setEditing(false); }}><Check className="h-3.5 w-3.5" />Gửi lại</Button>
                    </div>
                  </div>
                ) : <div className="break-words whitespace-pre-wrap">{message.content}</div>}
                {message.metadata?.contexts?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {message.metadata.contexts.map((context) => <span key={context.id} className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 text-micro text-primary"><Sparkles className="h-3 w-3" />{context.label}</span>)}
                  </div>
                ) : null}
                {message.metadata?.attachments?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {message.metadata.attachments.map((attachment) => <span key={attachment.id} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-white/70 px-2 py-1 text-micro text-text-secondary"><FileText className="h-3 w-3 text-primary" /><span className="max-w-40 truncate">{attachment.name}</span></span>)}
                  </div>
                ) : null}
              </div>
            )}

            {pending ? (
              <p
                className={`mt-2 text-caption ${
                  isAssistant ? "text-text-muted" : "text-primary/70"
                }`}
              >
                Đang gửi...
              </p>
            ) : null}
          </div>

          {!pending && !isAssistant ? (
            <div className="absolute bottom-full right-2 mb-0.5 text-micro font-medium text-text-muted transition-opacity duration-150 md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100">
              {new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at))}
            </div>
          ) : null}

          {!pending && !isAssistant ? (
            <div className="absolute right-0 top-full mt-0.5 flex h-7 items-center justify-end transition-opacity duration-150 md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100">
              {onEditResend ? <Button type="button" variant="ghost" size="sm" className="h-7 w-7 rounded-lg px-0 text-text-muted hover:bg-bg-hover hover:text-text-primary" onClick={() => setEditing(true)} aria-label="Chỉnh sửa và gửi lại" title="Chỉnh sửa"><Pencil className="h-3.5 w-3.5" /></Button> : null}
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 rounded-lg px-0 text-text-muted hover:bg-bg-hover hover:text-text-primary" onClick={() => { copyMessage().catch(() => {}); }} aria-label="Sao chép tin nhắn" title="Sao chép">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ) : null}

          {isAssistant && message.metadata?.parts && message.metadata.parts.length > 0 ? (
            <MoodieMessageParts parts={message.metadata.parts} />
          ) : isAssistant &&
          message.metadata?.widgets &&
          message.metadata.widgets.length > 0 ? (
            <MoodieWidgetRenderer widgets={message.metadata.widgets} />
          ) : null}

          {isAssistant && message.metadata?.actions && message.metadata.actions.length > 0 ? (
            <MoodieActionPreviews actions={message.metadata.actions} />
          ) : null}

          {isAssistant && message.metadata?.trace ? (
            <MoodieDebugPanel trace={message.metadata.trace} />
          ) : null}

          {!pending && isAssistant ? (
            <div className="!mt-1 flex h-7 items-center gap-0.5">
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 rounded-lg px-0 text-text-muted hover:text-text-primary" onClick={() => { copyMessage().catch(() => {}); }} aria-label="Sao chép câu trả lời" title="Sao chép">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              {onRegenerate ? <Button type="button" variant="ghost" size="sm" className="h-7 w-7 rounded-lg px-0 text-text-muted hover:text-text-primary" onClick={onRegenerate} aria-label="Tạo lại câu trả lời" title="Tạo lại"><RefreshCw className="h-3.5 w-3.5" /></Button> : null}
              {onFeedback ? <>
                <Button type="button" variant="ghost" size="sm" className={`h-7 w-7 rounded-lg px-0 ${feedback === 1 ? "text-success" : "text-text-muted"}`} onClick={() => { onFeedback(1).then(() => setFeedback(1)).catch(() => {}); }} aria-label="Phản hồi hữu ích"><ThumbsUp className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="ghost" size="sm" className={`h-7 w-7 rounded-lg px-0 ${feedback === -1 ? "text-danger" : "text-text-muted"}`} onClick={() => { onFeedback(-1).then(() => setFeedback(-1)).catch(() => {}); }} aria-label="Phản hồi chưa tốt"><ThumbsDown className="h-3.5 w-3.5" /></Button>
              </> : null}
              {branch && branch.total > 1 ? <div className="ml-1 inline-flex items-center gap-0.5 text-micro text-text-muted">
                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 rounded-md px-0" disabled={!branch.onPrevious} onClick={branch.onPrevious} aria-label="Phiên bản trước"><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <span>{branch.index + 1}/{branch.total}</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 rounded-md px-0" disabled={!branch.onNext} onClick={branch.onNext} aria-label="Phiên bản sau"><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div> : null}
              <span className="pl-1 text-micro text-text-muted">{new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at))}</span>
            </div>
          ) : null}

          {isAssistant &&
          message.metadata?.sources &&
          message.metadata.sources.length > 0 ? (
            <details className="group/sources border-t border-border/60 pt-3">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-micro font-medium text-text-muted hover:text-text-primary"><Database className="h-3.5 w-3.5" />{message.metadata.sources.length} nguồn dữ liệu<span className="ml-1 transition group-open/sources:rotate-90">›</span></summary>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">{message.metadata.sources.map((source) => (
                <div key={`${source.label}-${source.value || ""}`} className="rounded-xl border border-border/60 bg-bg-subtle/60 px-3 py-2 text-micro text-text-secondary">
                  <strong className="block text-text-main">{normalizeMoodieDisplayText(source.label)}</strong>
                  {source.value ? <span className="mt-0.5 block">{source.value}</span> : null}
                  {source.hint ? <span className="mt-1 block text-text-muted">{source.hint}</span> : null}
                </div>
              ))}</div>
            </details>
          ) : null}

          {isAssistant &&
          message.metadata?.follow_ups &&
          message.metadata.follow_ups.length > 0 &&
          onQuickPrompt ? (
            <div className="mt-3 border-t border-border/60 pt-3">
              <p className="mb-1.5 text-caption font-medium text-text-muted">Hỏi tiếp</p>
              {message.metadata.follow_ups.map((prompt) => {
                const displayPrompt = normalizeMoodieDisplayText(prompt);
                return (
                  <Button
                    key={prompt}
                    type="button"
                    onClick={() => onQuickPrompt(displayPrompt)}
                    unstyled
                    className="group flex w-full items-center justify-between gap-4 border-b border-border/50 px-0 py-2.5 text-left text-sm font-normal whitespace-normal text-text-secondary transition last:border-b-0 hover:text-text-primary"
                  >
                    <span>{displayPrompt}</span>
                    <span className="text-text-muted transition group-hover:translate-x-0.5 group-hover:text-primary">â†’</span>
                  </Button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
