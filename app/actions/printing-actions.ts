"use server";

import { withAuth } from "@/lib/auth_utils";
import {
  createPrintingOrder as createPrintingOrderImpl,
  updatePrintingOrderStatus as updatePrintingOrderStatusImpl,
} from "./printing-mutations";
import { getLabOptions as getLabOptionsImpl, getLabServices as getLabServicesImpl } from "./lab-queries";

export async function getLabs() {
  return getLabOptionsImpl();
}

export async function fetchLabServices(labId: string) {
  return getLabServicesImpl(labId);
}

export async function createPrintingOrder(rawData: unknown) {
  return createPrintingOrderImpl(rawData);
}

export async function updatePrintOrderStatus(
  orderId: string,
  status: string,
  contractId: string,
) {
  return updatePrintingOrderStatusImpl(orderId, status, contractId);
}

const VALID_RESERVATION_STATUSES = ["reserved", "in_use", "returned", "cancelled"] as const;

export async function updateReservationStatus(
  reservationId: string,
  status: string,
  contractId: string,
) {
  // C5 audit fix: validate status allowlist
  if (!VALID_RESERVATION_STATUSES.includes(status as typeof VALID_RESERVATION_STATUSES[number])) {
    return { success: false, error: `Trang thai khong hop le: ${status}` };
  }

  return withAuth(async (supabase, userId) => {
    const now = new Date().toISOString();

    // C5 audit fix: fetch reservation BEFORE update (not after)
    const { data: reservation, error: fetchError } = await supabase
      .from("dress_reservations")
      .select("id, item_id, status")
      .eq("id", reservationId)
      .single();

    if (fetchError || !reservation) {
      throw new Error(`Khong tim thay reservation: ${fetchError?.message || "Not found"}`);
    }

    const { error } = await supabase
      .from("dress_reservations")
      .update({
        status,
        updated_by: userId,
        updated_at: now,
      })
      .eq("id", reservationId);

    if (error) throw new Error(`Loi cap nhat trang phuc: ${error.message}`);

    // C5 audit fix: only update dress if returning AND dress exists
    if (status === "returned" && reservation.item_id) {
      // Check dress current status to avoid race condition
      const { data: dress } = await supabase
        .from("dresses")
        .select("id, status")
        .eq("id", reservation.item_id)
        .single();

      if (dress && dress.status !== "available") {
        await supabase
          .from("dresses")
          .update({ status: "available", updated_at: now })
          .eq("id", reservation.item_id);
      }
    }

    // ⚡ No revalidatePath — client uses optimistic UI + Realtime for sync
    return null;
  });
}
