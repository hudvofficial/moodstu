"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { getContractNotes, addContractNote, deleteContractNote } from "@/app/actions/note-actions";
import { revalidateContractCaches } from "@/lib/hooks/use-contracts";
import { toast } from "@/lib/toast-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ═══════════════════════════════════════════
// Notes Timeline — Chat-style collapsible
// Phase 07B: V1 ContractNotes (216 LOC) → V2
// Server actions only, no client Supabase
// ═══════════════════════════════════════════

interface Props {
  contractId: string;
}

interface Note {
  id: string;
  content: string;
  created_by: string | null;
  created_at: string;
  employees?: { full_name: string } | null;
}

export default function NotesTimeline({ contractId }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch notes on expand
  useEffect(() => {
    if (!expanded) return;
    getContractNotes(contractId).then((result) => {
      if (result.success && result.data) {
        setNotes(result.data as unknown as Note[]);
      }
    });
  }, [expanded, contractId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [notes]);

  const handleAdd = useCallback(async () => {
    if (!newNote.trim() || loading) return;
    setLoading(true);

    // Optimistic insert
    const tempId = `temp-${Date.now()}`;
    const tempNote: Note = {
      id: tempId,
      content: newNote.trim(),
      created_by: null,
      created_at: new Date().toISOString(),
      employees: { full_name: "Bạn" },
    };
    setNotes((prev) => [...prev, tempNote]);
    setNewNote("");

    try {
      const result = await addContractNote(contractId, newNote.trim());
      if (result.success && result.data) {
        // Replace temp with real
        setNotes((prev) =>
          prev.map((n) => (n.id === tempId ? (result.data as unknown as Note) : n))
        );
        void revalidateContractCaches(contractId);
      } else {
        // Rollback
        setNotes((prev) => prev.filter((n) => n.id !== tempId));
        toast(!result.success ? result.error || "Lỗi thêm ghi chú" : "Lỗi thêm ghi chú", "error");
      }
    } catch {
      setNotes((prev) => prev.filter((n) => n.id !== tempId));
      toast("Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  }, [newNote, contractId, loading]);

  const handleDelete = useCallback(
    async (noteId: string) => {
      if (noteId.startsWith("temp-")) return;
      setNotes((prev) => prev.filter((n) => n.id !== noteId));

      const result = await deleteContractNote(noteId, contractId);
      if (!result.success) {
        toast("Lỗi xóa ghi chú", "error");
        // Refetch on error
        const refetch = await getContractNotes(contractId);
        if (refetch.success && refetch.data) {
          setNotes(refetch.data as unknown as Note[]);
        }
      } else {
        void revalidateContractCaches(contractId);
      }
    },
    [contractId]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  return (
    <div className="card-base p-4 lg:p-5">
      {/* Header — click to expand */}
      <Button unstyled
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">
            Ghi chú
          </h3>
        </div>
        <span className="text-caption text-text-muted">
          {expanded ? "Thu gọn ▲" : `${notes.length > 0 ? notes.length + " ghi chú" : "Mở rộng"} ▼`}
        </span>
      </Button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3">
          {/* Notes list */}
          <div
            ref={scrollRef}
            className="max-h-64 overflow-y-auto space-y-2 mb-3"
          >
            {notes.length === 0 ? (
              <p className="text-caption text-text-muted text-center py-4">
                Chưa có ghi chú nào
              </p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className={`group p-3 rounded-md transition-all ${
                    note.id.startsWith("temp-")
                      ? "bg-primary/5 opacity-60"
                      : "bg-bg-hover"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-body-sm text-text-primary whitespace-pre-wrap flex-1">
                      {note.content}
                    </p>
                    {!note.id.startsWith("temp-") && (
                      <Button unstyled
                        onClick={() => handleDelete(note.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity
                                   btn-icon shrink-0 text-error"
                      >
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {note.employees?.full_name && (
                      <span className="font-medium text-text-secondary">
                        {note.employees.full_name}
                        {" · "}
                      </span>
                    )}
                    {new Date(note.created_at).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input unstyled
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập ghi chú..."
              className="input-base flex-1"
              autoFocus
            />
            <Button unstyled
              onClick={handleAdd}
              disabled={!newNote.trim() || loading}
              className="btn btn-primary px-3 disabled:opacity-50"
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
