"use client";

import { useEffect, useState } from "react";
import { History, Banknote, CreditCard, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { SkeletonText } from "@/components/ui/skeleton";
import { formatVnd, formatFinanceDate } from "@/components/finance/finance-format";
import { fetchDebtPaymentHistory } from "@/app/actions/finance-operations-queries";
import type { DebtListItem } from "@/types/finance-operations";

interface DebtHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtListItem | null;
}

export function DebtHistoryDrawer({ isOpen, onClose, debt }: DebtHistoryDrawerProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && debt) {
      loadHistory();
    }
  }, [isOpen, debt]);

  const loadHistory = async () => {
    if (!debt) return;
    setLoading(true);
    try {
      const res = await fetchDebtPaymentHistory(debt.id);
      if (!res.success) {
        throw new Error(res.error || "Lỗi tải lịch sử");
      }
      setHistory(res.data || []);
    } catch (err: any) {
      toast.error(err.message || "Không tải được lịch sử thanh toán");
    } finally {
      setLoading(false);
    }
  };

  if (!debt) return null;

  const isReceivable = debt.type === "receivable" || debt.type === "Phải thu";

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Lịch sử thanh toán"
      size="md"
      titleBadge={
        <div className={`badge ${isReceivable ? "badge-success" : "badge-error"}`}>
          {isReceivable ? "Phải thu" : "Phải trả"}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Debt Info Summary */}
        <div className="card-base p-4 bg-surface-elevated flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-caption text-text-muted">Đối tác</span>
            <span className="text-label text-text-primary font-semibold">{debt.entity_name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-caption text-text-muted">Tổng gốc nợ</span>
            <span className="text-body-sm font-medium">{formatVnd(debt.amount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-caption text-text-muted">Đã thanh toán</span>
            <span className="text-body-sm font-medium text-success">{formatVnd(debt.paid_amount || 0)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border mt-1">
            <span className="text-caption font-semibold">Còn nợ lại</span>
            <span className="text-label text-error font-bold">{formatVnd(debt.remaining)}</span>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h3 className="text-h4 mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-brand" />
            Chi tiết các lần thanh toán
          </h3>

          {loading ? (
            <div className="space-y-4">
              <SkeletonText lines={2} />
              <SkeletonText lines={2} />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-text-muted flex flex-col items-center gap-2 border border-dashed border-border rounded-lg">
              <History className="w-8 h-8 opacity-20" />
              <p className="text-body-sm">Chưa có giao dịch thanh toán nào</p>
            </div>
          ) : (
            <div className="relative pl-3 space-y-5 before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/50">
              {history.map((item, idx) => (
                <div key={item.id} className="relative pl-6">
                  {/* Timeline dot */}
                  <div className="absolute left-[-5px] top-1 w-[11px] h-[11px] rounded-full bg-surface-elevated border-2 border-brand" />
                  
                  <div className="card-base p-3 hover:border-brand/30 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        {item.payment_method === "tien_mat" ? (
                          <Banknote className="w-3.5 h-3.5 text-text-muted" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 text-text-muted" />
                        )}
                        <span className="text-body-sm font-medium text-text-primary">
                          {formatVnd(item.amount)}
                        </span>
                      </div>
                      <span className="text-caption text-text-muted">
                        {formatFinanceDate(item.date)}
                      </span>
                    </div>
                    <p className="text-caption text-text-secondary mt-1">
                      {item.notes}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
