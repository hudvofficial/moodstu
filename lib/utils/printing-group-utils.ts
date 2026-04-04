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
  paymentStatus: "chua_thanh_toan" | "da_thanh_toan";
  nearestExpectedDate: string | null;
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
        paymentStatus: "da_thanh_toan", // Assume paid until a non-paid order is found
        nearestExpectedDate: null,
      };
      map.set(key, group);
    }

    group.orders.push(order);
    group.orderCount += 1;
    group.totalAmount += order.totalAmount;

    // Aggregate Payment Status
    if (order.paymentStatus === "chua_thanh_toan") {
      group.paymentStatus = "chua_thanh_toan";
    }

    const isPending = isPendingPrintStatus(order.status);
    
    // Count overdue
    if (isPending && order.expectedDate && new Date(order.expectedDate) < new Date()) {
      group.overdueCount += 1;
    }

    // Nearest Expected Date (only for pending prints)
    if (isPending && order.expectedDate) {
      if (!group.nearestExpectedDate || new Date(order.expectedDate) < new Date(group.nearestExpectedDate)) {
        group.nearestExpectedDate = order.expectedDate;
      }
    }

    // Count completed (da_in + da_nhan)
    if (!isPending) {
      group.completedCount += 1;
    }
  }

  // Finalize processing: handle case where there are no orders or all are paid
  // The loop logic handles setting unpaid/cong_no correctly.

  return Array.from(map.values());
}
