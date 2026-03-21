"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";

// ═══════════════════════════════════════════
// Dress Actions — Wedding Dress Rental CRUD
// V1 ref: dresses.ts (143 lines, 5 fn)
// V2: withAuth + fireAuditLog (V1 had none!)
// ═══════════════════════════════════════════

// ─── RENT DRESS ──────────────────────────────

export async function rentDress(data: {
  dressId: string; customerName: string; phone: string;
  rentalDate: string; returnDate: string; deposit: number; notes?: string;
}) {
  return withAuth(async (supabase) => {
    const { error: rentError } = await supabase.from("dress_rentals").insert({
      dress_id: data.dressId, customer_name: data.customerName, phone: data.phone,
      rental_date: data.rentalDate, return_date: data.returnDate,
      deposit_amount: data.deposit, rental_price: 0, notes: data.notes, status: "Đang thuê",
    });
    if (rentError) throw new Error(`Lỗi tạo phiếu thuê: ${rentError.message}`);

    const { error: dressError } = await supabase.from("wedding_dresses").update({ status: "Đang cho thuê" }).eq("id", data.dressId);
    if (dressError) throw new Error(`Lỗi cập nhật trang phục: ${dressError.message}`);

    fireAuditLog({ action: "CREATE", tableName: "dress_rentals", description: `Cho thuê váy cho ${data.customerName}` });
    revalidatePath("/dresses");
    return null;
  });
}

// ─── RETURN DRESS ────────────────────────────

export async function returnDress(dressId: string) {
  return withAuth(async (supabase) => {
    const { data: rentals, error: searchError } = await supabase
      .from("dress_rentals")
      .select("id")
      .eq("dress_id", dressId)
      .eq("status", "Đang thuê")
      .limit(1);
    if (searchError) throw new Error(`Lỗi tìm phiếu thuê: ${searchError.message}`);

    if (rentals && rentals.length > 0) {
      const { error } = await supabase.from("dress_rentals").update({
        status: "Đã trả", actual_return_date: new Date().toISOString().split("T")[0],
      }).eq("id", rentals[0].id);
      if (error) throw new Error(`Lỗi cập nhật phiếu: ${error.message}`);
    }

    const { error: dressError } = await supabase.from("wedding_dresses").update({ status: "Sẵn sàng" }).eq("id", dressId);
    if (dressError) throw new Error(`Lỗi cập nhật trang phục: ${dressError.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "dress_rentals", description: `Trả váy #${dressId.substring(0, 8)}` });
    revalidatePath("/dresses");
    return null;
  });
}

// ─── CREATE DRESS ────────────────────────────

export async function createDress(data: Record<string, unknown>) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("wedding_dresses").insert([data]);
    if (error) {
      if (error.code === "23505" || error.message.includes("duplicate")) throw new Error("Mã váy này đã tồn tại! Vui lòng kiểm tra lại.");
      throw new Error(`Lỗi thêm trang phục: ${error.message}`);
    }

    fireAuditLog({ action: "CREATE", tableName: "wedding_dresses", description: `Thêm trang phục: ${(data.name as string) || (data.dress_code as string)}` });
    revalidatePath("/dresses");
    return null;
  });
}

// ─── UPDATE DRESS ────────────────────────────

export async function updateDress(data: { id: string; updates: Record<string, unknown> }) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("wedding_dresses").update(data.updates).eq("id", data.id);
    if (error) throw new Error(`Lỗi cập nhật trang phục: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "wedding_dresses", recordId: data.id, description: `Cập nhật trang phục #${data.id.substring(0, 8)}` });
    revalidatePath("/dresses");
    return null;
  });
}

// ─── DELETE DRESS ────────────────────────────

export async function deleteDress(id: string) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("wedding_dresses").delete().eq("id", id);
    if (error) throw new Error(`Lỗi xóa trang phục: ${error.message}`);

    fireAuditLog({ action: "DELETE", tableName: "wedding_dresses", recordId: id, description: `Xóa trang phục #${id.substring(0, 8)}`, severity: "WARNING" });
    revalidatePath("/dresses");
    return null;
  });
}
