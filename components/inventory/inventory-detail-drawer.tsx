"use client";

import { useCallback, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { deleteInventoryItem } from "@/app/actions/inventory-mutations";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { InventoryFormModal } from "@/components/inventory/inventory-form-modal";
import { StockInModal } from "@/components/inventory/stock-in-modal";
import { StockOutModal } from "@/components/inventory/stock-out-modal";
import {
  revalidateInventory,
  revalidateInventoryDetail,
  useInventoryDetail,
} from "@/lib/hooks/use-inventory";
import { CURRENCY_SYMBOL, formatCurrency, formatDate, getInitials } from "@/lib/utils";
import {
  INVENTORY_CATEGORY_MAP,
  INVENTORY_STATUS_MAP,
  INVENTORY_UNIT_MAP,
  TRANSACTION_TYPE_MAP,
} from "@/types/inventory-constants";
import type { InventoryItem } from "@/types/inventory";
import type {
  InventoryCategory,
  InventoryStatus,
  InventoryUnit,
} from "@/lib/validations/inventory.schema";

interface InventoryDetailDrawerProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

function asBadgeVariant(value: BadgeVariant | string | undefined): BadgeVariant {
  const variants = new Set<BadgeVariant>([
    "success",
    "warning",
    "error",
    "info",
    "neutral",
    "primary",
    "accent",
  ]);
  return variants.has(value as BadgeVariant) ? (value as BadgeVariant) : "neutral";
}

function fmt(value: number | null | undefined) {
  return `${formatCurrency(value || 0)} ${CURRENCY_SYMBOL}`;
}

function getStatusDisplay(item: InventoryItem) {
  if ((item.current_stock || 0) === 0) {
    return { label: "Hết hàng", variant: "error" as const };
  }
  if (item.min_stock && item.current_stock < item.min_stock) {
    return { label: "Sắp hết", variant: "warning" as const };
  }
  return (
    INVENTORY_STATUS_MAP[item.status as InventoryStatus] || {
      label: "Đang dùng",
      variant: "success" as const,
    }
  );
}

function getCategoryLabel(value: string | null | undefined) {
  if (!value) return "Chưa phân loại";
  return INVENTORY_CATEGORY_MAP[value as InventoryCategory]?.label || value;
}

function getUnitLabel(value: string | null | undefined) {
  if (!value) return "";
  return INVENTORY_UNIT_MAP[value as InventoryUnit] || value;
}

export function InventoryDetailDrawer({
  item,
  isOpen,
  onClose,
  onChanged,
}: InventoryDetailDrawerProps) {
  const { detail, isLoading } = useInventoryDetail(isOpen ? item?.id || null : null);
  const [showEdit, setShowEdit] = useState(false);
  const [showStockIn, setShowStockIn] = useState(false);
  const [showStockOut, setShowStockOut] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const source = detail || item;
  const status = source ? getStatusDisplay(source) : null;
  const canMoveStock = source?.status === "active";
  const categoryLabel = source ? getCategoryLabel(source.category) : "";
  const unitLabel = source ? getUnitLabel(source.unit) : "";

  const refresh = useCallback(async () => {
    await revalidateInventory();
    if (source?.id) await revalidateInventoryDetail(source.id);
    onChanged?.();
  }, [onChanged, source?.id]);

  const handleDelete = async () => {
    if (!source) return;
    if (!window.confirm(`Xóa "${source.name}"?`)) return;

    setActionLoading(true);
    try {
      const result = await deleteInventoryItem(source.id);
      if (!result.success) throw new Error(result.error || "Không thể xóa vật tư");
      toast.success("Đã xóa vật tư");
      onClose();
      void refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi xử lý");
    } finally {
      setActionLoading(false);
    }
  };

  const titleBadge = status ? (
    <Badge variant={asBadgeVariant(status.variant)} dot>
      {status.label}
    </Badge>
  ) : undefined;

  const actionClassName =
    "btn btn-secondary h-9 px-2.5 sm:px-3 gap-1.5 text-xs font-semibold";
  const dangerActionClassName =
    "btn btn-secondary h-9 px-2.5 sm:px-3 gap-1.5 text-xs font-semibold border-error/25 bg-error/5 text-error hover:bg-error/10 hover:border-error/40";

  const headerRight = source ? (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        unstyled
        onClick={() => setShowEdit(true)}
        className={actionClassName}
        aria-label="Sửa vật tư"
      >
        <Pencil className="size-4" />
        <span className="hidden sm:inline">Sửa</span>
      </Button>
      <Button
        type="button"
        unstyled
        onClick={handleDelete}
        disabled={actionLoading}
        className={dangerActionClassName}
        aria-label="Xóa vật tư"
      >
        {actionLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
        <span className="hidden sm:inline">Xóa</span>
      </Button>
    </div>
  ) : null;

  const transactions = detail?.transactions || [];
  const totalIn = detail?.transactionTotals?.totalIn ?? transactions
    .filter((txn) => txn.transaction_type === "stock_in")
    .reduce((sum, txn) => sum + txn.quantity, 0);
  const totalOut = detail?.transactionTotals?.totalOut ?? transactions
    .filter((txn) => txn.transaction_type === "stock_out")
    .reduce((sum, txn) => sum + txn.quantity, 0);
  const stockValue = (source?.current_stock || 0) * (source?.average_unit_price || 0);

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={source?.name || "Chi tiết vật tư"}
        titleBadge={titleBadge}
        headerRight={headerRight}
        size="lg"
      >
        {!source ? null : (
          <div className="space-y-4">
            <section className="card-base p-4">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {getInitials(source.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-h3 truncate">{source.name}</h3>
                    <span className="font-mono text-sm text-text-muted">
                      {source.item_code}
                    </span>
                  </div>
                  <p className="text-caption mt-1">
                    {categoryLabel}
                    {unitLabel ? ` · ${unitLabel}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="accent">{categoryLabel}</Badge>
                    {status ? (
                      <Badge variant={asBadgeVariant(status.variant)} dot>
                        {status.label}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <div className="accent-card accent-card-green">
                <div className="text-caption text-text-muted">Tồn kho</div>
                <div className="font-bold tabular-nums">
                  {source.current_stock} {unitLabel}
                </div>
              </div>
              <div className="accent-card accent-card-gold">
                <div className="text-caption text-text-muted">Giá trị tồn</div>
                <div className="font-bold tabular-nums">{fmt(stockValue)}</div>
              </div>
              <div className="accent-card accent-card-green">
                <div className="text-caption text-text-muted">Tổng nhập</div>
                <div className="font-bold tabular-nums">{totalIn}</div>
              </div>
              <div className="accent-card accent-card-gold">
                <div className="text-caption text-text-muted">Tổng xuất</div>
                <div className="font-bold tabular-nums">{totalOut}</div>
              </div>
            </section>

            <section className="flex gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowStockIn(true)}
                disabled={!canMoveStock}
                className="flex-1 gap-2"
              >
                <ArrowDownToLine className="size-4" />
                Nhập kho
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowStockOut(true)}
                disabled={!canMoveStock}
                className="flex-1 gap-2"
              >
                <ArrowUpFromLine className="size-4" />
                Xuất kho
              </Button>
            </section>

            <section className="card-base p-4">
              <InfoRows
                title="Thông tin vật tư"
                rows={[
                  ["Phân loại", categoryLabel],
                  ["Đơn vị", unitLabel || "-"],
                  ["Tồn tối thiểu", String(source.min_stock || "-")],
                  ["Nhà cung cấp", source.supplier || "-"],
                ]}
              />
              <div className="my-4 h-px bg-border/30" />
              <InfoRows
                title="Giá"
                rows={[
                  ["Giá nhập", fmt(source.purchase_price)],
                  ["Giá TB", fmt(source.average_unit_price)],
                  ["Giá bán", fmt(source.sale_price)],
                ]}
              />
              {source.notes ? (
                <>
                  <div className="my-4 h-px bg-border/30" />
                  <p className="text-sm text-text-secondary">{source.notes}</p>
                </>
              ) : null}
            </section>

            <section className="card-base overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4">
                <h3 className="section-heading">Lịch sử giao dịch</h3>
                {isLoading ? <Loader2 className="size-4 animate-spin text-text-muted" /> : null}
              </div>
              <TransactionPreview transactions={transactions} />
            </section>
          </div>
        )}
      </Drawer>

      {source && showEdit ? (
        <InventoryFormModal
          isOpen
          onClose={() => {
            setShowEdit(false);
            void refresh();
          }}
          editItem={source}
        />
      ) : null}
      {source && showStockIn ? (
        <StockInModal
          isOpen
          onClose={() => {
            setShowStockIn(false);
            void refresh();
          }}
          item={source}
        />
      ) : null}
      {source && showStockOut ? (
        <StockOutModal
          isOpen
          onClose={() => {
            setShowStockOut(false);
            void refresh();
          }}
          item={source}
        />
      ) : null}
    </>
  );
}

function InfoRows({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <>
      <h3 className="text-overline mb-3">{title}</h3>
      <div className="space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="text-caption">{label}</span>
            <span className="text-sm font-medium text-text">{value}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function TransactionPreview({
  transactions,
}: {
  transactions: Array<{
    id: string;
    transaction_type: string;
    quantity: number;
    unit_cost: number;
    reason: string | null;
    created_at: string;
  }>;
}) {
  if (transactions.length === 0) {
    return <p className="p-4 text-sm text-text-muted">Chưa có giao dịch nào.</p>;
  }

  return (
    <TableWrapper>
      <THead>
        <tr>
          <TH>Loại</TH>
          <TH className="text-right">SL</TH>
          <TH className="text-right">Đơn giá</TH>
          <TH>Ngày</TH>
        </tr>
      </THead>
      <TBody>
        {transactions.slice(0, 8).map((txn) => {
          const typeConfig = TRANSACTION_TYPE_MAP[txn.transaction_type] || {
            label: txn.transaction_type,
            variant: "neutral" as const,
          };
          return (
            <TR key={txn.id}>
              <TD>
                <Badge variant={asBadgeVariant(typeConfig.variant)}>
                  {typeConfig.label}
                </Badge>
              </TD>
              <TD className="text-right font-semibold">{txn.quantity}</TD>
              <TD className="text-right">{fmt(txn.unit_cost)}</TD>
              <TD>{formatDate(txn.created_at)}</TD>
            </TR>
          );
        })}
      </TBody>
    </TableWrapper>
  );
}
