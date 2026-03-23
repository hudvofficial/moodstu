"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
import ContractActionsMenu from "./contract-actions-menu";
import { useSetHeaderSlots } from "@/contexts/header-slots-context";
import CancelBanner from "./cancel-banner";
import MobileBottomBar from "./mobile-bottom-bar";
import PaymentReceiptForm from "./payment-receipt-form";
import PrintingOrderForm from "./printing-order-form";
import InventoryReservationForm from "./inventory-reservation-form";
import AddEventModal from "./add-event-modal";
import { DesktopLayout, MobileLayout } from "./detail-layout-sections";

// ═══════════════════════════════════════════
// Contract Detail Client — SWR wrapper + state
// V2: Layout sections extracted to detail-layout-sections.tsx
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
    mutate: refreshContract,
  } = useContractDetail(params.id);

  // SWR fallback
  const contract = (liveContract as unknown as Contract) || initialContract;
  const payments = (livePayments as unknown as Payment[]) || initialPayments;
  const paymentPlans = (livePaymentPlans as unknown as PaymentPlan[]) || initialPaymentPlans;
  const reservations = (liveReservations as unknown as InventoryReservation[]) || initialReservations;
  const printOrders = (livePrintOrders as unknown as PrintingOrder[]) || initialPrintOrders;
  const auditLogs = (liveAuditLogs as unknown as AuditLogEntry[]) || initialAuditLogs;
  const isCancelled = contract.status === "da_huy";

  // ── Set header slots for mobile ──
  const setHeaderSlots = useSetHeaderSlots();
  useEffect(() => {
    setHeaderSlots({
      leftSlot: (
        <Link href="/contracts" className="lg:hidden btn-icon shrink-0">
          <ArrowLeft size={20} />
        </Link>
      ),
      titleOverride: contract.contract_code,
      hideSearch: true,
      rightSlot: (
        <ContractActionsMenu
          contractId={contract.id}
          contractCode={contract.contract_code}
          customerName={contract.customers?.full_name || "Khách hàng"}
          hasReceipts={payments.length > 0}
          isCancelled={isCancelled}
        />
      ),
    });
    return () => setHeaderSlots({});
  }, [setHeaderSlots, contract.id, contract.contract_code, contract.customers?.full_name, payments.length, isCancelled]);

  // ── Quick Action Modal State ──
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPrintForm, setShowPrintForm] = useState(false);
  const [showCostumeForm, setShowCostumeForm] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);

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
        setShowAddEventModal(true);
        break;
      case "drive": {
        const el = document.getElementById("section-drive-mobile")
          || document.getElementById("section-drive");
        const scrollEl = document.getElementById("main-scroll");
        if (el && scrollEl) {
          const offset = 56 + 8;
          scrollEl.scrollTo({ top: el.offsetTop - offset, behavior: "smooth" });
        }
        break;
      }
      case "note":
        toast("Tính năng đang phát triển", "info");
        break;
    }
  }, []);

  // ── Auto-hide header logic ──
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const SCROLL_THRESHOLD = 15;

  // ── Merge tabs: detect when tabs leave natural position ──
  const [tabsMerged, setTabsMerged] = useState(false);
  const tabSentinelRef = useRef<HTMLDivElement>(null);

  // ── Hoisted tab state ──
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

  // Sentinel observer
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

  // ── Common layout props ──
  const layoutProps = {
    contract,
    payments,
    reservations,
    printOrders,
    auditLogs,
    refreshContract: () => refreshContract(),
    onPaymentClick: () => setShowPaymentForm(true),
    onAddEvent: () => setShowAddEventModal(true),
    onQuickAction: handleQuickAction,
  };

  return (
    <div className="main-container max-lg:pb-24">
      <TopActionBar
        contractId={contract.id}
        contractCode={contract.contract_code}
        customerName={contract.customers?.full_name || "Khách hàng"}
        hasReceipts={payments.length > 0}
        status={contract.status}
        paymentStatus={contract.payment_status}
        isCancelled={isCancelled}
      />

      {isCancelled && (
        <CancelBanner
          contractId={contract.id}
          notes={contract.notes}
          updatedAt={contract.updated_at}
        />
      )}

      <div className={isCancelled ? "opacity-60" : ""}>
        <DesktopLayout {...layoutProps} />
        <MobileLayout
          {...layoutProps}
          headerVisible={headerVisible}
          tabsMerged={tabsMerged}
          activeTab={activeTab}
          onTabClick={handleTabClick}
          setActiveTab={setActiveTab}
          tabSentinelRef={tabSentinelRef}
        />
      </div>

      <MobileBottomBar
        contractId={contract.id}
        isCancelled={isCancelled}
        remainingAmount={contract.remaining_amount}
        onPaymentClick={() => setShowPaymentForm(true)}
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
      <AddEventModal
        isOpen={showAddEventModal}
        contractId={contract.id}
        onClose={() => setShowAddEventModal(false)}
        onSaved={() => refreshContract()}
      />
    </div>
  );
}
