"use client";

import SummaryCard from "./summary-card";
import CustomerInfoBlock from "./customer-info-block";
import ServiceDetailsBlock from "./service-details-block";
import FinancialDashboard from "./financial-dashboard";
import EventTimeline from "./event-timeline";
import WorkflowStepper from "./workflow-stepper";
import CostumesBlock from "./costumes-block";
import PrintOrdersBlock from "./print-orders-block";
import ActivityLog from "./activity-log";
import DriveGalleryBlock from "./drive-gallery-block";
import QuickActionsGrid from "./quick-actions-grid";
import MobileTabNav from "./mobile-tab-nav";
import NotesTimeline from "./notes-timeline";
import type {
  Contract,
  Payment,
  DressReservationRow,
  PrintingOrder,
  AuditLogEntry,
} from "@/types/contract";

// ═══════════════════════════════════════════
// Detail Layout Sections — Desktop + Mobile
// Extracted from contract-detail-client.tsx (V2 split)
// ═══════════════════════════════════════════

// ─── Common Props ─────────────────────────
interface LayoutProps {
  contract: Contract;
  payments: Payment[];
  reservations: DressReservationRow[];
  printOrders: PrintingOrder[];
  auditLogs: AuditLogEntry[];
  refreshContract: () => void;
  onPaymentClick: () => void;
  onAddEvent: () => void;
  onQuickAction: (key: string) => void;
}

// ─── Desktop Layout (65/35 grid) ──────────
export function DesktopLayout({
  contract,
  payments,
  reservations,
  printOrders,
  auditLogs,
  refreshContract,
  onPaymentClick,
  onAddEvent,
  onQuickAction,
}: LayoutProps) {
  return (
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
              brideName={contract.customers?.bride_name}
              groomName={contract.customers?.groom_name}
              bridePhone={contract.customers?.bride_phone}
              groomPhone={contract.customers?.groom_phone}
              brideHeight={contract.customers?.bride_height}
              brideWeight={contract.customers?.bride_weight}
              brideShoeSize={contract.customers?.bride_shoe_size}
              groomHeight={contract.customers?.groom_height}
              groomWeight={contract.customers?.groom_weight}
              groomShoeSize={contract.customers?.groom_shoe_size}
            />
          </div>

          {/* Lịch trình chi tiết */}
          <EventTimeline
            events={contract.contract_events || []}
            tasks={contract.work_tasks || []}
            onRefresh={refreshContract}
            onAddEvent={onAddEvent}
          />

          {/* Thao tác nhanh */}
          <QuickActionsGrid onAction={onQuickAction} />

          {/* Service Details */}
          <ServiceDetailsBlock
            items={contract.contract_items || []}
            totalAmount={contract.total_amount}
            discountAmount={contract.discount_amount}
          />

          {/* Trang phục */}
          <CostumesBlock reservations={reservations} contractId={contract.id} />

          {/* In ấn */}
          <PrintOrdersBlock orders={printOrders} contractId={contract.id} />
        </div>

        {/* RIGHT COLUMN (33%) — Finance + Sidebar */}
        <div className="detail-sidebar">
          <FinancialDashboard
            totalAmount={contract.total_amount}
            paidAmount={contract.paid_amount}
            remainingAmount={contract.remaining_amount}
            payments={payments}
            onPaymentClick={onPaymentClick}
            subtotal={contract.total_amount + (contract.discount_amount || 0)}
            discountAmount={contract.discount_amount}
          />

          <div id="section-drive">
            <DriveGalleryBlock contractId={contract.id} />
          </div>

          <ActivityLog logs={auditLogs} />

          <NotesTimeline contractId={contract.id} />
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Layout Props (extends) ────────
interface MobileLayoutProps extends LayoutProps {
  headerVisible: boolean;
  tabsMerged: boolean;
  activeTab: string;
  onTabClick: (tab: { key: string; sectionId: string }) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  tabSentinelRef: React.RefObject<HTMLDivElement | null>;
}

// ─── Mobile Layout (stacked 1-col) ────────
export function MobileLayout({
  contract,
  payments,
  reservations,
  printOrders,
  auditLogs,
  refreshContract,
  onPaymentClick,
  onAddEvent,
  onQuickAction,
  headerVisible,
  tabsMerged,
  activeTab,
  onTabClick,
  setActiveTab,
  tabSentinelRef,
}: MobileLayoutProps) {
  return (
    <div className="lg:hidden">
      <div className="flex flex-col gap-4">
        <div id="section-details">
          <SummaryCard
            contract={contract}
            customer={contract.customers || null}
          />
        </div>

        <FinancialDashboard
          totalAmount={contract.total_amount}
          paidAmount={contract.paid_amount}
          remainingAmount={contract.remaining_amount}
          payments={payments}
          onPaymentClick={onPaymentClick}
        />

        <WorkflowStepper
          contract={contract}
          events={contract.contract_events || []}
        />
      </div>

      {/* Sentinel */}
      <div ref={tabSentinelRef} className="h-0 w-full" />

      {/* MobileTabNav */}
      <MobileTabNav
        headerVisible={headerVisible}
        tabsMerged={tabsMerged}
        activeTab={activeTab}
        onTabClick={onTabClick}
        setActiveTab={setActiveTab}
      />

      <div className="flex flex-col gap-4 px-0 mt-4">
        <div id="section-events">
          <EventTimeline
            events={contract.contract_events || []}
            tasks={contract.work_tasks || []}
            onRefresh={refreshContract}
            onAddEvent={onAddEvent}
          />
        </div>

        <div id="section-actions">
          <QuickActionsGrid onAction={onQuickAction} />
        </div>

        <div id="section-drive-mobile">
          <DriveGalleryBlock contractId={contract.id} />
        </div>

        <div id="section-notes">
          <NotesTimeline contractId={contract.id} />
        </div>

        <ServiceDetailsBlock
          items={contract.contract_items || []}
          totalAmount={contract.total_amount}
          discountAmount={contract.discount_amount}
        />

        <CostumesBlock reservations={reservations} contractId={contract.id} />

        <div id="section-print">
          <PrintOrdersBlock orders={printOrders} contractId={contract.id} />
        </div>

        <ActivityLog logs={auditLogs} />
      </div>
    </div>
  );
}
