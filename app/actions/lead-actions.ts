"use server";

import { withAuth, requireCrmAccess } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import type { LeadStatus, CrmLead } from "@/types/crm";
import { format } from "date-fns";
import { writeAuditLog } from "@/lib/audit";
import {
  ZodLeadFilter,
  ZodLeadCreate,
  ZodLeadUpdate,
  ZodUuidId,
} from "@/lib/validations/crm.schema";

// ----------------------------------------------------
// Lead Actions (Re-exports & Core CRUD)
// ----------------------------------------------------

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

// ----------------------------------------------------

export async function getLeads(params: {
  search?: string; status?: LeadStatus; source?: string; assigned?: string; page?: number; pageSize?: number;
}): Promise<ActionResult<{ leads: unknown[]; total: number; page: number; pageSize: number }>> {
  return withAuth(async (supabase, userId) => {
    await requireCrmAccess(supabase, userId);
    
    const parsed = ZodLeadFilter.safeParse(params);
    if (!parsed.success) throw new Error("Tham số lọc không hợp lệ");
    
    const page = parsed.data.page || 1;
    const pageSize = parsed.data.limit || params.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from("crm_leads").select("*", { count: "exact" }).is("deleted_at", null).order("created_at", { ascending: false }).range(from, to);
    if (parsed.data.search) query = query.or(`contact_name.ilike.%${parsed.data.search}%,phone.ilike.%${parsed.data.search}%`);
    if (parsed.data.status) query = query.eq("status", parsed.data.status);
    if (parsed.data.source) query = query.eq("source", parsed.data.source);
    if (parsed.data.assigned_to) query = query.eq("assigned_to", parsed.data.assigned_to);

    const { data, count, error } = await query;
    if (error) throw error;
    return { leads: data || [], total: count || 0, page, pageSize };
  });
}

// ----------------------------------------------------

export async function createLead(data: unknown): Promise<ActionResult<{ lead_id: string }>> {
  return withAuth(async (supabase, userId) => {
    await requireCrmAccess(supabase, userId);
    const parsed = ZodLeadCreate.safeParse(data);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    const tData = parsed.data;

    // Check for duplicates
    if (tData.phone?.trim()) {
      const { data: existing } = await supabase.from("crm_leads").select("id, contact_name").eq("phone", tData.phone.trim()).neq("status", "huy").is("deleted_at", null).limit(1);
      if (existing && existing.length > 0) {
        throw new Error(`SĐT này đã tồn tại (${existing[0].contact_name}). Vui lòng kiểm tra lại.`);
      }
    }

    const insertData = {
      contact_name: tData.contact_name.trim(), 
      phone: tData.phone?.trim() || null, 
      email: tData.email?.trim() || null,
      source: tData.source || null, 
      needs: tData.needs?.trim() || null, 
      address: tData.address?.trim() || null,
      potential: tData.potential || null, 
      status: tData.status || "moi", 
      notes: tData.notes?.trim() || null,
      social_link: tData.social_link?.trim() || null, 
      next_contact_date: tData.next_contact_date || null,
      assigned_to: tData.assigned_to || null, 
      contact_date: tData.contact_date || format(new Date(), "yyyy-MM-dd"),
      created_by: userId, 
      deal_value: tData.deal_value || 0, 
      tags: tData.tags || [], 
      score: tData.score || 0,
    };

    const { data: newLead, error } = await supabase.from("crm_leads").insert(insertData).select("id").single();
    if (error) throw error;

    await writeAuditLog({
      action: "CREATE",
      tableName: "crm_leads",
      recordId: newLead.id,
      oldData: undefined,
      newData: insertData,
    });

    revalidatePath("/crm/leads");
    return { lead_id: newLead.id };
  });
}

// ----------------------------------------------------
// ─── UPDATE LEAD ──────────────────────────────

export async function updateLead(id: string, data: unknown): Promise<ActionResult<null>> {
  return withAuth(async (supabase, userId) => {
    await requireCrmAccess(supabase, userId);
    
    // We expect the client to pass the id and data together for Zod parsing
    const parsed = ZodLeadUpdate.safeParse({ id, ...(typeof data === "object" && data !== null ? data : {}) });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    const tData = parsed.data;

    const { data: oldData, error: oldError } = await supabase.from("crm_leads").select("*").eq("id", tData.id).is("deleted_at", null).single();
    if (oldError || !oldData) throw new Error("Không tìm thấy lead hoặc lead đã bị xóa");

    // Optimistic Locking Check
    if (tData.expectedUpdatedAt && oldData.updated_at && new Date(oldData.updated_at).getTime() > new Date(tData.expectedUpdatedAt).getTime()) {
      throw new Error("Dữ liệu đã bị thay đổi bởi người khác, vui lòng tải lại trang");
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (tData.contact_name !== undefined) updateData.contact_name = tData.contact_name.trim();
    if (tData.phone !== undefined) updateData.phone = tData.phone.trim() || null;
    if (tData.email !== undefined) updateData.email = tData.email.trim() || null;
    if (tData.source !== undefined) updateData.source = tData.source || null;
    if (tData.needs !== undefined) updateData.needs = tData.needs?.trim() || null;
    if (tData.address !== undefined) updateData.address = tData.address?.trim() || null;
    if (tData.potential !== undefined) updateData.potential = tData.potential || null;
    if (tData.status !== undefined) updateData.status = tData.status;
    if (tData.notes !== undefined) updateData.notes = tData.notes?.trim() || null;
    if (tData.social_link !== undefined) updateData.social_link = tData.social_link?.trim() || null;
    if (tData.next_contact_date !== undefined) updateData.next_contact_date = tData.next_contact_date || null;
    if (tData.assigned_to !== undefined) updateData.assigned_to = tData.assigned_to || null;
    if (tData.deal_value !== undefined) updateData.deal_value = tData.deal_value || 0;
    if (tData.tags !== undefined) updateData.tags = tData.tags || [];
    if (tData.score !== undefined) updateData.score = tData.score || 0;

    const { error } = await supabase.from("crm_leads").update(updateData).eq("id", tData.id);
    if (error) throw error;

    await writeAuditLog({
      action: "UPDATE",
      tableName: "crm_leads",
      recordId: tData.id,
      
      oldData: oldData,
      newData: updateData,
    });

    revalidatePath("/crm/leads");
    return null;
  });
}

// ----------------------------------------------------

export async function deleteLead(id: string): Promise<ActionResult<null>> {
  return withAuth(async (supabase, userId) => {
    const { role } = await requireCrmAccess(supabase, userId);
    
    if (role !== "admin" && role !== "manager") {
      throw new Error("Chỉ tài khoản Quản lý mới được xóa lead");
    }

    const parsed = ZodUuidId.safeParse({ id });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "ID không hợp lệ");

    const { data: oldData, error: oldError } = await supabase.from("crm_leads").select("*").eq("id", id).is("deleted_at", null).single();
    if (oldError || !oldData) throw new Error("Không tìm thấy lead hoặc lead đã bị xóa");

    const updateData = { 
      deleted_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    };

    const { error } = await supabase.from("crm_leads").update(updateData).eq("id", id);
    if (error) throw error;

    await writeAuditLog({
      action: "DELETE",
      tableName: "crm_leads",
      recordId: id,
      
      oldData: oldData,
      newData: updateData, // Capturing the deletion timestamp
    });

    revalidatePath("/crm/leads");
    return null;
  });
}

// ----------------------------------------------------

export async function getLeadById(id: string): Promise<ActionResult<CrmLead>> {
  return withAuth(async (supabase, userId) => {
    await requireCrmAccess(supabase, userId);
    const parsed = ZodUuidId.safeParse({ id });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "ID không hợp lệ");

    const { data, error } = await supabase.from("crm_leads").select("*").eq("id", id).is("deleted_at", null).single();
    if (error) throw error;
    if (!data) throw new Error("Không tìm thấy lead");
    return data as CrmLead;
  });
}

// ----------------------------------------------------

export async function getLeadStats(): Promise<ActionResult<{ total: number; active: number; closed: number; conversionRate: number; byStatus: Record<string, number> }>> {
  return withAuth(async (supabase, userId) => {
    await requireCrmAccess(supabase, userId);
    const { data: leads, error } = await supabase.from("crm_leads").select("status").is("deleted_at", null);
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




