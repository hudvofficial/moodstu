"use server";

import {
  withDressesAccess,
  withDressesBookingAccess,
  withDressesCatalogWriteAccess,
} from "@/lib/auth_utils";
import { fireAuditLog } from "@/lib/audit";
import { invalidateDressPaths } from "@/lib/server-cache-invalidation";
import {
  dressCreateSchema,
  dressUpdateSchema,
  reserveDressSchema,
} from "@/lib/validations/dress.schema";
import { CATEGORY_PREFIX_MAP } from "@/types/dress-constants";
import { generateBlurHashFromUrl } from "./blurhash-actions";

type RpcError = { message?: string; code?: string } | null;

const ACTIVE_RESERVATION_STATUSES = ["reserved", "in_use", "rented"] as const;
const ACTIVE_RENTAL_STATUSES = ["reserved", "renting", "overdue"] as const;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function isMissingRpc(error: RpcError) {
  const message = error?.message?.toLowerCase() || "";
  return message.includes("could not find the function") || error?.code === "PGRST202";
}

function revalidateDresses(contractId?: string | null) {
  invalidateDressPaths(contractId);
}

function extractDressStoragePath(imageUrl: string) {
  const marker = "/storage/v1/object/public/dresses/";
  const index = imageUrl.indexOf(marker);
  if (index === -1) return null;

  const rawPath = imageUrl.slice(index + marker.length).split("?")[0];
  const decoded = decodeURIComponent(rawPath);
  if (!decoded || decoded.includes("..")) return null;
  return decoded;
}

async function fallbackRefreshDressStatus(
  supabase: Parameters<Parameters<typeof withDressesAccess>[0]>[0],
  dressId: string,
  userId?: string,
) {
  const rpc = await supabase.rpc("refresh_dress_status_atomic", {
    p_dress_id: dressId,
    p_user_id: userId ?? null,
  });

  if (!rpc.error || !isMissingRpc(rpc.error)) return;

  const [reservationRes, rentalRes, dressRes] = await Promise.all([
    supabase
      .from("dress_reservations")
      .select("status")
      .eq("dress_id", dressId)
      .in("status", [...ACTIVE_RESERVATION_STATUSES]),
    supabase
      .from("dress_rentals")
      .select("status")
      .eq("item_id", dressId)
      .in("status", [...ACTIVE_RENTAL_STATUSES]),
    supabase.from("dresses").select("status").eq("id", dressId).maybeSingle(),
  ]);

  if (reservationRes.error) throw new Error(reservationRes.error.message);
  if (rentalRes.error) throw new Error(rentalRes.error.message);
  if (dressRes.error) throw new Error(dressRes.error.message);

  const currentStatus = dressRes.data?.status;
  if (["maintenance", "retired", "cleaning"].includes(String(currentStatus))) return;

  const rentals = rentalRes.data || [];
  const reservations = reservationRes.data || [];
  const nextStatus = rentals.some((row) => row.status === "renting" || row.status === "overdue") ||
    reservations.some((row) => row.status === "in_use" || row.status === "rented")
    ? "rented"
    : rentals.length > 0 || reservations.length > 0
      ? "reserved"
      : "available";

  await supabase
    .from("dresses")
    .update({ status: nextStatus, updated_by: userId ?? null, updated_at: new Date().toISOString() })
    .eq("id", dressId);
}

export async function checkItemCodeExists(code: string, excludeId?: string) {
  return withDressesAccess(async (supabase) => {
    let query = supabase
      .from("dresses")
      .select("id")
      .eq("item_code", code.trim())
      .is("deleted_at", null)
      .limit(1);

    if (excludeId) query = query.neq("id", excludeId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { exists: (data?.length ?? 0) > 0 };
  });
}

export async function createDress(rawData: unknown) {
  const parsed = dressCreateSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withDressesCatalogWriteAccess(async (supabase, userId) => {
    const data = parsed.data;
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
        .maybeSingle();

      let nextNum = 1;
      if (maxRow?.item_code) {
        const match = maxRow.item_code.match(/(\d+)$/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      itemCode = `${prefix}-${String(nextNum).padStart(3, "0")}`;
    }

    let blurHash: string | null = null;
    let blurDataUrl: string | null = null;
    if (data.image_url) {
      try {
        const result = await generateBlurHashFromUrl(data.image_url);
        blurHash = result.blurHash;
        blurDataUrl = result.dataUrl;
      } catch (e) {
        console.error("Failed to generate blur hash for dress:", e);
      }
    }

    const insertPayload = {
      ...data,
      item_code: itemCode,
      image_url: data.image_url || null,
      blur_hash: blurHash,
      blur_data_url: blurDataUrl,
      notes: data.notes || null,
      status: "available",
      current_stock: 1,
      created_by: userId,
      updated_by: userId,
    };

    const { data: result, error } = await supabase
      .from("dresses")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505" && !parsed.data.item_code?.trim()) {
        const codeMatch = itemCode.match(/(\d+)$/);
        const currentNum = codeMatch ? parseInt(codeMatch[1], 10) : 0;
        const retryCode = `${itemCode.split("-")[0]}-${String(currentNum + 1).padStart(3, "0")}`;
        const { data: retryData, error: retryErr } = await supabase
          .from("dresses")
          .insert({ ...insertPayload, item_code: retryCode })
          .select("id")
          .single();

        if (retryErr) throw new Error("Ma trang phuc da ton tai, vui long thu lai");
        itemCode = retryCode;
        revalidateDresses();
        return { id: retryData.id };
      }

      if (error.code === "23505") throw new Error("Ma trang phuc da ton tai");
      throw new Error(error.message);
    }

    fireAuditLog({
      action: "CREATE",
      tableName: "dresses",
      recordId: result.id,
      description: `Them trang phuc: ${data.name} (${itemCode})`,
      source: "server_action",
    });

    revalidateDresses();
    return { id: result.id };
  });
}

export async function updateDress(rawData: unknown) {
  const parsed = dressUpdateSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withDressesCatalogWriteAccess(async (supabase, userId) => {
    const { id, updated_at, data } = parsed.data;

    const { data: current, error: fetchError } = await supabase
      .from("dresses")
      .select("updated_at, image_url, blur_hash, blur_data_url")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (fetchError || !current) throw new Error("Trang phuc khong ton tai");
    if (current.updated_at !== updated_at) {
      throw new Error("Du lieu da duoc cap nhat boi nguoi khac. Vui long tai lai trang.");
    }

    let blurHash = current.blur_hash;
    let blurDataUrl = current.blur_data_url;
    if (data.image_url !== current.image_url) {
      if (data.image_url) {
        try {
          const result = await generateBlurHashFromUrl(data.image_url);
          blurHash = result.blurHash;
          blurDataUrl = result.dataUrl;
        } catch (e) {
          console.error("Failed to generate blur hash for dress:", e);
          blurHash = null;
          blurDataUrl = null;
        }
      } else {
        blurHash = null;
        blurDataUrl = null;
      }
    }

    const { error } = await supabase
      .from("dresses")
      .update({
        ...data,
        image_url: data.image_url || null,
        blur_hash: blurHash,
        blur_data_url: blurDataUrl,
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
      description: `Cap nhat trang phuc #${id.substring(0, 8)}`,
      source: "server_action",
    });

    revalidateDresses();
    return null;
  });
}

export async function deleteDress(id: string) {
  if (!id) return { success: false as const, error: "ID khong hop le" };

  return withDressesCatalogWriteAccess(async (supabase, userId) => {
    const rpc = await supabase.rpc("delete_dress_atomic", {
      p_dress_id: id,
      p_user_id: userId,
    });

    if (rpc.error && !isMissingRpc(rpc.error)) throw new Error(rpc.error.message);

    if (rpc.error) {
      const [activeReservations, activeRentals, history] = await Promise.all([
        supabase
          .from("dress_reservations")
          .select("id")
          .eq("dress_id", id)
          .in("status", [...ACTIVE_RESERVATION_STATUSES])
          .limit(1),
        supabase
          .from("dress_rentals")
          .select("id")
          .eq("item_id", id)
          .in("status", [...ACTIVE_RENTAL_STATUSES])
          .limit(1),
        supabase
          .from("dress_reservations")
          .select("id")
          .eq("dress_id", id)
          .limit(1),
      ]);

      if (activeReservations.error) throw new Error(activeReservations.error.message);
      if (activeRentals.error) throw new Error(activeRentals.error.message);
      if (history.error) throw new Error(history.error.message);
      if ((activeReservations.data?.length || 0) > 0 || (activeRentals.data?.length || 0) > 0) {
        throw new Error("Khong the xoa trang phuc dang duoc dat hoac dang thue");
      }

      const updatePayload =
        (history.data?.length || 0) > 0
          ? { status: "retired", updated_by: userId, updated_at: new Date().toISOString() }
          : { deleted_at: new Date().toISOString(), updated_by: userId, updated_at: new Date().toISOString() };

      const { error } = await supabase.from("dresses").update(updatePayload).eq("id", id);
      if (error) throw new Error(error.message);
    }

    fireAuditLog({
      action: "DELETE",
      tableName: "dresses",
      recordId: id,
      description: `Xoa/ngung dung trang phuc #${id.substring(0, 8)}`,
      severity: "WARNING",
      source: "server_action",
    });

    revalidateDresses();
    return null;
  });
}

export async function reserveDressForContract(rawData: unknown) {
  const parsed = reserveDressSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withDressesBookingAccess(async (supabase, userId) => {
    const input = parsed.data;
    const now = new Date().toISOString();

    const rpc = await supabase.rpc("create_dress_contract_reservation_atomic", {
      p_dress_id: input.dressId,
      p_contract_id: input.contractId,
      p_contract_item_id: input.contractItemId || null,
      p_customer_id: input.customerId || null,
      p_start_date: input.startDate,
      p_end_date: input.endDate,
      p_export_type: input.exportType || null,
      p_is_addon: input.isAddon,
      p_rental_price: input.rentalPrice,
      p_notes: input.notes || null,
      p_user_id: userId,
    });

    if (!rpc.error) {
      revalidateDresses(input.contractId);
      return null;
    }

    if (!isMissingRpc(rpc.error)) throw new Error(rpc.error.message);

    const { data: item, error: itemErr } = await supabase
      .from("dresses")
      .select("id, name, status")
      .eq("id", input.dressId)
      .is("deleted_at", null)
      .single();

    if (itemErr || !item) throw new Error("Trang phuc khong ton tai hoac da bi xoa");
    if (["maintenance", "retired", "cleaning"].includes(String(item.status))) {
      throw new Error("Trang phuc hien khong the dat");
    }

    const [reservationOverlaps, rentalOverlaps] = await Promise.all([
      supabase
        .from("dress_reservations")
        .select("id")
        .eq("dress_id", input.dressId)
        .in("status", [...ACTIVE_RESERVATION_STATUSES])
        .lte("start_date", input.endDate)
        .gte("end_date", input.startDate)
        .limit(1),
      supabase
        .from("dress_rentals")
        .select("id")
        .eq("item_id", input.dressId)
        .in("status", [...ACTIVE_RENTAL_STATUSES])
        .lte("pickup_date", input.endDate)
        .gte("return_date", input.startDate)
        .limit(1),
    ]);

    if (reservationOverlaps.error) throw new Error(reservationOverlaps.error.message);
    if (rentalOverlaps.error) throw new Error(rentalOverlaps.error.message);
    if ((reservationOverlaps.data?.length || 0) > 0 || (rentalOverlaps.data?.length || 0) > 0) {
      throw new Error("Trang phuc da duoc dat trong khoang thoi gian nay");
    }

    let contractItemId = input.contractItemId || null;

    if (input.isAddon && input.rentalPrice > 0) {
      const { data: newItem, error: itemError } = await supabase
        .from("contract_items")
        .insert({
          contract_id: input.contractId,
          item_name: item.name || "Trang phuc phat sinh",
          type: "trang_phuc",
          quantity: 1,
          unit_price: input.rentalPrice,
          total_amount: input.rentalPrice,
          is_addon: true,
          addon_category: "trang_phuc",
          dress_id: input.dressId,
          added_by: userId,
          created_at: now,
        })
        .select("id")
        .single();

      if (itemError) throw new Error(`Loi them phat sinh: ${itemError.message}`);
      contractItemId = newItem.id;
      await supabase.rpc("recalc_contract_totals", { p_contract_id: input.contractId });
    }

    const { error: reservationError } = await supabase.from("dress_reservations").insert({
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

    if (reservationError) throw new Error(`Loi dat trang phuc: ${reservationError.message}`);

    await fallbackRefreshDressStatus(supabase, input.dressId, userId);

    fireAuditLog({
      action: "CREATE",
      tableName: "dress_reservations",
      description: `Dat trang phuc: ${item.name} cho HD #${input.contractId.substring(0, 8)}`,
      source: "server_action",
    });

    revalidateDresses(input.contractId);
    return null;
  });
}

export async function updateReservationStatus(
  reservationId: string,
  status: string,
  contractId?: string,
) {
  if (!reservationId) return { success: false as const, error: "ID khong hop le" };

  return withDressesBookingAccess(async (supabase, userId) => {
    const validStatuses = ["reserved", "in_use", "rented", "returned", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw new Error("Trang thai trang phuc khong hop le");
    }

    const rpc = await supabase.rpc("update_dress_reservation_status_atomic", {
      p_reservation_id: reservationId,
      p_status: status,
      p_user_id: userId,
    });

    if (rpc.error && !isMissingRpc(rpc.error)) throw new Error(rpc.error.message);

    if (rpc.error) {
      const { data: reservation, error: fetchError } = await supabase
        .from("dress_reservations")
        .select("id, dress_id, contract_id")
        .eq("id", reservationId)
        .single();

      if (fetchError || !reservation) throw new Error("Khong tim thay dat trang phuc");

      const { error } = await supabase
        .from("dress_reservations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", reservationId);

      if (error) throw new Error(`Loi cap nhat trang thai trang phuc: ${error.message}`);
      await fallbackRefreshDressStatus(supabase, reservation.dress_id, userId);
    }

    if (contractId) revalidateDresses(contractId);
    return null;
  });
}

export async function releaseReservation(reservationId: string) {
  if (!reservationId) return { success: false as const, error: "ID khong hop le" };

  return withDressesBookingAccess(async (supabase, userId) => {
    const rpc = await supabase.rpc("release_dress_reservation_atomic", {
      p_reservation_id: reservationId,
      p_user_id: userId,
    });

    if (!rpc.error) {
      const payload = rpc.data as { contract_id?: string | null } | null;
      revalidateDresses(payload?.contract_id || null);
      return null;
    }

    if (!isMissingRpc(rpc.error)) throw new Error(rpc.error.message);

    const now = new Date().toISOString();
    const { data: reservation, error: fetchErr } = await supabase
      .from("dress_reservations")
      .select("id, dress_id, contract_id, contract_item_id, status")
      .eq("id", reservationId)
      .single();

    if (fetchErr || !reservation) throw new Error("Khong tim thay dat trang phuc");
    if (reservation.status === "returned") throw new Error("Trang phuc da duoc tra truoc do");

    const { error: updateErr } = await supabase
      .from("dress_reservations")
      .update({ status: "returned", updated_at: now })
      .eq("id", reservationId);
    if (updateErr) throw new Error(`Loi tra trang phuc: ${updateErr.message}`);

    if (reservation.contract_item_id && reservation.contract_id) {
      await supabase
        .from("contract_items")
        .update({ deleted_at: now, updated_at: now })
        .eq("id", reservation.contract_item_id)
        .eq("is_addon", true);
      await supabase.rpc("recalc_contract_totals", { p_contract_id: reservation.contract_id });
    }

    await fallbackRefreshDressStatus(supabase, reservation.dress_id, userId);

    fireAuditLog({
      action: "UPDATE",
      tableName: "dress_reservations",
      recordId: reservationId,
      description: `Tra trang phuc - reservation #${reservationId.substring(0, 8)}`,
      source: "server_action",
    });

    revalidateDresses(reservation.contract_id);
    return null;
  });
}

export async function uploadDressImage(formData: FormData) {
  return withDressesCatalogWriteAccess(async (supabase) => {
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) throw new Error("Chua chon anh");
    if (file.size > 10 * 1024 * 1024) throw new Error("Anh khong duoc vuot qua 10MB");

    const ext = IMAGE_TYPES[file.type];
    if (!ext) throw new Error("Chi chap nhan anh JPG, PNG hoac WebP");

    const filePath = `unassigned/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("dresses")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw new Error(`Loi upload: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("dresses").getPublicUrl(filePath);
    return { url: urlData.publicUrl };
  });
}

export async function deleteDressImage(imageUrl: string) {
  return withDressesCatalogWriteAccess(async (supabase) => {
    const path = extractDressStoragePath(imageUrl);
    if (!path) return null;

    const { error } = await supabase.storage.from("dresses").remove([path]);
    if (error) throw new Error(`Loi xoa anh: ${error.message}`);
    return null;
  });
}
