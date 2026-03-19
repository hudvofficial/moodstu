"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// Inventory Actions — V2 (replaces V1 dress_rentals)
// Phase 07A: inventory_reservations + inventory_items
// ═══════════════════════════════════════════

/** Get available inventory items for reservation */
export async function getAvailableItems() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id, name, item_code, category, size, color, rental_price, image_url")
      .eq("status", "available")
      .order("name");

    if (error) throw new Error(`Lỗi lấy trang phục: ${error.message}`);
    return data || [];
  });
}

/** Add inventory reservation + optionally add as contract addon */
export async function addInventoryReservation(input: {
  contractId: string;
  itemId: string;
  isAddon: boolean; // if true, add to contract_items + update contract amounts
  rentalPrice: number;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}) {
  return withAuth(async (supabase, userId) => {
    const now = new Date().toISOString();

    // Step 1: Insert reservation
    const { error: resError } = await supabase
      .from("inventory_reservations")
      .insert({
        contract_id: input.contractId,
        item_id: input.itemId,
        status: "reserved",
        rental_price: input.rentalPrice,
        start_date: input.startDate,
        end_date: input.endDate,
        notes: input.notes,
        created_by: userId,
        created_at: now,
        updated_at: now,
      });

    if (resError) throw new Error(`Lỗi đặt trang phục: ${resError.message}`);

    // Step 2: Update item availability
    const { error: itemError } = await supabase
      .from("inventory_items")
      .update({ status: "reserved", updated_at: now })
      .eq("id", input.itemId);

    if (itemError) throw new Error(`Lỗi cập nhật kho: ${itemError.message}`);

    // Step 3: If addon → add to contract_items + update contract amounts
    if (input.isAddon && input.rentalPrice > 0) {
      // Get item name for contract_items
      const { data: item } = await supabase
        .from("inventory_items")
        .select("name")
        .eq("id", input.itemId)
        .single();

      // Insert contract item
      await supabase.from("contract_items").insert({
        contract_id: input.contractId,
        item_name: item?.name || "Trang phục phát sinh",
        quantity: 1,
        unit_price: input.rentalPrice,
        total_amount: input.rentalPrice,
        is_addon: true,
        created_at: now,
      });

      // Update contract totals
      const { data: contract } = await supabase
        .from("contracts")
        .select("total_amount, remaining_amount")
        .eq("id", input.contractId)
        .single();

      if (contract) {
        await supabase
          .from("contracts")
          .update({
            total_amount: contract.total_amount + input.rentalPrice,
            remaining_amount: contract.remaining_amount + input.rentalPrice,
            updated_by: userId,
            updated_at: now,
          })
          .eq("id", input.contractId);
      }
    }

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${input.contractId}`);
    return null;
  });
}
