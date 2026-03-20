"use client";

/**
 * 📋 ContractDrawer — Quick preview from contract list
 *
 * Uses useContractDetail() SWR hook (reuses getContractById server action).
 * Displays: header, customer info, financials, payment timeline, footer nav.
 */

import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  CalendarCheck,
  Calendar,
  MapPin,
  Printer,
  ExternalLink,
  Pencil,
  CheckCircle,
  Circle,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { DrawerEventTimeline } from "@/components/contracts/drawer-event-timeline";
import { DrawerAssignments } from "@/components/contracts/drawer-assignments";
import { DrawerNotes } from "@/components/contracts/drawer-notes";
import { DrawerChecklist } from "@/components/contracts/drawer-checklist";
import { useContractDetail } from "@/lib/hooks/use-contracts";
import { formatCurrency, formatDate, CURRENCY_SYMBOL } from "@/lib/utils";
import {
  getStatusLabel,
  getServiceLabel,
  CONTRACT_STATUS_MAP,
} from "@/types/contract-constants";
import type { ContractStatus, ServiceType } from "@/types/contract";

// ─── TYPES ───────────────────────────────────────

interface ContractDrawerProps {
  contractId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// ─── HELPERS ─────────────────────────────────────

function fmt(amount: number): string {
  return formatCurrency(amount) + " " + CURRENCY_SYMBOL;
}

function getStatusVariant(
  status: ContractStatus
): "info" | "warning" | "success" | "error" {
  return CONTRACT_STATUS_MAP[status]?.variant || "info";
}

// ─── SKELETON ────────────────────────────────────

function DrawerSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="skeleton skeleton-title w-48" />
      <div className="skeleton skeleton-text w-full" />
      <div className="skeleton skeleton-text w-3/4" />
      <div className="skeleton h-2 w-full rounded-full mt-2" />
      <div className="skeleton skeleton-text w-2/3 mt-4" />
      <div className="skeleton skeleton-text w-full" />
      <div className="skeleton skeleton-text w-full" />
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────

export function ContractDrawer({
  contractId,
  isOpen,
  onClose,
}: ContractDrawerProps) {
  const router = useRouter();
  const { contract, paymentPlans, isLoading } =
    useContractDetail(contractId);

  const c = contract as Record<string, unknown> | null;

  // ── Drawer title: Mã HĐ ──
  const contractCode = (c?.contract_code as string) || "...";

  // Header right: print button
  const headerRight = contractId ? (
    <a
      href={`/contracts/${contractId}/print`}
      target="_blank"
      rel="noopener noreferrer"
      className="p-1.5 rounded-lg hover:bg-hover transition-colors"
      title="In hợp đồng"
    >
      <Printer className="w-4 h-4 text-text-secondary" />
    </a>
  ) : null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={contractCode} headerRight={headerRight}>
      {isLoading || !c ? (
        <DrawerSkeleton />
      ) : (
        <DrawerContent
          contract={c}
          contractId={contractId!}
          paymentPlans={paymentPlans as Record<string, unknown>[]}
          onViewDetail={() => {
            onClose();
            router.push(`/contracts/${contractId}`);
          }}
          onEdit={() => {
            onClose();
            router.push(`/contracts/${contractId}/edit`);
          }}
        />
      )}
    </Drawer>
  );
}

// ─── CONTENT (split to keep main < 250 LOC) ─────

function DrawerContent({
  contract: c,
  contractId,
  paymentPlans,
  onViewDetail,
  onEdit,
}: {
  contract: Record<string, unknown>;
  contractId: string;
  paymentPlans: Record<string, unknown>[];
  onViewDetail: () => void;
  onEdit: () => void;
}) {
  const status = (c.status as ContractStatus) || "cho_xu_ly";
  const totalAmount = Number(c.total_amount) || 0;
  const paidAmount = Number(c.paid_amount) || 0;
  const remainingAmount = Number(c.remaining_amount) || 0;
  const paidPct =
    totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;
  const isFullyPaid = remainingAmount === 0 && totalAmount > 0;

  // Customer info from FK join
  const customer = c.customers as {
    full_name?: string;
    phone?: string;
    address?: string;
  } | null;

  // Date fields
  const workDate = c.work_date as string | null;
  const dressReturnDate = c.dress_return_date as string | null;

  // Events from FK join
  const contractEvents = (c.contract_events || []) as Array<{
    id: string;
    event_type: string;
    title?: string;
    event_date: string | null;
    end_date?: string | null;
    location: string | null;
    status: string;
    notes?: string | null;
  }>;

  // Work tasks from FK join
  const workTasks = (c.work_tasks || []) as Array<{
    id: string;
    work_type: string;
    assigned_to: string | null;
    status: string;
    deadline: string | null;
    start_date?: string | null;
    completion_date?: string | null;
    cost: number;
    notes: string | null;
    employees?: { id: string; full_name: string } | null;
  }>;

  // Checklists from FK join
  const checklists = (c.contract_checklists || []) as Array<{
    id: string;
    event_stage: string | null;
    category: string;
    item_name: string;
    is_completed: boolean;
  }>;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Status badge ── */}
      <div>
        <Badge variant={getStatusVariant(status)} dot>
          {getStatusLabel(status)}
        </Badge>
      </div>

      {/* ── Section: Khách hàng ── */}
      <section className="card-base p-4">
        <h4 className="text-caption font-semibold text-text-secondary mb-3 uppercase tracking-wide">
          Khách hàng
        </h4>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-text-muted shrink-0" />
            <span className="text-body-sm font-medium text-text-main">
              {customer?.full_name || "Chưa có"}
            </span>
          </div>
          {customer?.phone && (
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-text-muted shrink-0" />
              <span className="text-body-sm text-text-secondary">
                {customer.phone}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <CalendarCheck className="w-4 h-4 text-text-muted shrink-0" />
            <span className="text-body-sm text-text-secondary">
              {getServiceLabel(
                (c.service_type as ServiceType) || "studio"
              )}
            </span>
          </div>
          {customer?.address && (
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-text-muted shrink-0" />
              <span className="text-body-sm text-text-secondary truncate">
                {customer.address}
              </span>
            </div>
          )}
          {workDate && (
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-text-muted shrink-0" />
              <span className="text-body-sm text-text-secondary">
                Ngày làm: {formatDate(workDate)}
              </span>
            </div>
          )}
          {dressReturnDate && (
            <div className="flex items-center gap-2.5">
              <CalendarCheck className="w-4 h-4 text-text-muted shrink-0" />
              <span className="text-body-sm text-text-secondary">
                Trả đồ: {formatDate(dressReturnDate)}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Section: Tài chính ── */}
      <section className="card-base p-4">
        <h4 className="text-caption font-semibold text-text-secondary mb-3 uppercase tracking-wide">
          Tài chính
        </h4>

        {/* Amount grid */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <p className="text-tiny text-text-muted">Tổng</p>
            <p className="text-body-sm font-bold text-text-main">
              {fmt(totalAmount)}
            </p>
          </div>
          <div>
            <p className="text-tiny text-text-muted">Đã thu</p>
            <p className="text-body-sm font-bold text-success">
              {fmt(paidAmount)}
            </p>
          </div>
          <div>
            <p className="text-tiny text-text-muted">Còn lại</p>
            <p
              className={`text-body-sm font-bold ${
                isFullyPaid ? "text-success" : "text-error"
              }`}
            >
              {fmt(remainingAmount)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-border/30 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isFullyPaid ? "bg-success" : "bg-primary"
            }`}
            style={{ width: `${paidPct}%` }}
          />
        </div>
        <p className="text-tiny text-text-muted mt-1 text-right">
          {paidPct}% đã thanh toán
        </p>
      </section>

      {/* ── Section: Event Timeline ── */}
      <DrawerEventTimeline events={contractEvents} />

      {/* ── Section: Checklist ── */}
      <DrawerChecklist items={checklists} />

      {/* ── Section: Timeline thanh toán ── */}
      <section className="card-base p-4">
        <h4 className="text-caption font-semibold text-text-secondary mb-3 uppercase tracking-wide">
          Lịch thanh toán
        </h4>

        {paymentPlans.length === 0 ? (
          <p className="text-body-sm text-text-muted italic">
            Chưa có lịch thanh toán
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {paymentPlans.map((plan) => {
              const planId = plan.id as string;
              const label = (plan.label as string) || "Đợt thanh toán";
              const amount = Number(plan.amount) || 0;
              const isPaid = (plan.status as string) === "paid";
              const dueDate = plan.due_date as string | null;

              return (
                <div key={planId} className="flex items-start gap-2.5">
                  {isPaid ? (
                    <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-body-sm font-medium ${
                          isPaid ? "text-text-muted line-through" : "text-text-main"
                        }`}
                      >
                        {label}
                      </span>
                      <span className="text-body-sm font-semibold text-text-main">
                        {fmt(amount)}
                      </span>
                    </div>
                    {dueDate && (
                      <p className="text-tiny text-text-muted">
                        {isPaid ? "Đã thu" : "Hạn"}: {formatDate(dueDate)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section: Nhân sự phân công ── */}
      <DrawerAssignments tasks={workTasks} />

      {/* ── Section: Ghi chú ── */}
      {contractId && <DrawerNotes contractId={contractId} />}

      {/* ── Footer: Action buttons ── */}
      <div className="flex gap-3 pt-2">
        <button onClick={onViewDetail} className="btn btn-primary flex-1 gap-2">
          <ExternalLink className="w-4 h-4" />
          Xem chi tiết
        </button>
        <button onClick={onEdit} className="btn btn-secondary flex-1 gap-2">
          <Pencil className="w-4 h-4" />
          Sửa
        </button>
      </div>
    </div>
  );
}
