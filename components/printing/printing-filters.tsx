"use client";

import { SelectPill } from "@/components/ui/select/SelectPill";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { Switch } from "@/components/ui/switch";
import { Layers } from "lucide-react";
import type { LabOption, PrintingStats } from "@/types/printing";
import { TierSwitch } from "@/components/ui/tier-switch";

interface Props {
  stats: PrintingStats;
  labs: LabOption[];
  status: string;
  labId: string;
  paymentStatus: string;
  onStatusChange: (status: string) => void;
  onLabChange: (labId: string) => void;
  onPaymentStatusChange: (paymentStatus: string) => void;
  // Group toggle
  isGrouped?: boolean;
  onGroupChange?: (grouped: boolean) => void;
  groupDisabled?: boolean;
}

// ADR-014: payment_status là công nợ Lab (nhị phân), khớp thẳng giá trị DB thật.
const PAYMENT_OPTIONS = [
  { value: "all", label: "Thanh toán" },
  { value: "chua_thanh_toan", label: "Còn nợ lab" },
  { value: "da_thanh_toan", label: "Đã thanh toán" },
];

export default function PrintingFilters({
  stats,
  labs,
  status,
  labId,
  paymentStatus,
  onStatusChange,
  onLabChange,
  onPaymentStatusChange,
  isGrouped = false,
  onGroupChange,
  groupDisabled = false,
}: Props) {
  const statusTabs = [
    { label: "Tất cả", value: "all", count: stats.total },
    { label: "Chờ xử lý", value: "cho_xu_ly", count: stats.choXuLy },
    { label: "Đang in", value: "dang_in", count: stats.dangIn },
    { label: "Đã in", value: "da_in", count: stats.daIn },
    { label: "Hoàn thành", value: "hoan_thanh", count: stats.hoanThanh },
    { label: "Hủy đơn", value: "huy_don", count: stats.huyDon },
  ];

  const labOptions = [
    { value: "all", label: "Lab" },
    ...labs.map((lab) => ({
      value: lab.id,
      label: lab.lab_name,
    })),
  ];

  return (
    <TierSwitch
      phone={
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
        <TabsFilter
          tabs={statusTabs}
          activeTab={status}
          onChange={onStatusChange}
          variant="pills"
        />
        <div className="h-5 border-l border-border shrink-0" />
        <SelectPill
          value={labId}
          onChange={onLabChange}
          defaultValue="all"
          placeholder="Lab"
          options={labOptions}
        />
        <SelectPill
          value={paymentStatus}
          onChange={onPaymentStatusChange}
          defaultValue="all"
          placeholder="Thanh toán"
          options={PAYMENT_OPTIONS}
        />
        {onGroupChange && (
          <>
            <div className="h-5 border-l border-border shrink-0" />
            <div
              className="flex items-center gap-2 shrink-0"
              title="Gom nhóm theo hợp đồng"
            >
              <Layers className="w-4 h-4 text-text-muted shrink-0" />
              <Switch
                checked={isGrouped}
                onCheckedChange={onGroupChange}
                disabled={groupDisabled}
                aria-label="Gom nhóm hợp đồng"
              />
            </div>
          </>
        )}
        </div>
      }
      desktop={
        <div className="flex items-center justify-between gap-3">
        <TabsFilter
          tabs={statusTabs}
          activeTab={status}
          onChange={onStatusChange}
        />

        <div className="flex items-center gap-3">
          <SelectPill
            value={labId}
            onChange={onLabChange}
            defaultValue="all"
            placeholder="Lab"
            options={labOptions}
          />
          <SelectPill
            value={paymentStatus}
            onChange={onPaymentStatusChange}
            defaultValue="all"
            placeholder="Thanh toán"
            options={PAYMENT_OPTIONS}
          />
          {onGroupChange && (
            <>
              <div className="h-5 border-l border-border" />
              <div
                className="flex items-center gap-2 group"
                title="Gom nhóm theo hợp đồng"
              >
                <Layers className="w-4 h-4 text-text-muted" />
                <Switch
                  checked={isGrouped}
                  onCheckedChange={onGroupChange}
                  disabled={groupDisabled}
                  aria-label="Gom nhóm hợp đồng"
                />
              </div>
            </>
          )}
        </div>
      </div>
      }
    />
  );
}

