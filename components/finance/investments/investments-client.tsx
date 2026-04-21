"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, Landmark, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteInvestment } from "@/app/actions/investment-actions";
import { fetchInvestments } from "@/app/actions/finance-operations-queries";
import { formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import {
  formatInvestmentRoi,
  investmentConditionLabel,
  investmentConditionVariant,
  investmentRoiPercent,
  investmentStatusLabel,
  investmentStatusVariant,
} from "@/components/finance/investments/investment-display";
import { InvestmentFilters } from "@/components/finance/investments/investment-filters";
import { InvestmentFormModal } from "@/components/finance/investments/investment-form-modal";
import { InvestmentMobileList } from "@/components/finance/investments/investment-mobile-list";
import InvestmentStatsBar from "@/components/finance/investments/investment-stats-bar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { FAB } from "@/components/ui/fab";
import { SkeletonTable } from "@/components/ui/skeleton";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/ux-states";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, InvestmentItem } from "@/types/finance-operations";

interface InvestmentsClientProps {
  initialData: InvestmentItem[];
}

const ACTIVE_STATUSES = new Set(["active", "in_use", "dang_dung"]);
const MAINTENANCE_STATUSES = new Set(["maintenance", "bao_tri"]);
const ARCHIVED_STATUSES = new Set([
  "inactive",
  "ngung_dung",
  "sold",
  "da_ban",
  "disposed",
  "thanh_ly",
]);

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "book_desc", label: "Giá trị cao" },
  { value: "name_asc", label: "Tên A-Z" },
];

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function InvestmentsClient({ initialData }: InvestmentsClientProps) {
  const [editing, setEditing] = useState<InvestmentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scope, setScope] = useState("all");
  const [category, setCategory] = useState("all");
  const [condition, setCondition] = useState("all");
  const [sort, setSort] = useState("newest");
  const key = cacheKeys.financeInvestments();
  const { data, error, isLoading } = useSWR(
    key,
    () => requireData(fetchInvestments()),
    { fallbackData: initialData },
  );

  const handleOpenCreate = useCallback(() => {
    setEditing(null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleEdit = useCallback((item: InvestmentItem) => {
    setEditing(item);
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được tài sản.");
  }, [error]);

  const items = data || initialData;
  const stats = useMemo(
    () => ({
      total: items.length,
      totalPurchase: items.reduce((sum, item) => sum + item.purchase_price, 0),
      totalBook: items.reduce((sum, item) => sum + item.book_value, 0),
      maintenanceDue: items.filter((item) => item.maintenance_due).length,
    }),
    [items],
  );

  const scopeTabs = useMemo(
    () => [
      { label: "Tất cả", value: "all", count: items.length },
      {
        label: "Đang dùng",
        value: "active",
        count: items.filter((item) => ACTIVE_STATUSES.has(normalize(item.status))).length,
      },
      {
        label: "Cần bảo trì",
        value: "maintenance",
        count: items.filter(
          (item) =>
            item.maintenance_due || MAINTENANCE_STATUSES.has(normalize(item.status)),
        ).length,
      },
      {
        label: "Đã bán / dừng",
        value: "archived",
        count: items.filter((item) => ARCHIVED_STATUSES.has(normalize(item.status))).length,
      },
    ],
    [items],
  );

  const categoryOptions = useMemo(() => {
    const categoryMap = new Map<string, string>();
    for (const item of items) {
      const key = normalize(item.category);
      if (key && !categoryMap.has(key)) categoryMap.set(key, item.category);
    }
    return [
      { value: "all", label: "Danh mục" },
      ...Array.from(categoryMap.entries())
        .sort((a, b) => a[1].localeCompare(b[1], "vi"))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [items]);

  const conditionOptions = useMemo(() => {
    const values = new Set<string>();
    for (const item of items) {
      const key = normalize(item.condition);
      if (key) values.add(key);
    }
    return [
      { value: "all", label: "Tình trạng" },
      ...Array.from(values)
        .sort((a, b) =>
          investmentConditionLabel(a).localeCompare(investmentConditionLabel(b), "vi"),
        )
        .map((value) => ({
          value,
          label: investmentConditionLabel(value),
        })),
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    const next = items.filter((item) => {
      if (scope === "active" && !ACTIVE_STATUSES.has(normalize(item.status))) {
        return false;
      }

      if (
        scope === "maintenance"
        && !(item.maintenance_due || MAINTENANCE_STATUSES.has(normalize(item.status)))
      ) {
        return false;
      }

      if (scope === "archived" && !ARCHIVED_STATUSES.has(normalize(item.status))) {
        return false;
      }

      if (category !== "all" && normalize(item.category) !== category) {
        return false;
      }

      if (condition !== "all" && normalize(item.condition) !== condition) {
        return false;
      }

      return true;
    });

    return [...next].sort((left, right) => {
      if (sort === "oldest") {
        return left.purchase_date.localeCompare(right.purchase_date);
      }

      if (sort === "book_desc") {
        return right.book_value - left.book_value;
      }

      if (sort === "name_asc") {
        return left.name.localeCompare(right.name, "vi", { sensitivity: "base" });
      }

      return right.purchase_date.localeCompare(left.purchase_date);
    });
  }, [items, scope, category, condition, sort]);

  const hasActiveFilters = Boolean(
    scope !== "all" || category !== "all" || condition !== "all" || sort !== "newest",
  );
  const shouldShowResultMeta = filteredItems.length > 0 && filteredItems.length !== items.length;

  const resetFilters = useCallback(() => {
    setScope("all");
    setCategory("all");
    setCondition("all");
    setSort("newest");
  }, []);

  const refresh = () => void mutate(key);

  const remove = async (item: InvestmentItem) => {
    if (!window.confirm(`Xóa tài sản "${item.name}"?`)) return;

    setBusyId(item.id);
    const result = await deleteInvestment(item.id);
    setBusyId(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã xóa tài sản.");
    refresh();
  };

  return (
    <div className="main-container gap-4!">
      <Breadcrumb
        items={[
          { label: "Tài chính", href: "/finance" },
          { label: "Tài sản đầu tư" },
        ]}
      />

      <section className="entrance entrance-0">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-bg-card px-5 py-3 shadow-xs">
          <div className="min-w-0 flex-1">
            <InvestmentStatsBar stats={stats} />
          </div>
          <div className="hidden shrink-0 lg:flex">
            <Button
              type="button"
              onClick={handleOpenCreate}
              variant="primary"
              className="gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm tài sản</span>
            </Button>
          </div>
        </div>
      </section>

      <section className="entrance entrance-1">
        <InvestmentFilters
          scope={scope}
          category={category}
          condition={condition}
          sort={sort}
          tabs={scopeTabs}
          categoryOptions={categoryOptions}
          conditionOptions={conditionOptions}
          sortOptions={SORT_OPTIONS}
          hasActiveFilters={hasActiveFilters}
          onScopeChange={setScope}
          onCategoryChange={setCategory}
          onConditionChange={setCondition}
          onSortChange={setSort}
          onReset={resetFilters}
        />
      </section>

      <FAB onClick={handleOpenCreate} label="Thêm tài sản" />

      {isLoading && !data ? (
        <div className="card-base p-5">
          <SkeletonTable rows={6} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Chưa có tài sản"
          description="Chưa có tài sản đầu tư nào trong hệ thống"
          actionLabel="Thêm tài sản đầu tiên"
          onAction={handleOpenCreate}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="Không có tài sản phù hợp"
          description="Thử đổi bộ lọc để xem lại danh sách tài sản."
          actionLabel="Xóa bộ lọc"
          onAction={resetFilters}
        />
      ) : (
        <>
          <div className="hidden lg:block">
            <TableWrapper className="w-full min-w-[1360px]" containerClassName="rounded-xl">
              <THead>
                <TR>
                  <TH className="min-w-[240px]">Tên tài sản</TH>
                  <TH className="min-w-[120px]">Danh mục</TH>
                  <TH className="min-w-[120px]">Ngày mua</TH>
                  <TH className="min-w-[140px] text-right">Giá mua</TH>
                  <TH className="min-w-[140px] text-right">Hiện tại</TH>
                  <TH className="min-w-[140px] text-right">KH/tháng</TH>
                  <TH className="min-w-[96px] text-right">ROI</TH>
                  <TH className="min-w-[120px]">Tình trạng</TH>
                  <TH className="min-w-[160px]">Trạng thái</TH>
                  <TH className="w-32 text-right">Thao tác</TH>
                </TR>
              </THead>
              <TBody>
                {filteredItems.map((item) => {
                  const roi = investmentRoiPercent(item);

                  return (
                    <TR key={item.id}>
                      <TD className="min-w-[240px]">
                        <div className="text-body-sm font-semibold text-text-primary">
                          {item.name}
                        </div>
                        {item.serial_number ? (
                          <div className="mt-1 text-caption text-text-muted">
                            SN-{item.serial_number}
                          </div>
                        ) : null}
                      </TD>
                      <TD className="min-w-[120px]">
                        <span className="text-body-sm text-text-secondary">
                          {item.category}
                        </span>
                      </TD>
                      <TD className="min-w-[120px]">
                        {formatFinanceDate(item.purchase_date)}
                      </TD>
                      <TD className="min-w-[140px] text-right">
                        <div className="tabular-nums font-semibold text-text-primary">
                          {formatVnd(item.purchase_price)}
                        </div>
                      </TD>
                      <TD className="min-w-[140px] text-right">
                        <div className="tabular-nums font-semibold text-success">
                          {formatVnd(item.book_value)}
                        </div>
                      </TD>
                      <TD className="min-w-[140px] text-right">
                        <div className="tabular-nums text-text-secondary">
                          {formatVnd(item.monthly_depreciation)}
                        </div>
                      </TD>
                      <TD className="min-w-[96px] text-right">
                        <span
                          className={`tabular-nums font-semibold ${
                            roi === null
                              ? "text-text-muted"
                              : roi > 0
                                ? "text-success"
                                : roi < 0
                                  ? "text-error"
                                  : "text-text-secondary"
                          }`}
                        >
                          {formatInvestmentRoi(roi)}
                        </span>
                      </TD>
                      <TD className="min-w-[120px]">
                        <Badge variant={investmentConditionVariant(item.condition)}>
                          {investmentConditionLabel(item.condition)}
                        </Badge>
                      </TD>
                      <TD className="min-w-[160px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={investmentStatusVariant(item.status)}>
                            {investmentStatusLabel(item.status)}
                          </Badge>
                          {item.maintenance_due ? (
                            <Badge variant="warning">Cần bảo trì</Badge>
                          ) : null}
                        </div>
                      </TD>
                      <TD className="!text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            className="gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Sửa
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => remove(item)}
                            disabled={busyId === item.id}
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Xóa
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </TableWrapper>
          </div>

          <div className="lg:hidden">
            <InvestmentMobileList
              items={filteredItems}
              onEdit={handleEdit}
              onDelete={remove}
              busyId={busyId}
            />
          </div>

          {shouldShowResultMeta ? (
            <p className="text-center text-caption text-text-muted">
              Hiển thị {filteredItems.length} / {items.length} tài sản
            </p>
          ) : null}
        </>
      )}

      {isModalOpen && (
        <InvestmentFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSaved={refresh}
          item={editing}
        />
      )}
    </div>
  );
}
