"use client";

/**
 * 📝 DrawerNotes — Quick notes view with add capability
 *
 * Shows recent notes (3 max) + input for adding new ones.
 * Uses SWR for caching + optimistic add via mutate().
 */

import { useState, useRef, useCallback } from "react";
import { MessageSquare, Send } from "lucide-react";
import { addContractNote } from "@/app/actions/note-actions";
import { revalidateContractCaches } from "@/lib/hooks/use-contracts";
import { useContractNotes } from "@/lib/hooks/use-contract-notes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── TYPES ───────────────────────────────────────

interface Note {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
  employees?: { full_name: string } | null;
}

interface DrawerNotesProps {
  contractId: string;
  initialNotes?: { id: string; content: string; created_by: string; created_at: string }[];
}

// ─── HELPERS ─────────────────────────────────────

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── COMPONENT ───────────────────────────────────

const MAX_VISIBLE = 3;

export function DrawerNotes({ contractId, initialNotes }: DrawerNotesProps) {
  const { notes, isLoading: loading, mutate } = useContractNotes(contractId, initialNotes);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [optimisticNotes, setOptimisticNotes] = useState<Note[]>([]);

  // Combine server notes + optimistic
  const allNotes = [...notes, ...optimisticNotes];

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    // Optimistic add via local state
    const tempId = `temp-${Date.now()}`;
    const optimistic: Note = {
      id: tempId,
      content: trimmed,
      created_by: "",
      created_at: new Date().toISOString(),
    };

    setOptimisticNotes((prev) => [...prev, optimistic]);
    setInput("");
    setSending(true);

    try {
      const res = await addContractNote(contractId, trimmed);
      if (!res.success) {
        toast.error("Lỗi khi gửi ghi chú");
      } else {
        void revalidateContractCaches(contractId);
      }
      // Revalidate from server to get real data
      void mutate().then(() => setOptimisticNotes([]));
    } catch {
      toast.error("Lỗi kết nối!");
      await mutate();
      setOptimisticNotes([]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, contractId, mutate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const recentNotes = allNotes.slice(-MAX_VISIBLE);
  const hiddenCount = allNotes.length - MAX_VISIBLE;

  return (
    <section className="card-base p-4">
      <h4 className="text-caption font-semibold text-text-secondary mb-3 uppercase tracking-wide">
        <MessageSquare className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
        Ghi chú ({allNotes.length})
      </h4>

      {loading ? (
        <div className="flex flex-col gap-2">
          <div className="skeleton skeleton-text w-full" />
          <div className="skeleton skeleton-text w-3/4" />
        </div>
      ) : (
        <>
          {allNotes.length === 0 ? (
            <p className="text-body-sm text-text-muted italic mb-3">
              Chưa có ghi chú
            </p>
          ) : (
            <div className="flex flex-col gap-2 mb-3">
              {hiddenCount > 0 && (
                <p className="text-tiny text-text-muted text-center">
                  + {hiddenCount} ghi chú trước đó
                </p>
              )}
              {recentNotes.map((note) => (
                <div
                  key={note.id}
                  className={`rounded-md px-3 py-2 bg-hover/30 ${
                    note.id.startsWith("temp-") ? "opacity-60" : ""
                  }`}
                >
                  <p className="text-body-sm text-text-main whitespace-pre-wrap wrap-break-word leading-relaxed">
                    {note.content}
                  </p>
                  <p className="text-tiny text-text-muted mt-1">
                    {formatTime(note.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Quick input */}
          <div className="flex items-center gap-2">
            <Input unstyled
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 500))}
              onKeyDown={handleKeyDown}
              placeholder="Gõ ghi chú..."
              className="input-base flex-1 text-body-sm py-1.5"
              disabled={sending}
              maxLength={500}
            />
            <Button unstyled
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="btn btn-primary p-2 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
