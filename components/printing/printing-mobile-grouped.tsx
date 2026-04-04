"use client";

import { memo } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ContractGroup } from "@/lib/utils/printing-group-utils";
import { Badge } from "@/components/ui/badge";

// ═══════════════════════════════════════════
// PrintingMobileGrouped — Mobile card grouping
// Pattern: service-mobile-list.tsx vertical card
// ═══════════════════════════════════════════

interface Props {
  groups: ContractGroup[];
  onViewGroup?: (group: ContractGroup) => void;
}

function PrintingMobileGroupedInner({
  groups,
  onViewGroup,
}: Props) {
  return (
    <div className="flex flex-col gap-3 pt-1">
      {groups.map((group) => {
        return (
          <div key={group.contractCode}>
            {/* ── Contract Header Card (vertical layout) ── */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onViewGroup?.(group)}
              className="card-base p-4 text-left transition-all active:scale-[0.99] entrance stagger-item"
            >
              {/* Row 1: Contract code + Chevron */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-text-muted">
                  {group.contractCode}
                </span>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </div>

              {/* Row 2: Customer name (bold) */}
              <h3 className="text-sm font-bold text-text-main mb-1.5">
                {group.customerName}
              </h3>

              {/* Row 3: Tags (order count + progress + overdue) */}
              <div className="flex items-center flex-wrap gap-1.5 mb-2">
                <Badge variant="primary" className="text-tiny uppercase font-bold py-0.5 px-2">
                  {group.orderCount} đơn
                </Badge>
                {group.completedCount > 0 && (
                  <Badge variant="success" className="text-tiny uppercase font-bold py-0.5 px-2">
                    {group.completedCount}/{group.orderCount} xong
                  </Badge>
                )}
                {group.overdueCount > 0 && (
                  <Badge variant="error" className="flex items-center gap-1 text-tiny uppercase font-bold py-0.5 px-2">
                    <AlertTriangle className="w-3 h-3" />
                    {group.overdueCount} trễ
                  </Badge>
                )}
              </div>

              {/* Row 4: Total amount */}
              <p className="text-sm font-semibold text-text-main">
                {formatCurrency(group.totalAmount)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(PrintingMobileGroupedInner);
