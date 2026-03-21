"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import type { LeadFormData, LeadStatus, CrmLead } from "@/types/crm";

// ═══════════════════════════════════════════
// Lead Actions — CRUD + Pipeline + Care Log
// Split from crm.ts (640 lines) → customer-actions.ts + lead-actions.ts
// ═══════════════════════════════════════════

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── GET LEADS (Paginated + Filters) ──────────

export async function getLeads(params: {
  search?: string; status?: LeadStatus; source?: string; assigned?: string; page?: number; pageSize?: number;
}): Promise<ActionResult<{ leads: unknown[]; total: number; page: number; pageSize: number }>> {
  return withAuth(async (supabase) => {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from("crm_leads").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
    if (params.search) query = query.or(`contact_name.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
    if (params.status) query = query.eq("status", params.status);
    if (params.source) query = query.eq("source", params.source);
    if (params.assigned) query = query.eq("assigned_to", params.assigned);

    const { data, count, error } = await query;
    if (error) throw error;
    return { leads: data || [], total: count || 0, page, pageSize };
  });
}

// ─── CREATE LEAD ──────────────────────────────

export async function createLead(data: LeadFormData): Promise<ActionResult<{ lead_id: string }>> {
  if (!data.contact_name?.trim()) return { success: false, error: "Tên liên hệ là bắt buộc" };

  return withAuth(async (supabase, userId) => {
    if (data.phone?.trim()) {
      const { data: existing } = await supabase.from("crm_leads").select("id, contact_name").eq("phone", data.phone!.trim()).neq("status", "huy").limit(1);
      if (existing && existing.length > 0) throw new Error(`SĐT này đã tồn tại (${existing[0].contact_name}). Vui lòng kiểm tra lại.`);
    }

    const { data: lead, error } = await supabase.from("crm_leads").insert({
      contact_name: data.contact_name.trim(), phone: data.phone?.trim() || null, email: data.email?.trim() || null,
      source: data.source || null, needs: data.needs?.trim() || null, address: data.address?.trim() || null,
      potential: data.potential || null, status: data.status || "moi", notes: data.notes?.trim() || null,
      social_link: data.social_link?.trim() || null, next_contact_date: data.next_contact_date || null,
      assigned_to: data.assigned_to || null, contact_date: data.contact_date || new Date().toISOString().split("T")[0],
      created_by: userId, deal_value: data.deal_value || 0, tags: data.tags || [], score: data.score || 0,
    }).select("id").single();
    if (error) throw error;

    revalidatePath("/crm/leads");
    return { lead_id: lead.id };
  });
}

// ─── UPDATE LEAD ──────────────────────────────

export async function updateLead(id: string, data: Partial<LeadFormData>): Promise<ActionResult<null>> {
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

    const { error } = await supabase.from("crm_leads").update(updateData).eq("id", id);
    if (error) throw error;
    revalidatePath("/crm/leads");
    return null;
  });
}

// ─── DELETE LEAD ──────────────────────────────

export async function deleteLead(id: string): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("crm_leads").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/crm/leads");
    return null;
  });
}

// ─── GET LEAD BY ID ───────────────────────────

export async function getLeadById(id: string): Promise<ActionResult<CrmLead>> {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.from("crm_leads").select("*").eq("id", id).is("deleted_at", null).single();
    if (error) throw error;
    if (!data) throw new Error("Không tìm thấy lead");
    return data as CrmLead;
  });
}

// ─── LEAD STATS ───────────────────────────────

export async function getLeadStats(): Promise<ActionResult<{ total: number; active: number; closed: number; conversionRate: number; byStatus: Record<string, number> }>> {
  return withAuth(async (supabase) => {
    const { data: leads, error } = await supabase.from("crm_leads").select("status");
    if (error) throw error;

    const all = leads || [];
    const total = all.length;
    const closed = all.filter((l: { status: string }) => l.status === "da_chot").length;
    const cancelled = all.filter((l: { status: string }) => l.status === "huy").length;
    const active = total - closed - cancelled;
    const conversionRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    const byStatus: Record<string, number> = {};
    all.forEach((l: { status: string }) => { byStatus[l.status] = (byStatus[l.status] || 0) + 1; });

    return { total, active, closed, conversionRate, byStatus };
  });
}

// ─── PIPELINE ACTIONS ─────────────────────────

export async function moveLeadToStage(leadId: string, newStatus: LeadStatus): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("crm_leads").update({ status: newStatus, status_changed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", leadId);
    if (error) throw error;
    revalidatePath("/crm/leads");
    return null;
  });
}

export async function updateDealValue(leadId: string, dealValue: number): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("crm_leads").update({ deal_value: dealValue, updated_at: new Date().toISOString() }).eq("id", leadId);
    if (error) throw error;
    revalidatePath("/crm/leads");
    return null;
  });
}

export async function updateLeadScore(leadId: string, score: number): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const clampedScore = Math.max(0, Math.min(100, score));
    const { error } = await supabase.from("crm_leads").update({ score: clampedScore, updated_at: new Date().toISOString() }).eq("id", leadId);
    if (error) throw error;
    revalidatePath("/crm/leads");
    return null;
  });
}

export async function updateLeadTags(leadId: string, tags: string[]): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("crm_leads").update({ tags, updated_at: new Date().toISOString() }).eq("id", leadId);
    if (error) throw error;
    revalidatePath("/crm/leads");
    return null;
  });
}

export async function assignLead(leadId: string, employeeId: string | null): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("crm_leads").update({ assigned_to: employeeId, updated_at: new Date().toISOString() }).eq("id", leadId);
    if (error) throw error;
    revalidatePath("/crm/leads");
    return null;
  });
}

export async function markLeadAsLost(leadId: string, reason: string): Promise<ActionResult<null>> {
  return withAuth(async (supabase) => {
    const { data: lead } = await supabase.from("crm_leads").select("notes").eq("id", leadId).single();
    const updatedNotes = [lead?.notes || "", `\n[${new Date().toLocaleDateString("vi-VN")}] Huỷ: ${reason}`].join("").trim();
    const { error } = await supabase.from("crm_leads").update({ status: "huy", notes: updatedNotes, updated_at: new Date().toISOString() }).eq("id", leadId);
    if (error) throw error;
    revalidatePath("/crm/leads");
    return null;
  });
}

// ─── CONVERT LEAD → CUSTOMER (RPC) ───────────

export async function convertLeadToCustomer(leadId: string): Promise<ActionResult<{ url: string }>> {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.rpc("convert_lead_to_customer", { p_lead_id: leadId });
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

// ─── CARE LOG (RPC) ───────────────────────────

export async function addCareLog(leadId: string, content: string, type: string = "Ghi chú"): Promise<ActionResult<null>> {
  if (!content?.trim()) return { success: false, error: "Nội dung không được trống" };

  return withAuth(async (supabase) => {
    const { error } = await supabase.rpc("append_care_log", { p_lead_id: leadId, p_content: content.trim(), p_type: type });
    if (error) throw error;
    revalidatePath("/crm/leads");
    return null;
  });
}
