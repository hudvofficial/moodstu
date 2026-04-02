"use client";

import { memo, useCallback, useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PrintingOrderRow } from "@/types/printing";
import type { ContractGroup } from "@/lib/utils/printing-group-utils";
import PrintingCard from "./printing-card";

// ═══════════════════════════════════════════
// PrintingMobileGrouped — Mobile card grouping
// Pattern: service-mobile-list.tsx vertical card
// ═══════════════════════════════════════════

interface Props {
  groups: ContractGroup[];
  onEdit: (order: PrintingOrderRow) => void;
  onStatusChange: (
    order: PrintingOrderRow,
    newStatus: string,
  ) => Promise<void>;
}

function PrintingMobileGroupedInner({
  groups,
  onEdit,
  onStatusChange,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggleGroup = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-3 pt-1">
      {groups.map((group) => {
        const isOpen = expanded.has(group.contractCode);

        return (
          <div key={group.contractCode}>
            {/* ── Contract Header Card (vertical layout) ── */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleGroup(group.contractCode)}
              className={`card-base p-4 text-left transition-all active:scale-[0.99] entrance stagger-item ${isOpen ? "rounded-b-none" : ""}`}
            >
              {/* Row 1: Contract code + Chevron */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-text-muted">
                  {group.contractCode}
                </span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-text-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-muted" />
                )}
              </div>

              {/* Row 2: Customer name (bold) */}
              <h3 className="text-sm font-bold text-text-main mb-1.5">
                {group.customerName}
              </h3>

              {/* Row 3: Tags (order count + progress + overdue) */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-tiny px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                  {group.orderCount} đơn
                </span>
                {group.completedCount > 0 && (
                  <span className="text-tiny px-2 py-0.5 rounded-md bg-success/10 text-success">
                    {group.completedCount}/{group.orderCount} hoàn thành
                  </span>
                )}
                {group.overdueCount > 0 && (
                  <span className="flex items-center gap-0.5 text-tiny px-2 py-0.5 rounded-md bg-error/10 text-error font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    {group.overdueCount} quá hạn
                  </span>
                )}
              </div>

              {/* Row 4: Total amount */}
              <p className="text-sm font-semibold text-text-main">
                {formatCurrency(group.totalAmount)}
              </p>
            </div>

            {/* ── Child Cards (expanded) ── */}
            {isOpen && (
              <div className="border-t border-border/30 bg-bg-subtle/50 rounded-b-xl space-y-2 p-3 animate-in slide-in-from-top-1 duration-200">
                {group.orders.map((order) => (
                  <PrintingCard
                    key={order.id}
                    order={order}
                    compact
                    onEdit={onEdit}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(PrintingMobileGroupedInner);
