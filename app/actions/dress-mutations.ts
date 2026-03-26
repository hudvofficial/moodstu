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

    // Auto-gen item_code if empty — MAX() parse (kể cả đã xóa mềm)
    let itemCode = data.item_code?.trim();
    if (!itemCode) {
      const prefix = data.category === "Váy cưới" ? "VC" :
        data.category === "Áo dài" ? "AD" :
        data.category === "Vest" ? "VT" :
        data.category === "Váy tráp" ? "VTR" :
        data.category === "Đồ bé" ? "DB" : "K";

      const { data: maxRow } = await supabase
        .from("inventory_items")
        .select("item_code")
        .eq("category", data.category)
        .like("item_code", `${prefix}-%`)
        .order("item_code", { ascending: false })
        .limit(1)
        .single();

      let nextNum = 1;
      if (maxRow?.item_code) {
        const match = maxRow.item_code.match(/(\d+)$/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      itemCode = `${prefix}-${String(nextNum).padStart(3, "0")}`;
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
      // Auto-gen race condition: retry with incremented number
      if (error.code === "23505" && !parsed.data.item_code?.trim()) {
        const codeMatch = itemCode.match(/(\d+)$/);
        const currentNum = codeMatch ? parseInt(codeMatch[1], 10) : 0;
        const retryCode = `${itemCode.split("-")[0]}-${String(currentNum + 1).padStart(3, "0")}`;
        const { data: retryData, error: retryErr } = await supabase
          .from("inventory_items")
          .insert({
            ...data,
            item_code: retryCode,
            image_url: data.image_url || null,
            notes: data.notes || null,
            status: "available",
            current_stock: 1,
            created_by: userId,
            updated_by: userId,
          })
          .select("id")
          .single();
        if (retryErr) throw new Error("Mã trang phục đã tồn tại, vui lòng thử lại");
        itemCode = retryCode;
        return { id: retryData.id };
      }
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
      .eq("inventory_item_id", id)
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

// ─── RELEASE RESERVATION ─────────────────────────────────────

export async function releaseReservation(reservationId: string) {
  if (!reservationId) return { success: false as const, error: "ID không hợp lệ" };

  return withAuth(async (supabase, userId) => {
    const now = new Date().toISOString();

    // 1. Fetch reservation details
    const { data: reservation, error: fetchErr } = await supabase
      .from("inventory_reservations")
      .select("id, inventory_item_id, contract_id, contract_item_id, status")
      .eq("id", reservationId)
      .single();

    if (fetchErr || !reservation) throw new Error("Không tìm thấy đặt trang phục");
    if (reservation.status === "returned") throw new Error("Trang phục đã được trả trước đó");

    // 2. Update reservation → returned
    const { error: updateErr } = await supabase
      .from("inventory_reservations")
      .update({ status: "returned", updated_at: now })
      .eq("id", reservationId);
    if (updateErr) throw new Error(`Lỗi trả trang phục: ${updateErr.message}`);

    // 3. Check if item has other active reservations
    const { data: otherActive } = await supabase
      .from("inventory_reservations")
      .select("id")
      .eq("inventory_item_id", reservation.inventory_item_id)
      .in("status", ["reserved", "rented"])
      .neq("id", reservationId)
      .limit(1);

    // Restore item status only if no other active reservations
    if (!otherActive || otherActive.length === 0) {
      await supabase
        .from("inventory_items")
        .update({ status: "available", updated_at: now })
        .eq("id", reservation.inventory_item_id);
    }

    // 4. Reverse addon billing if applicable (JOIN contract_items for is_addon + unit_price)
    if (reservation.contract_item_id && reservation.contract_id) {
      const { data: contractItem } = await supabase
        .from("contract_items")
        .select("is_addon, unit_price")
        .eq("id", reservation.contract_item_id)
        .single();

      if (contractItem?.is_addon && contractItem.unit_price > 0) {
        const { data: contract } = await supabase
          .from("contracts")
          .select("total_amount, remaining_amount")
          .eq("id", reservation.contract_id)
          .single();

        if (contract) {
          await supabase
            .from("contracts")
            .update({
              total_amount: Math.max(0, contract.total_amount - contractItem.unit_price),
              remaining_amount: Math.max(0, contract.remaining_amount - contractItem.unit_price),
              updated_by: userId,
              updated_at: now,
            })
            .eq("id", reservation.contract_id);
        }
      }
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "inventory_reservations",
      recordId: reservationId,
      description: `Trả trang phục — reservation #${reservationId.substring(0, 8)}`,
      source: "server_action",
    });

    revalidatePath("/dresses");
    revalidatePath("/contracts");
    if (reservation.contract_id) {
      revalidatePath(`/contracts/${reservation.contract_id}`);
    }
    return null;
  });
}

// ═══════════════════════════════════════════
// Upload Dress Image — Server-side Storage
// Pattern: profile-actions.ts uploadAvatar
// ═══════════════════════════════════════════

export async function uploadDressImage(formData: FormData) {
  return withAuth(async (supabase) => {
    const file = formData.get("file") as File;
    const oldUrl = formData.get("oldUrl") as string | null;

    // Validate
    if (!file || file.size === 0) throw new Error("Chưa chọn ảnh");
    if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh không được vượt quá 5MB");
    if (!file.type.startsWith("image/")) throw new Error("Chỉ chấp nhận file ảnh");

    // Delete old file if exists
    if (oldUrl) {
      const oldPath = oldUrl.split("/dresses/")[1]?.split("?")[0];
      if (oldPath) await supabase.storage.from("dresses").remove([oldPath]);
    }

    // Upload new file
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("dresses")
      .upload(filePath, file, { contentType: file.type });
    if (uploadError) throw new Error(`Lỗi upload: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("dresses").getPublicUrl(filePath);
    return { url: urlData.publicUrl };
  });
}
