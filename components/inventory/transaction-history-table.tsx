"use client";

/**
 * 📋 TransactionHistoryTable — Desktop table + Mobile card list
 * Clone: inventory-table.tsx
 * Shows inventory transaction history with type badges and details
 *
 * Thứ tự cột tối ưu nghiệp vụ:
 * THỜI GIAN | NGUỒN + KHÁCH/NCC | VẬT TƯ | SỐ LƯỢNG | THÀNH TIỀN
 */

import { ChevronRight, History, ArrowDownToLine, ArrowUpFromLine, Printer, Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/ux-states";
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { formatCurrency, CURRENCY_SYMBOL, safeFormatDate } from "@/lib/utils";
import {
  INVENTORY_SOURCE_TYPE_MAP,
} from "@/types/inventory-constants";
import type { InventoryTransaction } from "@/types/inventory";

function fmt(amount: number | null | undefined): string {
  if (amount == null) return "-";
  return formatCurrency(amount) + " " + CURRENCY_SYMBOL;
}

function getSourceDisplay(sourceType: string | null | undefined) {
  if (!sourceType) return null;
  return INVENTORY_SOURCE_TYPE_MAP[sourceType] || { label: sourceType, variant: "neutral" as const };
}

interface TransactionHistoryTableProps {
  transactions: InventoryTransaction[];
  onRowClick: (txn: InventoryTransaction) => void;
  onHover?: (itemId: string) => void;
  onPrint?: (txn: InventoryTransaction) => void;
  onEdit?: (txn: InventoryTransaction) => void;
  onDelete?: (txn: InventoryTransaction) => void;
}

function DesktopTable({ transactions, onRowClick, onHover, onPrint, onEdit, onDelete }: TransactionHistoryTableProps) {
  // Sync styling with receipt-row-actions
  const strokeWg = 1.75;
  const iconStyle = { width: 20, height: 20 };
  const btnStyle = { padding: 0 };

  return (
    <div className="hidden lg:block">
      <TableWrapper>
        <THead>
          <tr>
            <TH className="w-[100px]">Thời gian</TH>
            <TH className="min-w-[200px]">Nguồn / Đối tác</TH>
            <TH>Vật tư</TH>
            <TH className="text-right w-[100px]">Số lượng</TH>
            <TH className="text-right w-[140px]">Thành tiền</TH>
            <TH className="text-right w-[120px]">Thao tác</TH>
          </tr>
        </THead>
        <TBody>
          {transactions.map((txn) => {
            const sourceDisplay = getSourceDisplay(txn.source_type);
            const isStockIn = txn.transaction_type === "stock_in";

            // Ưu tiên sale_total (giá bán) cho bán lẻ/HĐ, fallback total_cost (giá vốn)
            const displayAmount = txn.sale_total || txn.total_cost;

            // Check if printable (có receipt hoặc là bán hàng)
            const canPrint = Boolean(txn.receipt_id || txn.source_type === 'contract_addon_sale' || txn.source_type === 'retail_sale');

            return (
              <TR
                key={txn.id}
                onClick={() => onRowClick(txn)}
                onMouseEnter={() => onHover?.(txn.item_id)}
              >
                {/* Thời gian */}
                <TD>
                  <span className="text-sm text-text-muted">
                    {safeFormatDate(txn.created_at, "dd/MM HH:mm")}
                  </span>
                </TD>

                {/* Nguồn + Khách/NCC */}
                <TD>
                  <div className="flex flex-col gap-1">
                    {/* Row 1: Icon + Badge + Mã HĐ */}
                    <div className="flex items-center gap-2">
                      {isStockIn ? (
                        <ArrowDownToLine className="w-4 h-4 text-success shrink-0" />
                      ) : (
                        <ArrowUpFromLine className="w-4 h-4 text-warning shrink-0" />
                      )}
                      {sourceDisplay && (
                        <Badge variant={sourceDisplay.variant} className="text-xs">
                          {sourceDisplay.label}
                        </Badge>
                      )}
                      {txn.contract_code && (
                        <span className="text-xs font-mono text-primary font-medium">
                          {txn.contract_code}
                        </span>
                      )}
                    </div>
                    {/* Row 2: Tên khách / NCC */}
                    {txn.customer_name ? (
                      <span className="text-sm text-text-main font-semibold truncate max-w-[220px] pl-6">
                        {txn.customer_name}
                      </span>
                    ) : isStockIn && txn.supplier ? (
                      <span className="text-sm text-text-secondary truncate max-w-[220px] pl-6">
                        {txn.supplier}
                      </span>
                    ) : null}
                  </div>
                </TD>

                {/* Vật tư */}
                <TD>
                  <div className="flex flex-col">
                    <span className="font-semibold text-text-main group-hover:underline underline-offset-4 decoration-primary/30">
                      {txn.item_name || "-"}
                    </span>
                    <span className="text-xs text-text-muted font-mono">
                      {txn.item_code || "-"}
                    </span>
                  </div>
                </TD>

                {/* Số lượng */}
                <TD className="text-right">
                  <span className={`text-lg font-bold ${isStockIn ? "text-success" : "text-warning"}`}>
                    {isStockIn ? "+" : "-"}{txn.quantity}
                  </span>
                </TD>

                {/* Thành tiền */}
                <TD className="text-right">
                  <span className="font-semibold text-text-main">{fmt(displayAmount)}</span>
                </TD>

                {/* Actions - synced with receipt-row-actions styling */}
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canPrint && onPrint && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPrint(txn);
                        }}
                        className="btn-icon text-text-secondary"
                        style={btnStyle}
                        title="In phiếu"
                      >
                        <Printer style={iconStyle} strokeWidth={strokeWg} />
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(txn);
                        }}
                        className="btn-icon text-text-secondary"
                        style={btnStyle}
                        title="Sửa"
                      >
                        <Edit2 style={iconStyle} strokeWidth={strokeWg} />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(txn);
                        }}
                        className="btn-icon text-error hover:text-error hover:bg-error/10"
                        style={btnStyle}
                        title="Xóa"
                      >
                        <Trash2 style={iconStyle} strokeWidth={strokeWg} />
                      </Button>
                    )}
                    <div className="h-7 w-7 inline-flex items-center justify-center rounded-md text-text-secondary">
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

function MobileCardList({ transactions, onRowClick, onHover }: TransactionHistoryTableProps) {
  return (
    <div className="lg:hidden flex flex-col gap-3 pt-1">
      {transactions.map((txn, i) => {
        const sourceDisplay = getSourceDisplay(txn.source_type);
        const isStockIn = txn.transaction_type === "stock_in";
        const displayAmount = txn.sale_total || txn.total_cost;

        return (
          <Button
            unstyled
            key={txn.id}
            onClick={() => onRowClick(txn)}
            onPointerEnter={() => onHover?.(txn.item_id)}
            onFocus={() => onHover?.(txn.item_id)}
            className={`card-base p-4 text-left transition-all active:scale-[0.99] entrance entrance-${Math.min(i + 1, 5)}`}
          >
            {/* Row 1: Time + Type */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isStockIn ? (
                  <ArrowDownToLine className="w-4 h-4 text-success" />
                ) : (
                  <ArrowUpFromLine className="w-4 h-4 text-warning" />
                )}
                {sourceDisplay && (
                  <Badge variant={sourceDisplay.variant} className="text-tiny">
                    {sourceDisplay.label}
                  </Badge>
                )}
                {txn.contract_code && (
                  <span className="text-xs font-mono text-primary">{txn.contract_code}</span>
                )}
              </div>
              <span className="text-xs text-text-muted">
                {safeFormatDate(txn.created_at, "dd/MM HH:mm")}
              </span>
            </div>

            {/* Row 2: Customer / Supplier */}
            {(txn.customer_name || txn.supplier) && (
              <p className="text-sm font-semibold text-text-main mb-2 truncate">
                {txn.customer_name || (isStockIn && txn.supplier ? txn.supplier : null)}
              </p>
            )}

            {/* Row 3: Item */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-text-secondary truncate flex-1 mr-2">
                {txn.item_name || "-"}
              </span>
              <span className="text-xs text-text-muted font-mono">{txn.item_code}</span>
            </div>

            {/* Row 4: Quantity + Total */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className={`text-lg font-bold ${isStockIn ? "text-success" : "text-warning"}`}>
                {isStockIn ? "+" : "-"}{txn.quantity}
              </span>
              <span className="font-bold text-text-main">{fmt(displayAmount)}</span>
            </div>
          </Button>
        );
      })}
    </div>
  );
}

export function TransactionHistoryTable(props: TransactionHistoryTableProps) {
  if (props.transactions.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Chưa có giao dịch"
        description="Chưa ghi nhận giao dịch xuất nhập nào phù hợp với bộ lọc."
      />
    );
  }
  return (
    <>
      <DesktopTable {...props} />
      <MobileCardList {...props} />
    </>
  );
}
