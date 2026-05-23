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
  INVENTORY_SOURCE_TYPE_MAP,
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
          <div className="flex flex-col min-h-full">
            <div className="flex-1 space-y-5">
              {/* Image Preview (if exists) */}
              {source.image_url && (
                <div className="rounded-xl overflow-hidden shadow-sm">
                  <div className="relative aspect-video bg-bg-muted">
                    <Image
                      src={source.image_url}
                      alt={source.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 600px"
                      priority
                    />
                  </div>
                </div>
              )}

              {/* Header Info Card */}
              <div className="p-4 bg-bg-hover rounded-xl shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">Mã vật tư</p>
                  <p className="text-h3 text-primary font-mono">{source.item_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">Phân loại</p>
                  <p className="font-medium text-text-main">{categoryLabel}</p>
                </div>
              </div>

              {/* Item Name & Status */}
              <div className="p-4 bg-bg-hover rounded-xl shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                    {source.image_url ? (
                      <div className="relative size-12 rounded-full overflow-hidden">
                        <Image
                          src={source.image_url}
                          alt={source.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      getInitials(source.name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-h3 truncate mb-2">{source.name}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="accent">{categoryLabel}</Badge>
                      {status ? (
                        <Badge variant={asBadgeVariant(status.variant)} dot>
                          {status.label}
                        </Badge>
                      ) : null}
                      {unitLabel && <Badge variant="neutral">{unitLabel}</Badge>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-bg-hover p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Tồn kho</p>
                  <p className="text-h3 text-success tabular-nums">
                    {source.current_stock} <span className="text-sm font-normal text-text-muted">{unitLabel}</span>
                  </p>
                </div>
                <div className="rounded-xl bg-bg-hover p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Giá trị tồn</p>
                  <p className="text-h3 text-warning tabular-nums">{fmt(stockValue)}</p>
                </div>
                <div className="rounded-xl bg-bg-hover p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Tổng nhập</p>
                  <p className="text-h3 text-info tabular-nums">{totalIn}</p>
                </div>
                <div className="rounded-xl bg-bg-hover p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Tổng xuất</p>
                  <p className="text-h3 text-error tabular-nums">{totalOut}</p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="form-grid-2col">
                <div className="rounded-xl bg-bg-hover p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Tồn tối thiểu</p>
                  <p className="font-semibold text-text-main">{source.min_stock || 0}</p>
                </div>
                <div className="rounded-xl bg-bg-hover p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Nhà cung cấp</p>
                  <p className="font-semibold text-text-main truncate">{source.supplier || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-bg-hover p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Giá nhập</p>
                  <p className="font-semibold text-text-main tabular-nums">{fmt(source.purchase_price)}</p>
                </div>
                <div className="rounded-xl bg-bg-hover p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Giá TB</p>
                  <p className="font-semibold text-text-main tabular-nums">{fmt(source.average_unit_price)}</p>
                </div>
                <div className="rounded-xl bg-bg-hover p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Giá bán</p>
                  <p className="font-semibold text-text-main tabular-nums">{fmt(source.sale_price)}</p>
                </div>
              </div>

              {source.notes && (
                <div className="rounded-xl bg-bg-hover p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-text-muted mb-2">Ghi chú</p>
                  <p className="text-sm text-text-secondary">{source.notes}</p>
                </div>
              )}

              {/* Transaction History */}
              <section className="rounded-xl bg-bg-card border border-border/40 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/30">
                  <h4 className="section-heading">Lịch sử giao dịch</h4>
                  {isLoading ? <Loader2 className="size-4 animate-spin text-text-muted" /> : null}
                </div>
                <TransactionPreview transactions={transactions} totalCount={transactions.length} itemId={source?.id} onViewAll={onClose} />
              </section>
            </div>

            {/* Sticky Footer */}
            <div className="sticky -bottom-6 lg:-bottom-6 -mx-5 lg:-mx-6 -mb-6 mt-6 px-5 lg:px-6 py-4 bg-bg-base/95 backdrop-blur-md border-t border-border flex items-center justify-between gap-3 z-10 shrink-0">
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
            </div>
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

function TransactionPreview({
  transactions,
}: {
  transactions: Array<{
    id: string;
    transaction_type: string;
    quantity: number;
    unit_cost: number;
    sale_unit_price?: number | null;
    source_type?: string | null;
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
          <TH className="text-right">Giá vốn</TH>
          <TH className="text-right">Giá bán</TH>
          <TH>Ngày</TH>
        </tr>
      </THead>
      <TBody>
        {transactions.slice(0, 8).map((txn) => {
          const typeConfig = TRANSACTION_TYPE_MAP[txn.transaction_type] || {
            label: txn.transaction_type,
            variant: "neutral" as const,
          };
          const sourceConfig = txn.source_type
            ? INVENTORY_SOURCE_TYPE_MAP[txn.source_type] || typeConfig
            : typeConfig;
          return (
            <TR key={txn.id}>
              <TD>
                <Badge variant={asBadgeVariant(sourceConfig.variant)}>
                  {sourceConfig.label}
                </Badge>
              </TD>
              <TD className="text-right font-semibold">{txn.quantity}</TD>
              <TD className="text-right">{fmt(txn.unit_cost)}</TD>
              <TD className="text-right">{txn.sale_unit_price ? fmt(txn.sale_unit_price) : "—"}</TD>
              <TD>{formatDate(txn.created_at)}</TD>
            </TR>
          );
        })}
      </TBody>
    </TableWrapper>
  );
}
