"use client";

/**
 * 📦 InventoryDetailPage — Redesigned (Phase 6)
 * Gold Standard: employee-detail-page.tsx
 * Layout: Header Card + detail-grid (8:4 desktop) / stacked (mobile)
 * SSOT: 100% design tokens, 0 hardcode
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Pencil,
  Trash2,
  Package,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/ux-states";
import { StockInModal } from "@/components/inventory/stock-in-modal";
import { StockOutModal } from "@/components/inventory/stock-out-modal";
import { InventoryFormModal } from "@/components/inventory/inventory-form-modal";
import {
  useInventoryDetail,
  revalidateInventory,
  revalidateInventoryDetail,
} from "@/lib/hooks/use-inventory";
import { deleteInventoryItem } from "@/app/actions/inventory-mutations";
import { formatCurrency, CURRENCY_SYMBOL, formatDate, getInitials } from "@/lib/utils";
import {
  INVENTORY_STATUS_MAP,
  INVENTORY_CATEGORY_MAP,
  INVENTORY_UNIT_MAP,
  TRANSACTION_TYPE_MAP,
} from "@/types/inventory-constants";
import type { InventoryDetail, InventoryItem } from "@/types/inventory";
import type {
  InventoryStatus,
  InventoryCategory,
  InventoryUnit,
} from "@/lib/validations/inventory.schema";

// ═══════════════════════════════════════════
// InventoryDetailPage — Clone employee skeleton, inventory workflow
// ═══════════════════════════════════════════

interface InventoryDetailPageProps {
  id: string;
  initialDetail?: InventoryDetail | null;
}

export function InventoryDetailPage({ id, initialDetail }: InventoryDetailPageProps) {
  const router = useRouter();
  const { detail, isLoading, error } = useInventoryDetail(id, initialDetail);
  const [showStockIn, setShowStockIn] = useState(false);
  const [showStockOut, setShowStockOut] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!detail) return;
    if (!confirm(`Xóa "${detail.name}"?`)) return;
    setActionLoading(true);
    try {
      const result = await deleteInventoryItem(detail.id);
      if (result && "success" in result && result.success) {
        toast.success("Đã xóa vật tư");
        await revalidateInventory();
        router.push("/inventory");
      } else {
        toast.error("Không thể xóa vật tư");
      }
    } catch {
      toast.error("Lỗi xử lý");
    } finally {
      setActionLoading(false);
    }
  }, [detail, router]);

  const fmt = (n: number) => formatCurrency(n) + " " + CURRENCY_SYMBOL;

  // ── Loading Skeleton (match platform layout) ──
  if (isLoading) {
    return (
      <div className="main-container gap-4!">
        <div className="skeleton h-6 w-40 rounded-lg" />
        {/* Desktop skeleton */}
        <div className="max-lg:hidden space-y-4">
          <div className="skeleton h-20 rounded-xl" />
          <div className="detail-grid">
            <div className="detail-main">
              <div className="skeleton-card h-48 p-5" />
              <div className="skeleton-card h-32 p-5" />
            </div>
            <div className="detail-sidebar">
              <div className="skeleton-card h-28 p-5" />
              <div className="skeleton-card h-24 p-5" />
            </div>
          </div>
        </div>
        {/* Mobile skeleton */}
        <div className="lg:hidden space-y-3">
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton-card h-36 p-4" />
          <div className="skeleton h-10 rounded-lg" />
        </div>
      </div>
    );
  }

  // ── Error / Not found ──
  if (error || !detail) {
    return (
      <div className="main-container">
        <EmptyState
          icon={Package}
          title="Không tìm thấy"
          description="Vật tư không tồn tại hoặc đã bị xóa."
          actionLabel="Quay lại"
          onAction={() => router.push("/inventory")}
        />
      </div>
    );
  }

  const statusConfig =
    INVENTORY_STATUS_MAP[detail.status as InventoryStatus] || {
      label: "Hoạt động",
      variant: "success" as const,
    };
  const categoryLabel =
    INVENTORY_CATEGORY_MAP[detail.category as InventoryCategory]?.label ||
    detail.category ||
    "—";
  const unitLabel =
    INVENTORY_UNIT_MAP[detail.unit as InventoryUnit] || detail.unit || "—";

  const isLowStock =
    detail.min_stock > 0 && detail.current_stock < detail.min_stock;
  const canMoveStock = detail.status === "active";

  // ── Info items (employee InfoCard pattern) ──
  const infoItems = [
    { label: "Phân loại", value: categoryLabel },
    { label: "Đơn vị", value: unitLabel },
    {
      label: "Tồn kho",
      value: String(detail.current_stock),
      highlight: isLowStock,
    },
    { label: "Tồn tối thiểu", value: String(detail.min_stock || "—") },
  ];

  const priceItems = [
    { label: "Giá nhập", value: fmt(detail.purchase_price) },
    { label: "Giá TB", value: fmt(detail.average_unit_price) },
    { label: "Giá bán", value: fmt(detail.sale_price) },
    { label: "Nhà cung cấp", value: detail.supplier || "—" },
  ];

  // ── Summary stats ──
  const totalIn = detail.transactionTotals?.totalIn ?? detail.transactions
    .filter((t) => t.transaction_type === "stock_in")
    .reduce((s, t) => s + t.quantity, 0);
  const totalOut = detail.transactionTotals?.totalOut ?? detail.transactions
    .filter((t) => t.transaction_type === "stock_out")
    .reduce((s, t) => s + t.quantity, 0);
  const stockValue = detail.current_stock * (detail.average_unit_price || 0);

  const summaryItems = [
    { label: "Tổng nhập", value: String(totalIn) },
    { label: "Tổng xuất", value: String(totalOut) },
    { label: "Giá trị tồn", value: fmt(stockValue) },
  ];

  return (
    <>
      <div className="main-container gap-4!">
        {/* ── Breadcrumb ── */}
        <Breadcrumb
          items={[
            { label: "Kho vật tư", href: "/inventory" },
            { label: detail.name },
          ]}
        />

        {/* ── Header Card ── */}
        <div className="card-base flex items-start gap-4 py-4 px-5 entrance entrance-1">
          {/* Icon initials */}
          <div className="flex items-center justify-center size-14 rounded-full bg-primary/10 text-primary text-lg font-bold shrink-0">
            {getInitials(detail.name)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-h3 text-text">{detail.name}</h1>
              <span className="text-sm text-text-muted">
                {detail.item_code}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Badge variant="accent">{categoryLabel}</Badge>
              <Badge variant={statusConfig.variant} dot>
                {statusConfig.label}
              </Badge>
              {isLowStock && <Badge variant="warning">Sắp hết</Badge>}
            </div>
          </div>

          {/* Action buttons — inline header */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              onClick={() => setShowEdit(true)}
              className="gap-1.5"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Sửa</span>
            </Button>
            <Button
              variant="secondary"
              onClick={handleDelete}
              disabled={actionLoading}
              className="gap-1.5 text-error"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Xóa</span>
            </Button>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            DESKTOP LAYOUT (≥1024px)
            ══════════════════════════════════════════ */}
        <div className="max-lg:hidden">
          <div className="detail-grid">
            {/* ── Main (8 col) ── */}
            <div className="detail-main">
              {/* Info Card — 2 sections with divider */}
              <div className="card-base p-5 entrance entrance-2">
                <InfoSection title="Thông tin vật tư" items={infoItems} />
                <div className="h-px bg-border/30 my-4" />
                <InfoSection title="Giá & nhà cung cấp" items={priceItems} />
                {detail.notes && (
                  <>
                    <div className="h-px bg-border/30 my-4" />
                    <p className="text-sm text-text-secondary">{detail.notes}</p>
                  </>
                )}
              </div>

              {/* Transaction History */}
              <div className="card-base overflow-hidden entrance entrance-3">
                <h3 className="section-heading px-5 pt-4 pb-0">
                  Lịch sử giao dịch
                </h3>
                <TransactionTable transactions={detail.transactions} fmt={fmt} />
              </div>
            </div>

            {/* ── Sidebar (4 col) ── */}
            <div className="detail-sidebar">
              {/* Stock Actions CTA */}
              <div className="card-base p-4 space-y-2.5 entrance entrance-2">
                <h3 className="text-overline mb-3">Quản lý kho</h3>
                <Button
                  variant="primary"
                  onClick={() => setShowStockIn(true)}
                  disabled={!canMoveStock}
                  className="w-full gap-2"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  Nhập kho
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowStockOut(true)}
                  disabled={!canMoveStock}
                  className="w-full gap-2"
                >
                  <ArrowUpFromLine className="w-4 h-4" />
                  Xuất kho
                </Button>
              </div>

              {/* Summary Stats */}
              <div className="card-base p-4 entrance entrance-3">
                <InfoSection title="Tóm tắt" items={summaryItems} />
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            MOBILE LAYOUT (<1024px)
            ══════════════════════════════════════════ */}
        <div className="lg:hidden flex flex-col gap-3">
          {/* Info Card — embedded sections */}
          <div className="card-base p-4 entrance entrance-2">
            <InfoSection title="Thông tin vật tư" items={infoItems} />
            <div className="h-px bg-border/30 my-3" />
            <InfoSection title="Giá & NCC" items={priceItems} />
            {detail.notes && (
              <>
                <div className="h-px bg-border/30 my-3" />
                <p className="text-sm text-text-secondary">{detail.notes}</p>
              </>
            )}
          </div>

          {/* Stock Actions — 2 buttons horizontal */}
          <div className="flex gap-2 entrance entrance-3">
            <Button
              variant="primary"
              onClick={() => setShowStockIn(true)}
              disabled={!canMoveStock}
              className="flex-1 gap-2"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Nhập kho
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowStockOut(true)}
              disabled={!canMoveStock}
              className="flex-1 gap-2"
            >
              <ArrowUpFromLine className="w-4 h-4" />
              Xuất kho
            </Button>
          </div>

          {/* Transaction History */}
          <div className="card-base overflow-hidden entrance entrance-4">
            <h3 className="section-heading px-4 pt-3 pb-0">Lịch sử giao dịch</h3>
            <TransactionTable transactions={detail.transactions} fmt={fmt} />
          </div>

          {/* Summary */}
          <div className="card-base p-4 entrance entrance-5">
            <InfoSection title="Tóm tắt" items={summaryItems} />
          </div>
        </div>
      </div>

      {/* ── Modals — revalidate detail cache on close (Lesson #91) ── */}
      {showStockIn && (
        <StockInModal
          isOpen
          onClose={() => {
            setShowStockIn(false);
            revalidateInventoryDetail(id);
          }}
          item={detail as InventoryItem}
        />
      )}
      {showStockOut && (
        <StockOutModal
          isOpen
          onClose={() => {
            setShowStockOut(false);
            revalidateInventoryDetail(id);
          }}
          item={detail as InventoryItem}
        />
      )}
      {showEdit && (
        <InventoryFormModal
          isOpen
          onClose={() => {
            setShowEdit(false);
            revalidateInventoryDetail(id);
          }}
          editItem={detail as InventoryItem}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════
// InfoSection — Label/value rows (employee InfoCard pattern)
// ═══════════════════════════════════════════
function InfoSection({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string; highlight?: boolean }[];
}) {
  return (
    <>
      <h3 className="text-overline mb-3">{title}</h3>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-caption">{item.label}</span>
            <span
              className={`text-sm font-medium ${
                item.highlight ? "text-warning" : "text-text"
              }`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════
// TransactionTable — Shared between desktop & mobile
// ═══════════════════════════════════════════
function TransactionTable({
  transactions,
  fmt,
}: {
  transactions: Array<{
    id: string;
    transaction_type: string;
    quantity: number;
    unit_cost: number;
    reason: string | null;
    created_at: string;
  }>;
  fmt: (n: number) => string;
}) {
  if (transactions.length === 0) {
    return (
      <p className="text-sm text-text-muted p-5">Chưa có giao dịch nào.</p>
    );
  }

  return (
    <TableWrapper>
      <THead>
        <tr>
          <TH>Loại</TH>
          <TH className="text-right">SL</TH>
          <TH className="text-right">Đơn giá</TH>
          <TH>Lý do</TH>
          <TH>Ngày</TH>
        </tr>
      </THead>
      <TBody>
        {transactions.map((txn) => {
          const typeConfig = TRANSACTION_TYPE_MAP[txn.transaction_type] || {
            label: txn.transaction_type,
            variant: "neutral" as const,
          };
          return (
            <TR key={txn.id}>
              <TD>
                <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
              </TD>
              <TD className="text-right font-semibold">{txn.quantity}</TD>
              <TD className="text-right">{fmt(txn.unit_cost)}</TD>
              <TD>{txn.reason || "—"}</TD>
              <TD>{formatDate(txn.created_at)}</TD>
            </TR>
          );
        })}
      </TBody>
    </TableWrapper>
  );
}
