"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import type { CustomerFormData, LeadFormData, LeadStatus, CrmLead } from "@/types/crm";

// ═══════════════════════════════════════════
// CRM Server Actions — Customer + Lead CRUD
// Pattern V1: code auth check → admin client (bypass RLS) for ALL operations
// ═══════════════════════════════════════════

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

// ═══ CUSTOMER ACTIONS ═══════════════════════

export async function getCustomers(params: {
  search?: string;
  page?: number;
  pageSize?: number;
  source?: string;
  tags?: string;
}): Promise<ActionResult<{ customers: unknown[]; total: number; page: number; pageSize: number }>> {
  return withAuth(async (supabase) => {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("customers")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.search) {
      query = query.or(`full_name.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
    }
    if (params.source) {
      query = query.eq("source", params.source);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const customers = data || [];

    // Batch LTV: fetch contracts for these customers
    const customerIds = customers.map((c: { id: string }) => c.id);
    const ltvMap: Record<string, number> = {};

    if (customerIds.length > 0) {
      const { data: contracts } = await supabase
        .from("contracts")
        .select("customer_id, total_value")
        .in("customer_id", customerIds);

      (contracts || []).forEach((c: { customer_id: string; total_value: number }) => {
        ltvMap[c.customer_id] = (ltvMap[c.customer_id] || 0) + (c.total_value || 0);
      });
    }

    // Merge LTV into customers
    const customersWithLtv = customers.map((c: { id: string }) => ({
      ...c,
      ltv: ltvMap[c.id] || 0,
    }));

    return {
      customers: customersWithLtv,
      total: count || 0,
      page,
      pageSize,
    };
  });
}

export async function getCustomerById(id: string): Promise<ActionResult<{
  customer: unknown;
  contracts: unknown[];
  lifetimeValue: number;
}>> {
  return withAuth(async (supabase) => {
    const { data: customer, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) throw error;

    // Get linked contracts
    const { data: contracts } = await supabase
      .from("contracts")
      .select("id, contract_code, total_value, status, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false });

    const lifetimeValue = (contracts || []).reduce(
      (sum: number, c: { total_value?: number }) => sum + (c.total_value || 0),
      0
    );

    return { customer, contracts: contracts || [], lifetimeValue };
  });
}

export async function createCustomer(
  data: CustomerFormData
): Promise<ActionResult<{ customer_id: string }>> {
  if (!data.full_name?.trim()) {
    return { success: false, error: "Tên khách hàng là bắt buộc" };
  }

  return withAuth(async (supabase, userId) => {
    // FK now points to auth.users(id) directly

    // [V1 PORT] Phone dedup guard (contract.service.ts:56-80)
    // If phone matches existing customer → update & reuse instead of creating duplicate
    if (data.phone?.trim()) {
      const { data: existingByPhone } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", data.phone.trim())
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

      if (existingByPhone) {
        // Update existing customer with new info
        // B5+B6 Fix: Thêm bride_name/groom_name vào phone-dedup update
        await supabase
          .from("customers")
          .update({
            full_name: data.full_name.trim(),
            address: data.address?.trim() || null,
            email: data.email?.trim() || null,
            wedding_date: data.wedding_date || null,
            bride_name: data.bride_name?.trim() || null,
            groom_name: data.groom_name?.trim() || null,
            source: data.source || null,
            notes: data.notes?.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingByPhone.id);

        revalidatePath("/crm/customers");
        return { customer_id: existingByPhone.id };
      }
    }

    // Auto-gen customer_code via sequence
    const { data: seqResult } = await supabase.rpc("nextval_customer_code");
    const code = seqResult
      ? `KH-${String(seqResult).padStart(3, "0")}`
      : `KH-${Date.now().toString().slice(-3)}`;

    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        customer_code: code,
        full_name: data.full_name.trim(),
        phone: data.phone?.trim() || null,
        alt_phone: data.alt_phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        gender: data.gender || null,
        date_of_birth: data.date_of_birth || null,
        wedding_date: data.wedding_date || null,
        // B5+B6 Fix: Lưu bride_name/groom_name vào DB
        bride_name: data.bride_name?.trim() || null,
        groom_name: data.groom_name?.trim() || null,
        source: data.source || null,
        notes: data.notes?.trim() || null,
        tags: data.tags || null,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath("/crm/customers");
    return { customer_id: customer.id };
  });
}

export async function updateCustomer(
  id: string,
  data: Partial<CustomerFormData>
): Promise<ActionResult<null>> {
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

    const { error } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/crm/customers");
    return null;
  });
}

export async function deleteCustomer(id: string): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    // Soft delete
    const { error } = await supabase
      .from("customers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/crm/customers");
    return null;
  });
}

export async function getCustomerStats(): Promise<ActionResult<{
  total: number;
  newThisMonth: number;
  avgLifetimeValue: number;
}>> {
  return withAuth(async (supabase) => {
    const { count: total } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newThisMonth } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", startOfMonth.toISOString());

    const { data: contracts } = await supabase
      .from("contracts")
      .select("customer_id, total_value");

    const customerValues: Record<string, number> = {};
    (contracts || []).forEach((c: { customer_id: string; total_value: number }) => {
      customerValues[c.customer_id] = (customerValues[c.customer_id] || 0) + (c.total_value || 0);
    });

    const values = Object.values(customerValues);
    const avgLifetimeValue = values.length > 0
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 0;

    return { total: total || 0, newThisMonth: newThisMonth || 0, avgLifetimeValue };
  });
}

// ═══ LEAD ACTIONS ═══════════════════════════

export async function getLeads(params: {
  search?: string;
  status?: LeadStatus;
  source?: string;
  assigned?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ leads: unknown[]; total: number; page: number; pageSize: number }>> {
  return withAuth(async (supabase) => {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("crm_leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.search) {
      query = query.or(`contact_name.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
    }
    if (params.status) {
      query = query.eq("status", params.status);
    }
    if (params.source) {
      query = query.eq("source", params.source);
    }
    if (params.assigned) {
      query = query.eq("assigned_to", params.assigned);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return { leads: data || [], total: count || 0, page, pageSize };
  });
}

export async function createLead(
  data: LeadFormData
): Promise<ActionResult<{ lead_id: string }>> {
  if (!data.contact_name?.trim()) {
    return { success: false, error: "Tên liên hệ là bắt buộc" };
  }

  return withAuth(async (supabase, userId) => {
    // FK now points to auth.users(id) directly

    // Duplicate phone check
    if (data.phone?.trim()) {
      const { data: existing } = await supabase
        .from("crm_leads")
        .select("id, contact_name")
        .eq("phone", data.phone!.trim())
        .neq("status", "huy")
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error(`SĐT này đã tồn tại (${existing[0].contact_name}). Vui lòng kiểm tra lại.`);
      }
    }

    const { data: lead, error } = await supabase
      .from("crm_leads")
      .insert({
        contact_name: data.contact_name.trim(),
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        source: data.source || null,
        needs: data.needs?.trim() || null,
        address: data.address?.trim() || null,
        potential: data.potential || null,
        status: data.status || "moi",
        notes: data.notes?.trim() || null,
        social_link: data.social_link?.trim() || null,
        next_contact_date: data.next_contact_date || null,
        assigned_to: data.assigned_to || null,
        contact_date: data.contact_date || new Date().toISOString().split("T")[0],
        created_by: userId,
        deal_value: data.deal_value || 0,
        tags: data.tags || [],
        score: data.score || 0,
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath("/crm/leads");
    return { lead_id: lead.id };
  });
}

export async function updateLead(
  id: string,
  data: Partial<LeadFormData>
): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.contact_name !== undefined) updateData.contact_name = data.contact_name.trim();
    if (data.phone !== undefined) updateData.phone = data.phone.trim() || null;
    if (data.email !== undefined) updateData.email = data.email.trim() || null;
    if (data.source !== undefined) updateData.source = data.source || null;
    if (data.needs !== undefined) updateData.needs = data.needs?.trim() || null;
    if (data.address !== undefined) updateData.address = data.address?.trim() || null;
    if (data.potential !== undefined) updateData.potential = data.potential || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.social_link !== undefined) updateData.social_link = data.social_link?.trim() || null;
    if (data.next_contact_date !== undefined) updateData.next_contact_date = data.next_contact_date || null;
    if (data.assigned_to !== undefined) updateData.assigned_to = data.assigned_to || null;
    if (data.deal_value !== undefined) updateData.deal_value = data.deal_value || 0;
    if (data.tags !== undefined) updateData.tags = data.tags || [];
    if (data.score !== undefined) updateData.score = data.score || 0;

    const { error } = await supabase
      .from("crm_leads")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/crm/leads");
    return null;
  });
}

export async function deleteLead(id: string): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const { error } = await supabase
      .from("crm_leads")
      .delete()
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/crm/leads");
    return null;
  });
}

export async function getLeadById(id: string): Promise<ActionResult<CrmLead>> {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("crm_leads")
      .select(`*`)
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) throw error;
    if (!data) throw new Error("Không tìm thấy lead");

    return data as CrmLead;
  });
}

export async function getLeadStats(): Promise<ActionResult<{
  total: number;
  active: number;
  closed: number;
  conversionRate: number;
  byStatus: Record<string, number>;
}>> {
  return withAuth(async (supabase) => {
    const { data: leads, error } = await supabase
      .from("crm_leads")
      .select("status");

    if (error) throw error;

    const all = leads || [];
    const total = all.length;
    const closed = all.filter((l: { status: string }) => l.status === "da_chot").length;
    const cancelled = all.filter((l: { status: string }) => l.status === "huy").length;
    const active = total - closed - cancelled;
    const conversionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    const byStatus: Record<string, number> = {};
    all.forEach((l: { status: string }) => {
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    });

    return { total, active, closed, conversionRate, byStatus };
  });
}

// ═══ PIPELINE ACTIONS ═══════════════════════

export async function moveLeadToStage(
  leadId: string,
  newStatus: LeadStatus
): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const { error } = await supabase
      .from("crm_leads")
      .update({
        status: newStatus,
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (error) throw error;

    revalidatePath("/crm/leads");
    return null;
  });
}

export async function updateDealValue(
  leadId: string,
  dealValue: number
): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const { error } = await supabase
      .from("crm_leads")
      .update({ deal_value: dealValue, updated_at: new Date().toISOString() })
      .eq("id", leadId);

    if (error) throw error;

    revalidatePath("/crm/leads");
    return null;
  });
}

export async function updateLeadScore(
  leadId: string,
  score: number
): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const clampedScore = Math.max(0, Math.min(100, score));
    const { error } = await supabase
      .from("crm_leads")
      .update({ score: clampedScore, updated_at: new Date().toISOString() })
      .eq("id", leadId);

    if (error) throw error;

    revalidatePath("/crm/leads");
    return null;
  });
}

export async function updateLeadTags(
  leadId: string,
  tags: string[]
): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const { error } = await supabase
      .from("crm_leads")
      .update({ tags, updated_at: new Date().toISOString() })
      .eq("id", leadId);

    if (error) throw error;

    revalidatePath("/crm/leads");
    return null;
  });
}

export async function assignLead(
  leadId: string,
  employeeId: string | null
): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const { error } = await supabase
      .from("crm_leads")
      .update({ assigned_to: employeeId, updated_at: new Date().toISOString() })
      .eq("id", leadId);

    if (error) throw error;

    revalidatePath("/crm/leads");
    return null;
  });
}

export async function markLeadAsLost(
  leadId: string,
  reason: string
): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    // Append reason to notes + change status
    const { data: lead } = await supabase
      .from("crm_leads")
      .select("notes")
      .eq("id", leadId)
      .single();

    const updatedNotes = [
      lead?.notes || "",
      `\n[${new Date().toLocaleDateString("vi-VN")}] Huỷ: ${reason}`,
    ].join("").trim();

    const { error } = await supabase
      .from("crm_leads")
      .update({
        status: "huy",
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (error) throw error;

    revalidatePath("/crm/leads");
    return null;
  });
}

// ═══ CONVERT LEAD → CUSTOMER (via RPC) ═══════

export async function convertLeadToCustomer(
  leadId: string
): Promise<ActionResult<{ url: string }>> {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.rpc("convert_lead_to_customer", {
      p_lead_id: leadId,
    });

    if (error) throw error;

    const result = data as { customer_id: string; lead: { phone?: string; contact_name?: string; needs?: string } };
    const params = new URLSearchParams({
      customer_id: result.customer_id,
      ...(result.lead?.phone && { phone: result.lead.phone }),
      ...(result.lead?.contact_name && { contact_name: result.lead.contact_name }),
      ...(result.lead?.needs && { needs: result.lead.needs }),
    });

    revalidatePath("/crm");
    return { url: `/contracts/create?${params.toString()}` };
  });
}

// ═══ CARE LOG (via RPC) ═══════════════════════

export async function addCareLog(
  leadId: string,
  content: string,
  type: string = "Ghi chú"
): Promise<ActionResult<null>> {
  if (!content?.trim()) {
    return { success: false, error: "Nội dung không được trống" };
  }

  return withAuth(async (supabase) => {
    const { error } = await supabase.rpc("append_care_log", {
      p_lead_id: leadId,
      p_content: content.trim(),
      p_type: type,
    });

    if (error) throw error;

    revalidatePath("/crm/leads");
    return null;
  });
}
