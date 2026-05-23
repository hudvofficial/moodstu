"use server";

import { withAuth, requireCrmAccess } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { ZodCustomerCreate, ZodCustomerUpdate, ZodUuidId, ZodCustomerFilter, ZodCustomerSearch } from "@/lib/validations/crm.schema";

// ----------------------------------------------------
// Customer Actions - CRUD + Stats + LTV
// ----------------------------------------------------

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

type CustomerListRow = { id: string } & Record<string, unknown>;

const CUSTOMER_LIST_FIELDS = [
  "id",
  "customer_code",
  "full_name",
  "phone",
  "alt_phone",
  "email",
  "address",
  "gender",
  "date_of_birth",
  "wedding_date",
  "bride_name",
  "bride_phone",
  "bride_height",
  "bride_weight",
  "bride_shoe_size",
  "groom_name",
  "groom_phone",
  "groom_height",
  "groom_weight",
  "groom_shoe_size",
  "source",
  "notes",
  "tags",
  "created_at",
  "updated_at",
].join(", ");

/** Escape PostgREST ilike wildcards to prevent pattern injection */
function escapeSearch(s: string): string {
  return s.replace(/[%_\\]/g, (c) => `\\${c}`);
}

// ----------------------------------------------------
// GET CUSTOMERS (Paginated + Search)
// ----------------------------------------------------

export async function getCustomers(params: {
  search?: string; page?: number; pageSize?: number; source?: string; tags?: string;
}): Promise<ActionResult<{ customers: unknown[]; total: number; totalPages: number; page: number; pageSize: number }>> {
  return withAuth(async (supabase, userId) => {
    await requireCrmAccess(supabase, userId);
    
    const parsed = ZodCustomerFilter.safeParse(params);
    if (!parsed.success) throw new Error("Tham số lọc không hợp lệ");

    const { search, page, pageSize, source, tags } = parsed.data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from("customers").select(CUSTOMER_LIST_FIELDS, { count: "exact" }).is("deleted_at", null).order("created_at", { ascending: false }).range(from, to);
    if (search) {
      const s = escapeSearch(search);
      query = query.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%,customer_code.ilike.%${s}%`);
    }
    if (source) query = query.eq("source", source);
    if (tags) {
      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      if (tagsArray.length > 0) query = query.contains("tags", tagsArray);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const customers = (data || []) as unknown as CustomerListRow[];
    const customerIds = customers.map((c) => c.id);
    const ltvMap: Record<string, number> = {};

    if (customerIds.length > 0) {
      const { data: contracts, error: contractsError } = await supabase.from("contracts").select("customer_id, total_amount").in("customer_id", customerIds).is("deleted_at", null);
      if (contractsError) throw contractsError;
      (contracts || []).forEach((c: { customer_id: string; total_amount: number }) => {
        ltvMap[c.customer_id] = (ltvMap[c.customer_id] || 0) + (c.total_amount || 0);
      });
    }

    const totalPages = Math.ceil((count || 0) / pageSize);

    return { customers: customers.map((c) => ({ ...c, ltv: ltvMap[c.id] || 0 })), total: count || 0, totalPages, page, pageSize };
  });
}

// ----------------------------------------------------

export async function getCustomerById(id: string): Promise<ActionResult<{ customer: unknown; contracts: unknown[]; lifetimeValue: number }>> {
  return withAuth(async (supabase, userId) => {
    await requireCrmAccess(supabase, userId);
    
    const parsed = ZodUuidId.safeParse({ id });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "ID không hợp lệ");

    const { data: customer, error } = await supabase.from("customers").select("*").eq("id", id).is("deleted_at", null).single();
    if (error) throw error;

    const { data: contracts, error: contractsError } = await supabase.from("contracts").select("id, contract_code, total_amount, status, created_at").eq("customer_id", id).is("deleted_at", null).order("created_at", { ascending: false });
    if (contractsError) throw contractsError;
    const lifetimeValue = (contracts || []).reduce((sum: number, c: { total_amount?: number }) => sum + (c.total_amount || 0), 0);

    return { customer, contracts: contracts || [], lifetimeValue };
  });
}

// ----------------------------------------------------

export async function createCustomer(data: unknown): Promise<ActionResult<{ customer_id: string; duplicate?: boolean; customer_name?: string }>> {
  return withAuth(async (supabase, userId) => {
    const { employee } = await requireCrmAccess(supabase, userId);
    const parsed = ZodCustomerCreate.safeParse(data);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");
    
    const tData = parsed.data;

    // Phone dedup guard: never overwrite an existing profile from a create flow.
    if (tData.phone?.trim()) {
      const { data: existingByPhone, error: existingByPhoneError } = await supabase.from("customers").select("id, full_name, phone").eq("phone", tData.phone.trim()).is("deleted_at", null).limit(1).maybeSingle();
      if (existingByPhoneError) throw existingByPhoneError;
      if (existingByPhone) {
        return {
          customer_id: existingByPhone.id,
          duplicate: true,
          customer_name: existingByPhone.full_name,
        };
      }
    }

    const { data: seqResult } = await supabase.rpc("nextval_customer_code");
    const code = seqResult ? `KH-${String(seqResult).padStart(3, "0")}` : `KH-${Date.now().toString().slice(-3)}`;

    const insertData = {
      customer_code: code, 
      full_name: tData.full_name.trim(), 
      phone: tData.phone?.trim() || null,
      alt_phone: tData.alt_phone?.trim() || null, 
      email: tData.email?.trim() || null, 
      address: tData.address?.trim() || null,
      gender: tData.gender || null, 
      date_of_birth: tData.date_of_birth || null, 
      wedding_date: tData.wedding_date || null,
      bride_name: tData.bride_name?.trim() || null, 
      groom_name: tData.groom_name?.trim() || null,
      source: tData.source || null,
      notes: tData.notes?.trim() || null,
      tags: tData.tags || [],
      created_by: employee.id,
    };

    const { data: customer, error } = await supabase.from("customers").insert(insertData).select("id").single();
    if (error) throw error;

    await writeAuditLog({
      action: "CREATE",
      tableName: "customers",
      recordId: customer.id,
      
      oldData: undefined,
      newData: insertData,
    });

    revalidatePath("/crm/customers");
    return { customer_id: customer.id };
  });
}

// ----------------------------------------------------

export async function updateCustomer(id: string, data: unknown): Promise<ActionResult<null>> {
  return withAuth(async (supabase, userId) => {
    await requireCrmAccess(supabase, userId);
    
    // Pass ID to merged object for Zod validation mapping
    const parsed = ZodCustomerUpdate.safeParse({ id, ...(typeof data === "object" && data !== null ? data : {}) });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    const tData = parsed.data;

    const { data: oldData, error: oldError } = await supabase.from("customers").select("*").eq("id", tData.id).is("deleted_at", null).single();
    if (oldError || !oldData) throw new Error("Không tìm thấy khách hàng hoặc đã bị xóa");

    // Optimistic Locking Check
    if (tData.expectedUpdatedAt && oldData.updated_at && new Date(oldData.updated_at).getTime() > new Date(tData.expectedUpdatedAt).getTime()) {
      throw new Error("Dữ liệu đã bị thay đổi bởi người khác, vui lòng tải lại trang");
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (tData.full_name !== undefined) updateData.full_name = tData.full_name.trim();
    if (tData.phone !== undefined) updateData.phone = tData.phone.trim() || null;
    if (tData.alt_phone !== undefined) updateData.alt_phone = tData.alt_phone.trim() || null;
    if (tData.email !== undefined) updateData.email = tData.email.trim() || null;
    if (tData.address !== undefined) updateData.address = tData.address?.trim() || null;
    if (tData.gender !== undefined) updateData.gender = tData.gender || null;
    if (tData.date_of_birth !== undefined) updateData.date_of_birth = tData.date_of_birth || null;
    if (tData.wedding_date !== undefined) updateData.wedding_date = tData.wedding_date || null;
    if (tData.bride_name !== undefined) updateData.bride_name = tData.bride_name?.trim() || null;
    if (tData.groom_name !== undefined) updateData.groom_name = tData.groom_name?.trim() || null;
    if (tData.source !== undefined) updateData.source = tData.source || null;
    if (tData.notes !== undefined) updateData.notes = tData.notes?.trim() || null;
    if (tData.tags !== undefined) updateData.tags = tData.tags || [];

    const { error } = await supabase.from("customers").update(updateData).eq("id", tData.id);
    if (error) throw error;

    await writeAuditLog({
      action: "UPDATE",
      tableName: "customers",
      recordId: tData.id,
      
      oldData: oldData,
      newData: updateData,
    });

    revalidatePath("/crm/customers");
    return null;
  });
}

// ----------------------------------------------------

export async function deleteCustomer(id: string): Promise<ActionResult<null>> {
  return withAuth(async (supabase, userId) => {
    const { role } = await requireCrmAccess(supabase, userId);
    
    if (role !== "admin" && role !== "manager") {
      throw new Error("Chỉ tài khoản Quản lý mới được xóa");
    }

    const parsed = ZodUuidId.safeParse({ id });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "ID không hợp lệ");

    const { data: oldData, error: oldError } = await supabase.from("customers").select("*").eq("id", id).is("deleted_at", null).single();
    if (oldError || !oldData) throw new Error("Không tìm thấy khách hàng hoặc đã bị xóa");

    const updateData = { 
      deleted_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    };

    const { error } = await supabase.from("customers").update(updateData).eq("id", id);
    if (error) throw error;

    await writeAuditLog({
      action: "DELETE",
      tableName: "customers",
      recordId: id,
      
      oldData: oldData,
      newData: updateData,
    });

    revalidatePath("/crm/customers");
    return null;
  });
}

// ----------------------------------------------------

export async function getCustomerStats(): Promise<ActionResult<{ total: number; newThisMonth: number; avgLifetimeValue: number }>> {
  return withAuth(async (supabase, userId) => {
    await requireCrmAccess(supabase, userId);

    const { data, error } = await supabase.rpc("get_crm_customer_stats");
    if (error) throw error;

    const stats = data as {
      total?: number;
      newThisMonth?: number;
      avgLifetimeValue?: number;
    };

    return {
      total: stats.total || 0,
      newThisMonth: stats.newThisMonth || 0,
      avgLifetimeValue: stats.avgLifetimeValue || 0,
    };
  });
}

// ----------------------------------------------------
// SEARCH CUSTOMERS (Autocomplete)
// Moved from contract-queries.ts -> customer domain (V2)
// ----------------------------------------------------

export async function searchCustomers(query: string) {
  return withAuth(async (supabase, userId) => {
    await requireCrmAccess(supabase, userId);

    const parsed = ZodCustomerSearch.safeParse({ query });
    if (!parsed.success || !parsed.data.query) return [];

    const sanitized = parsed.data.query;

    const { data, error } = await supabase
      .from("customers")
      .select("id, full_name, phone, bride_name, groom_name, bride_phone, bride_height, bride_weight, bride_shoe_size, groom_phone, groom_height, groom_weight, groom_shoe_size, wedding_date, address")
      .is("deleted_at", null)
      .or(`full_name.ilike.%${escapeSearch(sanitized)}%,phone.ilike.%${escapeSearch(sanitized)}%`)
      .order("full_name")
      .limit(10);

    if (error) throw new Error(`Lỗi tìm khách hàng: ${error.message}`);
    return data || [];
  });
}



