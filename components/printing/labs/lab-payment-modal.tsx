"use client";

import { useState, useTransition, useMemo, useEffect, useRef, FormEvent } from "react";
import useSWR, { mutate } from "swr";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { TabsFilter } from "@/components/ui/tabs-filter";
import DatePicker from "@/components/ui/date-picker";
import { toast } from "sonner";
import { recordLabPayment } from "@/app/actions/lab-mutations";
import { fetchLabUnpaidOrders } from "@/app/actions/lab-queries";
import type { LabUnpaidOrder, PaymentMethod } from "@/types/printing";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

const EMPTY_ORDERS: LabUnpaidOrder[] = [];

interface LabPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  labId?: string;                    // Pre-selected lab
  labName?: string;                  // For display
  /** Đơn cụ thể vừa mở modal này — nếu có, tự chọn thủ công + tick sẵn đúng đơn. */
  focusOrderId?: string;
  onSuccess?: () => void;
}

interface AllocationItem {
  printing_order_id: string;
  amount: number;
}

type SelectionMode = "manual" | "fifo";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
  { value: "card", label: "Thẻ" },
  { value: "other", label: "Khác" },
];

// Icon size constants for consistency
const ICON_SIZE = "w-4 h-4";

export function LabPaymentModal({
  isOpen,
  onClose,
  labId,
  labName,
  focusOrderId,
  onSuccess,
}: LabPaymentModalProps) {
  const [isPending, startTransition] = useTransition();
  // Đã áp dụng focusOrderId cho lần mở hiện tại chưa — chỉ thử 1 lần/lần mở,
  // tránh SWR revalidate sau đó ghi đè lựa chọn tay của admin.
  const appliedFocusRef = useRef(false);

  // Helper to get TODAY's date in YYYY-MM-DD format
  const getTodayDate = () => new Date().toISOString().split("T")[0];

  // Form state - Initialize with TODAY
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState<string>(getTodayDate());
  const [notes, setNotes] = useState<string>("");
  const [showAllocationDetails, setShowAllocationDetails] = useState(false);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("fifo");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Reset form state when modal opens
  // KEY FIX: Only depend on isOpen transitioning to true, not labId
  // This ensures reset happens EVERY time modal opens, even with same lab
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      // CRITICAL: Reset all form fields to initial state with FRESH TODAY date
      const today = getTodayDate(); // Get TODAY from system, not cached value
      setAmount(0);
      setPaymentMethod("cash");
      setPaymentDate(today); // ALWAYS sync with system date
      setNotes("");
      setShowAllocationDetails(false);
      setSelectionMode("fifo");
      setSelectedOrderIds(new Set());
      appliedFocusRef.current = false;
    }
  }

  // Fetch unpaid orders for this lab
  const { data: ordersResult, isLoading, mutate } = useSWR(
    labId ? ["lab-unpaid-orders", labId] : null,
    () => fetchLabUnpaidOrders(labId!),
    { revalidateOnMount: true }
  );

  const unpaidOrders: LabUnpaidOrder[] = ordersResult?.success ? ordersResult.data : EMPTY_ORDERS;
  const totalDebt = unpaidOrders.reduce((sum, o) => sum + o.remainingAmount, 0);

  // Tự chọn đúng đơn khi mở modal từ 1 đơn cụ thể (T-20260824-lab-payment-entry-points).
  // Chờ unpaidOrders load xong mới tra remainingAmount THẬT (không suy từ order.totalAmount
  // — đơn có thể đã được trả một phần trước đó qua lần thanh toán khác).
  useEffect(() => {
    if (!isOpen || !focusOrderId || appliedFocusRef.current || isLoading) return;
    const target = unpaidOrders.find((o) => o.id === focusOrderId);
    appliedFocusRef.current = true; // dù có tìm thấy hay không, chỉ thử 1 lần/lần mở
    if (!target) return; // đơn đã trả xong từ trước hoặc không thuộc lab này — giữ FIFO mặc định
    setSelectionMode("manual");
    setSelectedOrderIds(new Set([focusOrderId]));
    setAmount(target.remainingAmount);
  }, [isOpen, focusOrderId, unpaidOrders, isLoading]);

  // Calculate selected orders total (for manual mode)
  const selectedOrdersTotal = useMemo(() => {
    return unpaidOrders
      .filter(o => selectedOrderIds.has(o.id))
      .reduce((sum, o) => sum + o.remainingAmount, 0);
  }, [unpaidOrders, selectedOrderIds]);

  // Toggle order selection
  const toggleOrderSelection = (orderId: string) => {
    const newSelection = new Set(selectedOrderIds);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrderIds(newSelection);

    // Auto-update amount when in manual mode
    if (selectionMode === "manual") {
      const newTotal = unpaidOrders
        .filter(o => newSelection.has(o.id))
        .reduce((sum, o) => sum + o.remainingAmount, 0);
      setAmount(newTotal);
    }
  };

  // Calculate allocation based on mode
  const allocation = useMemo((): AllocationItem[] => {
    if (amount <= 0) return [];

    // Manual mode: only allocate to selected orders
    if (selectionMode === "manual") {
      const selected = unpaidOrders.filter(o => selectedOrderIds.has(o.id));
      if (selected.length === 0) return [];

      let remaining = amount;
      const result: AllocationItem[] = [];

      for (const order of selected) {
        if (remaining <= 0) break;
        const allocate = Math.min(order.remainingAmount, remaining);
        result.push({
          printing_order_id: order.id,
          amount: allocate
        });
        remaining -= allocate;
      }

      return result;
    }

    // FIFO mode: allocate to oldest orders first (current behavior)
    let remaining = amount;
    const result: AllocationItem[] = [];

    for (const order of unpaidOrders) {
      if (remaining <= 0) break;
      const allocate = Math.min(order.remainingAmount, remaining);
      result.push({
        printing_order_id: order.id,
        amount: allocate
      });
      remaining -= allocate;
    }

    return result;
  }, [amount, unpaidOrders, selectionMode, selectedOrderIds]);

  const paidOrdersCount = allocation.filter(a => {
    const order = unpaidOrders.find(o => o.id === a.printing_order_id);
    return order && a.amount >= order.remainingAmount;
  }).length;

  const partialOrdersCount = allocation.length - paidOrdersCount;

  // Validation
  const isValid = useMemo(() => {
    if (!paymentMethod || !paymentDate) return false;
    if (amount <= 0) return false;

    // Must have unpaid orders
    if (unpaidOrders.length === 0) return false;

    // Manual mode: must have at least one order selected
    if (selectionMode === "manual") {
      if (selectedOrderIds.size === 0) return false;
      // Amount should not exceed selected orders total
      if (amount > selectedOrdersTotal) return false;
    } else {
      // FIFO mode: amount should not exceed total debt
      if (amount > totalDebt) return false;
    }

    // Must have valid allocation
    if (allocation.length === 0) return false;

    return true;
  }, [amount, paymentMethod, paymentDate, selectionMode, selectedOrderIds.size, selectedOrdersTotal, totalDebt, unpaidOrders.length, allocation.length]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Detailed validation error messages
    if (!labId) {
      toast.error("Lab ID không hợp lệ");
      return;
    }

    if (unpaidOrders.length === 0) {
      toast.error("Không có đơn chưa thanh toán");
      return;
    }

    if (amount <= 0) {
      toast.error("Số tiền thanh toán phải lớn hơn 0");
      return;
    }

    if (selectionMode === "manual" && selectedOrderIds.size === 0) {
      toast.error("Vui lòng chọn ít nhất một đơn cần thanh toán");
      return;
    }

    if (allocation.length === 0) {
      toast.error("Không có đơn nào được phân bổ. Vui lòng kiểm tra lại số tiền");
      return;
    }

    if (!isValid) {
      toast.error("Vui lòng kiểm tra lại thông tin");
      return;
    }

    startTransition(async () => {
      try {
        const result = await recordLabPayment({
          lab_id: labId,
          amount,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          note: notes.trim() || null,
          allocations: allocation,
        });

        if (!result.success) {
          throw new Error(result.error || "Không thể ghi nhận thanh toán");
        }

        // Enhanced success message with details
        const paidCount = allocation.filter(a => {
          const order = unpaidOrders.find(o => o.id === a.printing_order_id);
          return order && a.amount >= order.remainingAmount;
        }).length;
        const partialCount = allocation.length - paidCount;

        const detailMessage = [
          `Đã thanh toán ${formatCurrency(amount)} ${CURRENCY_SYMBOL}`,
          labName ? `cho ${labName}` : "",
          `• ${allocation.length} đơn`,
          paidCount > 0 ? `(${paidCount} đầy đủ${partialCount > 0 ? `, ${partialCount} một phần` : ""})` : "",
          selectionMode === "manual" ? "• Chế độ chọn thủ công" : "• FIFO tự động"
        ].filter(Boolean).join(" ");

        toast.success(detailMessage);

        // CRITICAL: Invalidate SWR client-side caches
        // This ensures dashboard/list views update after payment
        mutate((key) => {
          if (!Array.isArray(key)) return false;
          // Invalidate all printing-related caches
          return key[0]?.toString().includes("printing") ||
                 key[0]?.toString().includes("lab") ||
                 key[0]?.toString().includes("debt");
        });

        onSuccess?.();
        onClose();
      } catch (err: any) {
        const errorMsg = err.message || "Đã có lỗi xảy ra";

        // Handle specific error cases
        if (errorMsg.includes("lock") || errorMsg.includes("concurrent") || errorMsg.includes("đồng thời")) {
          toast.error("Đơn đang được xử lý bởi người khác. Vui lòng thử lại sau vài giây.");
          // Refresh unpaid orders data
          if (labId) {
            // Trigger SWR revalidation
            mutate();
          }
        } else if (errorMsg.includes("period") || errorMsg.includes("kỳ đã khóa")) {
          toast.error("Không thể ghi nhận thanh toán trong kỳ đã khóa. Vui lòng chọn ngày khác.");
        } else {
          toast.error(errorMsg);
        }
      }
    });
  };

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Thanh toán cho Lab${labName ? `: ${labName}` : ""}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lab Debt Summary */}
        <div className="dashboard-surface space-y-1">
          {isLoading ? (
            <div className="text-sm text-text-muted">Đang tải...</div>
          ) : (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Tổng công nợ:</span>
                <span className="font-bold text-error">
                  {formatCurrency(totalDebt)} {CURRENCY_SYMBOL}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Số đơn chưa thanh toán:</span>
                <span className="font-semibold">{unpaidOrders.length}</span>
              </div>
            </>
          )}
        </div>

        {/* Selection Mode Toggle */}
        <div className="space-y-2">
          <label className="label-base">
            Cách chọn đơn thanh toán
          </label>
          <TabsFilter
            tabs={[
              { value: "fifo", label: "Tự động (FIFO)" },
              { value: "manual", label: "Chọn thủ công" },
            ]}
            activeTab={selectionMode}
            onChange={(value) => {
              setSelectionMode(value as SelectionMode);
              // Clear selection and amount when switching modes
              setSelectedOrderIds(new Set());
              setAmount(0);
            }}
          />
        </div>

        {/* Manual Order Selection */}
        {selectionMode === "manual" && unpaidOrders.length > 0 && (
          <div className="card-base p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="section-heading">
                Chọn đơn cần thanh toán
              </h3>
              <span className="text-xs text-text-muted">
                {selectedOrderIds.size}/{unpaidOrders.length} đơn
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {unpaidOrders.map((order) => {
                const isSelected = selectedOrderIds.has(order.id);
                return (
                  <label
                    key={order.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                      isSelected ? "bg-primary/10 border border-primary" : "bg-surface hover:bg-bg-hover border border-transparent"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleOrderSelection(order.id)}
                      disabled={isPending}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-main">{order.orderCode}</span>
                        <span className="text-xs text-text-muted">
                          {order.orderDate ? new Date(order.orderDate).toLocaleDateString("vi-VN") : "—"}
                        </span>
                      </div>
                      <div className="text-sm text-text-muted mt-0.5">
                        {order.contractCode} · {order.customerName}
                      </div>
                      {order.allocatedAmount > 0 && (
                        <div className="text-xs text-text-muted mt-1">
                          Đã trả: {formatCurrency(order.allocatedAmount)}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-text-main">
                        {formatCurrency(order.remainingAmount)}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {selectedOrderIds.size > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm text-text-secondary">Tổng đã chọn:</span>
                <span className="font-semibold text-text-main">
                  {formatCurrency(selectedOrdersTotal)} {CURRENCY_SYMBOL}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Payment Amount */}
        <div className="space-y-2">
          <label className="label-base">
            Số tiền thanh toán <span className="text-error">*</span>
          </label>
          <CurrencyInput
            value={amount}
            onChange={setAmount}
            placeholder="Nhập số tiền thanh toán"
            required
            disabled={isPending || isLoading}
          />
          <div className="flex gap-2">
            {selectionMode === "manual" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(selectedOrdersTotal * 0.5)}
                  disabled={isPending || selectedOrderIds.size === 0}
                >
                  50% đơn đã chọn
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(selectedOrdersTotal)}
                  disabled={isPending || selectedOrderIds.size === 0}
                >
                  Thanh toán hết ({formatCurrency(selectedOrdersTotal)})
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(totalDebt * 0.5)}
                  disabled={isPending || totalDebt === 0}
                >
                  50%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(totalDebt)}
                  disabled={isPending || totalDebt === 0}
                >
                  Tất toán ({formatCurrency(totalDebt)})
                </Button>
              </>
            )}
          </div>
          {selectionMode === "manual" && amount > selectedOrdersTotal && selectedOrderIds.size > 0 && (
            <div className="flex items-center gap-2 text-warning text-sm">
              <AlertCircle className={ICON_SIZE} />
              Số tiền vượt quá tổng đơn đã chọn
            </div>
          )}
          {selectionMode === "fifo" && amount > totalDebt && (
            <div className="flex items-center gap-2 text-warning text-sm">
              <AlertCircle className={ICON_SIZE} />
              Số tiền vượt quá công nợ
            </div>
          )}
          {selectionMode === "manual" && selectedOrderIds.size === 0 && (
            <div className="flex items-center gap-2 text-info text-sm">
              <AlertCircle className={ICON_SIZE} />
              Vui lòng chọn ít nhất một đơn cần thanh toán
            </div>
          )}
        </div>

        {/* Allocation Preview */}
        {amount > 0 && allocation.length > 0 && (
          <div className="card-base p-3 space-y-2">
            <Button unstyled
              type="button"
              onClick={() => setShowAllocationDetails(!showAllocationDetails)}
              className="w-full flex items-center justify-between text-sm font-medium text-text-main hover:text-primary transition-colors block"
            >
              <span>
                Sẽ thanh toán {allocation.length} đơn
                ({paidOrdersCount} đầy đủ, {partialOrdersCount} một phần)
              </span>
              {showAllocationDetails ? (
                <ChevronUp className={ICON_SIZE} />
              ) : (
                <ChevronDown className={ICON_SIZE} />
              )}
            </Button>

            {showAllocationDetails && (
              <div className="space-y-1 pt-2 border-t border-border">
                {allocation.map((allocation) => {
                  const order = unpaidOrders.find(o => o.id === allocation.printing_order_id);
                  if (!order) return null;

                  const isFullPayment = allocation.amount >= order.remainingAmount;

                  return (
                    <div key={order.id} className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">
                        {order.orderCode}
                        {isFullPayment ? (
                          <span className="ml-2 text-success">✓ Đầy đủ</span>
                        ) : (
                          <span className="ml-2 text-warning">Một phần</span>
                        )}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(allocation.amount)} / {formatCurrency(order.remainingAmount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Payment Method */}
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

        {/* Payment Date */}
        <DatePicker
          label="Ngày thanh toán"
          value={paymentDate}
          onChange={setPaymentDate}
          required
          placeholder="Chọn ngày thanh toán"
        />

        {/* Notes */}
        <div className="space-y-2">
          <label className="label-base">
            Ghi chú
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi chú (tùy chọn)"
            rows={2}
            disabled={isPending}
          />
        </div>

        {/* Actions */}
        <div className="form-actions">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isPending}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isPending || !isValid || totalDebt === 0}
          >
            {isPending ? "Đang xử lý..." : "Xác nhận thanh toán"}
          </Button>
        </div>
      </form>
    </UnifiedModal>
  );
}
