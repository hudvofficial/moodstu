"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import {
  createPrintingOrder as createPrintingOrderImpl,
  updatePrintingOrderStatus as updatePrintingOrderStatusImpl,
} from "./printing-mutations";
import { getLabOptions as getLabOptionsImpl } from "./lab-queries";

export async function getLabs() {
  return getLabOptionsImpl();
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

export async function updateReservationStatus(
  reservationId: string,
  status: string,
  contractId: string,
) {
  return withAuth(async (supabase, userId) => {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("dress_reservations")
      .update({
        status,
        updated_by: userId,
        updated_at: now,
      })
      .eq("id", reservationId);

    if (error) throw new Error(`Loi cap nhat trang phuc: ${error.message}`);

    if (status === "returned") {
      const { data: reservation } = await supabase
        .from("dress_reservations")
        .select("item_id")
        .eq("id", reservationId)
        .single();

      if (reservation?.item_id) {
        await supabase
          .from("dresses")
          .update({ status: "available", updated_at: now })
          .eq("id", reservation.item_id);
      }
    }

    revalidatePath(`/contracts/${contractId}`);
    return null;
  });
}
