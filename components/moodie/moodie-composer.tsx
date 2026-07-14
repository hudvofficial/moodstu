"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, AudioLines, FileText, Loader2, Mic, Plus, Sparkles, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MoodieVoiceRecorder } from "@/components/moodie/moodie-voice-recorder";
import { MoodieModelPicker } from "@/components/moodie/moodie-model-picker";
import { toast } from "sonner";
import type { MoodieAttachment, MoodieCapability, MoodieComposerContext, MoodieComposerSubmission, MoodieModelOption } from "@/types/moodie";

interface MoodieComposerProps {
  suggestionChips?: string[];
  disabled?: boolean;
  loading?: boolean;
  hasMessages?: boolean;
  capabilities?: MoodieCapability[];
  draftKey?: string | null;
  modelOptions?: MoodieModelOption[];
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  onSend: (submission: MoodieComposerSubmission) => Promise<void> | void;
  onStop?: () => void;
  onSuggestionClick?: (content: string) => void;
  onOpenVoiceMode?: () => void;
}

export function MoodieComposer({
  disabled,
  loading,
  hasMessages,
  capabilities = [],
  draftKey,
  modelOptions = [],
  selectedModel,
  onModelChange,
  onSend,
  onStop,
  suggestionChips = [],
  onSuggestionClick,
  onOpenVoiceMode,
}: MoodieComposerProps) {
  const [value, setValue] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [attachments, setAttachments] = useState<MoodieAttachment[]>([]);
  const [contexts, setContexts] = useState<MoodieComposerContext[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storageKey = `moodie:draft:v1:${draftKey || "new"}`;

  useEffect(() => {
    const draft = window.localStorage.getItem(storageKey) || "";
    setValue(draft);
    window.requestAnimationFrame(() => resizeTextarea());
  }, [storageKey]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (value) window.localStorage.setItem(storageKey, value);
      else window.localStorage.removeItem(storageKey);
    }, 180);
    return () => window.clearTimeout(timeoutId);
  }, [storageKey, value]);

  function resizeTextarea() {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 192)}px`;
  }

  async function handleSubmit() {
    const content = value.trim();
    if (!content || disabled || loading) return;
    setValue("");
    window.localStorage.removeItem(storageKey);
    setShowShortcuts(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    const submission = { content, attachments, contexts, model: selectedModel };
    setAttachments([]);
    setContexts([]);
    await onSend(submission);
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length || uploading) return;
    const remainingSlots = Math.max(0, 6 - attachments.length);
    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    if (selectedFiles.length === 0) {
      toast.error("M\u1ed7i l\u01b0\u1ee3t ch\u1ec9 h\u1ed7 tr\u1ee3 t\u1ed1i \u0111a 6 t\u1ec7p");
      return;
    }
    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/moodie/attachments", { method: "POST", body: formData });
        const payload = await response.json() as { attachment?: MoodieAttachment; error?: string };
        if (!response.ok || !payload.attachment) throw new Error(payload.error || `Kh\u00f4ng th\u1ec3 t\u1ea3i ${file.name}`);
        setAttachments((current) => [...current, payload.attachment!]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kh\u00f4ng th\u1ec3 t\u1ea3i t\u1ec7p \u0111\u00ednh k\u00e8m");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeAttachment(attachment: MoodieAttachment) {
    setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    await fetch("/api/moodie/attachments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storage_path: attachment.storage_path }),
    }).catch(() => {});
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      toast.error("Kh\u00f4ng th\u1ec3 truy c\u1eadp micro");
      return;
    }
    setRecording(true);
  }

  async function openVoiceMode() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      toast.error("Kh\u00f4ng th\u1ec3 truy c\u1eadp micro");
      return;
    }
    onOpenVoiceMode?.();
  }

  function handleVoiceConfirm(text: string) {
    setRecording(false);
    setValue((current) => {
      const next = current ? `${current} ${text}` : text;
      return next;
    });
    window.requestAnimationFrame(() => {
      resizeTextarea();
      textareaRef.current?.focus();
    });
  }

  const visibleSuggestions = suggestionChips.slice(0, hasMessages ? 3 : 5);

  return (
    <div className="relative z-20 shrink-0 bg-linear-to-t from-white via-white to-white/0 px-3 pb-3 pt-3 sm:px-5 sm:pb-5 sm:pt-5">
      <div className="mx-auto w-full max-w-4xl">
        {showShortcuts && (visibleSuggestions.length > 0 || capabilities.length > 0) ? (
          <div className="mb-2 overflow-hidden rounded-2xl border border-border/70 bg-white p-2 shadow-lg">
            <div className="flex items-center gap-2 px-2 pb-1.5 pt-1 text-caption font-medium text-text-muted">
              <Sparkles className="h-3.5 w-3.5" />
              {"K\u1ef9 n\u0103ng v\u00e0 l\u1ec7nh nhanh"}
            </div>
            {capabilities.length > 0 ? (
              <div className="grid gap-1 sm:grid-cols-2">
                {capabilities.slice(0, 6).map((capability) => (
                  <Button key={capability.id} type="button" unstyled className="rounded-xl px-3 py-2 text-left transition hover:bg-bg-subtle" onClick={() => {
                    const prompt = capability.prompts[0];
                    if (prompt) setValue(prompt);
                    setContexts((current) => current.some((item) => item.id === capability.id) ? current : [...current, { id: capability.id, type: "capability", label: capability.label }]);
                    setShowShortcuts(false);
                    window.requestAnimationFrame(() => textareaRef.current?.focus());
                  }}>
                    <span className="block text-sm font-medium text-text-primary">{capability.label}</span>
                    <span className="mt-0.5 block text-micro leading-4 text-text-muted">{capability.description}</span>
                  </Button>
                ))}
              </div>
            ) : null}
            {visibleSuggestions.length > 0 ? <div className="mt-1 space-y-0.5 border-t border-border/60 pt-1">
              {visibleSuggestions.map((suggestion) => (
                <Button key={suggestion} type="button" unstyled className="block w-full rounded-xl px-3 py-2 text-left text-sm text-text-secondary transition hover:bg-bg-subtle hover:text-text-primary" onClick={() => { setShowShortcuts(false); onSuggestionClick?.(suggestion); }}>
                  {suggestion}
                </Button>
              ))}
            </div> : null}
            {capabilities.length > 0 ? <p className="px-3 pb-1 pt-2 text-micro text-text-muted">{capabilities.length}{" nh\u00f3m k\u1ef9 n\u0103ng \u0111\u01b0\u1ee3c c\u1ea5p quy\u1ec1n trong phi\u00ean n\u00e0y."}</p> : null}
          </div>
        ) : null}

        <div className="relative flex w-full flex-col rounded-3xl border border-border/70 bg-white px-1 shadow-lg transition hover:border-border focus-within:border-primary/25">
          <Input ref={fileInputRef} type="file" className="hidden" multiple accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" onChange={(event) => { uploadFiles(event.target.files).catch(() => {}); }} />
          {recording ? (
            <MoodieVoiceRecorder onCancel={() => setRecording(false)} onConfirm={handleVoiceConfirm} />
          ) : (
            <>
              {attachments.length > 0 || contexts.length > 0 ? (
                <div className="mx-2 mt-2.5 flex flex-wrap items-center gap-2 pb-1.5">
                  {contexts.map((context) => (
                    <span key={context.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/8 px-2.5 py-1 text-micro font-medium text-primary">
                      <Sparkles className="h-3 w-3" /><span className="truncate">{context.label}</span>
                      <Button type="button" unstyled className="rounded-full p-0.5 hover:bg-primary/10" onClick={() => setContexts((current) => current.filter((item) => item.id !== context.id))} aria-label={`B\u1ecf ng\u1eef c\u1ea3nh ${context.label}`}><X className="h-3 w-3" /></Button>
                    </span>
                  ))}
                  {attachments.map((attachment) => (
                    <span key={attachment.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-bg-subtle px-2.5 py-1 text-micro text-text-secondary">
                      <FileText className="h-3 w-3 text-primary" /><span className="max-w-40 truncate">{attachment.name}</span>
                      <Button type="button" unstyled className="rounded-full p-0.5 hover:bg-bg-subtle" onClick={() => { removeAttachment(attachment).catch(() => {}); }} aria-label={`B\u1ecf t\u1ec7p ${attachment.name}`}><X className="h-3 w-3" /></Button>
                    </span>
                  ))}
                </div>
              ) : null}
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(event) => { setValue(event.target.value); resizeTextarea(); }}
                placeholder={disabled ? "Cu\u1ed9c tr\u00f2 chuy\u1ec7n \u0111ang \u0111\u01b0\u1ee3c x\u1eed l\u00fd..." : "T\u00f4i c\u00f3 th\u1ec3 gi\u00fap g\u00ec cho b\u1ea1n h\u00f4m nay?"}
                rows={1}
                unstyled
                className="block max-h-48 min-h-10 w-full resize-none overflow-y-auto border-0 bg-transparent px-3 pb-1 pt-3 text-base leading-6 shadow-none placeholder:text-text-muted focus-visible:ring-0"
                disabled={disabled || loading}
                onKeyDown={async (event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    await handleSubmit();
                  }
                }}
              />

              <div className="mx-0.5 mb-2.5 mt-0.5 flex justify-between">
                <div className="ml-1 flex min-w-0 flex-1 items-center self-end">
                  <Button type="button" unstyled className="flex size-8 shrink-0 items-center justify-center rounded-full bg-transparent text-text-muted hover:bg-bg-subtle" onClick={() => fileInputRef.current?.click()} disabled={uploading || attachments.length >= 6} aria-label="Đính kèm tệp">
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                  </Button>
                  <Button type="button" unstyled className={`flex size-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-bg-subtle ${showShortcuts ? "bg-bg-subtle text-primary" : "bg-transparent"}`} onClick={() => setShowShortcuts((current) => !current)} aria-label="Kỹ năng và lệnh nhanh">
                    <Sparkles className="h-[18px] w-[18px]" />
                  </Button>
                </div>
                <div className="mr-1 flex items-center gap-0.5 self-end">
                  {modelOptions.length > 0 ? (
                    <MoodieModelPicker options={modelOptions} value={selectedModel} onChange={onModelChange} disabled={disabled || loading} />
                  ) : null}
                  <Button type="button" unstyled className="mr-0.5 self-center rounded-full p-1.5 text-text-muted transition hover:text-text-primary" onClick={() => { startRecording().catch(() => {}); }} disabled={disabled || loading} aria-label="Đọc để nhập">
                    <Mic className="h-5 w-5" />
                  </Button>
                  {loading ? (
                    <Button type="button" unstyled onClick={onStop} className="self-center rounded-full bg-primary p-1.5 text-white transition hover:bg-primary/90" aria-label="Dừng phản hồi của Moodie">
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </Button>
                  ) : value.trim() === "" && attachments.length === 0 && !recording ? (
                    <Button type="button" unstyled onClick={() => { openVoiceMode().catch(() => {}); }} className="self-center rounded-full bg-primary p-1.5 text-white transition hover:bg-primary/90 disabled:bg-bg-subtle disabled:text-text-muted" disabled={disabled} aria-label="Trò chuyện bằng giọng nói" title="Hey Moodie · W mở · S đóng">
                      <AudioLines className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button type="button" unstyled onClick={() => { handleSubmit().catch(() => {}); }} className="self-center rounded-full bg-primary p-1.5 text-white transition hover:bg-primary/90 disabled:bg-bg-subtle disabled:text-text-muted" disabled={disabled || value.trim().length === 0} aria-label="Gửi tin nhắn cho Moodie">
                      <ArrowUp className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <p className="mt-2 text-center text-micro text-text-muted">{"Moodie c\u00f3 th\u1ec3 m\u1eafc l\u1ed7i. H\u00e3y ki\u1ec3m tra d\u1eef li\u1ec7u quan tr\u1ecdng tr\u01b0\u1edbc khi th\u1ef1c thi."}</p>
      </div>
    </div>
  );
}
