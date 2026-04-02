"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Factory, Plus, WalletCards, Wrench } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/ux-states";
import { FAB } from "@/components/ui/fab";
import { StatsBar } from "@/components/ui/stats-bar";
import { Button } from "@/components/ui/button";
import { fetchLabsList } from "@/app/actions/lab-queries";
import { toggleLabStatus, deleteLab } from "@/app/actions/lab-mutations";
import { getLabDebts } from "@/app/actions/printing-queries";
import { useIsMobile } from "@/hooks/use-mobile";
import { cacheKeys } from "@/lib/swr";
import { toast } from "@/lib/toast-utils";
import type { Lab, LabDebtData } from "@/types/printing";
import { LAB_STATUS_LABELS, LAB_STATUS_VARIANTS } from "@/types/printing-constants";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import LabFormModal from "@/components/printing/labs/lab-form-modal";
import LabTable from "@/components/printing/labs/lab-table";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface Props {
  initialLabs: Lab[];
  initialDebts: LabDebtData;
}



function LabListInner({ initialLabs, initialDebts }: Props) {
  const isMobile = useIsMobile();
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lab | null>(null);

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

  const stats = useMemo(() => {
    const active = labs.filter((lab) => lab.status === "active").length;
    const services = labs.reduce((sum, lab) => sum + lab.serviceCount, 0);
    return {
      total: labs.length,
      active,
      inactive: labs.length - active,
      services,
      debt: debtData.totalDebt,
    };
  }, [debtData.totalDebt, labs]);

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

  const debtMap = new Map(
    debtData.items.map((item) => [item.labId, item.totalDebt]),
  );

  return (
    <>
      <div className="main-container gap-3!">
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
                iconBg: "bg-warning/10",
                iconColor: "text-warning",
              },
            ]}
          />

          <div className="hidden lg:flex items-center gap-2">
            <Link href="/printing" className="btn btn-outline">
              Quay lại đơn in
            </Link>
            <Button
              onClick={() => {
                setEditingLab(null);
                setShowForm(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm lab</span>
            </Button>
          </div>
        </div>

        <FAB
          onClick={() => {
            setEditingLab(null);
            setShowForm(true);
          }}
          label="Thêm lab"
        />

        {isLabsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-20 rounded-xl bg-surface animate-pulse" />
            ))}
          </div>
        ) : labs.length === 0 ? (
          <EmptyState
            icon={Factory}
            title="Chưa có lab nào"
            description="Thêm lab đầu tiên để bắt đầu quản lý xưởng in."
            actionLabel="Thêm lab"
            onAction={() => {
              setEditingLab(null);
              setShowForm(true);
            }}
          />
        ) : isMobile ? (
          <div className="space-y-3">
            {labs.map((lab) => (
              <div key={lab.id} className="card-base p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-body font-semibold text-text-main">
                      {lab.lab_name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {lab.contact_person || "Chưa có người liên hệ"}
                      {lab.phone ? ` - ${lab.phone}` : ""}
                    </p>
                  </div>
                  <Badge variant={LAB_STATUS_VARIANTS[lab.status]}>
                    {LAB_STATUS_LABELS[lab.status]}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm text-text-secondary">
                  <p>{lab.address || "Chưa có địa chỉ"}</p>
                  <p>{lab.serviceCount} dịch vụ</p>
                  <p>Công nợ: {formatCurrency(debtMap.get(lab.id) || 0)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    setEditingLab(lab);
                    setShowForm(true);
                  }}>
                    Sửa
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(lab)}
                  >
                    {lab.status === "active" ? "Tạm dừng" : "Kích hoạt"}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDeleteTarget(lab)}
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <LabTable
            labs={labs}
            onEdit={(lab) => {
              setEditingLab(lab);
              setShowForm(true);
            }}
            onToggleStatus={handleToggleStatus}
            onDelete={setDeleteTarget}
          />
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
