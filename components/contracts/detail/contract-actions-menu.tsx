"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Ban, Trash2, AlertTriangle } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { cancelContract, deleteContract } from "@/app/actions/contract-lifecycle";
import { revalidateContractCaches } from "@/lib/hooks/use-contracts";
import { toast } from "@/lib/toast-utils";

// ═══════════════════════════════════════════
// Contract Actions Menu — Cancel + Delete
// Phase 01A: V1 ContractCancelDeleteActions → V2
// Uses: UnifiedModal (shared), server actions, SWR invalidate
// ═══════════════════════════════════════════

interface Props {
  contractId: string;
  contractCode: string;
  customerName: string;
  hasReceipts: boolean;
  isCancelled: boolean;
}

export default function ContractActionsMenu({
  contractId,
  contractCode,
  customerName,
  hasReceipts,
  isCancelled,
}: Props) {
  const router = useRouter();

  // ── Modal state ──
  const [showCancel, setShowCancel] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Cancel handler ──
  const handleCancel = useCallback(async () => {
    if (!cancelReason.trim()) return;
    setLoading(true);
    try {
      const result = await cancelContract(contractId, cancelReason.trim());
      if (result.success) {
        toast("Đã hủy hợp đồng thành công", "success");
        setShowCancel(false);
        setCancelReason("");
        await revalidateContractCaches(contractId);
        router.refresh();
      } else {
        toast(result.error || "Lỗi hủy hợp đồng", "error");
      }
    } catch {
      toast("Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  }, [contractId, cancelReason, router]);

  // ── Delete handler ──
  const handleDelete = useCallback(async () => {
    if (confirmCode !== contractCode) return;
    setLoading(true);
    try {
      const result = await deleteContract(contractId);
      if (result.success) {
        toast("Đã xóa hợp đồng", "success");
        router.push("/contracts");
      } else {
        toast(result.error || "Lỗi xóa hợp đồng", "error");
      }
    } catch {
      toast("Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  }, [contractId, contractCode, confirmCode, router]);

  if (isCancelled) return null;

  return (
    <>
      {/* ── Trigger Buttons (rendered by parent) ── */}
      <div className="flex items-center gap-1">
        {/* Cancel */}
        <button
          onClick={() => setShowCancel(true)}
          className="btn-outline text-warning hover:text-warning"
        >
          <Ban size={14} />
          <span className="max-lg:hidden">Huỷ HĐ</span>
        </button>

        {/* Delete — only if no receipts */}
        {!hasReceipts && (
          <button
            onClick={() => setShowDelete(true)}
            className="btn-outline text-error hover:text-error"
          >
            <Trash2 size={14} />
            <span className="max-lg:hidden">Xoá</span>
          </button>
        )}
      </div>

      {/* ══════════ CANCEL MODAL ══════════ */}
      <UnifiedModal
        isOpen={showCancel}
        onClose={() => { setShowCancel(false); setCancelReason(""); }}
        title="Huỷ hợp đồng"
        description={`${contractCode} — ${customerName}`}
      >
        {/* Warning */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 mb-4">
          <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" />
          <p className="text-body-sm text-text-secondary">
            Công việc chưa hoàn thành, đơn in, lịch thanh toán sẽ <strong>tự động hủy</strong> theo.
          </p>
        </div>

        {/* Reason */}
        <label className="label-base mb-2 block">Lý do hủy *</label>
        <textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="VD: Khách huỷ do thay đổi kế hoạch..."
          rows={3}
          className="input-base w-full resize-none"
          autoFocus
        />

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { setShowCancel(false); setCancelReason(""); }}
            className="btn-outline flex-1"
          >
            Đóng
          </button>
          <button
            onClick={handleCancel}
            disabled={!cancelReason.trim() || loading}
            className="btn-primary flex-1 bg-warning! hover:bg-warning/90!
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang xử lý..." : "Xác nhận huỷ"}
          </button>
        </div>
      </UnifiedModal>

      {/* ══════════ DELETE MODAL ══════════ */}
      <UnifiedModal
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setConfirmCode(""); }}
        title="Xoá hợp đồng"
        description={`${contractCode} — ${customerName}`}
      >
        {/* Danger warning */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-error/10 mb-4">
          <AlertTriangle size={20} className="text-error shrink-0 mt-0.5" />
          <div className="text-body-sm text-text-secondary">
            <strong className="text-error">Không thể hoàn tác</strong> — toàn bộ dữ liệu hợp đồng,
            sự kiện, công việc sẽ bị xoá vĩnh viễn.
          </div>
        </div>

        {/* Confirm code input */}
        <label className="label-base mb-2 block">
          Nhập mã <strong>{contractCode}</strong> để xác nhận
        </label>
        <input
          type="text"
          value={confirmCode}
          onChange={(e) => setConfirmCode(e.target.value)}
          placeholder={contractCode}
          className="input-base w-full"
          autoFocus
        />

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { setShowDelete(false); setConfirmCode(""); }}
            className="btn-outline flex-1"
          >
            Đóng
          </button>
          <button
            onClick={handleDelete}
            disabled={confirmCode !== contractCode || loading}
            className="btn-primary flex-1 bg-error! hover:bg-error/90!
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang xử lý..." : "Xoá vĩnh viễn"}
          </button>
        </div>
      </UnifiedModal>
    </>
  );
}
