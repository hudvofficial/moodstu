"use server";

import { withDressesBookingAccess } from "@/lib/auth_utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { createRentalSchema, returnDressSchema } from "@/lib/validations/rental.schema";

type RpcError = { message?: string; code?: string } | null;

function isMissingRpc(error: RpcError) {
  const message = error?.message?.toLowerCase() || "";
  return message.includes("could not find the function") || error?.code === "PGRST202";
}

function revalidateDresses() {
  revalidatePath("/dresses");
  revalidatePath("/dresses/rentals");
}

export async function createRental(rawData: unknown) {
  const parsed = createRentalSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withDressesBookingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const data = parsed.data;

    const rpc = await supabase.rpc("create_standalone_dress_rental_atomic", {
      p_item_id: data.item_id,
      p_contract_id: data.contract_id || undefined,
      p_customer_name: data.customer_name,
      p_phone: data.phone,
      p_pickup_date: data.pickup_date,
      p_return_date: data.return_date,
      p_rental_price: data.rental_price,
      p_deposit: data.deposit,
      p_accessories: data.accessories || undefined,
      p_notes: data.notes || undefined,
      p_user_id: userId,
    });

    if (!rpc.error && rpc.data && typeof rpc.data === "object") {
      const payload = rpc.data as { rental_id?: string };
      fireAuditLog({
        action: "CREATE",
        tableName: "dress_rentals",
        recordId: payload.rental_id,
        description: `Dat thue: ${data.customer_name} (${data.pickup_date} -> ${data.return_date})`,
        source: "server_action",
      });
      revalidateDresses();
      return payload.rental_id;
    }

    if (rpc.error && !isMissingRpc(rpc.error)) {
      throw new Error(rpc.error.message);
    }

    const [reservationConflicts, rentalConflicts] = await Promise.all([
      supabase
        .from("dress_reservations")
        .select("id")
        .eq("dress_id", data.item_id)
        .in("status", ["reserved", "in_use", "rented"])
        .lte("start_date", data.return_date)
        .gte("end_date", data.pickup_date)
        .limit(1),
      supabase
        .from("dress_rentals")
        .select("id, customer_name, pickup_date, return_date")
        .eq("item_id", data.item_id)
        .in("status", ["reserved", "renting", "overdue"])
        .lte("pickup_date", data.return_date)
        .gte("return_date", data.pickup_date)
        .limit(1),
    ]);

    if (reservationConflicts.error) throw new Error(reservationConflicts.error.message);
    if (rentalConflicts.error) throw new Error(rentalConflicts.error.message);
    if ((reservationConflicts.data?.length || 0) > 0) {
      throw new Error("Trang phuc da duoc dat cho hop dong trong khoang thoi gian nay");
    }
    if ((rentalConflicts.data?.length || 0) > 0) {
      const conflict = rentalConflicts.data?.[0];
      throw new Error(
        `Trang phuc da duoc dat boi ${conflict?.customer_name || "khach"} (${conflict?.pickup_date} -> ${conflict?.return_date})`,
      );
    }

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

    await supabase
      .from("dresses")
      .update({ status: "reserved", updated_by: userId, updated_at: new Date().toISOString() })
      .eq("id", data.item_id);

    fireAuditLog({
      action: "CREATE",
      tableName: "dress_rentals",
      recordId: rental.id,
      description: `Dat thue: ${data.customer_name} (${data.pickup_date} -> ${data.return_date})`,
      source: "server_action",
    });

    revalidateDresses();
    return rental.id;
  });
}

export async function startRental(rentalId: string) {
  return withDressesBookingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const rpc = await supabase.rpc("start_dress_rental_atomic", {
      p_rental_id: rentalId,
      p_user_id: userId,
    });

    if (rpc.error && !isMissingRpc(rpc.error)) throw new Error(rpc.error.message);

    if (rpc.error) {
      const { data: rental, error: fetchErr } = await supabase
        .from("dress_rentals")
        .select("id, item_id, status, customer_name")
        .eq("id", rentalId)
        .single();

      if (fetchErr || !rental) throw new Error("Khong tim thay don thue");
      if (rental.status !== "reserved") {
        throw new Error(`Trang thai hien tai: ${rental.status}, khong the bat dau thue`);
      }

      const { error } = await supabase
        .from("dress_rentals")
        .update({ status: "renting", updated_at: new Date().toISOString() })
        .eq("id", rentalId);
      if (error) throw new Error(error.message);

      await supabase
        .from("dresses")
        .update({ status: "rented", updated_by: userId, updated_at: new Date().toISOString() })
        .eq("id", rental.item_id);

      fireAuditLog({
        action: "UPDATE",
        tableName: "dress_rentals",
        recordId: rentalId,
        description: `Bat dau thue: ${rental.customer_name}`,
        source: "server_action",
      });
    }

    revalidateDresses();
    return null;
  });
}

export async function returnDressRental(rawData: unknown) {
  const parsed = returnDressSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withDressesBookingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const data = parsed.data;

    const rpc = await supabase.rpc("return_dress_rental_atomic", {
      p_rental_id: data.rental_id,
      p_return_condition: data.return_condition,
      p_damage_fee: data.damage_fee,
      p_deposit_returned: data.deposit_returned,
      p_notes: data.notes || undefined,
      p_user_id: userId,
    });

    if (rpc.error && !isMissingRpc(rpc.error)) throw new Error(rpc.error.message);

    if (rpc.error) {
      const { data: rental, error: fetchErr } = await supabase
        .from("dress_rentals")
        .select("id, item_id, status, customer_name")
        .eq("id", data.rental_id)
        .single();

      if (fetchErr || !rental) throw new Error("Khong tim thay don thue");
      if (rental.status !== "renting" && rental.status !== "overdue") {
        throw new Error(`Trang thai: ${rental.status}, khong the tra`);
      }

      const { error } = await supabase
        .from("dress_rentals")
        .update({
          status: "returned",
          actual_return_date: new Date().toISOString().split("T")[0],
          return_condition: data.return_condition,
          damage_fee: data.damage_fee,
          deposit_returned: data.deposit_returned,
          notes: data.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.rental_id);
      if (error) throw new Error(error.message);

      await supabase
        .from("dresses")
        .update({ status: "cleaning", updated_by: userId, updated_at: new Date().toISOString() })
        .eq("id", rental.item_id);

      fireAuditLog({
        action: "UPDATE",
        tableName: "dress_rentals",
        recordId: data.rental_id,
        description: `Tra vay: ${rental.customer_name} - ${data.return_condition}`,
        source: "server_action",
      });
    }

    revalidateDresses();
    return null;
  });
}

export async function markCleaned(itemId: string) {
  return withDressesBookingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const rpc = await supabase.rpc("mark_dress_cleaned_atomic", {
      p_dress_id: itemId,
      p_user_id: userId,
    });

    if (rpc.error && !isMissingRpc(rpc.error)) throw new Error(rpc.error.message);

    if (rpc.error) {
      const { data: dress, error: fetchError } = await supabase
        .from("dresses")
        .select("status")
        .eq("id", itemId)
        .is("deleted_at", null)
        .maybeSingle();

      if (fetchError) throw new Error(fetchError.message);
      if (!dress) throw new Error("Khong tim thay trang phuc");
      if (dress.status !== "cleaning") {
        throw new Error("Chi co the danh dau da giat khi trang phuc dang o trang thai dang giat");
      }

      const { error } = await supabase
        .from("dresses")
        .update({ status: "available", updated_by: userId, updated_at: new Date().toISOString() })
        .eq("id", itemId);

      if (error) throw new Error(error.message);
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "dresses",
      recordId: itemId,
      description: "Giat xong - san sang cho thue",
      source: "server_action",
    });

    revalidateDresses();
    return null;
  });
}

export async function cancelRental(rentalId: string) {
  return withDressesBookingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const rpc = await supabase.rpc("cancel_dress_rental_atomic", {
      p_rental_id: rentalId,
      p_user_id: userId,
    });

    if (rpc.error && !isMissingRpc(rpc.error)) throw new Error(rpc.error.message);

    if (rpc.error) {
      const { data: rental, error: fetchErr } = await supabase
        .from("dress_rentals")
        .select("id, item_id, status, customer_name")
        .eq("id", rentalId)
        .single();

      if (fetchErr || !rental) throw new Error("Khong tim thay don thue");
      if (rental.status !== "reserved") {
        throw new Error("Chi co the huy don o trang thai da dat");
      }

      const { error } = await supabase
        .from("dress_rentals")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", rentalId);
      if (error) throw new Error(error.message);

      await supabase.rpc("refresh_dress_status_atomic", {
        p_dress_id: rental.item_id,
        p_user_id: userId,
      });

      fireAuditLog({
        action: "UPDATE",
        tableName: "dress_rentals",
        recordId: rentalId,
        description: `Huy dat thue: ${rental.customer_name}`,
        source: "server_action",
      });
    }

    revalidateDresses();
    return null;
  });
}

export async function refundDeposit(rentalId: string) {
  return withDressesBookingAccess(async (supabase: SupabaseClient<Database>) => {
    const { error } = await supabase
      .from("dress_rentals")
      .update({ deposit_returned: true, updated_at: new Date().toISOString() })
      .eq("id", rentalId);

    if (error) throw new Error(error.message);

    fireAuditLog({
      action: "UPDATE",
      tableName: "dress_rentals",
      recordId: rentalId,
      description: "Hoan coc cho khach",
      source: "server_action",
    });

    revalidateDresses();
    return null;
  });
}
