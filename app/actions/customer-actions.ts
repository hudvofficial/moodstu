"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import type { CustomerFormData } from "@/types/crm";

// ═══════════════════════════════════════════
// Customer Actions — CRUD + Stats + LTV
// Split from crm.ts (640 lines) → customer-actions.ts + lead-actions.ts
// ═══════════════════════════════════════════

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── GET CUSTOMERS (Paginated + Search) ───────

export async function getCustomers(params: {
  search?: string; page?: number; pageSize?: number; source?: string; tags?: string;
}): Promise<ActionResult<{ customers: unknown[]; total: number; page: number; pageSize: number }>> {
  return withAuth(async (supabase) => {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from("customers").select("*", { count: "exact" }).is("deleted_at", null).order("created_at", { ascending: false }).range(from, to);
    if (params.search) query = query.or(`full_name.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
    if (params.source) query = query.eq("source", params.source);

    const { data, count, error } = await query;
    if (error) throw error;

    const customers = data || [];
    const customerIds = customers.map((c: { id: string }) => c.id);
    const ltvMap: Record<string, number> = {};

    if (customerIds.length > 0) {
      const { data: contracts } = await supabase.from("contracts").select("customer_id, total_value").in("customer_id", customerIds);
      (contracts || []).forEach((c: { customer_id: string; total_value: number }) => {
        ltvMap[c.customer_id] = (ltvMap[c.customer_id] || 0) + (c.total_value || 0);
      });
    }

    return { customers: customers.map((c: { id: string }) => ({ ...c, ltv: ltvMap[c.id] || 0 })), total: count || 0, page, pageSize };
  });
}

// ─── GET CUSTOMER BY ID ──────────────────────

export async function getCustomerById(id: string): Promise<ActionResult<{ customer: unknown; contracts: unknown[]; lifetimeValue: number }>> {
  return withAuth(async (supabase) => {
    const { data: customer, error } = await supabase.from("customers").select("*").eq("id", id).is("deleted_at", null).single();
    if (error) throw error;

    const { data: contracts } = await supabase.from("contracts").select("id, contract_code, total_value, status, created_at").eq("customer_id", id).order("created_at", { ascending: false });
    const lifetimeValue = (contracts || []).reduce((sum: number, c: { total_value?: number }) => sum + (c.total_value || 0), 0);

    return { customer, contracts: contracts || [], lifetimeValue };
  });
}

// ─── CREATE CUSTOMER ─────────────────────────

export async function createCustomer(data: CustomerFormData): Promise<ActionResult<{ customer_id: string }>> {
  if (!data.full_name?.trim()) return { success: false, error: "Tên khách hàng là bắt buộc" };

  return withAuth(async (supabase, userId) => {
    // Phone dedup guard
    if (data.phone?.trim()) {
      const { data: existingByPhone } = await supabase.from("customers").select("id").eq("phone", data.phone.trim()).is("deleted_at", null).limit(1).maybeSingle();
      if (existingByPhone) {
        await supabase.from("customers").update({
          full_name: data.full_name.trim(), address: data.address?.trim() || null, email: data.email?.trim() || null,
          wedding_date: data.wedding_date || null, bride_name: data.bride_name?.trim() || null, groom_name: data.groom_name?.trim() || null,
          source: data.source || null, notes: data.notes?.trim() || null, updated_at: new Date().toISOString(),
        }).eq("id", existingByPhone.id);
        revalidatePath("/crm/customers");
        return { customer_id: existingByPhone.id };
      }
    }

    const { data: seqResult } = await supabase.rpc("nextval_customer_code");
    const code = seqResult ? `KH-${String(seqResult).padStart(3, "0")}` : `KH-${Date.now().toString().slice(-3)}`;

    const { data: customer, error } = await supabase.from("customers").insert({
      customer_code: code, full_name: data.full_name.trim(), phone: data.phone?.trim() || null,
      alt_phone: data.alt_phone?.trim() || null, email: data.email?.trim() || null, address: data.address?.trim() || null,
      gender: data.gender || null, date_of_birth: data.date_of_birth || null, wedding_date: data.wedding_date || null,
      bride_name: data.bride_name?.trim() || null, groom_name: data.groom_name?.trim() || null,
      source: data.source || null, notes: data.notes?.trim() || null, tags: data.tags || null, created_by: userId,
    }).select("id").single();
    if (error) throw error;

    revalidatePath("/crm/customers");
    return { customer_id: customer.id };
  });
}

// ─── UPDATE CUSTOMER ─────────────────────────

export async function updateCustomer(id: string, data: Partial<CustomerFormData>): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.full_name !== undefined) updateData.full_name = data.full_name.trim();
    if (data.phone !== undefined) updateData.phone = data.phone.trim() || null;
    if (data.alt_phone !== undefined) updateData.alt_phone = data.alt_phone.trim() || null;
    if (data.email !== undefined) updateData.email = data.email.trim() || null;
    if (data.address !== undefined) updateData.address = data.address.trim() || null;
    if (data.gender !== undefined) updateData.gender = data.gender || null;
    if (data.date_of_birth !== undefined) updateData.date_of_birth = data.date_of_birth || null;
    if (data.wedding_date !== undefined) updateData.wedding_date = data.wedding_date || null;
    if (data.source !== undefined) updateData.source = data.source || null;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.tags !== undefined) updateData.tags = data.tags || null;

    const { error } = await supabase.from("customers").update(updateData).eq("id", id);
    if (error) throw error;

    revalidatePath("/crm/customers");
    return null;
  });
}

// ─── DELETE CUSTOMER (Soft) ──────────────────

export async function deleteCustomer(id: string): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("customers").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    revalidatePath("/crm/customers");
    return null;
  });
}

// ─── CUSTOMER STATS ──────────────────────────

export async function getCustomerStats(): Promise<ActionResult<{ total: number; newThisMonth: number; avgLifetimeValue: number }>> {
  return withAuth(async (supabase) => {
    const { count: total } = await supabase.from("customers").select("*", { count: "exact", head: true }).is("deleted_at", null);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count: newThisMonth } = await supabase.from("customers").select("*", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", startOfMonth.toISOString());

    const { data: contracts } = await supabase.from("contracts").select("customer_id, total_value");
    const customerValues: Record<string, number> = {};
    (contracts || []).forEach((c: { customer_id: string; total_value: number }) => {
      customerValues[c.customer_id] = (customerValues[c.customer_id] || 0) + (c.total_value || 0);
    });
    const values = Object.values(customerValues);
    const avgLifetimeValue = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

    return { total: total || 0, newThisMonth: newThisMonth || 0, avgLifetimeValue };
  });
}

// ─── SEARCH CUSTOMERS (Autocomplete) ─────────
// Moved from contract-queries.ts → customer domain (V2)

export async function searchCustomers(query: string) {
  if (!query || query.length < 2) return { success: true as const, data: [] };

  return withAuth(async (supabase) => {
    const sanitized = query
      .replace(/[%_]/g, "")
      .trim();

    const { data, error } = await supabase
      .from("customers")
      .select("id, full_name, phone, bride_name, groom_name, bride_phone, bride_height, bride_weight, bride_shoe_size, groom_phone, groom_height, groom_weight, groom_shoe_size, wedding_date, address")
      .is("deleted_at", null)
      .or(`full_name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`)
      .order("full_name")
      .limit(10);

    if (error) throw new Error(`Lỗi tìm khách hàng: ${error.message}`);
    return data || [];
  });
}
