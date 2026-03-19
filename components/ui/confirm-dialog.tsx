"use client";

import { UnifiedModal } from "@/components/ui/unified-modal";
import { AlertTriangle } from "lucide-react";

// ═══════════════════════════════════════════
// ConfirmDialog — Shared confirmation modal
// Used for: delete items, dangerous actions
// ═══════════════════════════════════════════

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  variant = "danger",
}: Props) {
  const confirmClass =
    variant === "danger"
      ? "btn btn-danger"
      : variant === "warning"
        ? "btn btn-warning"
        : "btn btn-interactive";

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-radius-sm bg-error/10 p-2">
            <AlertTriangle className="h-5 w-5 text-error" />
          </div>
          <p className="text-body-sm text-text-secondary">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost text-body-sm"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`${confirmClass} text-body-sm`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </UnifiedModal>
  );
}
