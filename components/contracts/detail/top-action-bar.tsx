"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Pencil, Printer, Download } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CONTRACT_STATUS_MAP, PAYMENT_STATUS_MAP } from "@/types/contract-constants";
import { Badge } from "@/components/ui/badge";
import type { ContractStatus, PaymentStatus } from "@/types/contract";

const ContractActionsMenu = dynamic(() => import("./contract-actions-menu"), {
  ssr: false,
  loading: () => <div className="h-9 w-28 shrink-0" aria-hidden="true" />,
});

// ═══════════════════════════════════════════
// Top Action Bar — Stitch SSOT (line 96-120)
// Structure: breadcrumb → h2 title + badge → outline buttons
// Mobile: auto-hide on scroll down, show on scroll up
// ═══════════════════════════════════════════



// Tab config shared with MobileTabNav
export const CONTRACT_DETAIL_TABS = [
  { key: "details", label: "Chi tiết", sectionId: "section-details" },
  { key: "events", label: "Lịch trình", sectionId: "section-events" },
  { key: "print", label: "In ấn", sectionId: "section-print" },
  { key: "actions", label: "Thao tác", sectionId: "section-actions" },
] as const;

interface Props {
  contractId: string;
  contractCode: string;
  customerName: string;
  hasReceipts: boolean;
  status: ContractStatus;
  paymentStatus?: PaymentStatus;
  isCancelled: boolean;
}

export default function TopActionBar({
  contractId,
  contractCode,
  customerName,
  hasReceipts,
  status,
  paymentStatus,
  isCancelled,
}: Props) {
  const statusInfo = CONTRACT_STATUS_MAP[status];

  // Show payment status badge if meaningful
  const paymentLabel = paymentStatus ? PAYMENT_STATUS_MAP[paymentStatus] : null;

  return (
    <>
      {/* ══════════ DESKTOP HEADER ══════════ Stitch line 96-120 */}
      {/* Mobile header now handled by header.tsx via HeaderSlotsContext */}
      <header className="max-lg:hidden space-y-4">
        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: "Hợp đồng", href: "/contracts" },
          { label: contractCode },
        ]} />

        {/* Title + Badge + Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: title + status badge */}
          <div className="flex items-center gap-3">
            <h2 className="text-h2">
              Hợp đồng {contractCode}
            </h2>
            {statusInfo && (
              <Badge variant={statusInfo.variant}>
                {paymentLabel || statusInfo.label}
              </Badge>
            )}
          </div>

          {/* Right: action buttons — Stitch: outline style */}
          <div className="flex items-center gap-2">
            {/* Sửa */}
            {!isCancelled && (
              <Link
                href={`/contracts/${contractId}/edit`}
                className="btn btn-outline"
              >
                <Pencil size={14} />
                <span>Sửa</span>
              </Link>
            )}

            {/* In hợp đồng */}
            <Link
              href={`/contracts/${contractId}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              <Printer size={14} />
              <span>In hợp đồng</span>
            </Link>

            {/* Xuất file PDF */}
            <Link
              href={`/contracts/${contractId}/print?isExportMode=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              <Download size={14} />
              <span>Xuất file</span>
            </Link>

            {/* Actions menu */}
            <ContractActionsMenu
              contractId={contractId}
              contractCode={contractCode}
              customerName={customerName}
              hasReceipts={hasReceipts}
              isCancelled={isCancelled}
            />
          </div>
        </div>
      </header>
    </>
  );
}
