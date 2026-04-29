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
import { getLabDebts } from "@/app/actions/printing-reference-queries";
import { cacheKeys } from "@/lib/swr";
import { toast } from "@/lib/toast-utils";
import type { Lab, LabDebtData } from "@/types/printing";
import { LAB_STATUS_LABELS } from "@/types/printing-constants";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";

const LabFormModal = dynamic(
  () => import("@/components/printing/labs/lab-form-modal"),
  { ssr: false },
);

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type StatusFilter = "all" | "active" | "inactive" | "debt" | "no_services";
type SortMode = "debt_desc" | "unpaid_desc" | "services_desc" | "name_asc";

interface Props {
  initialLabs: Lab[];
  initialDebts: LabDebtData;
}

const SORT_OPTIONS = [
  { value: "debt_desc", label: "Nợ cao nhất" },
  { value: "unpaid_desc", label: "Đơn chưa trả nhiều nhất" },
  { value: "services_desc", label: "Nhiều dịch vụ nhất" },
  { value: "name_asc", label: "Tên A-Z" },
];

function getLabDebt(lab: Lab, debtMap: Map<string, number>) {
  return debtMap.get(lab.id) ?? lab.outstandingDebt ?? 0;
}

function getServicePreview(lab: Lab) {
  if (lab.servicePreview && lab.servicePreview.length > 0) {
    return lab.servicePreview.slice(0, 3).join(", ");
  }
  if (lab.services.length === 0) return "Chưa có bảng giá";
  return lab.services
    .slice(0, 3)
    .map((service) => service.item_name)
    .join(", ");
}

interface LabCardProps {
  lab: Lab;
  debt: number;
  onEdit: (lab: Lab) => void;
  onToggleStatus: (lab: Lab) => void;
  onDelete: (lab: Lab) => void;
}

function LabCard({ lab, debt, onEdit, onToggleStatus, onDelete }: LabCardProps) {
  const isActive = lab.status === "active";
  const statusActionLabel = isActive ? "Tạm dừng" : "Kích hoạt";
  const StatusIcon = isActive ? PauseCircle : PlayCircle;
  const servicePreview = getServicePreview(lab);

  return (
    <article
      className={cn(
        "card-base flex min-h-[280px] flex-col overflow-hidden border border-border bg-bg-card p-0 transition-colors hover:border-primary/30",
        !isActive && "opacity-60",
      )}
    >
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-bg-hover text-primary">
              <Printer className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <h3 className="truncate text-body font-semibold text-text-primary">
                  {lab.lab_name}
                </h3>
                {debt > 0 ? (
                  <Badge variant="warning" dot>
                    Có nợ
                  </Badge>
                ) : null}
                {lab.serviceCount === 0 ? (
                  <Badge variant="neutral">
                    Chưa có giá
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-body-sm font-medium text-text-secondary">
                {lab.contact_person || "Chưa có người liên hệ"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                isActive ? "bg-success" : "bg-text-muted",
              )}
              title={LAB_STATUS_LABELS[lab.status]}
            />
            <Button
              unstyled
              type="button"
              className="btn-icon h-8 w-8 min-w-8 text-text-secondary hover:text-primary"
              onClick={() => onEdit(lab)}
              aria-label={`Sửa ${lab.lab_name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              unstyled
              type="button"
              className="btn-icon h-8 w-8 min-w-8 text-text-secondary hover:text-primary"
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

        <div className="grid grid-cols-2 rounded-lg border border-dashed border-border bg-bg-hover/40 px-3 py-3">
          <div className="text-center">
            <p className="text-overline text-text-muted">Đơn treo</p>
            <p className="mt-1 text-h3 font-semibold tabular-nums text-primary">
              {lab.unpaidOrders}
            </p>
          </div>
          <div className="border-l border-border text-center">
            <p className="text-overline text-text-muted">Công nợ</p>
            <p
              className={cn(
                "mt-1 text-body font-semibold tabular-nums",
                debt > 0 ? "text-error" : "text-text-primary",
              )}
            >
              {formatCurrency(debt)}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-body-sm text-text-secondary">
          <div className="flex min-w-0 items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-text-muted" />
            <span className="truncate font-semibold">
              {lab.phone || "Chưa có SĐT"}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-text-muted" />
            <span className="truncate">
              {lab.address || "Chưa có địa chỉ"}
            </span>
          </div>
        </div>

        <p className="line-clamp-1 text-caption text-text-muted">
          {lab.serviceCount > 0 ? servicePreview : "Chưa có bảng giá"}
        </p>
      </div>

      <Button
        unstyled
        type="button"
        className="flex min-h-12 w-full items-center justify-between gap-3 border-t border-border bg-bg-hover/40 px-4 py-3 text-left transition-colors hover:bg-bg-hover"
        onClick={() => onEdit(lab)}
      >
        <span className="text-overline text-text-secondary">Quản lý dịch vụ</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
      </Button>
    </article>
  );
}

function LabListInner({ initialLabs, initialDebts }: Props) {
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lab | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("debt_desc");

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

  const { data: debtResult, mutate: mutateDebts } = useSWR<ActionResult<LabDebtData>>(
    cacheKeys.labDebts(),
    () => getLabDebts(),
    {
      fallbackData: { success: true, data: initialDebts },
      keepPreviousData: true,
      revalidateOnMount: false,
    },
  );

  const labs = useMemo(
    () => (labsResult?.success ? labsResult.data : []),
    [labsResult],
  );
  const debtData = useMemo(
    () =>
      debtResult?.success
        ? debtResult.data
        : { totalDebt: 0, totalLabs: 0, totalOrders: 0, items: [] },
    [debtResult],
  );

  const debtMap = useMemo(
    () => new Map(debtData.items.map((item) => [item.labId, item.totalDebt])),
    [debtData.items],
  );

  const stats = useMemo(() => {
    const active = labs.filter((lab) => lab.status === "active").length;
    const services = labs.reduce((sum, lab) => sum + lab.serviceCount, 0);
    const labsWithDebt = labs.filter((lab) => getLabDebt(lab, debtMap) > 0).length;
    const labsWithoutServices = labs.filter((lab) => lab.serviceCount === 0).length;
    return {
      total: labs.length,
      active,
      inactive: labs.length - active,
      services,
      debt: debtData.totalDebt,
      unpaidOrders: debtData.totalOrders,
      labsWithDebt,
      labsWithoutServices,
    };
  }, [debtData.totalDebt, debtData.totalOrders, debtMap, labs]);

  const visibleLabs = useMemo(() => {
    return labs
      .filter((lab) => {
        const debt = getLabDebt(lab, debtMap);
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
          return b.unpaidOrders - a.unpaidOrders || getLabDebt(b, debtMap) - getLabDebt(a, debtMap);
        }
        return getLabDebt(b, debtMap) - getLabDebt(a, debtMap) || b.unpaidOrders - a.unpaidOrders;
      });
  }, [debtMap, labs, sortMode, statusFilter]);

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
    await Promise.all([mutateLabs(), mutateDebts()]);
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
                value: formatCurrency(stats.debt),
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
                debt={getLabDebt(lab, debtMap)}
                onEdit={openEdit}
                onToggleStatus={handleToggleStatus}
                onDelete={setDeleteTarget}
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
