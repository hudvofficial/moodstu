"use client";

import { Edit, Trash2 } from "lucide-react";
import { formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import {
  formatInvestmentRoi,
  investmentConditionLabel,
  investmentConditionVariant,
  investmentRoiPercent,
  investmentStatusLabel,
  investmentStatusVariant,
} from "@/components/finance/investments/investment-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InvestmentItem } from "@/types/finance-operations";

interface InvestmentMobileListProps {
  items: InvestmentItem[];
  onEdit: (item: InvestmentItem) => void;
  onDelete: (item: InvestmentItem) => void;
  busyId: string | null;
}

export function InvestmentMobileList({
  items,
  onEdit,
  onDelete,
  busyId,
}: InvestmentMobileListProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3 lg:hidden">
      {items.map((item) => {
        const isBusy = busyId === item.id;
        const roi = investmentRoiPercent(item);
        const roiVariant = roi === null ? null : roi > 0 ? "success" : roi < 0 ? "error" : "neutral";

        return (
          <article
            key={item.id}
            className={cn(
              "card-base space-y-3 p-4",
              isBusy && "pointer-events-none opacity-60",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="icon-box shrink-0 bg-primary/10">
                  <span className="text-sm font-bold text-primary">
                    {item.category?.charAt(0) || "T"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-body-sm font-semibold leading-tight text-text-primary">
                    {item.name}
                  </h4>
                  {item.serial_number ? (
                    <div className="mt-1 truncate text-caption text-text-muted">
                      SN-{item.serial_number}
                    </div>
                  ) : null}
                  <div className="mt-1 flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-caption text-text-muted">
                      {item.category}
                    </span>
                    <span className="text-border">·</span>
                    <span className="shrink-0 text-caption text-text-muted">
                      {formatFinanceDate(item.purchase_date)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge variant={investmentStatusVariant(item.status)}>
                  {investmentStatusLabel(item.status)}
                </Badge>
                {item.maintenance_due ? (
                  <Badge variant="warning">Đến hạn</Badge>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-bg-base/70 px-3 py-2">
                <div className="text-caption text-text-muted">Giá mua</div>
                <div className="mt-1 tabular-nums text-body-sm font-semibold text-text-primary">
                  {formatVnd(item.purchase_price)}
                </div>
              </div>
              <div className="rounded-lg bg-success/5 px-3 py-2">
                <div className="text-caption text-text-muted">Hiện tại</div>
                <div className="mt-1 tabular-nums text-body-sm font-semibold text-success">
                  {formatVnd(item.book_value)}
                </div>
              </div>
              <div className="rounded-lg bg-bg-base/70 px-3 py-2">
                <div className="text-caption text-text-muted">KH/tháng</div>
                <div className="mt-1 tabular-nums text-body-sm font-medium text-text-secondary">
                  {formatVnd(item.monthly_depreciation)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={investmentConditionVariant(item.condition)}>
                {investmentConditionLabel(item.condition)}
              </Badge>
              {roiVariant ? (
                <Badge variant={roiVariant}>ROI {formatInvestmentRoi(roi)}</Badge>
              ) : null}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEdit(item)}
                className="flex-1 gap-2"
              >
                <Edit className="h-4 w-4" />
                Sửa
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => onDelete(item)}
                disabled={isBusy}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Xóa
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
