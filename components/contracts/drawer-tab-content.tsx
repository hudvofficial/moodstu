"use client";

import { useState } from "react";
import {
  Phone,
  MapPin,
  CheckCircle,
  Circle,
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

// ═══════════════════════════════════════════
// DrawerContent + OperationsTabs
// Extracted from contract-drawer.tsx (V2 split)
// ═══════════════════════════════════════════

// ─── HELPERS ─────────────────────────────────────

function fmt(amount: number): string {
  return formatCurrency(amount) + " " + CURRENCY_SYMBOL;
}

// ─── CONTENT ─────────────────────────────────────

interface DrawerContentProps {
  contract: ContractListItem;
  onViewDetail: () => void;
}

export function DrawerContent({ contract: c, onViewDetail }: DrawerContentProps) {
  const totalAmount = c.total_amount || 0;
  const paidAmount = c.paid_amount || 0;
  const remainingAmount = c.remaining_amount || 0;
  const paidPct =
    totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;
  const isFullyPaid = remainingAmount === 0 && totalAmount > 0;

  const customer = c.customers;
  const workDate = c.work_date;

  // All drawer sections from list data (0ms)
  const events = c.contract_events || [];
  const checklists = c.contract_checklists || [];
  const workTasks = c.work_tasks || [];
  const paymentPlans = c.payment_plans || [];

  return (
    <div className="flex flex-col gap-5">

      {/* ── Section: Khách hàng ── */}
      <section className="card-base p-4">
        <button onClick={onViewDetail} className="flex items-center gap-3 group w-full text-left">
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
        </button>

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
            <span className="text-body-sm font-black text-success block">
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

        {/* Payment schedule */}
        {paymentPlans.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-2 border-t border-dashed border-border/50">
            {paymentPlans.map((plan) => {
              const p = plan as Record<string, unknown>;
              const isPaid = p.status === "paid";
              return (
                <div key={String(p.id)} className="flex items-center gap-2">
                  {isPaid ? (
                    <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  )}
                  <span className={`text-tiny font-medium flex-1 ${isPaid ? "text-text-muted line-through" : "text-text-main"}`}>
                    {(p.stage_name as string) || "Đợt"}
                  </span>
                  <span className="text-tiny font-bold text-text-main">
                    {fmt(Number(p.amount) || 0)}
                  </span>
                  {typeof p.due_date === "string" && p.due_date && !isPaid && (
                    <span className="text-tiny text-text-muted">
                      ({formatDate(p.due_date)})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section: Operations Tabs ── */}
      <OperationsTabs
        events={events}
        checklists={checklists}
        workTasks={workTasks}
      />

      {/* ── Section: Ghi chú ── */}
      {c.id && <DrawerNotes contractId={c.id} initialNotes={c.contract_notes} />}

      {/* ── Footer: Action button ── */}
      <div className="pt-2">
        <button onClick={onViewDetail} className="btn btn-primary w-full gap-2">
          <ExternalLink className="w-4 h-4" />
          Xem chi tiết hồ sơ
        </button>
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
  events,
  checklists,
  workTasks,
}: {
  events: Record<string, unknown>[];
  checklists: Record<string, unknown>[];
  workTasks: Record<string, unknown>[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("events");

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-1 mb-3 bg-neutral-100/60 rounded-lg p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-3 rounded-md text-body-sm font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-bg-base text-text-main shadow-md"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "events" && (
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        <DrawerEventTimeline events={events as any[]} />
      )}
      {activeTab === "checklist" && (
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        <DrawerChecklist items={checklists as any[]} />
      )}
      {activeTab === "staff" && (
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        <DrawerAssignments tasks={workTasks as any[]} />
      )}
    </div>
  );
}
