"use client";

/**
 * 📋 TransactionHistoryTable — Desktop table + Mobile card list
 * Clone: inventory-table.tsx
 * Shows inventory transaction history with type badges and details
 *
 * Thứ tự cột tối ưu nghiệp vụ:
 * THỜI GIAN | NGUỒN + KHÁCH/NCC | VẬT TƯ | SỐ LƯỢNG | THÀNH TIỀN
 */

import { ChevronRight, History, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
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
}

function DesktopTable({ transactions, onRowClick, onHover }: TransactionHistoryTableProps) {
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
            <TH className="w-[50px]"></TH>
          </tr>
        </THead>
        <TBody>
          {transactions.map((txn) => {
            const sourceDisplay = getSourceDisplay(txn.source_type);
            const isStockIn = txn.transaction_type === "stock_in";

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
                  <span className="font-semibold text-text-main">{fmt(txn.total_cost)}</span>
                </TD>

                {/* Arrow */}
                <TD className="text-right">
                  <div className="h-8 w-8 inline-flex items-center justify-center rounded-md shadow-xs bg-bg-card text-text-secondary group-hover:bg-primary group-hover:text-white group-hover:shadow-sm transition-all">
                    <ChevronRight className="w-4 h-4" />
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
              <span className="font-bold text-text-main">{fmt(txn.total_cost)}</span>
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
