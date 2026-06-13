"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, Loader2, ReceiptText } from "lucide-react";
import { formatCurrency, formatDate, CURRENCY_SYMBOL } from "@/lib/utils";
import { reactivateContract } from "@/app/actions/contract-lifecycle";
import {
  createContractRefundExpense,
  getContractRefundSummary,
} from "@/app/actions/contract-refund-actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import {
  invalidateDressAfterWrite,
  invalidateFinanceAfterWrite,
  invalidatePrintingAfterWrite,
} from "@/lib/cache-invalidation";
import { revalidateContractCaches } from "@/lib/hooks/use-contract-queries";
import { getTodayInTimeZone } from "@/lib/studio-date";
import { toast } from "@/lib/toast-utils";

// ═══════════════════════════════════════════
// Cancel Banner — Warning when contract is cancelled
// Phase 08: + Reactivate button
// ═══════════════════════════════════════════

interface Props {
  contractId: string;
  paidAmount: number;
  notes: string | null;
  updatedAt: string;
}

interface RefundSummary {
  contractCode: string;
  customerName: string;
  paidAmount: number;
  refundedAmount: number;
  refundableAmount: number;
}

import { PAYMENT_METHOD_OPTIONS } from "@/types/contract-constants";


export default function CancelBanner({ contractId, paidAmount, notes, updatedAt }: Props) {
  const [isReactivating, setIsReactivating] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [summary, setSummary] = useState<RefundSummary | null>(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundDate, setRefundDate] = useState(getTodayInTimeZone());
  const [paymentMethod, setPaymentMethod] = useState<"tien_mat" | "chuyen_khoan">("chuyen_khoan");
  const [recipient, setRecipient] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  async function handleReactivate() {
    if (!confirm("Bạn có chắc muốn kích hoạt lại hợp đồng này?")) return;
    setIsReactivating(true);
    try {
      const result = await reactivateContract(contractId);
      if (!result.success) {
        alert(result.error);
      } else {
        await Promise.all([
          revalidateContractCaches(contractId),
          invalidateFinanceAfterWrite(),
          invalidateDressAfterWrite(),
          invalidatePrintingAfterWrite(),
        ]);
      }
    } catch {
      alert("Lỗi kích hoạt lại hợp đồng");
    } finally {
      setIsReactivating(false);
    }
  }

  const resetRefundForm = useCallback(() => {
    setRefundAmount(0);
    setRefundDate(getTodayInTimeZone());
    setPaymentMethod("chuyen_khoan");
    setRecipient("");
    setRefundNotes("");
  }, []);

  const closeRefundModal = useCallback(() => {
    setShowRefund(false);
    setSummary(null);
    resetRefundForm();
  }, [resetRefundForm]);

  useEffect(() => {
    if (!showRefund) return;

    // Fetch trigger: this setState precedes an async fetch, not a synchronous
    // cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingSummary(true);
    void getContractRefundSummary(contractId)
      .then((result) => {
        if (!result.success) {
          toast(result.error || "Không tải được dữ liệu hoàn tiền", "error");
          return;
        }

        setSummary(result.data);
        setRefundAmount(result.data.refundableAmount);
        setRecipient(result.data.customerName);
      })
      .catch((error) => {
        toast(error instanceof Error ? error.message : "Không tải được dữ liệu hoàn tiền", "error");
      })
      .finally(() => setIsLoadingSummary(false));
  }, [contractId, showRefund]);

  const handleCreateRefund = useCallback(async () => {
    if (!summary) {
      toast("Chưa tải được dữ liệu hoàn tiền", "warning");
      return;
    }
    if (refundAmount <= 0) {
      toast("Số tiền hoàn phải lớn hơn 0", "warning");
      return;
    }
    if (refundAmount > summary.refundableAmount) {
      toast("Số tiền hoàn vượt quá số tiền còn có thể hoàn", "warning");
      return;
    }

    setIsRefunding(true);
    try {
      const result = await createContractRefundExpense({
        contractId,
        amount: refundAmount,
        refundDate,
        paymentMethod,
        recipient,
        notes: refundNotes,
      });

      if (!result.success) {
        toast(result.error || "Không tạo được phiếu chi hoàn tiền", "error");
        return;
      }

      toast("Đã tạo phiếu chi hoàn tiền", "success");
      await Promise.all([
        revalidateContractCaches(contractId),
        invalidateFinanceAfterWrite(),
      ]);
      closeRefundModal();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không tạo được phiếu chi hoàn tiền", "error");
    } finally {
      setIsRefunding(false);
    }
  }, [
    closeRefundModal,
    contractId,
    paymentMethod,
    recipient,
    refundAmount,
    refundDate,
    refundNotes,
    summary,
  ]);

  return (
    <>
      <div
        className="flex items-start gap-3 p-4 rounded-xl
                   bg-error/10 shadow-sm"
        role="alert"
      >
        <div className="shrink-0 p-2 rounded-md bg-error/15">
          <AlertTriangle size={20} className="text-error" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-sm font-bold text-error">
            Hợp đồng đã bị hủy
          </p>
          {notes && (
            <p className="text-caption text-error/80 mt-0.5">
              Lý do: {notes}
            </p>
          )}
          <p className="text-caption text-error/60 mt-1">
            Cập nhật: {formatDate(updatedAt, "long")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {paidAmount > 0 && (
            <Button
              unstyled
              onClick={() => setShowRefund(true)}
              className="flex items-center gap-1.5 rounded-radius-md bg-warning/15 px-3 py-1.5 text-caption font-medium text-warning transition-colors hover:bg-warning/20"
            >
              <ReceiptText size={14} />
              Hoàn tiền
            </Button>
          )}
          <Button
            unstyled
            onClick={handleReactivate}
            disabled={isReactivating}
            className="flex items-center gap-1.5 rounded-radius-md bg-error/15 px-3 py-1.5 text-caption font-medium text-error hover:bg-error/20 disabled:opacity-50 transition-colors"
          >
            {isReactivating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RotateCcw size={14} />
            )}
            Kích hoạt lại
          </Button>
        </div>
      </div>

      <UnifiedModal
        isOpen={showRefund}
        onClose={closeRefundModal}
        title="Tạo phiếu chi hoàn tiền"
        description={summary?.contractCode || ""}
        size="lg"
      >
        {isLoadingSummary ? (
          <div className="flex items-center gap-2 py-8 text-body-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải dữ liệu hoàn tiền...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-bg-hover p-3 text-body-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-text-secondary">Đã thu</span>
                <span className="font-semibold text-text-primary">
                  {formatCurrency(summary?.paidAmount || 0)} {CURRENCY_SYMBOL}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-text-secondary">Đã hoàn</span>
                <span className="font-semibold text-text-primary">
                  {formatCurrency(summary?.refundedAmount || 0)} {CURRENCY_SYMBOL}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-2">
                <span className="font-semibold text-text-primary">Còn có thể hoàn</span>
                <span className="font-bold text-warning">
                  {formatCurrency(summary?.refundableAmount || 0)} {CURRENCY_SYMBOL}
                </span>
              </div>
            </div>

            <div className="form-grid-2col">
              <div>
                <label className="label-base mb-1 block">Số tiền hoàn *</label>
                <CurrencyInput
                  value={refundAmount}
                  onChange={setRefundAmount}
                  emptyWhenZero
                  className="h-11 text-base"
                />
              </div>
              <DatePicker
                label="Ngày chi"
                value={refundDate}
                onChange={setRefundDate}
              />
            </div>

            <div className="form-grid-2col">
              <SimpleSelect
                label="Hình thức"
                value={paymentMethod}
                onChange={(value) => setPaymentMethod(value as "tien_mat" | "chuyen_khoan")}
                options={PAYMENT_METHOD_OPTIONS}
              />
              <Input
                label="Người nhận"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
              />
            </div>

            <div>
              <label className="label-base mb-1 block">Ghi chú</label>
              <Textarea
                value={refundNotes}
                onChange={(event) => setRefundNotes(event.target.value)}
                placeholder="VD: Hoàn cọc do khách hủy hợp đồng"
                className="h-20 resize-none text-base"
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={closeRefundModal}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateRefund}
            disabled={
              isLoadingSummary ||
              isRefunding ||
              !summary ||
              refundAmount <= 0 ||
              refundAmount > (summary?.refundableAmount || 0)
            }
          >
            {isRefunding ? "Đang tạo..." : "Tạo phiếu chi"}
          </Button>
        </div>
      </UnifiedModal>
    </>
  );
}
