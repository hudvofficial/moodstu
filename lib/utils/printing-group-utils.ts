import type { PrintingOrderRow } from "@/types/printing";
import { isPendingPrintStatus } from "@/types/printing-constants";

// ═══════════════════════════════════════════
// Printing Group Utils — Client-side grouping
// Groups flat printing orders by contract
// ═══════════════════════════════════════════

export interface ContractGroup {
  contractId: string | null;
  contractCode: string;
  customerName: string;
  orders: PrintingOrderRow[];
  orderCount: number;
  totalAmount: number;
  overdueCount: number;
  completedCount: number;
}

/**
 * Group a flat list of printing orders by their contract.
 * Orders without a contract are grouped under "Không có HĐ".
 */
export function groupOrdersByContract(
  orders: PrintingOrderRow[],
): ContractGroup[] {
  const map = new Map<string, ContractGroup>();

  for (const order of orders) {
    const key = order.contractCode || "__no_contract__";

    let group = map.get(key);
    if (!group) {
      group = {
        contractId: order.contractId,
        contractCode: order.contractCode || "Không có HĐ",
        customerName: order.customerName || "—",
        orders: [],
        orderCount: 0,
        totalAmount: 0,
        overdueCount: 0,
        completedCount: 0,
      };
      map.set(key, group);
    }

    group.orders.push(order);
    group.orderCount += 1;
    group.totalAmount += order.totalAmount;

    // Count overdue (pending + past expected date)
    const isPending = isPendingPrintStatus(order.status);
    if (
      isPending &&
      order.expectedDate &&
      new Date(order.expectedDate) < new Date()
    ) {
      group.overdueCount += 1;
    }

    // Count completed (da_in + da_nhan)
    if (order.status === "da_in" || order.status === "da_nhan") {
      group.completedCount += 1;
    }
  }

  return Array.from(map.values());
}
