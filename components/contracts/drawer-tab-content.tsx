"use client";

import { useState } from "react";
import {
  Phone,
  MapPin,
  Banknote,
  ExternalLink,
} from "lucide-react";
import { DrawerEventTimeline } from "@/components/contracts/drawer-event-timeline";
import { DrawerAssignments } from "@/components/contracts/drawer-assignments";
import { DrawerNotes } from "@/components/contracts/drawer-notes";
import { DrawerChecklist } from "@/components/contracts/drawer-checklist";
import { formatCurrency, formatDate, CURRENCY_SYMBOL } from "@/lib/utils";
import {
  getServiceLabel,
} from "@/types/contract-constants";
import type { ServiceType } from "@/types/contract";
import type { ContractListItem } from "./contract-drawer";
import { Button } from "@/components/ui/button";

// ═══════════════════════════════════════════
// DrawerContent + OperationsTabs
// Extracted from contract-drawer.tsx (V2 split)
// ═══════════════════════════════════════════

// ─── HELPERS ─────────────────────────────────────

function fmt(amount: number): string {
  return formatCurrency(amount) + " " + CURRENCY_SYMBOL;
}

// ─── CONTENT ─────────────────────────────────────

// ─── TYPES ───────────────────────────────────────

export interface DrawerEvent {
  id: string;
  event_type?: string;
  title?: string;
  event_date?: string;
  end_date?: string;
  location?: string;
  status?: string;
  notes?: string;
}

export interface DrawerChecklist {
  id: string;
  event_stage?: string;
  category?: string;
  item_name?: string;
  is_completed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DrawerWorkTask {
  id: string;
  contract_id?: string;
  event_id?: string;
  work_type?: string;
  status?: string;
  assignees?: { user_id: string; full_name?: string; role_in_task?: string }[];
}

interface DrawerContentProps {
  contract: ContractListItem;
  extra?: {
    events: DrawerEvent[];
    checklists: DrawerChecklist[];
    workTasks: DrawerWorkTask[];
    paymentPlans: unknown[];
  };
  isLoadingExtra?: boolean;
  onViewDetail: () => void;
  onHoverDetail?: () => void;
  onTrackPayment: () => void;
}

export function DrawerContent({
  contract: c,
  extra,
  isLoadingExtra = false,
  onViewDetail,
  onHoverDetail,
  onTrackPayment,
}: DrawerContentProps) {
  const totalAmount = c.total_amount || 0;
  const paidAmount = c.paid_amount || 0;
  const remainingAmount = c.remaining_amount || 0;
  const paidPct =
    totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;
  const isFullyPaid = remainingAmount === 0 && totalAmount > 0;

  const customer = c.customers;
  const workDate = c.work_date;

  // Heavy drawer sections are lazy-loaded; list data remains a lightweight fallback.
  const events = extra?.events?.length ? extra.events : c.contract_events || [];
  const checklists = extra?.checklists?.length
    ? extra.checklists
    : c.contract_checklists || [];
  const workTasks = extra?.workTasks?.length ? extra.workTasks : c.work_tasks || [];
  return (
    <div className="flex flex-col gap-5">

      {/* ── Section: Khách hàng ── */}
      <section className="card-base p-4">
        <Button unstyled onClick={onViewDetail} onMouseEnter={onHoverDetail} className="flex items-center gap-3 group w-full text-left">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-lg font-black group-hover:bg-primary group-hover:text-white transition-all shrink-0">
            {(customer?.full_name || "K")[0].toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-body-sm font-bold text-text-main group-hover:text-primary truncate">
              {customer?.full_name || "Chưa có"}
            </h3>
            <div className="flex items-center gap-3 text-tiny text-text-muted">
              {customer?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {customer.phone}
                </span>
              )}
              {customer?.address && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3" />
                  {customer.address}
                </span>
              )}
            </div>
          </div>
        </Button>

        {/* Pill cards */}
        <div className="flex gap-2 mt-3">
          <div className="flex-1 px-3 py-2 rounded-md bg-primary/5 border border-primary/10">
            <span className="text-tiny font-bold text-primary/70 uppercase block">Dịch vụ</span>
            <span className="text-body-sm font-bold text-primary truncate block">
              {getServiceLabel((c.service_type || "studio") as ServiceType)}
            </span>
          </div>
          <div className="flex-1 px-3 py-2 rounded-md bg-warning/5 border border-warning/10">
            <span className="text-tiny font-bold text-warning/70 uppercase block">Ngày làm</span>
            <span className="text-body-sm font-bold text-text-main truncate block">
              {workDate ? formatDate(workDate) : "—"}
            </span>
          </div>
        </div>
      </section>

      {/* ── Section: Thanh toán ── */}
      <section className="card-base p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-caption font-semibold text-text-secondary uppercase tracking-wide">
            Thanh toán
          </h4>
          <span className={`text-caption font-black ${isFullyPaid ? "text-success" : "text-primary"}`}>
            {paidPct}%
          </span>
        </div>

        {/* Amount grid */}
        <div className="flex items-stretch mb-3">
          <div className="flex-1 text-center">
            <span className="text-tiny font-bold text-text-muted uppercase block">Tổng</span>
            <span className="text-body-sm font-black text-text-main block">
              {fmt(totalAmount)}
            </span>
          </div>
          <div className="w-px bg-border/50 my-1" />
          <div className="flex-1 text-center">
            <span className="text-tiny font-bold text-text-muted uppercase block">Đã thu</span>
            <span className={`text-body-sm font-black block ${paidAmount > 0 ? "text-success" : "text-text-muted"}`}>
              {fmt(paidAmount)}
            </span>
          </div>
          <div className="w-px bg-border/50 my-1" />
          <div className="flex-1 text-center">
            <span className="text-tiny font-bold text-text-muted uppercase block">Còn lại</span>
            <span className={`text-body-sm font-black block ${isFullyPaid ? "text-success" : "text-error"}`}>
              {fmt(remainingAmount)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-border/30 overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-700 ${isFullyPaid ? "bg-success" : "bg-primary"}`}
            style={{ width: `${paidPct}%` }}
          />
        </div>

        <Button
          unstyled
          type="button"
          onClick={onTrackPayment}
          className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-success/10 px-4 py-3 text-caption font-bold uppercase tracking-wide text-text-secondary transition-colors hover:bg-success/15 hover:text-success active:scale-[0.99]"
        >
          <Banknote className="h-4 w-4 text-success" />
          Theo dõi thanh toán
        </Button>
      </section>

      {/* ── Section: Operations Tabs ── */}
      <OperationsTabs
        contractId={c.id}
        events={events}
        checklists={checklists}
        workTasks={workTasks}
        isLoading={isLoadingExtra}
      />

      {/* ── Section: Ghi chú ── */}
      {c.id && <DrawerNotes contractId={c.id} initialNotes={c.contract_notes} />}

      {/* ── Footer: Action button ── */}
      <div className="pt-2">
        <Button unstyled onClick={onViewDetail} onMouseEnter={onHoverDetail} className="btn btn-primary w-full gap-2">
          <ExternalLink className="w-4 h-4" />
          Chi tiết hợp đồng
        </Button>
      </div>
    </div>
  );
}

// ─── OPERATIONS TABS ─────────────────────────────

const TABS = [
  { key: "events", label: "📅 Sự kiện" },
  { key: "checklist", label: "✅ Checklist" },
  { key: "staff", label: "👥 Nhân sự" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function OperationsTabs({
  contractId,
  events,
  checklists,
  workTasks,
  isLoading,
}: {
  contractId?: string;
  events: DrawerEvent[];
  checklists: DrawerChecklist[];
  workTasks: DrawerWorkTask[];
  isLoading: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("events");

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-1 mb-3 bg-neutral-100/60 rounded-lg p-1">
        {TABS.map((tab) => (
          <Button
            unstyled
            type="button"
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 cursor-pointer rounded-md px-3 py-2 text-body-sm font-semibold transition-all active:scale-[0.98] ${
              activeTab === tab.key
                ? "bg-bg-base text-text-main shadow-md"
                : "text-text-muted hover:bg-bg-base/70 hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      {isLoading ? (
        <div className="mb-3 flex flex-col gap-2 rounded-lg bg-bg-subtle p-3">
          <div className="skeleton skeleton-text w-full" />
          <div className="skeleton skeleton-text w-3/4" />
        </div>
      ) : (
        <>
          {activeTab === "events" && (
            <DrawerEventTimeline events={events as unknown as React.ComponentProps<typeof DrawerEventTimeline>["events"]} />
          )}
          {activeTab === "checklist" && (
            <DrawerChecklist 
              contractId={contractId}
              items={checklists as unknown as React.ComponentProps<typeof DrawerChecklist>["items"]} 
            />
          )}
          {activeTab === "staff" && (
            <DrawerAssignments 
              tasks={workTasks as unknown as React.ComponentProps<typeof DrawerAssignments>["tasks"]} 
              events={events as unknown as React.ComponentProps<typeof DrawerAssignments>["events"]}
            />
          )}
        </>
      )}
    </div>
  );
}
