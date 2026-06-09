"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TableWrapper,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import type { Lab } from "@/types/printing";
import { LAB_STATUS_LABELS, LAB_STATUS_VARIANTS } from "@/types/printing-constants";
import { formatCurrency } from "@/lib/utils";



interface Props {
  labs: Lab[];
  onEdit: (lab: Lab) => void;
  onToggleStatus: (lab: Lab) => void;
  onDelete: (lab: Lab) => void;
}

export default function LabTable({
  labs,
  onEdit,
  onToggleStatus,
  onDelete,
}: Props) {
  return (
    <TableWrapper>
      <THead>
        <TR className="hover:bg-transparent h-auto">
          <TH>Lab</TH>
          <TH>Liên hệ</TH>
          <TH>Bảng giá</TH>
          <TH>Công nợ</TH>
          <TH>Trạng thái</TH>
          <TH className="text-right">Hành động</TH>
        </TR>
      </THead>

      <TBody>
        {labs.map((lab) => (
          <TR key={lab.id}>
            <TD>
              <div className="flex flex-col">
                <span className="font-semibold text-text-main">
                  {lab.lab_name}
                </span>
                <span className="text-xs text-text-muted">
                  {lab.address || "Chưa có địa chỉ"}
                </span>
              </div>
            </TD>
            <TD>
              <div className="flex flex-col">
                <span>{lab.contact_person || "Chưa có người liên hệ"}</span>
                <span className="text-xs text-text-muted">
                  {lab.phone || "Chưa có số điện thoại"}
                </span>
              </div>
            </TD>
            <TD>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-text-main">
                  {lab.serviceCount} dịch vụ
                </span>
                <span className="text-xs text-text-muted">
                  {lab.services.length > 0
                    ? lab.services
                        .slice(0, 2)
                        .map((service) => service.item_name)
                        .join(", ")
                    : "Chưa có bảng giá"}
                </span>
              </div>
            </TD>
            <TD>
              <div className="flex flex-col">
                <span className="font-semibold text-text-main">
                  {formatCurrency(lab.outstandingDebt)}
                </span>
                <span className="text-xs text-text-muted">
                  {lab.unpaidOrders} đơn chưa thanh toán
                </span>
              </div>
            </TD>
            <TD>
              <Badge variant={LAB_STATUS_VARIANTS[lab.status]}>
                {LAB_STATUS_LABELS[lab.status]}
              </Badge>
            </TD>
            <TD>
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(lab)}>
                  Sửa
                </Button>
                <Button size="sm" variant="outline" onClick={() => onToggleStatus(lab)}>
                  {lab.status === "active" ? "Tạm dừng" : "Kích hoạt"}
                </Button>
                <Button size="sm" variant="danger" onClick={() => onDelete(lab)}>
                  Xóa
                </Button>
              </div>
            </TD>
          </TR>
        ))}
      </TBody>
    </TableWrapper>
  );
}

