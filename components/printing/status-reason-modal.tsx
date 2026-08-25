"use client";

import { useState } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/**
 * Modal nhập lý do bắt buộc khi đổi trạng thái đơn in sang "Gặp sự cố"/"Hủy đơn"
 * hoặc lùi bước (xem printingStatusRequiresReason, types/printing-constants.ts).
 * SSOT UI cho cả /printing (printing-list-page.tsx) và /contracts/[id]
 * (print-orders-block.tsx) — trước đây chỉ trang hợp đồng có, /printing không có
 * gì nên server từ chối thẳng (T-20260825 review, ADR-015).
 */
export function StatusReasonModal({ isOpen, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    setReason("");
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nhập lý do thay đổi trạng thái"
      description="Bắt buộc khi báo sự cố, hủy đơn, hoặc chuyển lùi quy trình."
      size="md"
      footer={(
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>Hủy</Button>
          <Button type="button" onClick={handleConfirm} disabled={!reason.trim()}>Xác nhận</Button>
        </div>
      )}
    >
      <Textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="VD: In sai màu, khách đổi yêu cầu, thao tác nhầm cần quay lại..."
        rows={4}
        autoFocus
      />
    </UnifiedModal>
  );
}
