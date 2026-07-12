"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Database, ExternalLink, FileText, Globe2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MoodieMessageSourceV2 } from "@/types/moodie";

function formatSourceTime(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function MoodieSourceDrawer({ open, sources, onClose }: { open: boolean; sources: MoodieMessageSourceV2[]; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || !open) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const modal = modalRef.current;
    if (modal && !modal.open) modal.showModal();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (modal?.open) modal.close();
      previouslyFocusedRef.current?.focus();
    };
  }, [mounted, open, onClose]);

  if (!mounted || !open) return null;
  return createPortal(
    <dialog
      ref={modalRef}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-transparent p-0 backdrop:bg-black/20"
      aria-labelledby="moodie-source-title"
      aria-describedby="moodie-source-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <aside ref={panelRef} className="ml-auto h-dvh w-full overflow-y-auto border-l border-border bg-white p-5 shadow-xl sm:w-[28rem]" role="document">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h2 id="moodie-source-title" className="text-base font-semibold text-text-primary">Dữ liệu tham chiếu</h2><p id="moodie-source-description" className="text-caption text-text-muted">{sources.length} mục được dùng trong câu trả lời</p></div>
          <Button ref={closeButtonRef} type="button" variant="ghost" size="sm" className="h-9 w-9 shrink-0 px-0" onClick={onClose} aria-label="Đóng dữ liệu tham chiếu"><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-2">
          {sources.map((source, index) => {
            const Icon = source.kind === "web" ? Globe2 : source.kind === "document" ? FileText : Database;
            const href = source.href || source.url;
            const external = Boolean(href?.startsWith("http"));
            const typeLabel = source.kind === "web" ? "Nguồn web" : source.kind === "document" ? "Tài liệu" : source.kind === "internal" ? "Ngữ cảnh nội bộ" : "Dữ liệu hệ thống";
            const retrievedAt = formatSourceTime(source.metadata?.retrieved_at);
            const publishedAt = formatSourceTime(source.metadata?.published_at);
            const content = <><span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1 text-micro font-semibold text-primary">{index + 1}</span><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block break-words font-medium text-text-primary">{source.title}</span><span className="block text-micro text-text-muted">{source.domain || typeLabel}</span>{publishedAt ? <span className="block text-micro text-text-muted">Xuất bản {publishedAt}</span> : null}{retrievedAt ? <span className="block text-micro text-text-muted">Truy xuất {retrievedAt}</span> : null}{source.snippet ? <span className="mt-1 block break-words text-caption text-text-secondary">{source.snippet}</span> : null}</span>{href ? <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-muted" /> : null}</>;
            return href ? <a key={source.id} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="flex gap-3 rounded-xl border border-border p-3 outline-none transition-colors hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-primary/20">{content}</a> : <div key={source.id} className="flex gap-3 rounded-xl border border-border p-3">{content}</div>;
          })}
        </div>
      </aside>
    </dialog>,
    document.body,
  );
}
