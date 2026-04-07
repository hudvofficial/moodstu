"use client";

import { memo } from "react";
import { Drawer } from "@/components/ui/drawer";
import { formatCurrency } from "@/lib/utils";
import type { PrintingOrderRow } from "@/types/printing";
import type { ContractGroup } from "@/lib/utils/printing-group-utils";
import PrintingCard from "./printing-card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  group: ContractGroup | null;
  onEdit: (order: PrintingOrderRow) => void;
  onStatusChange: (
    order: PrintingOrderRow,
    newStatus: string,
  ) => Promise<void>;
}

function PrintingGroupDrawerInner({
  isOpen,
  onClose,
  group,
  onEdit,
  onStatusChange,
}: Props) {
  if (!group) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Chi tiết Nhóm Đơn In"
      width="650px"
      titleBadge={
        <Badge variant="primary" className="font-semibold text-xs">
          {group.orderCount} đơn
        </Badge>
      }
    >
      <div className="flex flex-col min-h-full">
        <div className="flex-1 space-y-5">
          {/* Header Info */}
          <div className="p-4 bg-bg-hover rounded-xl mb-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">Hợp đồng</p>
              <p className="text-h3 text-primary">{group.contractCode}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">Khách hàng</p>
              <p className="font-medium text-text-main">{group.customerName}</p>
            </div>
          </div>

          <div className="form-grid-2col mb-4">
             <div className="rounded-xl bg-bg-hover p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-text-muted mb-1">
                  Đã hoàn thành
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-h3 text-success">
                    {group.completedCount} <span className="text-sm font-normal text-text-muted">/ {group.orderCount}</span>
                  </p>
                </div>
             </div>
             
             <div className="rounded-xl bg-bg-hover p-4 shadow-sm flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted mb-1">
                    Trễ lịch
                  </p>
                  <div className="flex items-center gap-2 text-error">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-h3">{group.overdueCount}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-xs uppercase tracking-wide text-text-muted mb-1">
                     Tổng chi phí
                   </p>
                   <p className="text-h3 text-text-main">
                     {formatCurrency(group.totalAmount)}
                   </p>
                </div>
             </div>
          </div>

          {/* Orders List */}
          <div className="space-y-3">
            <h4 className="section-heading mt-4 border-t border-border pt-5">
              Danh sách đơn in
            </h4>
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
        </div>

        {/* Sticky Footer */}
        <div className="sticky -bottom-6 lg:-bottom-6 -mx-5 lg:-mx-6 -mb-6 mt-6 px-5 lg:px-6 py-4 bg-bg-base/95 backdrop-blur-md border-t border-border flex items-center justify-end z-10 shrink-0">
          <Button onClick={onClose} variant="ghost" className="font-semibold">
            Đóng
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

export default memo(PrintingGroupDrawerInner);
