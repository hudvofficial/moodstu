"use server";

/**
 * Printing Workflow Phase 1: Server Actions
 * - recordDepositPayment: Thu đặt cọc
 * - startProduction: Bắt đầu in (reserve inventory)
 * - completeProduction: Hoàn thành in (stock out)
 */

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { fireAuditLog } from "@/lib/audit";
import { withPrintingAccess } from "@/lib/auth_utils";
import type {
  RecordDepositPaymentInput,
  StartProductionInput,
  CompleteProductionInput,
  OrderPayment,
  InventoryReservation,
} from "@/types/printing";

/**
 * Module In ấn dùng từ vựng riêng cho phương thức thanh toán
 * (`cash | transfer | card | other`, xem types/printing.ts) trong khi cột
 * `expenses.payment_method` là enum `payment_method_enum` chỉ có 2 giá trị.
 * Quy về 2 nhóm: tiền mặt và không-tiền-mặt.
 */
function toPaymentMethodEnum(
  method: "cash" | "transfer" | "card" | "other",
): Database["public"]["Enums"]["payment_method_enum"] {
  return method === "cash" ? "tien_mat" : "chuyen_khoan";
}

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

// ─── 1. RECORD DEPOSIT PAYMENT ──────────────────────────

export async function recordDepositPayment(input: RecordDepositPaymentInput) {
  return withPrintingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const { orderId, depositAmount, paymentMethod, paymentDate, notes } = input;

    // Validate input
    if (depositAmount <= 0) {
      throw new Error("Số tiền đặt cọc phải lớn hơn 0");
    }

    // Get order
    const order = await getOrderWithValidation(supabase, orderId);

    if (order.status !== "cho_xu_ly") {
      throw new Error("Chỉ có thể thu đặt cọc cho đơn 'Chờ xử lý'");
    }

    if (depositAmount > order.total_amount) {
      throw new Error("Số tiền đặt cọc không thể lớn hơn tổng đơn");
    }

    const paymentDateStr = paymentDate || new Date().toISOString().split("T")[0];

    // 1. Create receipt
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .insert({
        receipt_date: paymentDateStr,
        receipt_type: "sale_receipt",
        // data thật trong receipts.payment_type là tien_mat/chuyen_khoan — quy đổi từ vựng UI
        payment_type: toPaymentMethodEnum(paymentMethod),
        receipt_amount: depositAmount,
        category_name: "Đặt cọc đơn in",
        notes: notes || `Đặt cọc đơn #${order.order_code}`,
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();

    if (receiptError || !receipt) {
      throw new Error(`Không thể tạo phiếu thu: ${receiptError?.message}`);
    }

    // 2. Link to order via order_payments
    const { data: orderPayment, error: opError } = await supabase
      .from("order_payments")
      .insert({
        order_id: orderId,
        receipt_id: receipt.id,
        payment_type: "deposit",
        amount: depositAmount,
        payment_date: paymentDateStr,
        payment_method: toPaymentMethodEnum(paymentMethod), // thống nhất từ vựng tien_mat/chuyen_khoan
        notes,
        created_by: userId,
        updated_by: userId,
      })
      .select("*")
      .single();

    if (opError) {
      throw new Error(`Không thể liên kết thanh toán: ${opError.message}`);
    }

    // 3. Update order status & payment fields
    const newPaidAmount = (order.paid_amount || 0) + depositAmount;
    const newPaymentStatus = newPaidAmount >= order.total_amount ? "paid" : "partial";

    const { error: updateError } = await supabase
      .from("printing_orders")
      .update({
        status: "dat_coc",
        deposit_amount: depositAmount,
        paid_amount: newPaidAmount,
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", orderId);

    if (updateError) {
      throw new Error(`Không thể cập nhật đơn: ${updateError.message}`);
    }

    // 4. Audit log
    await fireAuditLog({
      action: "CREATE",
      tableName: "order_payments",
      recordId: orderPayment.id,
      description: `Thu đặt cọc ${depositAmount.toLocaleString()} cho đơn ${order.order_code}`,
      newData: {
        order_id: orderId,
        receipt_id: receipt.id,
        amount: depositAmount,
        payment_method: toPaymentMethodEnum(paymentMethod), // thống nhất từ vựng tien_mat/chuyen_khoan
      },
      source: "server_action",
    });

    revalidatePath("/printing");
    revalidatePath(`/printing/${orderId}`);
    revalidatePath("/finance/receipts");

    return {
      success: true,
      data: {
        order_payment_id: orderPayment.id,
        receipt_id: receipt.id,
        paid_amount: newPaidAmount,
        remaining_amount: order.total_amount - newPaidAmount,
      },
    };
  });
}

// ─── 2. START PRODUCTION (Reserve Inventory) ────────────

export async function startProduction(input: StartProductionInput) {
  return withPrintingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const { orderId, expiresInDays = 7 } = input;

    // Get order with items
    const order = await getOrderWithValidation(supabase, orderId);

    if (order.status !== "dat_coc") {
      throw new Error("Chỉ có thể bắt đầu in cho đơn 'Đã đặt cọc'");
    }

    if (!order.items || order.items.length === 0) {
      throw new Error("Đơn không có vật tư để reserve");
    }

    // Parse items (stored as JSONB)
    const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;

    // 2. Check availability & Reserve each item
    const reservations: InventoryReservation[] = [];
    const errors: string[] = [];

    for (const item of items) {
      if (!item.item_id || !item.quantity) continue;

      // Check available stock (current_stock - reserved)
      const { data: stockView, error: stockError } = await supabase
        .from("inventory_available_stock")
        .select("*")
        .eq("id", item.item_id)
        .single();

      if (stockError || !stockView) {
        errors.push(`Không tìm thấy vật tư ${item.name || item.item_id}`);
        continue;
      }

      if ((stockView.available_stock ?? 0) < item.quantity) {
        errors.push(
          `${stockView.name}: Tồn khả dụng ${stockView.available_stock ?? 0}, cần ${item.quantity}`
        );
        continue;
      }

      // Create reservation
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data: reservation, error: resError } = await supabase
        .from("inventory_reservations")
        .insert({
          item_id: item.item_id,
          order_id: orderId,
          reserved_quantity: item.quantity,
          expires_at: expiresAt.toISOString(),
          status: "active",
          notes: `Reserve cho đơn #${order.order_code}`,
          created_by: userId,
        })
        .select("*")
        .single();

      if (resError) {
        errors.push(`Không thể reserve ${item.name || item.item_id}: ${resError.message}`);
        continue;
      }

      // inventory_reservations.status là text (không enum) → DB trả string|null
      reservations.push(reservation as InventoryReservation);
    }

    if (errors.length > 0) {
      throw new Error(`Lỗi reserve vật tư:\\n${errors.join("\\n")}`);
    }

    // 3. Update order status
    const { error: updateError } = await supabase
      .from("printing_orders")
      .update({
        status: "dang_in",
        inventory_status: "reserved",
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", orderId);

    if (updateError) {
      throw new Error(`Không thể cập nhật đơn: ${updateError.message}`);
    }

    // 4. Audit
    await fireAuditLog({
      action: "UPDATE",
      tableName: "printing_orders",
      recordId: orderId,
      description: `Bắt đầu in, reserve ${reservations.length} vật tư`,
      newData: {
        status: "dang_in",
        inventory_status: "reserved",
        reservations: reservations.map((r) => ({
          item_id: r.item_id,
          quantity: r.reserved_quantity,
        })),
      },
      source: "server_action",
    });

    revalidatePath("/printing");
    revalidatePath(`/printing/${orderId}`);
    revalidatePath("/inventory");

    return {
      success: true,
      data: {
        reservations,
        message: `Đã reserve ${reservations.length} vật tư`,
      },
    };
  });
}

// ─── 3. COMPLETE PRODUCTION (Stock Out) ─────────────────

export async function completeProduction(input: CompleteProductionInput) {
  return withPrintingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const { orderId, manualStockOut = false, adjustedItems } = input;

    // Get order
    const order = await getOrderWithValidation(supabase, orderId);

    if (order.status !== "dang_in") {
      throw new Error("Chỉ có thể hoàn thành đơn 'Đang in'");
    }

    // If manual stock out, just update status
    if (manualStockOut) {
      // Get reservations to mark as fulfilled
      const { data: reservations } = await supabase
        .from("inventory_reservations")
        .select("*")
        .eq("order_id", orderId)
        .eq("status", "active");

      if (reservations && reservations.length > 0) {
        await supabase
          .from("inventory_reservations")
          .update({ status: "fulfilled", updated_at: new Date().toISOString() })
          .in("id", reservations.map((r: any) => r.id));
      }

      await supabase
        .from("printing_orders")
        .update({
          status: "da_in",
          inventory_status: "stocked_out",
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq("id", orderId);

      await fireAuditLog({
        action: "UPDATE",
        tableName: "printing_orders",
        recordId: orderId,
        description: "Hoàn thành in (đã xuất kho thủ công)",
        source: "server_action",
      });

      revalidatePath("/printing");
      revalidatePath(`/printing/${orderId}`);

      return {
        success: true,
        data: { message: "Đã cập nhật trạng thái (manual stock out)" },
      };
    }

    // Auto stock out mode
    const { data: reservations, error: resError } = await supabase
      .from("inventory_reservations")
      .select(`
        *,
        inventory_items!inner(id, name, item_code, unit, current_stock)
      `)
      .eq("order_id", orderId)
      .eq("status", "active");

    if (resError || !reservations || reservations.length === 0) {
      throw new Error("Không tìm thấy reservation để xuất kho");
    }

    // Determine items to stock out
    const itemsToStockOut =
      adjustedItems && adjustedItems.length > 0
        ? adjustedItems
        : reservations.map((r: any) => ({
            item_id: r.item_id,
            quantity: r.reserved_quantity,
            reservation_id: r.id,
          }));

    const transactions = [];

    // Stock out each item
    for (const item of itemsToStockOut) {
      const reservation = reservations.find((r: any) => r.item_id === item.item_id);
      const itemInfo: any = reservation?.inventory_items;

      if (!itemInfo) {
        throw new Error(`Không tìm thấy thông tin vật tư ${item.item_id}`);
      }

      // Check if enough stock
      if (itemInfo.current_stock < item.quantity) {
        throw new Error(
          `${itemInfo.name}: Tồn hiện tại ${itemInfo.current_stock}, cần xuất ${item.quantity}`
        );
      }

      // Create stock out transaction
      const { data: txn, error: txnError } = await supabase
        .from("inventory_transactions")
        .insert({
          item_id: item.item_id,
          transaction_type: "stock_out",
          quantity: item.quantity,
          source_type: "printing_order",
          source_id: orderId,
          reservation_id: reservation?.id || null,
          reason: `Xuất cho đơn in #${order.order_code}`,
          notes: "Auto stock out khi hoàn thành in",
          created_by: userId,
        })
        .select("*")
        .single();

      if (txnError) {
        throw new Error(`Không thể xuất kho ${itemInfo.name}: ${txnError.message}`);
      }

      // Update inventory item stock
      const { error: updateStockError } = await supabase
        .from("inventory_items")
        .update({
          current_stock: itemInfo.current_stock - item.quantity,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq("id", item.item_id);

      if (updateStockError) {
        throw new Error(`Không thể cập nhật tồn kho: ${updateStockError.message}`);
      }

      transactions.push(txn);

      // Mark reservation as fulfilled
      if (reservation) {
        await supabase
          .from("inventory_reservations")
          .update({ status: "fulfilled", updated_at: new Date().toISOString() })
          .eq("id", reservation.id);
      }
    }

    // Update order status
    await supabase
      .from("printing_orders")
      .update({
        status: "da_in",
        inventory_status: "stocked_out",
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", orderId);

    // Audit
    await fireAuditLog({
      action: "UPDATE",
      tableName: "printing_orders",
      recordId: orderId,
      description: `Hoàn thành in, xuất ${transactions.length} vật tư`,
      newData: {
        status: "da_in",
        inventory_status: "stocked_out",
        transactions: transactions.map((t) => ({
          item_id: t.item_id,
          quantity: t.quantity,
        })),
      },
      source: "server_action",
    });

    revalidatePath("/printing");
    revalidatePath(`/printing/${orderId}`);
    revalidatePath("/inventory");

    return {
      success: true,
      data: {
        transactions,
        message: `Đã xuất ${transactions.length} vật tư`,
      },
    };
  });
}

// ─── PHASE 2: FINAL PAYMENT ──────────────────────────

export async function recordFinalPayment(input: {
  orderId: string;
  finalAmount: number;
  paymentMethod: "cash" | "transfer" | "card" | "other";
  paymentDate?: string;
  notes?: string;
}) {
  return withPrintingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const { orderId, finalAmount, paymentMethod, paymentDate, notes } = input;

    // Validate
    if (finalAmount <= 0) {
      throw new Error("Số tiền thanh toán phải lớn hơn 0");
    }

    // Get order
    const order = await getOrderWithValidation(supabase, orderId);

    if (order.status !== "da_giao") {
      throw new Error("Chỉ có thể thu tất toán cho đơn 'Đã giao'");
    }

    const paymentDateStr = paymentDate || new Date().toISOString().split("T")[0];

    // Check remaining amount
    const { data: summary } = await supabase
      .from("order_payment_summary")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (!summary) {
      throw new Error("Không tìm thấy thông tin thanh toán");
    }

    if (finalAmount < (summary.remaining ?? 0)) {
      throw new Error(
        `Số tiền chưa đủ tất toán. Còn lại: ${summary.remaining ?? 0}`
      );
    }

    // 1. Create receipt
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .insert({
        receipt_date: paymentDateStr,
        receipt_type: "sale_receipt",
        // data thật trong receipts.payment_type là tien_mat/chuyen_khoan — quy đổi từ vựng UI
        payment_type: toPaymentMethodEnum(paymentMethod),
        receipt_amount: finalAmount,
        category_name: "Thanh toán đơn in",
        notes: notes || `Thanh toán cuối cho đơn #${order.order_code}`,
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();

    if (receiptError) {
      throw new Error(`Không thể tạo phiếu thu: ${receiptError.message}`);
    }

    // 2. Link to order
    const { data: orderPayment, error: opError } = await supabase
      .from("order_payments")
      .insert({
        order_id: orderId,
        receipt_id: receipt.id,
        payment_type: "final",
        amount: finalAmount,
        payment_date: paymentDateStr,
        payment_method: toPaymentMethodEnum(paymentMethod), // thống nhất từ vựng tien_mat/chuyen_khoan
        notes,
        created_by: userId,
        updated_by: userId,
      })
      .select("*")
      .single();

    if (opError) {
      throw new Error(`Không thể liên kết thanh toán: ${opError.message}`);
    }

    // 3. Update order
    const newPaidAmount = (summary.total_paid ?? 0) + finalAmount;
    const { error: updateError } = await supabase
      .from("printing_orders")
      .update({
        status: "hoan_thanh",
        final_amount: finalAmount,
        paid_amount: newPaidAmount,
        payment_status: "paid",
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", orderId);

    if (updateError) {
      throw new Error(`Không thể cập nhật đơn: ${updateError.message}`);
    }

    // 4. Audit
    await fireAuditLog({
      action: "CREATE",
      tableName: "order_payments",
      recordId: orderPayment.id,
      description: `Thu tất toán ${finalAmount.toLocaleString()} cho đơn ${
        order.order_code
      }`,
      newData: {
        order_id: orderId,
        receipt_id: receipt.id,
        amount: finalAmount,
        payment_method: toPaymentMethodEnum(paymentMethod), // thống nhất từ vựng tien_mat/chuyen_khoan
      },
      source: "server_action",
    });

    revalidatePath("/printing");
    revalidatePath(`/printing/${orderId}`);
    revalidatePath("/finance/receipts");

    return {
      success: true,
      data: {
        order_payment_id: orderPayment.id,
        receipt_id: receipt.id,
        paid_amount: newPaidAmount,
      },
    };
  });
}

// ─── PHASE 2: CANCEL ORDER WITH ROLLBACK ─────────────

export async function cancelOrder(input: {
  orderId: string;
  reason: string;
  refundAmount?: number;
  refundMethod?: "cash" | "transfer" | "card" | "other";
}) {
  return withPrintingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const { orderId, reason, refundAmount = 0, refundMethod = "cash" } = input;

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

    // 2. Handle refund if needed
    if (refundAmount > 0) {
      // Create expense for refund
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          // expenses KHÔNG có expense_type / category_name / notes / updated_by —
          // 4 cột này từng làm insert trả 400 PGRST204 nên khoản hoàn tiền không được ghi.
          expense_date: new Date().toISOString().split("T")[0],
          payment_method: toPaymentMethodEnum(refundMethod),
          amount: refundAmount,
          description: `Hoàn tiền hủy đơn in #${order.order_code}: ${reason}`,
          printing_order_id: orderId,
          created_by: userId,
        })
        .select("id")
        .single();

      if (!expenseError && expense) {
        // Link refund to order
        await supabase.from("order_payments").insert({
          order_id: orderId,
          payment_type: "refund",
          amount: -Math.abs(refundAmount), // Negative for refund
          payment_date: new Date().toISOString().split("T")[0],
          payment_method: toPaymentMethodEnum(refundMethod), // thống nhất từ vựng
          notes: `Hoàn tiền: ${reason}`,
          created_by: userId,
          updated_by: userId,
        });
      }
    }

    // 3. Update order status
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

    // 4. Audit
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
        refund_amount: refundAmount,
      },
      source: "server_action",
    });

    revalidatePath("/printing");
    revalidatePath(`/printing/${orderId}`);
    if (refundAmount > 0) {
      revalidatePath("/finance/expenses");
    }

    return {
      success: true,
      data: {
        message: "Đã hủy đơn và hoàn trả kho",
        refunded: refundAmount,
      },
    };
  });
}
