"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookLock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cancelMonthlyClose, listCloses } from "@/app/actions/finance-close-actions";
import { CloseCreateModal } from "@/components/finance/closes/close-create-modal";
import { CloseFilters, type CloseStatusFilter } from "@/components/finance/closes/close-filters";
import { CloseStatsBar } from "@/components/finance/closes/close-stats-bar";
import { formatFinanceDate } from "@/components/finance/finance-format";
import { useFinanceFilters } from "@/hooks/use-finance-filters";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FAB } from "@/components/ui/fab";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { SkeletonTable } from "@/components/ui/skeleton";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/ux-states";
import type { ActionResult, CloseListItem } from "@/types/finance-operations";

interface ClosesClientProps {
  initialYear: number;
  initialData: CloseListItem[];
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

function closeStatusLabel(status: string | null | undefined): string {
  const labels: Record<string, string> = {
    draft: "Nháp",
    in_progress: "Đang xử lý",
    pending_review: "Chờ duyệt",
    locked: "Đã khóa",
  };

  return labels[status?.toLowerCase() || ""] || "Thông tin";
}

function closeStatusVariant(status: string | null | undefined): BadgeVariant {
  const value = status?.toLowerCase();
  if (value === "locked") return "success";
  if (value === "in_progress" || value === "pending_review") return "warning";
  if (value === "draft") return "neutral";
  return "info";
}

export function ClosesClient({ initialYear, initialData }: ClosesClientProps) {
  const [year, setYear] = useState(initialYear);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CloseStatusFilter>("all");
  const [cancelTarget, setCancelTarget] = useState<CloseListItem | null>(null);

  const key = cacheKeys.financeCloses(year);
  const { yearOptions } = useFinanceFilters(initialYear);

  const handleYearChange = useCallback((value: string) => {
    setYear(Number(value));
    setStatusFilter("all");
  }, []);
  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const { data, error, isLoading } = useSWR(
    key,
    () => requireData(listCloses(year)),
    { fallbackData: initialData },
  );

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được kỳ chốt sổ.");
  }, [error]);

  const closes = data || initialData;
  const refresh = () => void mutate(key);
  const counts = useMemo(() => {
    let draft = 0;
    let inProgress = 0;
    let pendingReview = 0;
    let locked = 0;

    for (const item of closes) {
      const status = item.status?.toLowerCase();
      if (status === "draft") draft += 1;
      else if (status === "in_progress") inProgress += 1;
      else if (status === "pending_review") pendingReview += 1;
      else if (status === "locked") locked += 1;
    }

    return {
      all: closes.length,
      draft,
      inProgress,
      pendingReview,
      locked,
    };
  }, [closes]);
  const filteredCloses = useMemo(() => {
    if (statusFilter === "all") return closes;
    return closes.filter((item) => item.status?.toLowerCase() === statusFilter);
  }, [closes, statusFilter]);
  const resetFilters = useCallback(() => setStatusFilter("all"), []);
  const now = new Date();

  const handleCancelClose = async () => {
    if (!cancelTarget) return false;
    const result = await cancelMonthlyClose(cancelTarget.id);
    if (!result.success) {
      toast.error(result.error);
      return false;
    }
    toast.success(`Đã hủy kỳ chốt sổ ${cancelTarget.period}.`);
    refresh();
    return true;
  };

  return (
    <div className="main-container gap-4!">
      <Breadcrumb
        items={[
          { label: "Tài chính", href: "/finance" },
          { label: "Chốt sổ", href: "/finance/closes" },
        ]}
      />

      <section className="entrance entrance-0">
        <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
          <div className="flex-1 min-w-0">
            <CloseStatsBar counts={counts} />
          </div>
          <div className="hidden lg:flex shrink-0">
            <Button type="button" onClick={openModal} variant="primary" className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Tạo kỳ chốt
            </Button>
          </div>
        </div>
      </section>

      <section className="entrance entrance-1 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <CloseFilters activeStatus={statusFilter} onStatusChange={setStatusFilter} counts={counts} />
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide lg:overflow-visible">
          <SelectPill
            value={String(year)}
            onChange={handleYearChange}
            placeholder="Năm"
            options={yearOptions}
          />
        </div>
      </section>

      <section className="entrance entrance-2">
        {isLoading && !data ? (
          <div className="card-base p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : closes.length === 0 ? (
          <EmptyState
            icon={BookLock}
            title={`Chưa có kỳ chốt sổ năm ${year}`}
            description="Tạo kỳ chốt để theo dõi từng bước đối soát và khóa sổ theo tháng trong module Tài chính."
            actionLabel="Tạo kỳ chốt đầu tiên"
            onAction={openModal}
          />
        ) : filteredCloses.length === 0 ? (
          <EmptyState
            icon={BookLock}
            title="Không có kỳ phù hợp"
            description="Thử đổi bộ lọc trạng thái để xem lại danh sách kỳ chốt sổ trong năm này."
            actionLabel="Xóa bộ lọc"
            onAction={resetFilters}
          />
        ) : (
          <TableWrapper>
            <THead>
              <TR>
                <TH>Kỳ</TH>
                <TH>Trạng thái</TH>
                <TH>Khóa bởi</TH>
                <TH>Cập nhật</TH>
                <TH>Chi tiết</TH>
                <TH className="text-right">Thao tác</TH>
              </TR>
            </THead>
            <TBody>
              {filteredCloses.map((item) => (
                <TR key={item.id}>
                  <TD className="font-semibold text-text-primary">{item.period}</TD>
                  <TD>
                    <Badge variant={closeStatusVariant(item.status)}>
                      {closeStatusLabel(item.status)}
                    </Badge>
                  </TD>
                  <TD>{item.locked_user_name || "-"}</TD>
                  <TD>{formatFinanceDate(item.updated_at || item.created_at)}</TD>
                  <TD>
                    <Link className="link-base" href={`/finance/closes/${item.id}`}>
                      Mở kỳ
                    </Link>
                  </TD>
                  <TD className="text-right">
                    {item.status !== "locked" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-error hover:text-error hover:bg-error/10"
                        aria-label="Hủy kỳ chốt sổ"
                        title="Hủy kỳ chốt sổ"
                        onClick={() => setCancelTarget(item)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    ) : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </TableWrapper>
        )}
      </section>

      <FAB onClick={openModal} label="Tạo kỳ chốt" />

      <CloseCreateModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSaved={refresh}
        initialMonth={now.getMonth() + 1}
        initialYear={year}
      />

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelClose}
        title="Hủy kỳ chốt sổ"
        message={`Xóa toàn bộ kỳ chốt sổ ${cancelTarget?.period ?? ""} và cả 8 bước đã ghi nhận — không khôi phục được. Chỉ dùng khi tạo nhầm tháng.`}
        confirmLabel="Hủy kỳ"
        variant="danger"
      />
    </div>
  );
}
