"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog, logError } from "@/lib/audit";

// ═══════════════════════════════════════════
// Printing Actions — Orders + Auto-Expense Pipeline
// Phase 04: V1 auto-expense on create printing order
// ═══════════════════════════════════════════

/** Get all active labs */
export async function getLabs() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("labs")
      .select("id, lab_name")
      .eq("status", "active")
      .order("lab_name");

    if (error) throw new Error(`Lỗi lấy danh sách lab: ${error.message}`);
    return data || [];
  });
}

/** Create a printing order + auto-create expense (V1 pipeline) */
export async function createPrintingOrder(input: {
  contractId: string;
  labId: string | null;
  items: Array<{
    name: string;
    size: string;
    quantity: number;
    unitPrice: number;
  }>;
  notes: string | null;
  expectedDate: string | null;
}) {
  return withAuth(async (supabase, userId) => {
    const now = new Date().toISOString();

    // Calculate total
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    // Generate order code
    const orderCode = `IN-${Date.now().toString(36).toUpperCase()}`;

    const { error } = await supabase.from("printing_orders").insert({
      contract_id: input.contractId,
      lab_id: input.labId,
      order_code: orderCode,
      status: "cho_xu_ly",
      total_amount: totalAmount,
      order_date: now,
      expected_date: input.expectedDate,
      items: input.items, // JSONB
      notes: input.notes,
      created_by: userId,
      created_at: now,
      updated_at: now,
    });

    if (error) throw new Error(`Lỗi tạo đơn in: ${error.message}`);

    // ── AUTO-EXPENSE PIPELINE (V1 port) ──────────
    // When printing order created with cost > 0 → auto-create expense
    if (totalAmount > 0) {
      try {
        // Find "Chi phí in ấn" category
        const { data: cat } = await supabase
          .from("transaction_categories")
          .select("id")
          .eq("type", "Chi")
          .ilike("name", "%in ấn%")
          .limit(1)
          .single();

        // Get lab name for description
        let labName = "Lab";
        if (input.labId) {
          const { data: lab } = await supabase
            .from("labs")
            .select("lab_name")
            .eq("id", input.labId)
            .single();
          labName = lab?.lab_name || "Lab";
        }

        const itemNames = input.items.map((i) => i.name).join(", ");

        await supabase.from("expenses").insert({
          expense_date: new Date().toISOString().split("T")[0],
          payment_method: "chuyen_khoan",
          category_id: cat?.id || null,
          amount: totalAmount,
          description: `[Auto-Print] ${orderCode}: ${itemNames} (${labName})`,
          recipient: labName,
          contract_id: input.contractId,
          created_by: userId,
        });
      } catch (expErr) {
        // Non-blocking: don't fail order creation if expense fails
        logError({
          error: expErr,
          context: "createPrintingOrder.autoExpense",
          tableName: "expenses",
          recordId: input.contractId,
        }).catch(() => {});
      }
    }

    // ── Audit log ────────────────────────────────
    fireAuditLog({
      action: "CREATE",
      tableName: "printing_orders",
      description: `Tạo đơn in ${orderCode} (${totalAmount.toLocaleString("vi-VN")}₫)`,
      newData: { orderCode, totalAmount, itemCount: input.items.length },
      source: "server_action",
    });

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${input.contractId}`);
    revalidatePath("/finance");
    return { orderCode };
  });
}

/** Update printing order status */
export async function updatePrintOrderStatus(
  orderId: string,
  status: string,
  contractId: string
) {
  return withAuth(async (supabase, userId) => {
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      status,
      updated_by: userId,
      updated_at: now,
    };

    // If received → set received_date
    if (status === "da_nhan") {
      updateData.received_date = now;
    }

    const { error } = await supabase
      .from("printing_orders")
      .update(updateData)
      .eq("id", orderId);

    if (error) throw new Error(`Lỗi cập nhật đơn in: ${error.message}`);

    revalidatePath(`/contracts/${contractId}`);
    return null;
  });
}

/** Update dress reservation status (V2 — replaces V1 dress_rentals) */
export async function updateReservationStatus(
  reservationId: string,
  status: string,
  contractId: string
) {
  return withAuth(async (supabase, userId) => {
    const now = new Date().toISOString();

    // Update reservation
    const { error } = await supabase
      .from("dress_reservations")
      .update({
        status,
        updated_by: userId,
        updated_at: now,
      })
      .eq("id", reservationId);

    if (error) throw new Error(`Lỗi cập nhật trang phục: ${error.message}`);

    // V2 special: if "returned" → update dresses availability
    if (status === "returned") {
      const { data: reservation } = await supabase
        .from("dress_reservations")
        .select("item_id")
        .eq("id", reservationId)
        .single();

      if (reservation?.item_id) {
        await supabase
          .from("dresses")
          .update({ status: "available", updated_at: now })
          .eq("id", reservation.item_id);
      }
    }

    revalidatePath(`/contracts/${contractId}`);
    return null;
  });
}
