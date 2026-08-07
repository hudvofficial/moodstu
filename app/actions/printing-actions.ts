"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { withPrintingAccess } from "@/lib/auth_utils";
import { getLabOptions as getLabOptionsImpl, getLabServices as getLabServicesImpl } from "./lab-queries";
import {
  createPrintingOrder as createPrintingOrderImpl,
  updatePrintingOrderStatus as updatePrintingOrderStatusImpl,
} from "./printing-mutations";

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
  reason?: string | null,
) {
  return updatePrintingOrderStatusImpl(orderId, status, contractId, reason);
}

export async function updatePrintOrderFileUrl(orderId: string, fileUrl: string | null, contractId: string) {
  // Validate URL scheme if present
  if (fileUrl) {
    try {
      const url = new URL(fileUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { success: false, error: "Đường dẫn không hợp lệ (chỉ hỗ trợ http/https)" };
      }
    } catch {
      return { success: false, error: "Đường dẫn không hợp lệ" };
    }
  }

  return withPrintingAccess(async (supabase: SupabaseClient<Database>) => {
    const { data, error } = await supabase
      .from("printing_orders")
      .update({ print_file_url: fileUrl?.trim() || null })
      .eq("id", orderId)
      .eq("contract_id", contractId)
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Không thể lưu hoặc không có quyền" };
    }

    revalidatePath(`/contracts/${contractId}`);
    revalidatePath("/printing");
    return { success: true };
  });
}
