"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addContractNote } from "@/app/actions/note-actions";
import { revalidateContractCaches } from "@/lib/hooks/use-contracts";

// ═══════════════════════════════════════════
// QuickNoteModal — Add a note quickly from Quick Actions
// SSOT: UnifiedModal, .input-base
// ═══════════════════════════════════════════

interface Props {
  isOpen: boolean;
  contractId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function QuickNoteModal({
  isOpen,
  contractId,
  onClose,
  onSaved,
}: Props) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setNotes("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!notes.trim()) {
      toast.error("Vui lòng nhập nội dung ghi chú");
      return;
    }

    setSubmitting(true);
    try {
      const result = await addContractNote(contractId, notes.trim());

      if (!result.success) throw new Error(result.error);

      toast.success("Đã thêm ghi chú");
      await revalidateContractCaches(contractId);
      resetForm();
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi thêm ghi chú");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Footer ──────────────────────────────
  const footer = (
    <div className="flex items-center justify-end gap-2 w-full">
      <Button unstyled onClick={handleClose} className="btn btn-secondary" disabled={submitting}>
        Hủy
      </Button>
      <Button unstyled
        onClick={handleSubmit}
        disabled={submitting || !notes.trim()}
        className="btn btn-primary"
      >
        {submitting ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Đang lưu...
          </>
        ) : (
          <>
            <Send size={14} />
            Lưu ghi chú
          </>
        )}
      </Button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Thêm ghi chú"
      footer={footer}
      size="sm"
    >
      <div className="space-y-4">
        <div>
          <Textarea unstyled
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Nhập ghi chú cho hợp đồng này..."
            className="input-base min-h-24 resize-none"
            autoFocus
          />
        </div>
      </div>
    </UnifiedModal>
  );
}
