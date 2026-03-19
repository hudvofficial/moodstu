"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// Printing Actions — Labs + Orders
// Phase 05B: V1 PrintingOrderForm logic → V2 server actions
// ═══════════════════════════════════════════

/** Get all active labs */
export async function getLabs() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("labs")
      .select("id, name")
      .order("name");

    if (error) throw new Error(`Lỗi lấy danh sách lab: ${error.message}`);
    return data || [];
  });
}

/** Create a printing order */
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

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${input.contractId}`);
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

/** Update inventory reservation status (V2 — replaces V1 dress_rentals) */
export async function updateReservationStatus(
  reservationId: string,
  status: string,
  contractId: string
) {
  return withAuth(async (supabase, userId) => {
    const now = new Date().toISOString();

    // Update reservation
    const { error } = await supabase
      .from("inventory_reservations")
      .update({
        status,
        updated_by: userId,
        updated_at: now,
      })
      .eq("id", reservationId);

    if (error) throw new Error(`Lỗi cập nhật trang phục: ${error.message}`);

    // V2 special: if "returned" → update inventory_items availability
    if (status === "returned") {
      const { data: reservation } = await supabase
        .from("inventory_reservations")
        .select("item_id")
        .eq("id", reservationId)
        .single();

      if (reservation?.item_id) {
        await supabase
          .from("inventory_items")
          .update({ status: "available", updated_at: now })
          .eq("id", reservation.item_id);
      }
    }

    revalidatePath(`/contracts/${contractId}`);
    return null;
  });
}
