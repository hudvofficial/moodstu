"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight, Pencil, Printer, Download } from "lucide-react";
import { CONTRACT_STATUS_MAP, PAYMENT_STATUS_MAP } from "@/types/contract-constants";
import { Badge } from "@/components/ui/badge";
import type { ContractStatus, PaymentStatus } from "@/types/contract";
import ContractActionsMenu from "./contract-actions-menu";

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
  { key: "checklist", label: "Checklist", sectionId: "section-checklist" },
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
  headerVisible: boolean;
  tabsMerged?: boolean;
  activeTab?: string;
  onTabClick?: (tab: { key: string; sectionId: string }) => void;
}

export default function TopActionBar({
  contractId,
  contractCode,
  customerName,
  hasReceipts,
  status,
  paymentStatus,
  isCancelled,
  headerVisible,
  tabsMerged = false,
  activeTab,
  onTabClick,
}: Props) {
  const statusInfo = CONTRACT_STATUS_MAP[status];

  // Show payment status badge if meaningful
  const paymentLabel = paymentStatus ? PAYMENT_STATUS_MAP[paymentStatus] : null;

  return (
    <>
      {/* ══════════ MOBILE HEADER ══════════ Stitch lines 47-57 */}
      <div
        className={`lg:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-xs
                    transition-transform duration-300 ease-out
                    ${(headerVisible || tabsMerged) ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="flex items-center justify-between px-4 h-(--header-mobile-h)">
          {/* Left: icon-only back */}
          <Link
            href="/contracts"
            className="btn-icon shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>

          {/* Center: title OR tabs (cross-fade) */}
          <div className="flex-1 min-w-0 relative flex items-center justify-center">
            {/* Layer 1: Contract code — hide when merged */}
            <span
              className={`text-[15px] font-semibold tracking-tight uppercase text-text-primary
                transition-opacity duration-200 ease-out
                ${tabsMerged ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            >
              {contractCode}
            </span>

            {/* Layer 2: Tab pills — show when merged */}
            <div
              className={`absolute inset-0 flex items-center gap-1
                overflow-x-auto no-scrollbar
                transition-opacity duration-200 ease-out
                ${tabsMerged ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              {CONTRACT_DETAIL_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onTabClick?.(tab)}
                  className={`tab-pill tab-pill-compact whitespace-nowrap
                    ${activeTab === tab.key ? "tab-pill-active" : "tab-pill-inactive"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: actions menu */}
          <ContractActionsMenu
            contractId={contractId}
            contractCode={contractCode}
            customerName={customerName}
            hasReceipts={hasReceipts}
            isCancelled={isCancelled}
          />
        </div>
      </div>

      {/* ══════════ DESKTOP HEADER ══════════ Stitch line 96-120 */}
      <header className="max-lg:hidden space-y-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-body-sm text-text-secondary">
          <Link
            href="/contracts"
            className="hover:text-primary transition-colors"
          >
            Hợp đồng
          </Link>
          <ChevronRight size={14} className="text-text-muted" />
          <span className="text-text-primary font-medium">{contractCode}</span>
        </nav>

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
