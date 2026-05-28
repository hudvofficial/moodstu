"use client";

import { Suspense, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import useSWR from "swr";
import {
  ChevronRight,
  Factory,
  MapPin,
  PauseCircle,
  Pencil,
  Phone,
  PlayCircle,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Trash2,
  WalletCards,
  Wrench,
  Layers,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/ux-states";
import { FAB } from "@/components/ui/fab";
import { StatsBar } from "@/components/ui/stats-bar";
import { Button } from "@/components/ui/button";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { fetchLabsList } from "@/app/actions/lab-queries";
import { toggleLabStatus, deleteLab } from "@/app/actions/lab-mutations";
import { cacheKeys } from "@/lib/swr";
import { toast } from "@/lib/toast-utils";
import type { Lab } from "@/types/printing";
import { LAB_STATUS_LABELS } from "@/types/printing-constants";
import { Badge } from "@/components/ui/badge";
import { cn, formatVnd } from "@/lib/utils";

const LabFormModal = dynamic(
  () => import("@/components/printing/labs/lab-form-modal"),
  { ssr: false },
);

const LabPaymentModal = dynamic(
  () => import("@/components/printing/labs/lab-payment-modal").then(mod => ({ default: mod.LabPaymentModal })),
  { ssr: false },
);

const LabDetailDrawer = dynamic(
  () => import("@/components/printing/labs/lab-detail-drawer").then(mod => ({ default: mod.LabDetailDrawer })),
  { ssr: false },
);

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type StatusFilter = "all" | "active" | "inactive" | "debt" | "no_services";
type SortMode = "debt_desc" | "unpaid_desc" | "services_desc" | "name_asc";

interface Props {
  initialLabs: Lab[];
}

const SORT_OPTIONS = [
  { value: "debt_desc", label: "Nợ cao nhất" },
  { value: "unpaid_desc", label: "Đơn chưa trả nhiều nhất" },
  { value: "services_desc", label: "Nhiều dịch vụ nhất" },
  { value: "name_asc", label: "Tên A-Z" },
];





interface LabCardProps {
  lab: Lab;
  debt: number;
  onEdit: (lab: Lab) => void;
  onToggleStatus: (lab: Lab) => void;
  onDelete: (lab: Lab) => void;
  onPayDebt?: (lab: Lab) => void;
  onViewDetail?: (lab: Lab) => void;
}

function LabCard({ lab, debt, onEdit, onToggleStatus, onDelete, onPayDebt, onViewDetail }: LabCardProps) {
  const isActive = lab.status === "active";
  const statusActionLabel = isActive ? "Tạm dừng" : "Kích hoạt";
  const StatusIcon = isActive ? PauseCircle : PlayCircle;

  return (
    <article
      className={cn(
        "group relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-border bg-bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg",
        !isActive && "opacity-60 grayscale-[0.2]",
      )}
    >
      <div className="flex flex-1 flex-col p-5">
        {/* Header: Brand & Identity & Contact */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <Printer className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 text-h3 font-semibold text-text-primary transition-colors group-hover:text-primary">
                  {lab.lab_name}
                </h3>
                {debt > 0 && (
                  <Badge variant="warning" dot className="shrink-0 px-2 py-0.5 text-micro uppercase tracking-wider mt-0.5">
                    Có nợ
                  </Badge>
                )}
              </div>
              
              {/* Contact Info Grouped */}
              <div className="mt-2 flex flex-col gap-1 text-body-sm text-text-secondary sm:flex-row sm:items-center sm:gap-2">
                <span className="font-medium line-clamp-1">{lab.contact_person || "Chưa có người LH"}</span>
                {lab.phone && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="hidden sm:inline text-text-muted/50">•</span>
                    <Phone className="h-3.5 w-3.5 shrink-0 text-text-muted sm:hidden" />
                    <span className="font-medium text-text-primary">{lab.phone}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-1.5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex items-start gap-1.5 text-body-sm text-text-secondary">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-text-muted mt-0.5" />
                  <span className="line-clamp-2 sm:line-clamp-1">{lab.address || "Chưa có địa chỉ"}</span>
                </div>
                <div className="flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-micro font-semibold text-primary shrink-0">
                  <Layers className="h-3 w-3 shrink-0" />
                  <span>{lab.serviceCount > 0 ? `${lab.serviceCount} dịch vụ` : "Chưa có giá"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Actions on Hover */}
          <div className="absolute right-3 top-3 flex shrink-0 items-center gap-0.5 rounded-xl bg-bg-card/80 p-1 backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100 shadow-sm border border-border/50">
            <Button
              unstyled
              type="button"
              className="btn-icon h-8 w-8 min-w-8 text-text-secondary hover:bg-bg-hover hover:text-primary"
              onClick={() => onEdit(lab)}
              aria-label={`Sửa ${lab.lab_name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              unstyled
              type="button"
              className="btn-icon h-8 w-8 min-w-8 text-text-secondary hover:bg-bg-hover hover:text-primary"
              onClick={() => onToggleStatus(lab)}
              aria-label={`${statusActionLabel} ${lab.lab_name}`}
              title={statusActionLabel}
            >
              <StatusIcon className="h-4 w-4" />
            </Button>
            <Button
              unstyled
              type="button"
              className="btn-icon h-8 w-8 min-w-8 text-text-secondary hover:bg-error/10 hover:text-error"
              onClick={() => onDelete(lab)}
              aria-label={`Xóa ${lab.lab_name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>


        {/* Stats Grid */}
        <div className="mt-auto pt-5">
          <div className="flex rounded-xl bg-surface py-3.5">
            <div className="flex flex-1 flex-col items-center justify-center border-r border-border/50">
              <span className="text-micro font-semibold uppercase tracking-wider text-text-muted">Đơn treo</span>
              <span className="mt-1 text-h2 font-bold tabular-nums text-primary">{lab.unpaidOrders}</span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center">
              <span className="text-micro font-semibold uppercase tracking-wider text-text-muted">Công nợ</span>
              <span className={cn("mt-1 text-h3 font-bold tabular-nums", debt > 0 ? "text-error" : "text-text-primary")}>
                {formatVnd(debt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex border-t border-border bg-bg-card">
        {debt > 0 && onPayDebt && (
          <Button
            unstyled
            type="button"
            className="group/pay flex min-h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 border-r border-border bg-primary/5 px-4 py-3 transition-colors hover:bg-primary/15"
            onClick={(e) => {
              e.stopPropagation();
              onPayDebt(lab);
            }}
          >
            <WalletCards className="h-4 w-4 text-primary transition-transform group-hover/pay:scale-110" />
            <span className="text-xs font-bold uppercase tracking-wide text-primary">Thanh toán</span>
          </Button>
        )}
        <Button
          unstyled
          type="button"
          className={cn(
            "group/detail flex min-h-[52px] cursor-pointer items-center justify-center gap-2 bg-transparent px-4 py-3 transition-colors hover:bg-bg-hover",
            debt > 0 && onPayDebt ? "flex-1" : "w-full"
          )}
          onClick={() => onViewDetail ? onViewDetail(lab) : onEdit(lab)}
        >
          <span className="text-xs font-bold uppercase tracking-wide text-text-secondary transition-colors group-hover/detail:text-primary">
            {onViewDetail ? "Chi tiết" : "Dịch vụ"}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover/detail:translate-x-0.5 group-hover/detail:text-primary" />
        </Button>
      </div>
    </article>
  );
}

function LabListInner({ initialLabs }: Props) {
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lab | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("debt_desc");

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedLabForPayment, setSelectedLabForPayment] = useState<Lab | null>(null);

  // Detail drawer state
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedLabForDetail, setSelectedLabForDetail] = useState<Lab | null>(null);

  const {
    data: labsResult,
    isLoading: isLabsLoading,
    mutate: mutateLabs,
  } = useSWR<ActionResult<Lab[]>>(
    [cacheKeys.labs(), "list"],
    () => fetchLabsList(),
    {
      fallbackData: { success: true, data: initialLabs },
      keepPreviousData: true,
      revalidateOnMount: false,
    },
  );

  const labs = useMemo(
    () => (labsResult?.success ? labsResult.data : []),
    [labsResult],
  );

  const stats = useMemo(() => {
    const active = labs.filter((lab) => lab.status === "active").length;
    const services = labs.reduce((sum, lab) => sum + lab.serviceCount, 0);
    const debt = labs.reduce((sum, lab) => sum + (lab.outstandingDebt ?? 0), 0);
    const unpaidOrders = labs.reduce((sum, lab) => sum + (lab.unpaidOrders ?? 0), 0);
    const labsWithDebt = labs.filter((lab) => (lab.outstandingDebt ?? 0) > 0).length;
    const labsWithoutServices = labs.filter((lab) => lab.serviceCount === 0).length;
    return {
      total: labs.length,
      active,
      inactive: labs.length - active,
      services,
      debt,
      unpaidOrders,
      labsWithDebt,
      labsWithoutServices,
    };
  }, [labs]);

  const visibleLabs = useMemo(() => {
    return labs
      .filter((lab) => {
        const debt = lab.outstandingDebt ?? 0;
        if (statusFilter === "active" && lab.status !== "active") return false;
        if (statusFilter === "inactive" && lab.status !== "inactive") return false;
        if (statusFilter === "debt" && debt <= 0) return false;
        if (statusFilter === "no_services" && lab.serviceCount > 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortMode === "name_asc") {
          return a.lab_name.localeCompare(b.lab_name, "vi-VN");
        }
        if (sortMode === "services_desc") {
          return b.serviceCount - a.serviceCount || a.lab_name.localeCompare(b.lab_name, "vi-VN");
        }
        if (sortMode === "unpaid_desc") {
          return b.unpaidOrders - a.unpaidOrders || (b.outstandingDebt ?? 0) - (a.outstandingDebt ?? 0);
        }
        return (b.outstandingDebt ?? 0) - (a.outstandingDebt ?? 0) || b.unpaidOrders - a.unpaidOrders;
      });
  }, [labs, sortMode, statusFilter]);

  const statusTabs = useMemo(
    () => [
      { label: "Tất cả", value: "all", count: stats.total },
      { label: "Đang hoạt động", value: "active", count: stats.active },
      { label: "Tạm dừng", value: "inactive", count: stats.inactive },
      { label: "Có nợ", value: "debt", count: stats.labsWithDebt },
      { label: "Chưa có bảng giá", value: "no_services", count: stats.labsWithoutServices },
    ],
    [stats.active, stats.inactive, stats.labsWithDebt, stats.labsWithoutServices, stats.total],
  );

  const openCreate = () => {
    setEditingLab(null);
    setShowForm(true);
  };

  const openEdit = (lab: Lab) => {
    setEditingLab(lab);
    setShowForm(true);
  };

  const handleSaved = async () => {
    await mutateLabs();
  };

  const handlePayDebt = (lab: Lab) => {
    setSelectedLabForPayment(lab);
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async () => {
    await mutateLabs();
    setPaymentModalOpen(false);
    setSelectedLabForPayment(null);
  };

  const handleViewDetail = (lab: Lab) => {
    setSelectedLabForDetail(lab);
    setDetailDrawerOpen(true);
  };

  const handleToggleStatus = async (lab: Lab) => {
    const result = await toggleLabStatus(
      lab.id,
      lab.status === "active" ? "inactive" : "active",
    );

    if (!result.success) {
      toast(result.error, "error");
      return;
    }

    toast("Cập nhật trạng thái lab thành công", "success");
    await handleSaved();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const result = await deleteLab(deleteTarget.id);
    if (!result.success) {
      toast(result.error, "error");
      return;
    }

    toast("Đã xóa lab", "success");
    setDeleteTarget(null);
    await handleSaved();
  };

  return (
    <>
      <div className="main-container">
        <Breadcrumb
          items={[
            { label: "Printing", href: "/printing" },
            { label: "Labs" },
          ]}
        />

        <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
          <StatsBar
            items={[
              {
                icon: Factory,
                label: "Tổng lab",
                value: String(stats.total),
              },
              {
                icon: Factory,
                label: "Đang hoạt động",
                value: String(stats.active),
                iconBg: "bg-success/10",
                iconColor: "text-success",
              },
              {
                icon: ReceiptText,
                label: "Đơn chưa trả",
                value: String(stats.unpaidOrders),
                iconBg: "bg-info/10",
                iconColor: "text-info",
              },
              {
                icon: Wrench,
                label: "Dịch vụ",
                value: String(stats.services),
                iconBg: "bg-primary/10",
                iconColor: "text-primary",
              },
              {
                icon: WalletCards,
                label: "Công nợ",
                value: formatVnd(stats.debt),
                iconBg: "bg-error/10",
                iconColor: "text-error",
              },
            ]}
          />

          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <Link href="/printing" className="btn btn-outline">
              Quay lại đơn in
            </Link>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              <span>Thêm lab</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
            <TabsFilter
              tabs={statusTabs}
              activeTab={statusFilter}
              onChange={(value) => setStatusFilter(value as StatusFilter)}
              variant="pills"
            />
            <div className="h-5 border-l border-border shrink-0" />
            <SelectPill
              value={sortMode}
              onChange={(value) => setSortMode(value as SortMode)}
              defaultValue="debt_desc"
              placeholder="Sắp xếp"
              options={SORT_OPTIONS}
            />
          </div>

          <div className="hidden lg:flex lg:items-center lg:justify-between gap-3">
            <TabsFilter
              tabs={statusTabs}
              activeTab={statusFilter}
              onChange={(value) => setStatusFilter(value as StatusFilter)}
            />

            <SelectPill
              value={sortMode}
              onChange={(value) => setSortMode(value as SortMode)}
              defaultValue="debt_desc"
              placeholder="Sắp xếp"
              options={SORT_OPTIONS}
            />
          </div>
        </div>

        <FAB onClick={openCreate} label="Thêm lab" />

        {isLabsLoading ? (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-72 rounded-xl bg-surface animate-pulse" />
            ))}
          </div>
        ) : labs.length === 0 ? (
          <EmptyState
            icon={Factory}
            title="Chưa có lab nào"
            description="Thêm lab đầu tiên để bắt đầu quản lý xưởng in."
            actionLabel="Thêm lab"
            onAction={openCreate}
          />
        ) : visibleLabs.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Không tìm thấy lab"
            description="Thử đổi từ khóa, trạng thái hoặc cách sắp xếp."
            actionLabel="Xóa bộ lọc"
            onAction={() => {
              setStatusFilter("all");
              setSortMode("debt_desc");
            }}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {visibleLabs.map((lab) => (
              <LabCard
                key={lab.id}
                lab={lab}
                debt={lab.outstandingDebt ?? 0}
                onEdit={openEdit}
                onToggleStatus={handleToggleStatus}
                onDelete={setDeleteTarget}
                onPayDebt={handlePayDebt}
                onViewDetail={handleViewDetail}
              />
            ))}
          </div>
        )}
      </div>

      <LabFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingLab(null);
        }}
        lab={editingLab}
        onSaved={handleSaved}
      />

      <LabPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedLabForPayment(null);
        }}
        labId={selectedLabForPayment?.id}
        labName={selectedLabForPayment?.lab_name}
        onSuccess={handlePaymentSuccess}
      />

      <LabDetailDrawer
        isOpen={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedLabForDetail(null);
        }}
        lab={selectedLabForDetail}
        debt={selectedLabForDetail ? (selectedLabForDetail.outstandingDebt ?? 0) : 0}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xóa lab"
        message={`Bạn chắc chắn muốn xóa "${deleteTarget?.lab_name || ""}"?`}
        confirmLabel="Xóa"
      />
    </>
  );
}

export default function LabListPage(props: Props) {
  return (
    <Suspense>
      <LabListInner {...props} />
    </Suspense>
  );
}
