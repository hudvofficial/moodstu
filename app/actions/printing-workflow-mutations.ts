"use server";

/**
 * Printing Workflow — Server Actions
 *
 * ADR-014 (2026-08-24): in ấn là Mood ⇄ Lab đối tác thuần tuý — không có "đặt cọc"
 * (recordDepositPayment), không có "kho vật tư nội bộ" (startProduction/
 * completeProduction — 0/27 đơn thật từng chạm inventory_reservations), không có
 * "giao khách" gắn ở đơn in (recordFinalPayment — thuộc contract_events). Cả 4 hàm
 * đó đã bị xoá khỏi file này. Công nợ Lab đi qua record_lab_payment_atomic (module
 * lab-mutations.ts), không đổi. Chỉ còn `cancelOrder` là hợp lệ ở đây.
 *
 * ADR-015 (2026-08-25): bỏ luôn nhánh "hoàn tiền khách" trong cancelOrder — khách
 * không trả tiền Mood qua đơn in nên không có gì để hoàn (tàn dư "đặt cọc" sót lại
 * vì file UI gọi nó nằm ngoài locks của ADR-014). Nhánh hoàn kho bên dưới cũng là
 * dead code cùng lý do (không nơi nào set inventory_status reserved/stocked_out
 * nữa) nhưng không gây triệu chứng sai — giữ nguyên, chỉ ghi nhận.
 */

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { fireAuditLog } from "@/lib/audit";
import { withPrintingAccess } from "@/lib/auth_utils";

// ─── HELPER: Get order with validation ──────────────────

async function getOrderWithValidation(supabase: any, orderId: string) {
  const { data: order, error } = await supabase
    .from("printing_orders")
    .select("*")
    .eq("id", orderId)
    .is("deleted_at", null)
    .single();

  if (error || !order) {
    throw new Error("Không tìm thấy đơn in");
  }

  return order;
}

// ─── CANCEL ORDER WITH ROLLBACK ──────────────────────

export async function cancelOrder(input: {
  orderId: string;
  reason: string;
}) {
  return withPrintingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const { orderId, reason } = input;

    if (!reason.trim()) {
      throw new Error("Phải nhập lý do hủy đơn");
    }

    // Get order
    const order = await getOrderWithValidation(supabase, orderId);

    if (order.status === "hoan_thanh" || order.status === "huy_don") {
      throw new Error("Không thể hủy đơn đã hoàn thành hoặc đã hủy");
    }

    const currentStatus = order.status;
    const inventoryStatus = order.inventory_status;

    // 1. Rollback inventory if stocked out
    if (inventoryStatus === "stocked_out") {
      // Find all stock out transactions for this order
      const { data: transactions, error: txnError } = await supabase
        .from("inventory_transactions")
        .select("*")
        .eq("source_type", "printing_order")
        .eq("source_id", orderId)
        .eq("transaction_type", "stock_out")
        .eq("is_rollback", false);

      if (txnError) {
        throw new Error(`Không thể lấy danh sách giao dịch: ${txnError.message}`);
      }

      // Reverse each transaction
      for (const txn of transactions || []) {
        // Stock back in
        const { error: stockInError } = await supabase
          .from("inventory_transactions")
          .insert({
            item_id: txn.item_id,
            transaction_type: "stock_in",
            quantity: txn.quantity,
            unit_cost: txn.unit_cost || 0,
            source_type: "printing_order",
            source_id: orderId,
            is_rollback: true,
            rolled_back_txn_id: txn.id,
            reason: `Hoàn trả do hủy đơn #${order.order_code}`,
            notes: `Rollback transaction ${txn.id}`,
            created_by: userId,
          });

        if (stockInError) {
          throw new Error(`Không thể hoàn kho: ${stockInError.message}`);
        }

        // Update item stock
        // RPC increment_inventory_stock KHÔNG tồn tại trong DB (404 PGRST202) — trước đây
        // lời gọi luôn lỗi rồi rơi xuống nhánh fallback này, nên bỏ hẳn lời gọi chết.
        const { data: item } = await supabase
          .from("inventory_items")
          .select("current_stock")
          .eq("id", txn.item_id)
          .single();

        if (item) {
          await supabase
            .from("inventory_items")
            .update({
              current_stock: (item.current_stock ?? 0) + txn.quantity,
              updated_at: new Date().toISOString(),
              updated_by: userId,
            })
            .eq("id", txn.item_id);
        }
      }
    } else if (inventoryStatus === "reserved") {
      // Cancel reservations
      await supabase
        .from("inventory_reservations")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId)
        .eq("status", "active");
    }

    // 2. Update order status
    const { error: updateError } = await supabase
      .from("printing_orders")
      .update({
        status: "huy_don",
        inventory_status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", orderId);

    if (updateError) {
      throw new Error(`Không thể cập nhật đơn: ${updateError.message}`);
    }

    // 3. Audit
    await fireAuditLog({
      action: "UPDATE",
      tableName: "printing_orders",
      recordId: orderId,
      description: `Hủy đơn: ${reason}`,
      severity: "WARNING",
      oldData: {
        status: currentStatus,
        inventory_status: inventoryStatus,
      },
      newData: {
        status: "huy_don",
      },
      source: "server_action",
    });

    revalidatePath("/printing");
    revalidatePath(`/printing/${orderId}`);

    return {
      success: true,
      data: {
        message: "Đã hủy đơn",
      },
    };
  });
}
