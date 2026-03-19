"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useContractDetail } from "@/lib/hooks/use-contracts";
import { toast } from "@/lib/toast-utils";
import type {
  Contract,
  Payment,
  PaymentPlan,
  InventoryReservation,
  PrintingOrder,
  AuditLogEntry,
} from "@/types/contract";
import TopActionBar from "./top-action-bar";
import CancelBanner from "./cancel-banner";
import SummaryCard from "./summary-card";
import CustomerInfoBlock from "./customer-info-block";
import ServiceDetailsBlock from "./service-details-block";
import FinancialDashboard from "./financial-dashboard";
import EventTimeline from "./event-timeline";
import WorkflowStepper from "./workflow-stepper";
import CostumesBlock from "./costumes-block";
import PrintOrdersBlock from "./print-orders-block";
import ActivityLog from "./activity-log";
import FilesDrivePlaceholder from "./files-drive-placeholder";
import QuickActionsGrid from "./quick-actions-grid";
import ChecklistBlock from "./checklist-block";
import MobileBottomBar from "./mobile-bottom-bar";
import MobileTabNav from "./mobile-tab-nav";
import PaymentReceiptForm from "./payment-receipt-form";
import PrintingOrderForm from "./printing-order-form";
import InventoryReservationForm from "./inventory-reservation-form";
import NotesTimeline from "./notes-timeline";

// ═══════════════════════════════════════════
// Contract Detail Client — SWR wrapper
// Phase 04d→04f: Desktop 65/35 + Sidebar + Quick Actions
// Mobile: stacked 1-col, Desktop: 2-col grid
// ═══════════════════════════════════════════

interface Props {
  initialContract: Contract;
  initialPayments: Payment[];
  initialPaymentPlans: PaymentPlan[];
  initialReservations: InventoryReservation[];
  initialPrintOrders: PrintingOrder[];
  initialAuditLogs: AuditLogEntry[];
}

export default function ContractDetailClient({
  initialContract,
  initialPayments,
  initialPaymentPlans,
  initialReservations,
  initialPrintOrders,
  initialAuditLogs,
}: Props) {
  const params = useParams<{ id: string }>();
  const {
    contract: liveContract,
    payments: livePayments,
    paymentPlans: livePaymentPlans,
    reservations: liveReservations,
    printOrders: livePrintOrders,
    auditLogs: liveAuditLogs,
  } = useContractDetail(params.id);

  // SWR fallback: use live data if available, else initial server data
  const contract =
    (liveContract as unknown as Contract) || initialContract;
  const payments =
    (livePayments as unknown as Payment[]) || initialPayments;
  const paymentPlans =
    (livePaymentPlans as unknown as PaymentPlan[]) || initialPaymentPlans;
  const reservations =
    (liveReservations as unknown as InventoryReservation[]) || initialReservations;
  const printOrders =
    (livePrintOrders as unknown as PrintingOrder[]) || initialPrintOrders;
  const auditLogs =
    (liveAuditLogs as unknown as AuditLogEntry[]) || initialAuditLogs;
  const isCancelled = contract.status === "da_huy";

  // ── Quick Action Modal State ──
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPrintForm, setShowPrintForm] = useState(false);
  const [showCostumeForm, setShowCostumeForm] = useState(false);

  const handleQuickAction = useCallback((key: string) => {
    switch (key) {
      case "payment":
        setShowPaymentForm(true);
        break;
      case "print":
        setShowPrintForm(true);
        break;
      case "costume":
        setShowCostumeForm(true);
        break;
      case "event":
        toast("Tính năng thêm sự kiện đang phát triển", "info");
        break;
      case "drive":
      case "note":
        toast("Tính năng đang phát triển", "info");
        break;
    }
  }, []);

  // subtotal computed in FinancialSummary desktop embed only

  // ── Linked State: Hoist auto-hide header logic ──
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const SCROLL_THRESHOLD = 15;

  // ── Merge tabs: detect when tabs leave natural position ──
  const [tabsMerged, setTabsMerged] = useState(false);
  const tabSentinelRef = useRef<HTMLDivElement>(null);

  // ── Hoisted tab state (shared between MobileTabNav + TopActionBar) ──
  const [activeTab, setActiveTab] = useState<string>("details");

  const handleTabClick = useCallback((tab: { key: string; sectionId: string }) => {
    setActiveTab(tab.key);
    const scrollEl = document.getElementById("main-scroll");
    const el = document.getElementById(tab.sectionId);
    if (el && scrollEl) {
      const offset = 56 + 8;
      const top = el.offsetTop - offset;
      scrollEl.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const scrollEl = document.getElementById("main-scroll");
    if (!scrollEl) return;

    const onScroll = () => {
      const currentY = scrollEl.scrollTop;
      const delta = currentY - lastScrollY.current;

      if (currentY < 56) {
        setHeaderVisible(true);
      } else if (delta > SCROLL_THRESHOLD) {
        setHeaderVisible(false);
      } else if (delta < -SCROLL_THRESHOLD) {
        setHeaderVisible(true);
      }

      lastScrollY.current = currentY;
    };

    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", onScroll);
  }, []);

  // Sentinel observer: detect when tab nav leaves viewport
  useEffect(() => {
    const sentinel = tabSentinelRef.current;
    const scrollEl = document.getElementById("main-scroll");
    if (!sentinel || !scrollEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => setTabsMerged(!entry.isIntersecting),
      { root: scrollEl, threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="main-container max-lg:pb-24 mobile-header-spacer">
      {/* Top Action Bar — Stitch header with title + badge */}
      <TopActionBar
        contractId={contract.id}
        contractCode={contract.contract_code}
        customerName={contract.customers?.full_name || "Khách hàng"}
        hasReceipts={payments.length > 0}
        status={contract.status}
        paymentStatus={contract.payment_status}
        isCancelled={isCancelled}
        headerVisible={headerVisible}
        tabsMerged={tabsMerged}
        activeTab={activeTab}
        onTabClick={handleTabClick}
      />

      {/* Cancel Banner (if cancelled) */}
      {isCancelled && (
        <CancelBanner
          contractId={contract.id}
          notes={contract.notes}
          updatedAt={contract.updated_at}
        />
      )}

      {/* Content with opacity when cancelled */}
      <div className={isCancelled ? "opacity-60" : ""}>

        {/* ════════════════════════════════════════ */}
        {/*  DESKTOP LAYOUT: 65/35 grid             */}
        {/* ════════════════════════════════════════ */}
        <div className="max-lg:hidden">
          <WorkflowStepper
            contract={contract}
            events={contract.contract_events || []}
          />
          <div className="detail-grid mt-6">
            {/* LEFT COLUMN (67%) — Info + Events + Actions */}
            <div className="detail-main">
              {/* Thông tin hợp đồng (Stitch: merged info card) */}
              <div className="card-base p-6">
                <SummaryCard
                  contract={contract}
                  customer={contract.customers || null}
                  embedded
                />
                <div className="h-px bg-border/30 my-4" />
                <CustomerInfoBlock
                  customer={contract.customers || null}
                  notes={contract.notes}
                  embedded
                />
              </div>

              {/* Lịch trình chi tiết */}
              <EventTimeline
                events={contract.contract_events || []}
                tasks={contract.work_tasks || []}
              />

              {/* Thao tác nhanh (Stitch: main column, after events) */}
              <QuickActionsGrid />

              {/* Service Details */}
              <ServiceDetailsBlock
                items={contract.contract_items || []}
                totalAmount={contract.total_amount}
                discountAmount={contract.discount_amount}
              />

              {/* Trang phục (Stitch: main column, last section) */}
              <CostumesBlock reservations={reservations} contractId={contract.id} />
            </div>

            {/* RIGHT COLUMN (33%) — Finance + Sidebar */}
            <div className="detail-sidebar">
              {/* Financial Dashboard + Payments inline (Stitch: 1 card) */}
              <FinancialDashboard
                totalAmount={contract.total_amount}
                paidAmount={contract.paid_amount}
                remainingAmount={contract.remaining_amount}
                payments={payments}
              />

              {/* In ấn */}
              <PrintOrdersBlock orders={printOrders} contractId={contract.id} />

              {/* File & Drive (Stitch: before Checklist) */}
              <FilesDrivePlaceholder />

              {/* Checklist (Stitch: after File/Drive) */}
              <ChecklistBlock tasks={contract.work_tasks || []} />

              {/* Hoạt động gần đây */}
              <ActivityLog logs={auditLogs} />
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════ */}
        {/*  MOBILE LAYOUT: stacked 1-col            */}
        {/* ════════════════════════════════════════ */}
        <div className="lg:hidden">
          <div className="flex flex-col gap-4 mt-4">
            {/* 1. SummaryCard compact — badges + tên KH (Stitch 59-71) */}
            <div id="section-details">
              <SummaryCard
                contract={contract}
                customer={contract.customers || null}
              />
            </div>

            {/* 2. FinancialDashboard — mobile variant (Stitch 72-101) */}
            <FinancialDashboard
              totalAmount={contract.total_amount}
              paidAmount={contract.paid_amount}
              remainingAmount={contract.remaining_amount}
            />

            {/* 3. WorkflowStepper (Stitch 103-137) */}
            <WorkflowStepper
              contract={contract}
              events={contract.contract_events || []}
            />
          </div>

          {/* Sentinel — detect when tabs leave natural position */}
          <div ref={tabSentinelRef} className="h-0 w-full" />

          {/* 4. MobileTabNav — sticky pills (Stitch 139-147) */}
          <MobileTabNav
            headerVisible={headerVisible}
            tabsMerged={tabsMerged}
            activeTab={activeTab}
            onTabClick={handleTabClick}
            setActiveTab={setActiveTab}
          />

          <div className="flex flex-col gap-4 px-0 mt-4">
            {/* 4. Lịch trình sự kiện (Stitch 149-182) */}
            <div id="section-events">
              <EventTimeline
                events={contract.contract_events || []}
                tasks={contract.work_tasks || []}
              />
            </div>

            {/* 5. Đơn hàng in ấn (Stitch 183-207) */}
            <div id="section-print">
              <PrintOrdersBlock orders={printOrders} contractId={contract.id} />
            </div>

            {/* 6. Checklist công việc (Stitch 208-247) */}
            <div id="section-checklist">
              <ChecklistBlock tasks={contract.work_tasks || []} />
            </div>

            {/* 7. Thao tác nhanh (Stitch 249-277) */}
            <div id="section-actions">
              <QuickActionsGrid onAction={handleQuickAction} />
            </div>

            {/* 8. Ghi chú (Phase 07B) */}
            <div id="section-notes">
              <NotesTimeline contractId={contract.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar (Stitch: sticky 2 buttons) */}
      <MobileBottomBar
        contractId={contract.id}
        isCancelled={isCancelled}
        remainingAmount={contract.remaining_amount}
      />

      {/* ── Quick Action Modals ── */}
      <PaymentReceiptForm
        isOpen={showPaymentForm}
        onClose={() => setShowPaymentForm(false)}
        contractId={contract.id}
        contractCode={contract.contract_code}
        remainingAmount={contract.remaining_amount}
        paymentPlans={paymentPlans}
      />
      <PrintingOrderForm
        isOpen={showPrintForm}
        onClose={() => setShowPrintForm(false)}
        contractId={contract.id}
        contractCode={contract.contract_code}
      />
      <InventoryReservationForm
        isOpen={showCostumeForm}
        onClose={() => setShowCostumeForm(false)}
        contractId={contract.id}
        contractCode={contract.contract_code}
      />
    </div>
  );
}
