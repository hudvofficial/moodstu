"use client";

import { Trash2 } from "lucide-react";
import { formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import { Button } from "@/components/ui/button";
import { UnifiedModal } from "@/components/ui/unified-modal";
import type { SalaryItem } from "@/types/finance-operations";

interface SalaryDetailModalProps {
  item: SalaryItem | null;
  onClose: () => void;
  onDeleteAdjustment: (adjustmentId: string, salaryId: string) => void;
  deletingId: string | null;
}

function MoneyLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-text-secondary">{label}</span>
      <span className="tabular-nums font-bold">{formatVnd(value)}</span>
    </div>
  );
}

export function SalaryDetailModal({ item, onClose, onDeleteAdjustment, deletingId }: SalaryDetailModalProps) {
  return (
    <UnifiedModal
      isOpen={Boolean(item)}
      onClose={onClose}
      title={item ? `Lương ${item.employee_name}` : "Chi tiết lương"}
      size="2xl"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      {item && (
        <div className="space-y-4">
          <div className="card-base p-5 space-y-2">
            <MoneyLine label="Lương cơ bản" value={item.base_salary} />
            <MoneyLine label="Lương sản phẩm" value={item.product_salary} />
            <MoneyLine label="Thưởng" value={item.bonus} />
            <MoneyLine label="Phạt" value={item.penalty} />
            <MoneyLine label="Ứng trước" value={item.advance_payment} />
            <div className="form-total">
              <span>Thực nhận</span>
              <span className="tabular-nums">{formatVnd(item.net_salary)}</span>
            </div>
          </div>

          <div>
            <h3 className="form-section-heading">Điều chỉnh</h3>
            <div className="space-y-2">
              {item.adjustments.length === 0 ? (
                <div className="card-base p-5 text-text-muted">Chưa có điều chỉnh.</div>
              ) : (
                item.adjustments.map((adjustment) => (
                  <div key={adjustment.id} className="card-base p-3 flex items-center justify-between gap-3">
                    <div>
                      <span className={adjustment.type === "bonus" ? "badge badge-success" : "badge badge-error"}>
                        {adjustment.type === "bonus" ? "Thưởng" : "Phạt"}
                      </span>
                      <div className="mt-1 font-semibold">{adjustment.reason}</div>
                      <div className="text-caption text-text-muted">{formatFinanceDate(adjustment.date)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-bold">{formatVnd(adjustment.amount)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteAdjustment(adjustment.id, item.id)}
                        disabled={deletingId === adjustment.id}
                        className="text-error"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </UnifiedModal>
  );
}
