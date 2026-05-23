"use client";

/**
 * 📋 InventoryTable — Desktop table + Mobile card list (SAME FILE)
 * Clone: contracts/contracts-table.tsx
 * Table: uses TableWrapper/TH/TD/TR (SSOT — NOT raw <table>)
 * Cards: uses card-base + entrance animations
 */

import { ChevronRight, Package, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/ux-states";
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { SwipeableCard } from "@/components/ui/swipeable-card";
import type { SwipeAction } from "@/components/ui/swipeable-card";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import {
  INVENTORY_STATUS_MAP,
  INVENTORY_CATEGORY_MAP,
  INVENTORY_UNIT_MAP,
} from "@/types/inventory-constants";
import type { InventoryItem } from "@/types/inventory";
import type { InventoryStatus, InventoryCategory, InventoryUnit } from "@/lib/validations/inventory.schema";

// ─── HELPERS ─────────────────────────────────────────

function fmt(amount: number): string {
  return formatCurrency(amount) + " " + CURRENCY_SYMBOL;
}

function getStatusDisplay(item: InventoryItem) {
  // Computed stock status (higher priority than DB status)
  if (item.current_stock === 0) {
    return { label: "Hết hàng", variant: "error" as const };
  }
  if (item.min_stock && item.current_stock < item.min_stock) {
    return { label: "Sắp hết", variant: "warning" as const };
  }
  // DB status
  const status = item.status as InventoryStatus;
  const config = INVENTORY_STATUS_MAP[status];
  return config || { label: "Hoạt động", variant: "success" as const };
}

function getCategoryLabel(category: string | null): string {
  if (!category) return "Chưa phân loại";
  return INVENTORY_CATEGORY_MAP[category as InventoryCategory]?.label || category;
}

function getUnitLabel(unit: string | null): string {
  if (!unit) return "";
  return INVENTORY_UNIT_MAP[unit as InventoryUnit] || unit;
}

// ─── PROPS ───────────────────────────────────────────

interface InventoryTableProps {
  items: InventoryItem[];
  onRowClick: (item: InventoryItem) => void;
  onHover?: (id: string) => void;
  onStockIn?: (item: InventoryItem) => void;
  onStockOut?: (item: InventoryItem) => void;
}

// ─── DESKTOP TABLE ──────────────────────────────────

function DesktopTable({ items, onRowClick, onHover, onStockIn, onStockOut }: InventoryTableProps) {
  return (
    <div className="hidden lg:block">
      <TableWrapper>
        <THead>
          <tr>
            <TH>Mã</TH>
            <TH>Tên vật tư</TH>
            <TH>Phân loại</TH>
            <TH className="text-right">Tồn kho</TH>
            <TH className="text-right">Đơn giá TB</TH>
            <TH>Trạng thái</TH>
            <TH className="text-right">Thao tác</TH>
          </tr>
        </THead>
        <TBody>
          {items.map((item) => {
            const status = getStatusDisplay(item);
            const canMoveStock = item.status === "active";
            return (
              <TR
                key={item.id}
                onClick={() => onRowClick(item)}
                onMouseEnter={() => onHover?.(item.id)}
              >
                <TD>
                  <span className="font-mono text-text-muted">{item.item_code}</span>
                </TD>
                <TD>
                  <span
                    className="font-semibold text-text-main group-hover:underline underline-offset-4 decoration-primary/30"
                  >
                    {item.name}
                  </span>
                </TD>
                <TD>
                  <Badge variant="info">{getCategoryLabel(item.category)}</Badge>
                </TD>
                <TD className="text-right">
                  <span className="font-semibold text-text-main">
                    {item.current_stock} {getUnitLabel(item.unit)}
                  </span>
                </TD>
                <TD className="text-right">
                  <span className="text-text-secondary">{fmt(item.average_unit_price || 0)}</span>
                </TD>
                <TD>
                  <Badge variant={status.variant} dot>{status.label}</Badge>
                </TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onStockIn && canMoveStock && (
                      <Button unstyled
                        onClick={(e) => { e.stopPropagation(); onStockIn(item); }}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md text-text-secondary opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all"
                        title="Nhập kho"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {onStockOut && canMoveStock && (
                      <Button unstyled
                        onClick={(e) => { e.stopPropagation(); onStockOut(item); }}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md text-text-secondary opacity-0 group-hover:opacity-100 hover:bg-warning/10 hover:text-warning transition-all"
                        title="Xuất kho"
                      >
                        <ArrowUpFromLine className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <div className="h-8 w-8 inline-flex items-center justify-center rounded-md shadow-xs bg-bg-card text-text-secondary group-hover:bg-primary group-hover:text-white group-hover:shadow-sm transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </TableWrapper>
    </div>
  );
}

// ─── MOBILE CARD LIST ────────────────────────────────

function MobileCardList({ items, onRowClick, onHover, onStockIn, onStockOut }: InventoryTableProps) {
  return (
    <div className="lg:hidden flex flex-col gap-3 pt-1">
      {items.map((item, i) => {
        const status = getStatusDisplay(item);
        const canMoveStock = item.status === "active";

        // Swipe actions
        const leftActions: SwipeAction[] = canMoveStock && onStockOut ? [{
          id: "stock-out",
          label: "Xuất",
          icon: <ArrowUpFromLine className="w-4 h-4" />,
          className: "bg-warning text-white",
          onClick: () => onStockOut(item),
        }] : [];

        const rightActions: SwipeAction[] = canMoveStock && onStockIn ? [{
          id: "stock-in",
          label: "Nhập",
          icon: <ArrowDownToLine className="w-4 h-4" />,
          className: "bg-success text-white",
          onClick: () => onStockIn(item),
        }] : [];

        return (
          <SwipeableCard
            key={item.id}
            leftActions={leftActions}
            rightActions={rightActions}
          >
            <Button unstyled
              onClick={() => onRowClick(item)}
              onPointerEnter={() => onHover?.(item.id)}
              onFocus={() => onHover?.(item.id)}
              className={`card-base p-4 text-left transition-all active:scale-[0.99] entrance entrance-${Math.min(i + 1, 5)} w-full`}
            >
              {/* Row 1: Mã vật tư + Status badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted font-mono">
                  {item.item_code}
                </span>
                <Badge variant={status.variant} className="text-tiny">
                  {status.label}
                </Badge>
              </div>

              {/* Row 2: Tên vật tư */}
              <h3 className="text-sm font-bold text-text-main mb-1.5 truncate">
                {item.name}
              </h3>

              {/* Row 3: Category + Stock */}
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="info" className="text-tiny">
                  {getCategoryLabel(item.category)}
                </Badge>
                <span className="text-xs text-text-secondary">
                  Tồn: <strong>{item.current_stock}</strong> {getUnitLabel(item.unit)}
                </span>
              </div>

              {/* Row 4: Đơn giá */}
              <p className="text-sm font-semibold text-text-main">
                {fmt(item.average_unit_price || 0)}
              </p>
            </Button>
          </SwipeableCard>
        );
      })}
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────

export function InventoryTable(props: InventoryTableProps) {
  if (props.items.length === 0) return (
    <EmptyState
      icon={Package}
      title="Chưa có vật tư"
      description="Chưa ghi nhận vật tư nào phù hợp với bộ lọc hiện tại."
    />
  );
  return (
    <>
      <DesktopTable {...props} />
      <MobileCardList {...props} />
    </>
  );
}
