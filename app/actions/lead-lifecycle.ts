"use server";

import { withAuth, requireCrmAccess } from "@/lib/auth_utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { revalidatePath } from "next/cache";
import type { LeadStatus } from "@/types/crm";
import { VALID_LEAD_TRANSITIONS } from "@/types/crm";
import { writeAuditLog } from "@/lib/audit";
import { format } from "date-fns";
import {
  ZodLeadMoveStage,
  ZodLeadUpdateDealValue,
  ZodLeadUpdateScore,
  ZodLeadUpdateTags,
  ZodLeadAssign,
  ZodLeadMarkLost,
  ZodAddCareLog,
  ZodLeadConvertToCustomer,
} from "@/lib/validations/crm.schema";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

// ----------------------------------------------------

export async function moveLeadToStage(leadId: string, newStatus: LeadStatus): Promise<ActionResult<null>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    await requireCrmAccess(supabase, userId);
    const parsed = ZodLeadMoveStage.safeParse({ id: leadId, newStatus });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    const { data: oldData, error: oldError } = await supabase.from("crm_leads").select("*").eq("id", leadId).is("deleted_at", null).single();
    if (oldError || !oldData) throw new Error("Không tìm thấy lead hoặc lead đã bị xóa");

    const oldStatus = oldData.status || "moi";
    if (parsed.data.newStatus !== oldStatus) {
      const allowedNexts = VALID_LEAD_TRANSITIONS[oldStatus] || [];
      if (!allowedNexts.includes(parsed.data.newStatus)) {
        throw new Error(`Không thể chuyển trạng thái từ '${oldStatus}' sang '${parsed.data.newStatus}'`);
      }
    }

    const updateData = { status: parsed.data.newStatus, status_changed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { error } = await supabase.from("crm_leads").update(updateData).eq("id", leadId);
    if (error) throw error;

    await writeAuditLog({
      action: "UPDATE",
      tableName: "crm_leads",
      recordId: leadId,
      
      oldData: { status: oldData.status, status_changed_at: oldData.status_changed_at, updated_at: oldData.updated_at },
      newData: updateData,
    });

    revalidatePath("/crm/leads");
    return null;
  });
}

export async function updateDealValue(leadId: string, dealValue: number): Promise<ActionResult<null>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    await requireCrmAccess(supabase, userId);
    const parsed = ZodLeadUpdateDealValue.safeParse({ id: leadId, dealValue });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    const { data: oldData, error: oldError } = await supabase.from("crm_leads").select("*").eq("id", leadId).is("deleted_at", null).single();
    if (oldError || !oldData) throw new Error("Không tìm thấy lead hoặc lead đã bị xóa");

    const updateData = { deal_value: parsed.data.dealValue, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("crm_leads").update(updateData).eq("id", leadId);
    if (error) throw error;

    await writeAuditLog({
      action: "UPDATE",
      tableName: "crm_leads",
      recordId: leadId,
      
      oldData: { deal_value: oldData.deal_value, updated_at: oldData.updated_at },
      newData: updateData,
    });

    revalidatePath("/crm/leads");
    return null;
  });
}

export async function updateLeadScore(leadId: string, score: number): Promise<ActionResult<null>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    await requireCrmAccess(supabase, userId);
    const parsed = ZodLeadUpdateScore.safeParse({ id: leadId, score });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    const { data: oldData, error: oldError } = await supabase.from("crm_leads").select("*").eq("id", leadId).is("deleted_at", null).single();
    if (oldError || !oldData) throw new Error("Không tìm thấy lead hoặc lead đã bị xóa");

    const updateData = { score: parsed.data.score, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("crm_leads").update(updateData).eq("id", leadId);
    if (error) throw error;

    await writeAuditLog({
      action: "UPDATE",
      tableName: "crm_leads",
      recordId: leadId,
      
      oldData: { score: oldData.score, updated_at: oldData.updated_at },
      newData: updateData,
    });

    revalidatePath("/crm/leads");
    return null;
  });
}

export async function updateLeadTags(leadId: string, tags: string[]): Promise<ActionResult<null>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    await requireCrmAccess(supabase, userId);
    const parsed = ZodLeadUpdateTags.safeParse({ id: leadId, tags });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    const { data: oldData, error: oldError } = await supabase.from("crm_leads").select("*").eq("id", leadId).is("deleted_at", null).single();
    if (oldError || !oldData) throw new Error("Không tìm thấy lead hoặc lead đã bị xóa");

    const updateData = { tags: parsed.data.tags, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("crm_leads").update(updateData).eq("id", leadId);
    if (error) throw error;

    await writeAuditLog({
      action: "UPDATE",
      tableName: "crm_leads",
      recordId: leadId,
      
      oldData: { tags: oldData.tags, updated_at: oldData.updated_at },
      newData: updateData,
    });

    revalidatePath("/crm/leads");
    return null;
  });
}

export async function assignLead(leadId: string, employeeId: string | null): Promise<ActionResult<null>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const { employee, role } = await requireCrmAccess(supabase, userId);
    const parsed = ZodLeadAssign.safeParse({ id: leadId, employeeId });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    const { data: oldData, error: oldError } = await supabase.from("crm_leads").select("*").eq("id", leadId).is("deleted_at", null).single();
    if (oldError || !oldData) throw new Error("Không tìm thấy lead hoặc lead đã bị xóa");

    // assignLead RBAC: admin/manager assign any. sale can only self-assign if unassigned or self, OR unassign if currently assigned to self.
    if (role === "sale") {
      const isUnassigningSelf = parsed.data.employeeId === null && oldData.assigned_to === employee.id;
      
      if (!isUnassigningSelf) {
        if (parsed.data.employeeId !== employee.id) {
          throw new Error("Tài khoản sale chỉ được quyền tự nhận lead cho mình hoặc nhả lead đang quản lý.");
        }
        if (oldData.assigned_to && oldData.assigned_to !== employee.id) {
          throw new Error("Không thể chiếm lead đã phân công cho người khác.");
        }
      }
    }

    const updateData = { assigned_to: parsed.data.employeeId, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("crm_leads").update(updateData).eq("id", leadId);
    if (error) throw error;

    await writeAuditLog({
      action: "UPDATE",
      tableName: "crm_leads",
      recordId: leadId,
      
      oldData: { assigned_to: oldData.assigned_to, updated_at: oldData.updated_at },
      newData: updateData,
    });

    revalidatePath("/crm/leads");
    return null;
  });
}

export async function markLeadAsLost(leadId: string, reason: string): Promise<ActionResult<null>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    await requireCrmAccess(supabase, userId);
    const parsed = ZodLeadMarkLost.safeParse({ id: leadId, reason });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    const { data: oldData, error: oldError } = await supabase.from("crm_leads").select("*").eq("id", leadId).is("deleted_at", null).single();
    if (oldError || !oldData) throw new Error("Không tìm thấy lead hoặc lead đã bị xóa");

    const updatedNotes = [oldData.notes || "", `\n[${format(new Date(), "yyyy-MM-dd")}] Huỷ: ${parsed.data.reason}`].join("").trim();
    const updateData: Database["public"]["Tables"]["crm_leads"]["Update"] = { 
      status: "huy", 
      lost_reason: parsed.data.reason,
      notes: updatedNotes, 
      updated_at: new Date().toISOString() 
    };

    const { error } = await supabase.from("crm_leads").update(updateData).eq("id", leadId);
    if (error) throw error;

    await writeAuditLog({
      action: "UPDATE",
      tableName: "crm_leads",
      recordId: leadId,
      oldData: { status: oldData.status, lost_reason: oldData.lost_reason, notes: oldData.notes, updated_at: oldData.updated_at },
      newData: updateData,
    });

    revalidatePath("/crm/leads");
    return null;
  });
}

// ----------------------------------------------------

export async function convertLeadToCustomer(leadId: string): Promise<ActionResult<{ url: string }>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    await requireCrmAccess(supabase, userId);
    const parsed = ZodLeadConvertToCustomer.safeParse({ id: leadId });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    const { data: oldData, error: oldError } = await supabase.from("crm_leads").select("*").eq("id", leadId).is("deleted_at", null).single();
    if (oldError || !oldData) throw new Error("Không tìm thấy lead hoặc lead đã bị xóa");

    const { data: existingCustomer, error: existingCustomerError } = oldData.phone
      ? await supabase
          .from("customers")
          .select("id, lead_id, full_name, phone")
          .eq("phone", oldData.phone.trim())
          .is("deleted_at", null)
          .maybeSingle()
      : { data: null, error: null };
    if (existingCustomerError) throw existingCustomerError;

    // The RPC currently does its own insertion. We still log an UPDATE to the lead to track the conversion.
    const { data, error } = await supabase.rpc("convert_lead_to_customer", { p_lead_id: leadId });
    if (error) throw error;

    await writeAuditLog({
      action: "UPDATE",
      tableName: "crm_leads",
      recordId: leadId,
      oldData: { status: oldData.status },
      newData: { status: "da_chot", _converted: true },
    });

    const result = data as { customer_id: string; lead: { phone?: string; contact_name?: string; needs?: string } };
    
    await writeAuditLog({
      action: existingCustomer ? "UPDATE" : "CREATE",
      tableName: "customers",
      recordId: result.customer_id,
      oldData: existingCustomer || undefined,
      newData: { source_lead_id: leadId, linked_existing_customer: !!existingCustomer, ...result.lead },
    });

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

// ----------------------------------------------------

export async function addCareLog(leadId: string, content: string, type: string = "Ghi chú"): Promise<ActionResult<null>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    await requireCrmAccess(supabase, userId);
    const parsed = ZodAddCareLog.safeParse({ id: leadId, content, type });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    // RPC is atomic. Fetching before creates a race condition. Audit log only records newData.
    const { error } = await supabase.rpc("append_care_log", { 
      p_lead_id: leadId, 
      p_content: parsed.data.content, 
      p_type: parsed.data.type 
    });
    if (error) throw error;

    await writeAuditLog({
      action: "UPDATE",
      tableName: "crm_leads",
      recordId: leadId,
      
      oldData: undefined,
      newData: { care_history_appended: { content: parsed.data.content, type: parsed.data.type } },
    });

    revalidatePath("/crm/leads");
    return null;
  });
}



