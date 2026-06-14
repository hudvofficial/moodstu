"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import useSWR from "swr";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { Textarea } from "@/components/ui/textarea";
import { TabsFilter } from "@/components/ui/tabs-filter";
import DatePicker from "@/components/ui/date-picker";
import { toast } from "sonner";
import { recordVendorPayment } from "@/app/actions/vendor-payment-actions";
import { fetchVendorUnpaidTasks } from "@/app/actions/vendor-payment-actions";
import type { VendorUnpaidTask } from "@/types/vendor";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, AlertCircle, Check } from "lucide-react";

const EMPTY_TASKS: VendorUnpaidTask[] = [];

interface VendorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId?: string;
  vendorName?: string;
  onSuccess?: () => void;
}

interface AllocationItem {
  work_task_id: string;
  amount: number;
}

type SelectionMode = "fifo" | "manual";
type PaymentMethod = "tien_mat" | "chuyen_khoan" | "the" | "khac";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "tien_mat", label: "Tiền mặt" },
  { value: "chuyen_khoan", label: "Chuyển khoản" },
  { value: "the", label: "Thẻ" },
  { value: "khac", label: "Khác" },
];

const ICON_SIZE = "w-4 h-4";

export function VendorPaymentModal({
  isOpen,
  onClose,
  vendorId,
  vendorName,
  onSuccess,
}: VendorPaymentModalProps) {
  const [isPending, startTransition] = useTransition();

  // Helper to get TODAY's date
  const getTodayDate = () => new Date().toISOString().split("T")[0];

  // Form state
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("chuyen_khoan");
  const [paymentDate, setPaymentDate] = useState<string>(getTodayDate());
  const [note, setNote] = useState<string>("");
  const [showAllocationDetails, setShowAllocationDetails] = useState(false);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("fifo");
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Reset form when modal opens (Adjust state on render to avoid cascading updates)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setAmount(0);
      setPaymentMethod("chuyen_khoan");
      setPaymentDate(getTodayDate());
      setNote("");
      setShowAllocationDetails(false);
      setSelectionMode("fifo");
      setSelectedTaskIds(new Set());
    }
  }

  // Fetch unpaid tasks for this vendor
  const { data: tasksResult, isLoading } = useSWR(
    vendorId ? ["vendor-unpaid-tasks", vendorId] : null,
    () => fetchVendorUnpaidTasks(vendorId!),
    { revalidateOnMount: true }
  );

  const unpaidTasks: VendorUnpaidTask[] = tasksResult?.success ? tasksResult.data : EMPTY_TASKS;
  const totalDebt = unpaidTasks.reduce((sum, t) => sum + t.remaining, 0);

  // Calculate selected tasks total (for manual mode)
  const selectedTasksTotal = useMemo(() => {
    return unpaidTasks
      .filter((t) => selectedTaskIds.has(t.id))
      .reduce((sum, t) => sum + t.remaining, 0);
  }, [unpaidTasks, selectedTaskIds]);

  // FIFO allocation preview
  const fifoAllocation = useMemo(() => {
    if (selectionMode !== "fifo" || amount <= 0) return [];

    const allocations: AllocationItem[] = [];
    let remainingPayment = amount;

    // Sort by deadline (oldest first, NULL deadlines go last - matches backend NULLS LAST)
    const sortedTasks = [...unpaidTasks].sort((a, b) => {
      // NULL deadlines go to the end (same as backend NULLS LAST)
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;

      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    for (const task of sortedTasks) {
      if (remainingPayment <= 0) break;

      const allocationAmount = Math.min(task.remaining, remainingPayment);
      if (allocationAmount > 0) {
        allocations.push({
          work_task_id: task.id,
          amount: allocationAmount,
        });
        remainingPayment -= allocationAmount;
      }
    }

    return allocations;
  }, [amount, selectionMode, unpaidTasks]);

  // Manual allocation list
  const manualAllocation = useMemo(() => {
    if (selectionMode !== "manual") return [];

    return unpaidTasks
      .filter((t) => selectedTaskIds.has(t.id))
      .map((t) => ({
        work_task_id: t.id,
        amount: t.remaining,
      }));
  }, [selectionMode, unpaidTasks, selectedTaskIds]);

  // Toggle task selection (manual mode)
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      
      // Update amount immediately
      if (selectionMode === "manual") {
        const newTotal = unpaidTasks
          .filter((t) => next.has(t.id))
          .reduce((sum, t) => sum + t.remaining, 0);
        setAmount(newTotal);
      }
      
      return next;
    });
  };

  const handleModeChange = (val: SelectionMode) => {
    setSelectionMode(val);
    if (val === "manual" && selectedTaskIds.size > 0) {
      setAmount(selectedTasksTotal);
    }
  };

  // Handle submit
  const handleSubmit = () => {
    if (!vendorId) {
      toast.error("Vui lòng chọn vendor");
      return;
    }

    if (amount <= 0) {
      toast.error("Số tiền thanh toán phải lớn hơn 0");
      return;
    }

    if (amount > totalDebt) {
      toast.error("Số tiền vượt quá công nợ hiện tại");
      return;
    }

    // Prepare allocations
    const allocations =
      selectionMode === "fifo"
        ? fifoAllocation
        : selectionMode === "manual"
          ? manualAllocation
          : undefined;

    // Validate manual mode
    if (selectionMode === "manual") {
      if (selectedTaskIds.size === 0) {
        toast.error("Vui lòng chọn ít nhất 1 task để thanh toán");
        return;
      }

      // Validate amount matches selected tasks total
      if (amount !== selectedTasksTotal) {
        toast.error(
          `Số tiền phải bằng tổng tasks đã chọn (${formatCurrency(selectedTasksTotal)}${CURRENCY_SYMBOL})`
        );
        return;
      }
    }

    startTransition(async () => {
      const result = await recordVendorPayment({
        vendor_id: vendorId,
        amount,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        note: note || undefined,
        allocations: allocations && allocations.length > 0 ? allocations : undefined,
      });

      if (result.success) {
        toast.success(
          `Đã thanh toán ${formatCurrency(result.data.allocated_amount)}đ cho ${vendorName || "vendor"}`
        );
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error || "Không thể ghi nhận thanh toán");
      }
    });
  };

  // Format work type
  const formatWorkType = (type: string) => {
    const map: Record<string, string> = {
      chup_anh: "Chụp ảnh",
      quay_phim: "Quay phim",
      makeup: "Trang điểm",
      hau_ky_anh: "Hậu kỳ ảnh",
      hau_ky_phim: "Hậu kỳ phim",
    };
    return map[type] || type;
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Thanh toán ${vendorName || "Vendor"}`}
      description="Ghi nhận thanh toán cho vendor"
      size="lg"
    >
      <div className="space-y-4">
        {/* Debt Summary */}
        <div className="card-base bg-bg-subtle p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-body-sm text-text-muted">Tổng công nợ:</span>
            <span className="text-h3 font-bold text-error tabular-nums">
              {formatCurrency(totalDebt)} {CURRENCY_SYMBOL}
            </span>
          </div>
          <div className="text-caption text-text-muted">{unpaidTasks.length} tasks chưa thanh toán</div>
        </div>

        {/* Amount */}
        <div>
          <label className="mb-1.5 block text-body-sm font-medium text-text-primary">
            Số tiền thanh toán <span className="text-error">*</span>
          </label>
          <CurrencyInput
            value={amount}
            onChange={setAmount}
            placeholder="Nhập số tiền..."
            disabled={isPending}
          />
          {amount > totalDebt && (
            <div className="mt-1.5 flex items-start gap-1.5 text-caption text-warning">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>Số tiền vượt quá công nợ hiện tại</span>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label className="mb-1.5 block text-body-sm font-medium text-text-primary">
            Phương thức thanh toán <span className="text-error">*</span>
          </label>
          <SelectForm
            options={PAYMENT_METHODS}
            value={paymentMethod}
            onChange={(val) => setPaymentMethod(val as PaymentMethod)}
            placeholder="Chọn phương thức"
            disabled={isPending}
          />
        </div>

        {/* Payment Date */}
        <div>
          <label className="mb-1.5 block text-body-sm font-medium text-text-primary">
            Ngày thanh toán <span className="text-error">*</span>
          </label>
          <DatePicker value={paymentDate} onChange={setPaymentDate} />
        </div>

        {/* Note */}
        <div>
          <label className="mb-1.5 block text-body-sm font-medium text-text-primary">Ghi chú</label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú về thanh toán..."
            disabled={isPending}
            rows={2}
          />
        </div>

        {/* Allocation Mode */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-body-sm font-medium text-text-primary">Phân bổ thanh toán</label>
            <Button unstyled
              type="button"
              onClick={() => setShowAllocationDetails(!showAllocationDetails)}
              className="flex items-center gap-1 text-caption text-interactive hover:underline"
            >
              {showAllocationDetails ? (
                <>
                  <ChevronUp className={ICON_SIZE} />
                  Ẩn chi tiết
                </>
              ) : (
                <>
                  <ChevronDown className={ICON_SIZE} />
                  Xem chi tiết
                </>
              )}
            </Button>
          </div>

          <TabsFilter
            activeTab={selectionMode}
            onChange={(val) => handleModeChange(val as SelectionMode)}
            tabs={[
              { value: "fifo", label: "FIFO (Tự động)" },
              { value: "manual", label: "Thủ công" },
            ]}
            variant="tabs"
          />

          {showAllocationDetails && amount > 0 && (
            <div className="mt-3 space-y-2">
              {selectionMode === "fifo" && (
                <div className="card-base bg-bg-subtle p-3 space-y-2">
                  <div className="text-caption font-medium text-text-primary">
                    Phân bổ tự động (Tasks cũ nhất trước):
                  </div>
                  {fifoAllocation.map((alloc, idx) => {
                    const task = unpaidTasks.find((t) => t.id === alloc.work_task_id);
                    return (
                      <div key={idx} className="flex items-center justify-between text-caption">
                        <span className="text-text-muted">
                          {task?.contract_code || "N/A"} - {formatWorkType(task?.work_type || "")}
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatCurrency(alloc.amount)} {CURRENCY_SYMBOL}
                        </span>
                      </div>
                    );
                  })}
                  {fifoAllocation.length === 0 && (
                    <div className="text-caption text-text-muted">Nhập số tiền để xem phân bổ</div>
                  )}
                </div>
              )}

              {selectionMode === "manual" && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {unpaidTasks.map((task) => {
                    const isSelected = selectedTaskIds.has(task.id);
                    return (
                      <Button unstyled
                        key={task.id}
                        type="button"
                        onClick={() => toggleTaskSelection(task.id)}
                        className={cn(
                          "w-full card-base p-3 text-left transition-colors hover:bg-bg-hover block",
                          isSelected && "ring-2 ring-interactive"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-body-sm font-medium text-text-primary">
                              {task.contract_code || "N/A"} - {formatWorkType(task.work_type)}
                            </div>
                            <div className="text-caption text-text-muted">
                              Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString("vi-VN") : "-"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-body-sm font-bold tabular-nums">
                              {formatCurrency(task.remaining)} {CURRENCY_SYMBOL}
                            </span>
                            {isSelected && <Check className="h-5 w-5 text-interactive" />}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                  {unpaidTasks.length === 0 && (
                    <div className="card-base p-4 text-center text-caption text-text-muted">
                      Không có task nào cần thanh toán
                    </div>
                  )}
                </div>
              )}

              {selectionMode === "manual" && selectedTaskIds.size > 0 && (
                <div className="card-base bg-success/10 p-3 text-caption">
                  <span className="text-text-muted">Đã chọn {selectedTaskIds.size} tasks, tổng: </span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(selectedTasksTotal)} {CURRENCY_SYMBOL}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending} className="flex-1">
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || amount <= 0 || isLoading || amount > totalDebt} className="flex-1">
            {isPending ? "Đang xử lý..." : "Thanh toán"}
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}
