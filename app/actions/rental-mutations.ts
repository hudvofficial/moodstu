"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { createRentalSchema, returnDressSchema } from "@/lib/validations/rental.schema";

// ═══════════════════════════════════════════
// Rental Mutations — CRUD + Status Flow
// DB: dress_rentals + dresses
// Pattern: withAuth + Zod + fireAuditLog + revalidatePath
// ═══════════════════════════════════════════

// ─── CREATE RENTAL ───────────────────────────────────────────
// Flow: available → reserved
// Check trùng lịch trước khi insert

export async function createRental(rawData: unknown) {
  const parsed = createRentalSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" };
  }

  return withAuth(async (supabase, userId) => {
    const data = parsed.data;

    // 1. Check trùng lịch — overlap detection
    const { data: conflicts } = await supabase
      .from("dress_rentals")
      .select("id, customer_name, pickup_date, return_date")
      .eq("item_id", data.item_id)
      .in("status", ["reserved", "renting"])
      .lte("pickup_date", data.return_date)
      .gte("return_date", data.pickup_date);

    if (conflicts && conflicts.length > 0) {
      const c = conflicts[0];
      throw new Error(`Trang phục đã được đặt bởi ${c.customer_name} (${c.pickup_date} → ${c.return_date})`);
    }

    // 2. Insert rental
    const { data: rental, error } = await supabase
      .from("dress_rentals")
      .insert({
        item_id: data.item_id,
        contract_id: data.contract_id || null,
        customer_name: data.customer_name,
        phone: data.phone,
        pickup_date: data.pickup_date,
        return_date: data.return_date,
        rental_price: data.rental_price,
        deposit: data.deposit,
        accessories: data.accessories || null,
        notes: data.notes || null,
        status: "reserved",
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    // 3. Update dress status → reserved
    await supabase
      .from("dresses")
      .update({ status: "reserved", updated_by: userId })
      .eq("id", data.item_id);

    fireAuditLog({
      action: "CREATE",
      tableName: "dress_rentals",
      recordId: rental.id,
      description: `Đặt thuê: ${data.customer_name} (${data.pickup_date} → ${data.return_date})`,
      source: "server_action",
    });

    revalidatePath("/dresses");
    return rental.id;
  });
}

// ─── START RENTAL ────────────────────────────────────────────
// Flow: reserved → renting

export async function startRental(rentalId: string) {
  return withAuth(async (supabase, userId) => {
    // Get rental + item_id
    const { data: rental, error: fetchErr } = await supabase
      .from("dress_rentals")
      .select("id, item_id, status, customer_name")
      .eq("id", rentalId)
      .single();

    if (fetchErr || !rental) throw new Error("Không tìm thấy đơn thuê");
    if (rental.status !== "reserved") {
      throw new Error(`Trạng thái hiện tại: ${rental.status}, không thể bắt đầu thuê`);
    }

    // Update rental status
    const { error } = await supabase
      .from("dress_rentals")
      .update({ status: "renting" })
      .eq("id", rentalId);

    if (error) throw new Error(error.message);

    // Update dress status → rented
    await supabase
      .from("dresses")
      .update({ status: "rented", updated_by: userId })
      .eq("id", rental.item_id);

    fireAuditLog({
      action: "UPDATE",
      tableName: "dress_rentals",
      recordId: rentalId,
      description: `Bắt đầu thuê: ${rental.customer_name}`,
      source: "server_action",
    });

    revalidatePath("/dresses");
  });
}

// ─── RETURN DRESS ────────────────────────────────────────────
// Flow: renting → returned, dress → cleaning

export async function returnDressRental(rawData: unknown) {
  const parsed = returnDressSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" };
  }

  return withAuth(async (supabase, userId) => {
    const data = parsed.data;

    // Get rental
    const { data: rental, error: fetchErr } = await supabase
      .from("dress_rentals")
      .select("id, item_id, status, customer_name")
      .eq("id", data.rental_id)
      .single();

    if (fetchErr || !rental) throw new Error("Không tìm thấy đơn thuê");
    if (rental.status !== "renting" && rental.status !== "overdue") {
      throw new Error(`Trạng thái: ${rental.status}, không thể trả`);
    }

    // Update rental
    const { error } = await supabase
      .from("dress_rentals")
      .update({
        status: "returned",
        actual_return_date: new Date().toISOString().split("T")[0],
        return_condition: data.return_condition,
        damage_fee: data.damage_fee,
        deposit_returned: data.deposit_returned,
        notes: data.notes || null,
      })
      .eq("id", data.rental_id);

    if (error) throw new Error(error.message);

    // Dress → cleaning
    await supabase
      .from("dresses")
      .update({ status: "cleaning", updated_by: userId })
      .eq("id", rental.item_id);

    fireAuditLog({
      action: "UPDATE",
      tableName: "dress_rentals",
      recordId: data.rental_id,
      description: `Trả váy: ${rental.customer_name} — ${data.return_condition}`,
      source: "server_action",
    });

    revalidatePath("/dresses");
  });
}

// ─── MARK CLEANED ────────────────────────────────────────────
// Flow: cleaning → available

export async function markCleaned(itemId: string) {
  return withAuth(async (supabase, userId) => {
    const { error } = await supabase
      .from("dresses")
      .update({ status: "available", updated_by: userId })
      .eq("id", itemId);

    if (error) throw new Error(error.message);

    fireAuditLog({
      action: "UPDATE",
      tableName: "dresses",
      recordId: itemId,
      description: "Giặt xong — sẵn sàng cho thuê",
      source: "server_action",
    });

    revalidatePath("/dresses");
  });
}

// ─── CANCEL RENTAL ───────────────────────────────────────────
// Flow: reserved → cancelled, dress → available (if no other active)

export async function cancelRental(rentalId: string) {
  return withAuth(async (supabase, userId) => {
    const { data: rental, error: fetchErr } = await supabase
      .from("dress_rentals")
      .select("id, item_id, status, customer_name")
      .eq("id", rentalId)
      .single();

    if (fetchErr || !rental) throw new Error("Không tìm thấy đơn thuê");
    if (rental.status !== "reserved") {
      throw new Error("Chỉ có thể hủy đơn ở trạng thái 'Đã đặt'");
    }

    // Cancel rental
    const { error } = await supabase
      .from("dress_rentals")
      .update({ status: "cancelled" })
      .eq("id", rentalId);

    if (error) throw new Error(error.message);

    // Check other active rentals for this dress
    const { data: otherActive } = await supabase
      .from("dress_rentals")
      .select("id")
      .eq("item_id", rental.item_id)
      .in("status", ["reserved", "renting"])
      .limit(1);

    // If no other active → set available
    if (!otherActive || otherActive.length === 0) {
      await supabase
        .from("dresses")
        .update({ status: "available", updated_by: userId })
        .eq("id", rental.item_id);
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "dress_rentals",
      recordId: rentalId,
      description: `Hủy đặt thuê: ${rental.customer_name}`,
      source: "server_action",
    });

    revalidatePath("/dresses");
  });
}

// ─── REFUND DEPOSIT ──────────────────────────────────────────

export async function refundDeposit(rentalId: string) {
  return withAuth(async (supabase) => {
    const { error } = await supabase
      .from("dress_rentals")
      .update({ deposit_returned: true })
      .eq("id", rentalId);

    if (error) throw new Error(error.message);

    fireAuditLog({
      action: "UPDATE",
      tableName: "dress_rentals",
      recordId: rentalId,
      description: "Hoàn cọc cho khách",
      source: "server_action",
    });

    revalidatePath("/dresses");
  });
}
