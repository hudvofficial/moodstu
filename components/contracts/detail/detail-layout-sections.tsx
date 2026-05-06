"use client";

import dynamic from "next/dynamic";
import SummaryCard from "./summary-card";
import CustomerInfoBlock from "./customer-info-block";
import FinancialDashboard from "./financial-dashboard";
import PaymentPlanCard from "./payment-plan-card";
import PaymentReceiptsCard from "./payment-receipts-card";
import WorkflowStepper from "./workflow-stepper";
import QuickActionsGrid from "./quick-actions-grid";
import MobileTabNav from "./mobile-tab-nav";
import { SkeletonCard } from "@/components/ui/skeleton";
import type {
  Contract,
  Payment,
  PaymentPlan,
  DressReservationRow,
  PrintingOrder,
  TaskStatus,
} from "@/types/contract";
import type { ActiveEmployee } from "@/types/employee";

const CostumesBlock = dynamic(() => import("./costumes-block"), {
  ssr: false,
  loading: () => <SkeletonCard className="h-64" />,
});

const DriveGalleryBlock = dynamic(() => import("./drive-gallery-block"), {
  ssr: false,
  loading: () => <SkeletonCard className="h-64" />,
});

const EventTimeline = dynamic(() => import("./event-timeline"), {
  ssr: false,
  loading: () => <SkeletonCard className="h-80" />,
});

const NotesTimeline = dynamic(() => import("./notes-timeline"), {
  ssr: false,
  loading: () => <SkeletonCard className="h-64" />,
});

const PrintOrdersBlock = dynamic(() => import("./print-orders-block"), {
  ssr: false,
  loading: () => <SkeletonCard className="h-64" />,
});

const ServiceDetailsBlock = dynamic(() => import("./service-details-block"), {
  ssr: false,
  loading: () => <SkeletonCard className="h-64" />,
});

// ═══════════════════════════════════════════
// Detail Layout Sections — Desktop + Mobile
// Extracted from contract-detail-client.tsx (V2 split)
// ═══════════════════════════════════════════

// ─── Common Props ─────────────────────────
interface LayoutProps {
  contract: Contract;
  payments: Payment[];
  paymentPlans: PaymentPlan[];
  reservations: DressReservationRow[];
  printOrders: PrintingOrder[];
  activeEmployees?: ActiveEmployee[];
  refreshContract: () => void;
  onTaskStatusChange: (taskId: string, eventId: string, status: TaskStatus) => void;
  onPaymentClick: () => void;
  onCollectPlan?: (planId?: string) => void;
  onAddEvent: () => void;
  onQuickAction: (key: string) => void;
  onMuteRealtime?: () => void;
}

// ─── Desktop Layout (65/35 grid) ──────────
export function DesktopLayout({
  contract,
  payments,
  paymentPlans,
  reservations,
  printOrders,
  activeEmployees,
  refreshContract,
  onTaskStatusChange,
  onPaymentClick,
  onCollectPlan,
  onAddEvent,
  onQuickAction,
  onMuteRealtime,
}: LayoutProps) {
  const taskCost = (contract.work_tasks || []).reduce((sum, task) => sum + (Number(task.cost) || 0), 0);
  const estimatedProfit = taskCost > 0 ? contract.total_amount - taskCost : null;

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
            activeEmployees={activeEmployees}
            onRefresh={refreshContract}
            onTaskStatusChange={onTaskStatusChange}
            onAddEvent={onAddEvent}
          />

          {/* Thao tác nhanh */}
          <QuickActionsGrid
            onAction={onQuickAction}
            paymentLabel={contract.remaining_amount > 0 ? "Thu tiền" : "Phát sinh"}
          />

          {/* Service Details */}
          <ServiceDetailsBlock
            items={contract.contract_items || []}
            totalAmount={contract.total_amount}
            discountAmount={contract.discount_amount}
          />

          {/* Trang phục */}
          <CostumesBlock reservations={reservations} contractId={contract.id} onStatusChange={onMuteRealtime} />

          {/* In ấn */}
          <PrintOrdersBlock orders={printOrders} contractId={contract.id} onStatusChange={onMuteRealtime} />
        </div>

        {/* RIGHT COLUMN (33%) — Finance + Sidebar */}
        <div className="detail-sidebar">
          <div data-section-payment className="flex flex-col gap-6">
            <FinancialDashboard
              totalAmount={contract.total_amount}
              paidAmount={contract.paid_amount}
              remainingAmount={contract.remaining_amount}
              onPaymentClick={onPaymentClick}
              subtotal={contract.total_amount + (contract.discount_amount || 0)}
              discountAmount={contract.discount_amount}
              estimatedProfit={estimatedProfit}
            />

            <PaymentPlanCard
              paymentPlans={paymentPlans}
              onCollectPlan={(planId) => onCollectPlan?.(planId)}
            />

            <PaymentReceiptsCard payments={payments} />
          </div>

          <div id="section-drive">
            <DriveGalleryBlock contractId={contract.id} />
          </div>

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
  paymentPlans,
  reservations,
  printOrders,
  activeEmployees,
  refreshContract,
  onTaskStatusChange,
  onPaymentClick,
  onCollectPlan,
  onAddEvent,
  onQuickAction,
  onMuteRealtime,
  headerVisible,
  tabsMerged,
  activeTab,
  onTabClick,
  setActiveTab,
  tabSentinelRef,
}: MobileLayoutProps) {
  const taskCost = (contract.work_tasks || []).reduce((sum, task) => sum + (Number(task.cost) || 0), 0);
  const estimatedProfit = taskCost > 0 ? contract.total_amount - taskCost : null;

  return (
    <div className="lg:hidden">
      <div className="flex flex-col gap-4">
        <div id="section-details">
          <SummaryCard
            contract={contract}
            customer={contract.customers || null}
          />
        </div>

        <div data-section-payment className="flex flex-col gap-4">
          <FinancialDashboard
            totalAmount={contract.total_amount}
            paidAmount={contract.paid_amount}
            remainingAmount={contract.remaining_amount}
            onPaymentClick={onPaymentClick}
            subtotal={contract.total_amount + (contract.discount_amount || 0)}
            discountAmount={contract.discount_amount}
            estimatedProfit={estimatedProfit}
          />

          <PaymentPlanCard
            paymentPlans={paymentPlans}
            onCollectPlan={(planId) => onCollectPlan?.(planId)}
          />

          <PaymentReceiptsCard payments={payments} />
        </div>

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
            activeEmployees={activeEmployees}
            onRefresh={refreshContract}
            onTaskStatusChange={onTaskStatusChange}
            onAddEvent={onAddEvent}
          />
        </div>

        <div id="section-actions">
          <QuickActionsGrid
            onAction={onQuickAction}
            paymentLabel={contract.remaining_amount > 0 ? "Thu tiền" : "Phát sinh"}
          />
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

        <CostumesBlock reservations={reservations} contractId={contract.id} onStatusChange={onMuteRealtime} />

        <div id="section-print">
          <PrintOrdersBlock orders={printOrders} contractId={contract.id} onStatusChange={onMuteRealtime} />
        </div>
      </div>
    </div>
  );
}
