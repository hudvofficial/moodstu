"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SimpleSelect } from "@/components/ui/simple-select";
import { createPaymentReceipt, getTransactionCategories } from "@/app/actions/payment-actions";
import {
  invalidateContractAfterWrite,
  invalidateFinanceAfterWrite,
} from "@/lib/cache-invalidation";
import { toast } from "@/lib/toast-utils";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { PaymentPlan } from "@/types/contract";
import { getPaymentStageLabel, PAYMENT_METHOD_OPTIONS } from "@/types/contract-constants";
import DatePicker from "@/components/ui/date-picker";
import { getTodayInTimeZone } from "@/lib/studio-date";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractCode: string;
  remainingAmount: number;
  paidAmount: number;
  paymentPlans: PaymentPlan[];
  initialPlanId?: string;
  onSuccess?: () => void;
}

interface CategoryOption {
  id: string;
  name: string;
  type: string;
  category_code?: string | null;
}

type CategoryIntent = "deposit" | "contract" | "outside" | "adjustment";

const PLAN_PREFIX = "plan:";
const OUTSIDE_TARGET = "outside";
const ADJUSTMENT_TARGET = "adjustment";




function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isPlanCancelled(plan: PaymentPlan) {
  const status = normalizeText(plan.status);
  return status === "cancelled" || status === "da_huy" || status === "huy";
}

function isPlanClosed(plan: PaymentPlan) {
  const status = normalizeText(plan.status);
  return status === "paid" || status === "closed" || status === "da_thu" || status === "da_thanh_toan";
}

function getPlanPaidAmount(plan: PaymentPlan) {
  if (typeof plan.paid_amount === "number") return Math.max(0, plan.paid_amount);
  return (plan.allocations || []).reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0);
}

function getPlanAmount(plan: PaymentPlan) {
  return Number(plan.amount || 0);
}

function getPlanStageKey(plan: PaymentPlan | null) {
  return normalizeText(plan?.stage_key || plan?.stage_name);
}

function isDepositPlan(plan: PaymentPlan | null) {
  const key = getPlanStageKey(plan);
  return key === "deposit" || key === "dat_coc" || key === "coc" || key.includes("tien_coc");
}

function isFinalPlan(plan: PaymentPlan | null) {
  const key = getPlanStageKey(plan);
  return key === "final" || key === "remaining" || key.includes("tat_toan") || key.includes("con_lai");
}

function stageLabel(plan: PaymentPlan) {
  return getPaymentStageLabel(plan.stage_key || plan.stage_name, plan.stage_name || "Đợt thu");
}

function planOptionValue(planId: string) {
  return `${PLAN_PREFIX}${planId}`;
}

function findCategory(cats: CategoryOption[], intent: CategoryIntent) {
  const normalized = (item: CategoryOption) => normalizeText(`${item.category_code || ""} ${item.name}`);

  if (intent === "adjustment") {
    return cats.find((item) => {
      const text = normalized(item);
      return text.includes("phat_sinh") || text.includes("addon") || text.includes("dieu_chinh");
    });
  }

  if (intent === "deposit") {
    return cats.find((item) => {
      const text = normalized(item);
      return text.includes("coc") || text.includes("deposit") || text.includes("contract_deposit");
    });
  }

  if (intent === "outside") {
    return cats.find((item) => {
      const text = normalized(item);
      return text.includes("ngoai_dot") || text.includes("thu_khac") || text.includes("other");
    });
  }

  return cats.find((item) => {
    const text = normalized(item);
    return text.includes("hop_dong") || text.includes("contract_payment") || text.includes("thu_tien_hop_dong");
  });
}

export default function PaymentReceiptForm({
  isOpen,
  onClose,
  contractId,
  contractCode,
  remainingAmount,
  paymentPlans,
  initialPlanId,
  onSuccess,
}: Props) {
  const isFullyPaid = remainingAmount <= 0;
  const [amount, setAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(getTodayInTimeZone());
  const [method, setMethod] = useState<"tien_mat" | "chuyen_khoan">("tien_mat");
  const [selectedTarget, setSelectedTarget] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const collectablePlans = useMemo(
    () =>
      paymentPlans
        .filter((plan) => !isPlanCancelled(plan) && !isPlanClosed(plan))
        .sort((a, b) => {
          if ((a.sort_order || 0) !== (b.sort_order || 0)) return (a.sort_order || 0) - (b.sort_order || 0);
          return String(a.created_at || "").localeCompare(String(b.created_at || ""));
        }),
    [paymentPlans],
  );

  const untouchedPlan = useMemo(
    () => collectablePlans.find((plan) => getPlanPaidAmount(plan) <= 0) || null,
    [collectablePlans],
  );

  const nextPlan = untouchedPlan || collectablePlans[0] || null;
  const finalPlan = useMemo(() => collectablePlans.find((plan) => isFinalPlan(plan)) || null, [collectablePlans]);

  const selectedPlanId = selectedTarget.startsWith(PLAN_PREFIX)
    ? selectedTarget.slice(PLAN_PREFIX.length)
    : null;

  const selectedPlan = useMemo(
    () => selectedPlanId
      ? collectablePlans.find((plan) => plan.id === selectedPlanId) || null
      : null,
    [collectablePlans, selectedPlanId],
  );

  const categoryIntent = useMemo<CategoryIntent>(() => {
    if (isFullyPaid || selectedTarget === ADJUSTMENT_TARGET) return "adjustment";
    if (selectedTarget === OUTSIDE_TARGET) return "outside";
    if (isDepositPlan(selectedPlan)) return "deposit";
    return "contract";
  }, [isFullyPaid, selectedPlan, selectedTarget]);

  const resetForm = useCallback(() => {
    setAmount(0);
    setPaymentDate(getTodayInTimeZone());
    setMethod("tien_mat");
    setSelectedTarget("");
    setCategoryId(null);
    setNotes("");
  }, []);

  const applyTarget = useCallback(
    (target: string) => {
      setSelectedTarget(target);

      if (target === ADJUSTMENT_TARGET || target === OUTSIDE_TARGET) {
        setAmount(0);
        return;
      }

      if (target.startsWith(PLAN_PREFIX)) {
        const planId = target.slice(PLAN_PREFIX.length);
        const plan = collectablePlans.find((item) => item.id === planId) || null;
        setAmount(isFinalPlan(plan) ? Math.max(remainingAmount, 0) : 0);
      }
    },
    [collectablePlans, remainingAmount],
  );

  const selectPlan = useCallback((planId: string) => {
    applyTarget(planOptionValue(planId));
  }, [applyTarget]);

  const selectRemaining = useCallback(() => {
    setAmount(Math.max(remainingAmount, 0));
    if (finalPlan) {
      applyTarget(planOptionValue(finalPlan.id));
    }
  }, [applyTarget, finalPlan, remainingAmount]);

  useEffect(() => {
    if (!isOpen) return;

    setPaymentDate(getTodayInTimeZone());
    setMethod("tien_mat");
    setNotes("");

    if (isFullyPaid) {
      applyTarget(ADJUSTMENT_TARGET);
      return;
    }

    const initialPlan = initialPlanId
      ? collectablePlans.find((plan) => plan.id === initialPlanId)
      : null;

    if (initialPlan) {
      applyTarget(planOptionValue(initialPlan.id));
      return;
    }

    if (nextPlan) {
      applyTarget(planOptionValue(nextPlan.id));
      return;
    }

    applyTarget(OUTSIDE_TARGET);
  }, [applyTarget, collectablePlans, initialPlanId, isFullyPaid, isOpen, nextPlan]);

  useEffect(() => {
    if (!isOpen) return;

    void getTransactionCategories("thu")
      .then((result) => {
        if (result.success && result.data) setCategories(result.data as CategoryOption[]);
      })
      .catch(() => {
        setCategories([]);
        setCategoryId(null);
      });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const preferred = findCategory(categories, categoryIntent);
    setCategoryId(preferred?.id || categories[0]?.id || null);
  }, [categories, categoryIntent, isOpen]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const planOptions = useMemo(() => {
    if (isFullyPaid) {
      return [{ value: ADJUSTMENT_TARGET, label: "Phát sinh hợp đồng" }];
    }

    const options = collectablePlans.map((plan) => {
      const paid = getPlanPaidAmount(plan);
      const planned = getPlanAmount(plan);
      const suffix = planned > 0
        ? ` - KH: ${formatCurrency(planned)} ${CURRENCY_SYMBOL}`
        : paid > 0
          ? ` - Đã thu: ${formatCurrency(paid)} ${CURRENCY_SYMBOL}`
          : "";

      return {
        value: planOptionValue(plan.id),
        label: `${stageLabel(plan)}${suffix}`,
      };
    });

    options.push({ value: OUTSIDE_TARGET, label: "Thu ngoài đợt" });
    return options;
  }, [collectablePlans, isFullyPaid]);

  const selectValue = selectedTarget || (isFullyPaid ? ADJUSTMENT_TARGET : OUTSIDE_TARGET);

  const handleSubmit = useCallback(async () => {
    if (!selectedTarget) {
      toast(isFullyPaid ? "Vui lòng chọn loại phát sinh" : "Vui lòng chọn đợt thanh toán", "warning");
      return;
    }

    if (amount <= 0) {
      toast("Vui lòng nhập số tiền hợp lệ", "warning");
      return;
    }

    if (!isFullyPaid && remainingAmount > 0 && amount > remainingAmount) {
      toast("Số tiền thu không được vượt quá số tiền còn lại của hợp đồng", "warning");
      return;
    }

    if (selectedPlanId && !selectedPlan) {
      toast("Đợt thanh toán không hợp lệ", "warning");
      return;
    }

    if (isFullyPaid && notes.trim().length < 5) {
      toast("Lý do phát sinh phải có ít nhất 5 ký tự", "warning");
      return;
    }

    const updateTotal = isFullyPaid || selectedTarget === ADJUSTMENT_TARGET;
    const resolvedStage = selectedPlan
      ? selectedPlan.stage_key || selectedPlan.stage_name
      : selectedTarget === OUTSIDE_TARGET
        ? "thu_ngoai_dot"
        : "phat_sinh";

    setLoading(true);
    try {
      const result = await createPaymentReceipt({
        contractId,
        amount,
        paymentDate,
        paymentMethod: method,
        paymentStage: resolvedStage,
        categoryId,
        notes: notes.trim() || null,
        paymentPlanId: selectedPlan?.id || null,
        updateTotal,
      });

      if (result.success) {
        toast(updateTotal ? "Đã tạo phiếu phát sinh" : "Đã tạo phiếu thu", "success");
        await Promise.all([
          invalidateContractAfterWrite(contractId),
          invalidateFinanceAfterWrite(),
        ]);
        onSuccess?.();
        resetForm();
        onClose();
      } else {
        toast(result.error || "Lỗi tạo phiếu thu", "error");
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  }, [
    amount,
    categoryId,
    contractId,
    isFullyPaid,
    method,
    notes,
    onClose,
    paymentDate,
    remainingAmount,
    resetForm,
    selectedPlan,
    selectedPlanId,
    selectedTarget,
  ]);

  const isSubmitDisabled =
    loading ||
    !selectedTarget ||
    amount <= 0 ||
    (isFullyPaid && notes.trim().length < 5);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isFullyPaid ? "Tạo phiếu phát sinh" : "Tạo phiếu thu"}
      description={contractCode}
      size="xl"
    >
      <div className="space-y-4">
        {isFullyPaid && (
          <div className="flex gap-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-body-sm text-text-secondary">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="font-semibold text-text-primary">Hợp đồng đã tất toán.</p>
              <p>Khoản thu mới là phát sinh và sẽ cập nhật giá trị hợp đồng.</p>
            </div>
          </div>
        )}

        <div className="form-grid-2col">
          <div>
            <label className="label-base mb-1 block">
              {isFullyPaid ? "Số tiền phát sinh *" : "Số tiền thu *"}
            </label>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              autoFocus
              emptyWhenZero
              placeholder={isFullyPaid ? "Nhập số tiền phát sinh" : "Nhập số tiền thu"}
              className="h-11 text-base"
            />
            {remainingAmount > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-text-muted">
                  Còn lại: {formatCurrency(remainingAmount)} {CURRENCY_SYMBOL}
                </span>
                <Button
                  unstyled
                  type="button"
                  onClick={selectRemaining}
                  className="text-xs font-semibold text-interactive hover:underline"
                >
                  Thu hết
                </Button>
                {nextPlan && selectedTarget !== planOptionValue(nextPlan.id) && (
                  <Button
                    unstyled
                    type="button"
                    onClick={() => selectPlan(nextPlan.id)}
                    className="text-xs font-semibold text-interactive hover:underline"
                  >
                    Đợt tiếp theo
                  </Button>
                )}
              </div>
            )}
          </div>

          <DatePicker
            value={paymentDate}
            onChange={(date) => setPaymentDate(date)}
            label="Ngày thu"
            placeholder="Chọn ngày thu"
          />
        </div>

        <div className="form-grid-2col items-start">
          <SimpleSelect
            value={selectValue}
            onChange={applyTarget}
            options={planOptions}
            label={isFullyPaid ? "Loại phát sinh" : "Đợt thanh toán"}
          />

          <SimpleSelect
            value={method}
            onChange={(value) => setMethod(value as "tien_mat" | "chuyen_khoan")}
            options={PAYMENT_METHOD_OPTIONS}
            label="Hình thức"
          />
        </div>

        <div>
          <label className="label-base mb-1 block">Ghi chú</label>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={
              isFullyPaid
                ? "Nhập lý do phát sinh (bắt buộc, tối thiểu 5 ký tự)"
                : "VD: Cọc chuyển khoản VCB"
            }
            className="h-20 resize-none text-base"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
        <Button variant="outline" onClick={handleClose}>
          Hủy
        </Button>
        <Button
          variant={isFullyPaid ? "interactive" : "primary"}
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          {loading ? "Đang xử lý..." : isFullyPaid ? "Tạo phiếu phát sinh" : "Tạo phiếu thu"}
        </Button>
      </div>
    </UnifiedModal>
  );
}
