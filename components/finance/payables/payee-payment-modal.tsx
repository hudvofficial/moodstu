"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { fetchPayableItems, recordPayeePayment } from "@/app/actions/payable-actions";
import { formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { getTodayInTimeZone } from "@/lib/studio-date";
import { useSWR } from "@/lib/swr";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/types/action-result";
import { PAYEE_TYPE_LABEL, type PayableItem, type PayeeType } from "@/types/payables";

// ADR-016 M2 — MỘT modal trả tiền cho mọi đối tác ngoài (lab / thợ ngoài / NCC phôi).
// Khoản phải trả đến từ payable_items(); phiếu chi ghi qua record_payee_payment_atomic.

export interface PayeeRef {
  payee_type: PayeeType;
  payee_id: string;
  payee_name: string;
}

interface PayeePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payee: PayeeRef | null;
  onSuccess?: () => void;
}

type SelectionMode = "fifo" | "manual";
type PaymentMethod = "tien_mat" | "chuyen_khoan";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "chuyen_khoan", label: "Chuyển khoản" },
  { value: "tien_mat", label: "Tiền mặt" },
];

const EMPTY_ITEMS: PayableItem[] = [];
const ICON_SIZE = "w-4 h-4";

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function PayeePaymentModal({ isOpen, onClose, payee, onSuccess }: PayeePaymentModalProps) {
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("chuyen_khoan");
  const [paymentDate, setPaymentDate] = useState(() => getTodayInTimeZone());
  const [note, setNote] = useState("");
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("fifo");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);

  // Reset form mỗi lần mở (điều chỉnh state trong render — không useEffect+setState)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setAmount(0);
      setPaymentMethod("chuyen_khoan");
      setPaymentDate(getTodayInTimeZone());
      setNote("");
      setSelectionMode("fifo");
      setSelectedIds(new Set());
      setShowDetails(false);
    }
  }

  // Không dùng `payee!.x` trong closure: React Compiler hoist thuộc tính thành dependency memo
  // → đọc `.payee_id` của null ngay lúc render đầu (đã cháy 26/08). Tách giá trị bằng optional chaining.
  const payeeType = payee?.payee_type ?? null;
  const payeeId = payee?.payee_id ?? null;
  const { data: items = EMPTY_ITEMS, isLoading } = useSWR(
    isOpen && payeeType && payeeId ? ["payable-items", payeeType, payeeId] : null,
    () => requireData(fetchPayableItems(payeeType as PayeeType, payeeId as string)),
    { revalidateOnMount: true },
  );

  const totalDebt = items.reduce((sum, item) => sum + item.remaining, 0);
  const selectedTotal = useMemo(
    () => items.filter((item) => selectedIds.has(item.target_id)).reduce((sum, item) => sum + item.remaining, 0),
    [items, selectedIds],
  );

  // Phân bổ: FIFO theo thứ tự payable_items (ngày cũ nhất trước) · thủ công theo khoản đã chọn
  const allocation = useMemo(() => {
    if (amount <= 0) return [] as Array<{ target_id: string; amount: number; label: string; remaining: number }>;
    const pool = selectionMode === "manual" ? items.filter((item) => selectedIds.has(item.target_id)) : items;
    let left = amount;
    const result: Array<{ target_id: string; amount: number; label: string; remaining: number }> = [];
    for (const item of pool) {
      if (left <= 0) break;
      const part = Math.min(item.remaining, left);
      if (part > 0) {
        result.push({ target_id: item.target_id, amount: part, label: item.label, remaining: item.remaining });
        left -= part;
      }
    }
    return result;
  }, [amount, items, selectionMode, selectedIds]);

  const cap = selectionMode === "manual" ? selectedTotal : totalDebt;
  const isValid =
    !!payee && amount > 0 && amount <= cap && allocation.length > 0 && (selectionMode !== "manual" || selectedIds.size > 0);

  const toggleItem = (targetId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      // thủ công: số tiền = tổng khoản đã chọn
      setAmount(items.filter((item) => next.has(item.target_id)).reduce((sum, item) => sum + item.remaining, 0));
      return next;
    });
  };

  const handleModeChange = (value: string) => {
    setSelectionMode(value as SelectionMode);
    setSelectedIds(new Set());
    setAmount(0);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!payee) return;
    if (amount <= 0) {
      toast.error("Số tiền thanh toán phải lớn hơn 0");
      return;
    }
    if (amount > cap) {
      toast.error(selectionMode === "manual" ? "Số tiền vượt quá tổng khoản đã chọn" : "Số tiền vượt quá công nợ hiện tại");
      return;
    }
    if (!isValid) {
      toast.error("Vui lòng kiểm tra lại thông tin");
      return;
    }

    startTransition(async () => {
      const result = await recordPayeePayment({
        payee_type: payee.payee_type,
        payee_id: payee.payee_id,
        amount,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        note: note.trim() || undefined,
        allocations: allocation.map((a) => ({ target_id: a.target_id, amount: a.amount })),
      });

      if (!result.success) {
        const message = result.error || "Không thể ghi nhận thanh toán";
        if (message.includes("khoa") || message.includes("khóa")) {
          toast.error("Kỳ kế toán đã khoá. Vui lòng chọn ngày khác.");
        } else {
          toast.error(message);
        }
        return;
      }

      toast.success(
        `Đã lập phiếu chi ${formatVnd(amount)} cho ${payee.payee_name} · ${allocation.length} khoản`,
      );
      onSuccess?.();
      onClose();
    });
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={() => {
        if (!isPending) onClose();
      }}
      title={`Trả ${payee ? PAYEE_TYPE_LABEL[payee.payee_type].toLowerCase() : "đối tác"}: ${payee?.payee_name ?? ""}`}
      description="Phiếu chi thật, phân bổ vào từng khoản còn nợ"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="dashboard-surface space-y-1">
          {isLoading ? (
            <div className="text-sm text-text-muted">Đang tải...</div>
          ) : (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Tổng còn nợ:</span>
                <span className="font-bold text-error tabular-nums">{formatVnd(totalDebt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Số khoản chưa trả:</span>
                <span className="font-semibold">{items.length}</span>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <label className="label-base">Cách chọn khoản thanh toán</label>
          <TabsFilter
            tabs={[
              { value: "fifo", label: "Tự động (cũ nhất trước)" },
              { value: "manual", label: "Chọn thủ công" },
            ]}
            activeTab={selectionMode}
            onChange={handleModeChange}
          />
        </div>

        {selectionMode === "manual" && items.length > 0 && (
          <div className="card-base p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="section-heading">Chọn khoản cần trả</h3>
              <span className="text-xs text-text-muted">
                {selectedIds.size}/{items.length} khoản
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {items.map((item) => {
                const isSelected = selectedIds.has(item.target_id);
                return (
                  <label
                    key={item.target_id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                      isSelected ? "bg-primary/10 border border-primary" : "bg-surface hover:bg-bg-hover border border-transparent",
                    )}
                  >
                    <Checkbox checked={isSelected} onChange={() => toggleItem(item.target_id)} disabled={isPending} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-main truncate">{item.label}</span>
                        <span className="text-xs text-text-muted shrink-0">{formatFinanceDate(item.item_date)}</span>
                      </div>
                      {item.allocated > 0 && (
                        <div className="text-xs text-text-muted mt-1">Đã trả: {formatVnd(item.allocated)}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0 font-semibold text-text-main tabular-nums">{formatVnd(item.remaining)}</div>
                  </label>
                );
              })}
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
                <span className="text-text-secondary">Tổng đã chọn:</span>
                <span className="font-semibold text-text-main tabular-nums">{formatVnd(selectedTotal)}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="label-base">
            Số tiền thanh toán <span className="text-error">*</span>
          </label>
          <CurrencyInput value={amount} onChange={setAmount} placeholder="Nhập số tiền" required disabled={isPending || isLoading} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setAmount(Math.round(cap * 0.5))} disabled={isPending || cap === 0}>
              50%
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setAmount(cap)} disabled={isPending || cap === 0}>
              Tất toán ({formatVnd(cap)})
            </Button>
          </div>
          {amount > cap && cap > 0 && (
            <div className="flex items-center gap-2 text-warning text-sm">
              <AlertCircle className={ICON_SIZE} />
              {selectionMode === "manual" ? "Số tiền vượt quá tổng khoản đã chọn" : "Số tiền vượt quá công nợ"}
            </div>
          )}
          {selectionMode === "manual" && selectedIds.size === 0 && (
            <div className="flex items-center gap-2 text-info text-sm">
              <AlertCircle className={ICON_SIZE} />
              Vui lòng chọn ít nhất một khoản cần trả
            </div>
          )}
        </div>

        {amount > 0 && allocation.length > 0 && (
          <div className="card-base p-3 space-y-2">
            <Button
              unstyled
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="w-full flex items-center justify-between text-sm font-medium text-text-main hover:text-primary transition-colors block"
            >
              <span>Sẽ phân bổ vào {allocation.length} khoản</span>
              {showDetails ? <ChevronUp className={ICON_SIZE} /> : <ChevronDown className={ICON_SIZE} />}
            </Button>
            {showDetails && (
              <div className="space-y-1 pt-2 border-t border-border">
                {allocation.map((a) => (
                  <div key={a.target_id} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary truncate">
                      {a.label}
                      {a.amount >= a.remaining ? (
                        <span className="ml-2 text-success">✓ Đầy đủ</span>
                      ) : (
                        <span className="ml-2 text-warning">Một phần</span>
                      )}
                    </span>
                    <span className="font-medium tabular-nums shrink-0">
                      {formatVnd(a.amount)} / {formatVnd(a.remaining)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="label-base">
            Phương thức thanh toán <span className="text-error">*</span>
          </label>
          <SelectForm
            value={paymentMethod}
            onChange={(value) => setPaymentMethod(value as PaymentMethod)}
            options={PAYMENT_METHODS}
            placeholder="Chọn phương thức"
            disabled={isPending}
          />
        </div>

        <DatePicker label="Ngày thanh toán" value={paymentDate} onChange={setPaymentDate} required placeholder="Chọn ngày thanh toán" />

        <div className="space-y-2">
          <label className="label-base">Ghi chú</label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (tùy chọn)" rows={2} disabled={isPending} />
        </div>

        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={isPending || !isValid || isLoading}>
            {isPending ? "Đang xử lý..." : "Xác nhận thanh toán"}
          </Button>
        </div>
      </form>
    </UnifiedModal>
  );
}
