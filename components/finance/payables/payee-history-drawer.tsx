"use client";

import { useState } from "react";
import { Banknote, CreditCard, History } from "lucide-react";
import { toast } from "sonner";
import { fetchPayeePaymentHistory, voidPayeePayment } from "@/app/actions/payable-actions";
import { formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { SkeletonText } from "@/components/ui/skeleton";
import { useSWR } from "@/lib/swr";
import type { ActionResult } from "@/types/action-result";
import { PAYEE_TYPE_LABEL, type PayeeType } from "@/types/payables";
import type { PayeeRef } from "./payee-payment-modal";

// ADR-016 M2 — lịch sử phiếu chi trả đối tác (kèm phân bổ) + huỷ phiếu (xoá mềm, dẫn xuất lại trạng thái đơn in).

interface PayeeHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payee: PayeeRef | null;
  onVoidSuccess?: () => void;
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function PayeeHistoryDrawer({ open, onOpenChange, payee, onVoidSuccess }: PayeeHistoryDrawerProps) {
  // Huỷ 2 bước ngay trên dòng (không window.confirm — chặn extension/browser dialog)
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  // Không dùng `payee!.x` trong closure (React Compiler hoist thành dependency → đọc null) — xem payee-payment-modal
  const payeeType = payee?.payee_type ?? null;
  const payeeId = payee?.payee_id ?? null;
  const { data: history, isLoading, error, mutate } = useSWR(
    open && payeeType && payeeId ? ["payee-history", payeeType, payeeId] : null,
    () => requireData(fetchPayeePaymentHistory(payeeType as PayeeType, payeeId as string)),
    { revalidateOnMount: true },
  );

  if (!payee) return null;

  const handleVoid = async (expenseId: string) => {
    setVoidingId(expenseId);
    try {
      const result = await voidPayeePayment({ expense_id: expenseId });
      if (!result.success) {
        toast.error(result.error || "Không thể huỷ phiếu chi");
        return;
      }
      toast.success("Đã huỷ phiếu chi — công nợ được hoàn lại");
      setConfirmId(null);
      await mutate();
      onVoidSuccess?.();
    } finally {
      setVoidingId(null);
    }
  };

  const items = history ?? [];

  return (
    <Drawer
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Lịch sử thanh toán"
      size="md"
      titleBadge={<div className="badge badge-success">Đã chi</div>}
    >
      <div className="space-y-6">
        <div className="card-base p-4 bg-surface-elevated flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-caption text-text-muted">Đối tác</span>
            <span className="text-label text-text-primary font-semibold">{payee.payee_name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-caption text-text-muted">Loại</span>
            <span className="text-caption text-text-secondary">{PAYEE_TYPE_LABEL[payee.payee_type]}</span>
          </div>
        </div>

        <div>
          <h3 className="text-h4 mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-brand" />
            Các phiếu chi đã trả
          </h3>

          {isLoading ? (
            <div className="space-y-4">
              <SkeletonText lines={2} />
              <SkeletonText lines={2} />
            </div>
          ) : error ? (
            <p className="text-body-sm text-error">{error.message || "Không tải được lịch sử thanh toán"}</p>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-text-muted flex flex-col items-center gap-2 border border-dashed border-border rounded-lg">
              <History className="w-8 h-8 opacity-20" />
              <p className="text-body-sm">Chưa có phiếu chi nào</p>
            </div>
          ) : (
            <div className="relative pl-3 space-y-5 before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/50">
              {items.map((item) => {
                const isConfirming = confirmId === item.id;
                const isVoiding = voidingId === item.id;
                return (
                  <div key={item.id} className="relative pl-6">
                    <div className="absolute left-[-5px] top-1 w-[11px] h-[11px] rounded-full bg-surface-elevated border-2 border-brand" />
                    <div className="card-base p-3 hover:border-brand/30 transition-colors">
                      <div className="flex justify-between items-start mb-1 gap-3">
                        <div className="flex items-center gap-2">
                          {item.payment_method === "tien_mat" ? (
                            <Banknote className="w-3.5 h-3.5 text-text-muted" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5 text-text-muted" />
                          )}
                          <span className="text-body-sm font-medium text-text-primary tabular-nums">{formatVnd(item.amount)}</span>
                        </div>
                        <span className="text-caption text-text-muted">{formatFinanceDate(item.expense_date)}</span>
                      </div>

                      {item.note && <p className="text-caption text-text-secondary mt-1">{item.note}</p>}

                      {item.allocations.length > 0 && (
                        <ul className="mt-2 space-y-0.5 border-t border-border/60 pt-2">
                          {item.allocations.map((a) => (
                            <li key={`${a.target_type}:${a.target_id}`} className="flex items-center justify-between gap-3 text-caption">
                              <span className="truncate text-text-secondary">{a.label}</span>
                              <span className="tabular-nums text-text-primary shrink-0">{formatVnd(a.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-2 flex items-center justify-end gap-2">
                        {isConfirming ? (
                          <>
                            <span className="text-caption text-text-muted">Huỷ phiếu này?</span>
                            <Button variant="ghost" size="sm" className="text-caption p-0 h-auto" onClick={() => setConfirmId(null)} disabled={isVoiding}>
                              Không
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-caption text-error hover:text-error/80 p-0 h-auto"
                              onClick={() => handleVoid(item.id)}
                              disabled={isVoiding}
                            >
                              {isVoiding ? "Đang huỷ..." : "Xác nhận huỷ"}
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-caption text-error hover:text-error/80 p-0 h-auto"
                            onClick={() => setConfirmId(item.id)}
                            disabled={voidingId !== null}
                          >
                            Huỷ phiếu chi
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
