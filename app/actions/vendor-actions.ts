"use server";

import { z } from "zod";
import { withAuth, requireContractWriteAccess } from "@/lib/auth_utils";
import type { Vendor } from "@/types/vendor";

const quickAddSchema = z.object({
  full_name: z.string().min(1, "Tên thợ ngoài không được để trống"),
  phone: z.string().optional(),
  service_type: z.string().optional(),
});

export async function getActiveVendors() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("vendors")
      .select("id, full_name, phone, service_type, status")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("full_name");

    if (error) throw new Error(`Lỗi tải danh sách thợ ngoài: ${error.message}`);
    return (data || []) as Vendor[];
  });
}

export async function quickAddVendor(input: z.infer<typeof quickAddSchema>) {
  return withAuth(async (supabase, userId) => {
    const parsed = quickAddSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");
    }

    const { data, error } = await supabase
      .from("vendors")
      .insert({
        full_name: parsed.data.full_name,
        phone: parsed.data.phone || null,
        service_type: parsed.data.service_type || null,
        status: "active",
      })
      .select("id, full_name, phone, service_type, status")
      .single();

    if (error) throw new Error(`Lỗi thêm thợ ngoài: ${error.message}`);
    
    // Audit log if needed
    // fireAuditLog({ action: "CREATE", tableName: "vendors", recordId: data.id, description: `Thêm thợ ngoài: ${data.full_name}` });
    
    return data as Vendor;
  });
}
