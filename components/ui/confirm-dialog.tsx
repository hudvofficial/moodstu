"use client";

import { useState } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

// ═══════════════════════════════════════════
// ConfirmDialog — Shared confirmation modal
// Used for: delete items, dangerous actions
// ═══════════════════════════════════════════

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | boolean | Promise<void | boolean>;
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
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmVariant = variant === "danger" ? "danger" : "interactive";

  async function handleConfirm() {
    if (isConfirming) return;
    setIsConfirming(true);
    try {
      const shouldClose = await onConfirm();
      if (shouldClose !== false) onClose();
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-sm bg-error/10 p-2">
            <AlertTriangle className="h-5 w-5 text-error" />
          </div>
          <p className="text-body-sm text-text-secondary">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            variant="ghost"
            className="text-body-sm"
            data-testid="confirm-dialog-cancel"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            variant={confirmVariant}
            className="text-body-sm"
            data-testid="confirm-dialog-confirm"
          >
            {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isConfirming ? "Đang xử lý..." : confirmLabel}
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}
