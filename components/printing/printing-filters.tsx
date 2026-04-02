"use client";

import { SelectPill } from "@/components/ui/select/SelectPill";
import { TabsFilter } from "@/components/ui/tabs-filter";
import type { LabOption, PrintingStats } from "@/types/printing";

interface Props {
  stats: PrintingStats;
  labs: LabOption[];
  status: string;
  labId: string;
  paymentStatus: string;
  onStatusChange: (status: string) => void;
  onLabChange: (labId: string) => void;
  onPaymentStatusChange: (paymentStatus: string) => void;
}

const PAYMENT_OPTIONS = [
  { value: "all", label: "Thanh toán" },
  { value: "chua_thanh_toan", label: "Chưa thanh toán" },
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
}: Props) {
  const statusTabs = [
    { label: "Tất cả", value: "all", count: stats.total },
    { label: "Chờ xử lý", value: "cho_xu_ly", count: stats.choXuLy },
    { label: "Đang in", value: "dang_in", count: stats.dangIn },
    { label: "Đã in", value: "da_in", count: stats.daIn },
    { label: "Đã nhận", value: "da_nhan", count: stats.daNhan },
  ];

  const labOptions = [
    { value: "all", label: "Lab" },
    ...labs.map((lab) => ({
      value: lab.id,
      label: lab.lab_name,
    })),
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* MOBILE: Status pills + Dropdowns (1 hàng cuộn ngang) */}
      <div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
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
      </div>

      {/* DESKTOP: Tabs + Dropdowns (no inline search — uses header search) */}
      <div className="hidden lg:flex lg:items-center lg:justify-between gap-3">
        <TabsFilter
          tabs={statusTabs}
          activeTab={status}
          onChange={onStatusChange}
        />

        <div className="flex items-center gap-2">
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
        </div>
      </div>
    </div>
  );
}

