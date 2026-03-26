"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { dressCreateSchema, dressUpdateSchema } from "@/lib/validations/dress.schema";

// ═══════════════════════════════════════════
// Dress Mutations — Create/Update/Delete
// DB: inventory_items (dresses subset)
// Pattern: withAuth + Zod + fireAuditLog + revalidatePath
// ═══════════════════════════════════════════

// ─── CREATE ──────────────────────────────────────────────────

export async function createDress(rawData: unknown) {
  const parsed = dressCreateSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" };
  }

  return withAuth(async (supabase, userId) => {
    const data = parsed.data;

    // Auto-gen item_code if empty
    let itemCode = data.item_code?.trim();
    if (!itemCode) {
      const prefix = data.category === "Váy cưới" ? "VC" :
        data.category === "Áo dài" ? "AD" :
        data.category === "Vest" ? "VT" :
        data.category === "Váy tráp" ? "VTR" :
        data.category === "Đồ bé" ? "DB" : "K";
      const { count } = await supabase
        .from("inventory_items")
        .select("id", { count: "exact", head: true })
        .eq("category", data.category)
        .is("deleted_at", null);
      itemCode = `${prefix}-${String((count || 0) + 1).padStart(3, "0")}`;
    }

    const { data: result, error } = await supabase
      .from("inventory_items")
      .insert({
        ...data,
        item_code: itemCode,
        image_url: data.image_url || null,
        notes: data.notes || null,
        status: "available",
        current_stock: 1,
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") throw new Error("Mã trang phục đã tồn tại");
      throw new Error(error.message);
    }

    fireAuditLog({
      action: "CREATE",
      tableName: "inventory_items",
      recordId: result.id,
      description: `Thêm trang phục: ${data.name} (${itemCode})`,
      source: "server_action",
    });

    revalidatePath("/dresses");
    return { id: result.id };
  });
}

// ─── UPDATE (with Optimistic Locking) ────────────────────────

export async function updateDress(rawData: unknown) {
  const parsed = dressUpdateSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" };
  }

  return withAuth(async (supabase, userId) => {
    const { id, updated_at, data } = parsed.data;

    // Optimistic Locking: check updated_at hasn't changed
    const { data: current } = await supabase
      .from("inventory_items")
      .select("updated_at")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (!current) throw new Error("Trang phục không tồn tại");
    if (current.updated_at !== updated_at) {
      throw new Error("Dữ liệu đã được cập nhật bởi người khác. Vui lòng tải lại trang.");
    }

    const { error } = await supabase
      .from("inventory_items")
      .update({
        ...data,
        image_url: data.image_url || null,
        notes: data.notes || null,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new Error(error.message);

    fireAuditLog({
      action: "UPDATE",
      tableName: "inventory_items",
      recordId: id,
      description: `Cập nhật trang phục #${id.substring(0, 8)}`,
      source: "server_action",
    });

    revalidatePath("/dresses");
    return null;
  });
}

// ─── SOFT DELETE ──────────────────────────────────────────────

export async function deleteDress(id: string) {
  if (!id) return { success: false as const, error: "ID không hợp lệ" };

  return withAuth(async (supabase, userId) => {
    // Check: cannot delete if reserved/rented
    const { data: reservations } = await supabase
      .from("inventory_reservations")
      .select("id")
      .eq("item_id", id)
      .in("status", ["reserved", "rented"])
      .limit(1);

    if (reservations && reservations.length > 0) {
      throw new Error("Không thể xóa trang phục đang được đặt hoặc đang thuê");
    }

    const { error } = await supabase
      .from("inventory_items")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", id);

    if (error) throw new Error(error.message);

    fireAuditLog({
      action: "DELETE",
      tableName: "inventory_items",
      recordId: id,
      description: `Xóa mềm trang phục #${id.substring(0, 8)}`,
      severity: "WARNING",
      source: "server_action",
    });

    revalidatePath("/dresses");
    return null;
  });
}
