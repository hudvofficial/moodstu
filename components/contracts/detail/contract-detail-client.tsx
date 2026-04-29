"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useRealtime } from "@/hooks/use-realtime";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import {
  revalidateContractDetailCaches,
  useContractDetail,
  useActiveEmployees,
} from "@/lib/hooks/use-contracts";
import ContractDetailLoading from "@/app/(protected)/contracts/[id]/loading";
import type {
  Contract,
  Payment,
  PaymentPlan,
  DressReservationRow,
  PrintingOrder,
  AuditLogEntry,
  TaskStatus,
} from "@/types/contract";
import TopActionBar from "./top-action-bar";
import { useSetHeaderSlots } from "@/contexts/header-slots-context";
import CancelBanner from "./cancel-banner";
import MobileBottomBar from "./mobile-bottom-bar";
import { DesktopLayout, MobileLayout } from "./detail-layout-sections";

const ContractActionsMenu = dynamic(() => import("./contract-actions-menu"), {
  ssr: false,
  loading: () => <div className="h-9 w-9 shrink-0" aria-hidden="true" />,
});

const PaymentReceiptForm = dynamic(() => import("./payment-receipt-form"), {
  ssr: false,
});

const PrintingOrderForm = dynamic(() => import("./printing-order-form"), {
  ssr: false,
});

const DressReservationForm = dynamic(() => import("./dress-reservation-form"), {
  ssr: false,
});

const AddEventModal = dynamic(() => import("./add-event-modal"), {
  ssr: false,
});

const QuickNoteModal = dynamic(() => import("./quick-note-modal"), {
  ssr: false,
});

const CONTRACT_DETAIL_REFRESH_SETTLE_MS = 160;
const LOCAL_MUTATION_ECHO_MUTE_MS = 2000;
const EMPTY_PAYMENTS: Payment[] = [];
const EMPTY_PAYMENT_PLANS: PaymentPlan[] = [];
const EMPTY_RESERVATIONS: DressReservationRow[] = [];
const EMPTY_PRINT_ORDERS: PrintingOrder[] = [];
const EMPTY_AUDIT_LOGS: AuditLogEntry[] = [];

// ═══════════════════════════════════════════
// Contract Detail Client — SWR wrapper + state
// V2: Layout sections extracted to detail-layout-sections.tsx
// ═══════════════════════════════════════════

interface Props {
  contractId?: string;
  initialContract?: Contract;
  initialPayments?: Payment[];
  initialPaymentPlans?: PaymentPlan[];
  initialReservations?: DressReservationRow[];
  initialPrintOrders?: PrintingOrder[];
  initialAuditLogs?: AuditLogEntry[];
}

export default function ContractDetailClient({
  contractId,
  initialContract,
  initialPayments,
  initialPaymentPlans,
  initialReservations,
  initialPrintOrders,
  initialAuditLogs,
}: Props) {
  const params = useParams<{ id: string }>();
  const id = contractId || params.id;
  const {
    contract: liveContract,
    payments: livePayments,
    paymentPlans: livePaymentPlans,
    reservations: liveReservations,
    printOrders: livePrintOrders,
    auditLogs: liveAuditLogs,
    error: contractError,
    mutate: mutateContractDetail,
  } = useContractDetail(
    id,
    initialContract
      ? {
          contract: initialContract,
          payments: initialPayments || [],
          paymentPlans: initialPaymentPlans || [],
          reservations: initialReservations || [],
          printOrders: initialPrintOrders || [],
          auditLogs: initialAuditLogs || [],
        }
      : undefined,
  );

  // Client-side employees (cached 2 min)
  const activeEmployees = useActiveEmployees();

  const refreshCooldownUntilRef = useRef(0);
  const refreshSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const muteRealtimeUntilRef = useRef(0);

  const muteRealtimeEcho = useCallback(() => {
    muteRealtimeUntilRef.current = Math.max(
      muteRealtimeUntilRef.current,
      Date.now() + LOCAL_MUTATION_ECHO_MUTE_MS,
    );
    if (refreshSettleTimerRef.current) {
      clearTimeout(refreshSettleTimerRef.current);
      refreshSettleTimerRef.current = null;
    }
  }, []);

  // 📡 Realtime — auto-refresh on contract or receipt changes
  const refreshContractCaches = useCallback(() => {
    if (Date.now() < muteRealtimeUntilRef.current) return;

    const now = Date.now();

    if (now >= refreshCooldownUntilRef.current) {
      refreshCooldownUntilRef.current = now + CONTRACT_DETAIL_REFRESH_SETTLE_MS;
      void revalidateContractDetailCaches(id);
      return;
    }

    if (refreshSettleTimerRef.current) return;

    refreshSettleTimerRef.current = setTimeout(() => {
      refreshSettleTimerRef.current = null;
      refreshCooldownUntilRef.current = Date.now() + CONTRACT_DETAIL_REFRESH_SETTLE_MS;
      void revalidateContractDetailCaches(id);
    }, Math.max(refreshCooldownUntilRef.current - now, 0));
  }, [id]);

  // SWR fallback — may be null on cold start (client-first mode)
  const contract = (liveContract as unknown as Contract | null) ?? initialContract;
  const payments = (livePayments as unknown as Payment[] | null) ?? initialPayments ?? EMPTY_PAYMENTS;
  const paymentPlans = (livePaymentPlans as unknown as PaymentPlan[] | null) ?? initialPaymentPlans ?? EMPTY_PAYMENT_PLANS;
  const reservations = (liveReservations as unknown as DressReservationRow[] | null) ?? initialReservations ?? EMPTY_RESERVATIONS;
  const printOrders = (livePrintOrders as unknown as PrintingOrder[] | null) ?? initialPrintOrders ?? EMPTY_PRINT_ORDERS;
  const auditLogs = (liveAuditLogs as unknown as AuditLogEntry[] | null) ?? initialAuditLogs ?? EMPTY_AUDIT_LOGS;
  const renderedDetailRef = useRef({
    contract,
    payments,
    paymentPlans,
    reservations,
    printOrders,
    auditLogs,
  });

  useEffect(() => {
    renderedDetailRef.current = {
      contract,
      payments,
      paymentPlans,
      reservations,
      printOrders,
      auditLogs,
    };
  }, [contract, payments, paymentPlans, reservations, printOrders, auditLogs]);

  const isCancelled = contract?.status === "da_huy";
  const headerContractId = contract?.id;
  const headerContractCode = contract?.contract_code;
  const headerCustomerName = contract?.customers?.full_name || "KhĂ¡ch hĂ ng";

  const applyTaskStatusOptimistic = useCallback(
    (taskId: string, eventId: string, nextStatus: TaskStatus) => {
      muteRealtimeEcho();
      const completionDate =
        nextStatus === "hoan_thanh" ? new Date().toISOString() : null;

      void mutateContractDetail(
        (current) => {
          // SWR fallbackData doesn't populate cache → current may be undefined.
          // Fall back to building from current rendered props.
          const base = current ?? renderedDetailRef.current;
          if (!base.contract) return current;

          const nextTasks = (base.contract.work_tasks || []).map((task) =>
            task.id === taskId
              ? { ...task, status: nextStatus, completion_date: completionDate }
              : task,
          );
          const eventTasks = nextTasks.filter((task) => task.event_id === eventId);
          const allDone =
            eventTasks.length > 0 &&
            eventTasks.every((task) => task.status === "hoan_thanh");
          const anyInProgress = eventTasks.some((task) => task.status === "dang_lam");
          const nextEventStatus: TaskStatus = allDone
            ? "hoan_thanh"
            : anyInProgress
              ? "dang_lam"
              : "chua_lam";
          const nextEvents = (base.contract.contract_events || []).map((event) =>
            event.id === eventId ? { ...event, status: nextEventStatus } : event,
          );

          return {
            ...base,
            contract: {
              ...base.contract,
              work_tasks: nextTasks,
              contract_events: nextEvents,
            },
          };
        },
        { revalidate: false },
      );
    },
    [muteRealtimeEcho, mutateContractDetail],
  );

  useEffect(() => {
    return () => {
      if (refreshSettleTimerRef.current) {
        clearTimeout(refreshSettleTimerRef.current);
      }
    };
  }, []);

  useRealtime("contracts", { filter: `id=eq.${id}`, onChange: refreshContractCaches });
  useRealtime("payments", { filter: `contract_id=eq.${id}`, onChange: refreshContractCaches });
  useRealtime("contract_checklists", { filter: `contract_id=eq.${id}`, onChange: refreshContractCaches });
  useRealtime("contract_notes", { filter: `contract_id=eq.${id}`, onChange: refreshContractCaches });
  useRealtime("contract_events", { filter: `contract_id=eq.${id}`, onChange: refreshContractCaches });
  useRealtime("work_tasks", { filter: `contract_id=eq.${id}`, onChange: refreshContractCaches });
  useRealtime("payment_plans", { filter: `contract_id=eq.${id}`, onChange: refreshContractCaches });
  useRealtime("dress_reservations", { filter: `contract_id=eq.${id}`, onChange: refreshContractCaches });
  useRealtime("printing_orders", { filter: `contract_id=eq.${id}`, onChange: refreshContractCaches });

  // ── Set header slots for mobile ──
  const setHeaderSlots = useSetHeaderSlots();
  useEffect(() => {
    if (!headerContractId || !headerContractCode) return;
    setHeaderSlots({
      leftSlot: (
        <Link href="/contracts" className="lg:hidden btn-icon shrink-0">
          <ArrowLeft size={20} />
        </Link>
      ),
      titleOverride: headerContractCode,
      hideSearch: true,
      rightSlot: (
        <ContractActionsMenu
          contractId={headerContractId}
          contractCode={headerContractCode}
          customerName={contract.customers?.full_name || "Khách hàng"}
          hasReceipts={payments.length > 0}
          isCancelled={isCancelled}
        />
      ),
    });
    return () => setHeaderSlots({});
  }, [setHeaderSlots, contract, headerContractId, headerContractCode, headerCustomerName, payments.length, isCancelled]);

  // ── Quick Action Modal State ──
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPrintForm, setShowPrintForm] = useState(false);
  const [showCostumeForm, setShowCostumeForm] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

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
        setShowNoteModal(true);
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

  // Loading/error guards — placed after all hooks to satisfy React's Rules of Hooks.
  if (!contract && contractError) {
    const message = contractError instanceof Error
      ? contractError.message
      : "Không tìm thấy hoặc không thể tải hợp đồng.";

    return (
      <div className="main-container max-w-2xl">
        <div className="card-base p-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-text-main">Không tải được hợp đồng</h1>
            <p className="text-body-sm text-text-muted">{message}</p>
          </div>
          <Link href="/contracts" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  // Loading guard — show skeleton while SWR fetches on cold start.
  // MUST be placed AFTER all hooks to satisfy React's Rules of Hooks
  if (!contract) {
    return <ContractDetailLoading />;
  }

  // ── Common layout props ──
  const layoutProps = {
    contract,
    payments,
    reservations,
    printOrders,
    auditLogs,
    activeEmployees,
    refreshContract: refreshContractCaches,
    onTaskStatusChange: applyTaskStatusOptimistic,
    onPaymentClick: () => setShowPaymentForm(true),
    onAddEvent: () => setShowAddEventModal(true),
    onQuickAction: handleQuickAction,
    onMuteRealtime: muteRealtimeEcho,
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
      {showPaymentForm && (
        <PaymentReceiptForm
          isOpen={showPaymentForm}
          onClose={() => setShowPaymentForm(false)}
          contractId={contract.id}
          contractCode={contract.contract_code}
          remainingAmount={contract.remaining_amount}
          paymentPlans={paymentPlans}
        />
      )}
      {showPrintForm && (
        <PrintingOrderForm
          isOpen={showPrintForm}
          onClose={() => setShowPrintForm(false)}
          contractId={contract.id}
          contractCode={contract.contract_code}
        />
      )}
      {showCostumeForm && (
        <DressReservationForm
          isOpen={showCostumeForm}
          onClose={() => setShowCostumeForm(false)}
          contractId={contract.id}
          contractCode={contract.contract_code}
        />
      )}
      {showAddEventModal && (
        <AddEventModal
          isOpen={showAddEventModal}
          contractId={contract.id}
          onClose={() => setShowAddEventModal(false)}
          onSaved={refreshContractCaches}
        />
      )}
      {showNoteModal && (
        <QuickNoteModal
          isOpen={showNoteModal}
          contractId={contract.id}
          onClose={() => setShowNoteModal(false)}
          onSaved={refreshContractCaches}
        />
      )}
    </div>
  );
}
