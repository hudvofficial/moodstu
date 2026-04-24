"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { dressCreateSchema, dressUpdateSchema, reserveDressSchema } from "@/lib/validations/dress.schema";
import { CATEGORY_PREFIX_MAP } from "@/types/dress-constants";

const ACTIVE_RESERVATION_STATUSES = ["reserved", "in_use", "rented"] as const;

type AdminSupabase = Parameters<Parameters<typeof withAuth>[0]>[0];

async function refreshDressStatus(supabase: AdminSupabase, dressId: string) {
  const { data: activeReservations } = await supabase
    .from("dress_reservations")
    .select("status")
    .eq("dress_id", dressId)
    .in("status", [...ACTIVE_RESERVATION_STATUSES]);

  const nextStatus = (activeReservations || []).some((row) =>
    row.status === "in_use" || row.status === "rented"
  )
    ? "rented"
    : (activeReservations || []).length > 0
      ? "reserved"
      : "available";

  await supabase
    .from("dresses")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", dressId);
}

// ═══════════════════════════════════════════
// Dress Mutations — Create/Update/Delete
// DB: dresses
// Pattern: withAuth + Zod + fireAuditLog + revalidatePath
// ═══════════════════════════════════════════

// ─── CHECK ITEM CODE EXISTS ─────────────────────────────────

export async function checkItemCodeExists(code: string, excludeId?: string) {
  return withAuth(async (supabase) => {
    let query = supabase
      .from("dresses")
      .select("id")
      .eq("item_code", code.trim())
      .is("deleted_at", null)
      .limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query;
    return { exists: (data?.length ?? 0) > 0 };
  });
}

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
      const prefix = CATEGORY_PREFIX_MAP[data.category] || "K";

      const { data: maxRow } = await supabase
        .from("dresses")
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
      .from("dresses")
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
          .from("dresses")
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
      tableName: "dresses",
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
      .from("dresses")
      .select("updated_at")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (!current) throw new Error("Trang phục không tồn tại");
    if (current.updated_at !== updated_at) {
      throw new Error("Dữ liệu đã được cập nhật bởi người khác. Vui lòng tải lại trang.");
    }

    const { error } = await supabase
      .from("dresses")
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
      tableName: "dresses",
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
      .from("dress_reservations")
      .select("id")
      .eq("dress_id", id)
      .in("status", [...ACTIVE_RESERVATION_STATUSES])
      .limit(1);

    if (reservations && reservations.length > 0) {
      throw new Error("Không thể xóa trang phục đang được đặt hoặc đang thuê");
    }

    const { error } = await supabase
      .from("dresses")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", id);

    if (error) throw new Error(error.message);

    fireAuditLog({
      action: "DELETE",
      tableName: "dresses",
      recordId: id,
      description: `Xóa mềm trang phục #${id.substring(0, 8)}`,
      severity: "WARNING",
      source: "server_action",
    });

    revalidatePath("/dresses");
    return null;
  });
}

// ─── RESERVE DRESS FOR CONTRACT ──────────────────────────────

export async function reserveDressForContract(rawData: unknown) {
  const parsed = reserveDressSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" };
  }

  return withAuth(async (supabase, userId) => {
    const input = parsed.data;
    const now = new Date().toISOString();

    // 1. Check item exists + not deleted
    const { data: item, error: itemErr } = await supabase
      .from("dresses")
      .select("id, name, status")
      .eq("id", input.dressId)
      .is("deleted_at", null)
      .single();

    if (itemErr || !item) throw new Error("Trang phục không tồn tại hoặc đã bị xóa");

    // 2. Date overlap check (prevent double-booking)
    const { data: overlaps } = await supabase
      .from("dress_reservations")
      .select("id")
      .eq("dress_id", input.dressId)
      .in("status", [...ACTIVE_RESERVATION_STATUSES])
      .lte("start_date", input.endDate)
      .gte("end_date", input.startDate)
      .limit(1);

    if (overlaps && overlaps.length > 0) {
      throw new Error("Trang phục đã được đặt trong khoảng thời gian này");
    }

    // 3. Handle addon billing (insert contract_item FIRST to get FK)
    let contractItemId = input.contractItemId || null;

    if (input.isAddon && input.rentalPrice > 0) {
      const { data: newItem, error: ciErr } = await supabase
        .from("contract_items")
        .insert({
          contract_id: input.contractId,
          item_name: item.name || "Trang phục phát sinh",
          type: "trang_phuc",
          quantity: 1,
          unit_price: input.rentalPrice,
          total_amount: input.rentalPrice,
          is_addon: true,
          addon_category: "trang_phuc",
          dress_id: input.dressId,
          created_at: now,
        })
        .select("id")
        .single();

      if (ciErr) throw new Error(`Lỗi thêm phát sinh: ${ciErr.message}`);
      contractItemId = newItem.id;

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

    // 4. Insert reservation (correct column names)
    const { error: resError } = await supabase.from("dress_reservations").insert({
      dress_id: input.dressId,
      contract_id: input.contractId,
      contract_item_id: contractItemId,
      customer_id: input.customerId || null,
      start_date: input.startDate,
      end_date: input.endDate,
      export_type: input.exportType || null,
      status: "reserved",
      notes: input.notes || null,
      created_at: now,
      updated_at: now,
    });

    if (resError) throw new Error(`Lỗi đặt trang phục: ${resError.message}`);

    // 5. Update item status → reserved
    await supabase
      .from("dresses")
      .update({ status: "reserved", updated_at: now })
      .eq("id", input.dressId);

    // 6. Audit log
    fireAuditLog({
      action: "CREATE",
      tableName: "dress_reservations",
      description: `Đặt trang phục: ${item.name} cho HĐ #${input.contractId.substring(0, 8)}`,
      source: "server_action",
    });

    // 7. Revalidate
    revalidatePath("/dresses");
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${input.contractId}`);
    return null;
  });
}

export async function updateReservationStatus(
  reservationId: string,
  status: string,
  contractId?: string,
) {
  if (!reservationId) return { success: false as const, error: "ID khong hop le" };

  return withAuth(async (supabase) => {
    const validStatuses = ["reserved", "in_use", "rented", "returned", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw new Error("Trang thai trang phuc khong hop le");
    }

    const { data: reservation, error: fetchError } = await supabase
      .from("dress_reservations")
      .select("id, dress_id, contract_id")
      .eq("id", reservationId)
      .single();

    if (fetchError || !reservation) {
      throw new Error("Khong tim thay dat trang phuc");
    }

    const { error } = await supabase
      .from("dress_reservations")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", reservationId);

    if (error) throw new Error(`Loi cap nhat trang thai trang phuc: ${error.message}`);

    await refreshDressStatus(supabase, reservation.dress_id);

    // ⚡ No revalidatePath — client uses optimistic UI + Realtime for sync
    return null;
  });
}

export async function releaseReservation(reservationId: string) {
  if (!reservationId) return { success: false as const, error: "ID không hợp lệ" };

  return withAuth(async (supabase, userId) => {
    const now = new Date().toISOString();

    // 1. Fetch reservation details
    const { data: reservation, error: fetchErr } = await supabase
      .from("dress_reservations")
      .select("id, dress_id, contract_id, contract_item_id, status")
      .eq("id", reservationId)
      .single();

    if (fetchErr || !reservation) throw new Error("Không tìm thấy đặt trang phục");
    if (reservation.status === "returned") throw new Error("Trang phục đã được trả trước đó");

    // 2. Update reservation → returned
    const { error: updateErr } = await supabase
      .from("dress_reservations")
      .update({ status: "returned", updated_at: now })
      .eq("id", reservationId);
    if (updateErr) throw new Error(`Lỗi trả trang phục: ${updateErr.message}`);

    await refreshDressStatus(supabase, reservation.dress_id);

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
      tableName: "dress_reservations",
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
    if (file.size > 10 * 1024 * 1024) throw new Error("Ảnh không được vượt quá 10MB");
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

// ═══════════════════════════════════════════
// Delete Dress Image — Cleanup orphan files
// Best-effort: lỗi vẫn return success
// ═══════════════════════════════════════════

export async function deleteDressImage(imageUrl: string) {
  return withAuth(async (supabase) => {
    try {
      const path = imageUrl.split("/dresses/")[1]?.split("?")[0];
      if (path) await supabase.storage.from("dresses").remove([path]);
    } catch {
      // Best-effort cleanup — don't block user
    }
    return null;
  });
}
