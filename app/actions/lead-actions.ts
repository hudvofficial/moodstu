"use server";

import { withAuth, requireCrmAccess } from "@/lib/auth_utils";
import type { Database } from "@/types/database.types";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadStatus, CrmLead } from "@/types/crm";
import { VALID_LEAD_TRANSITIONS } from "@/types/crm";
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

const LEAD_LIST_FIELDS = [
  "id",
  "contact_date",
  "contact_name",
  "phone",
  "email",
  "source",
  "needs",
  "potential",
  "status",
  "next_contact_date",
  "assigned_to",
  "created_at",
  "updated_at",
  "deal_value",
  "tags",
  "score",
  "pipeline_order",
  "status_changed_at",
  "lost_reason",
].join(", ");

/** Escape PostgREST ilike wildcards to prevent pattern injection */
function escapeSearch(s: string): string {
  return s.replace(/[%_\\]/g, (c) => `\\${c}`);
}

/**
 * 🔒 Lead visibility scope. A `sale` only sees their own leads plus unassigned
 * (claimable) ones; admin/manager see everything. Applied to list queries so the
 * count/list match what the user is allowed to see.
 */
function applyLeadVisibilityScope<Q extends { or(filter: string): Q }>(
  query: Q,
  role: string,
  employeeId: string,
): Q {
  if (role === "sale") {
    return query.or(`assigned_to.eq.${employeeId},assigned_to.is.null`);
  }
  return query;
}

/** A `sale` may only read/mutate a lead assigned to them or still unassigned. */
function assertLeadVisibleToRole(
  role: string,
  employeeId: string,
  currentAssignedTo: string | null | undefined,
) {
  if (role !== "sale") return;
  if (currentAssignedTo && currentAssignedTo !== employeeId) {
    throw new Error("Bạn không có quyền truy cập lead đã giao cho nhân viên khác.");
  }
}

function assertLeadAssignmentAllowed(params: {
  role: string;
  currentEmployeeId: string;
  currentAssignedTo: string | null | undefined;
  nextAssignedTo: string | null;
}) {
  const { role, currentEmployeeId, currentAssignedTo, nextAssignedTo } = params;

  if ((currentAssignedTo || null) === nextAssignedTo) return;

  if (role !== "sale") return;

  const isUnassigningSelf =
    nextAssignedTo === null && currentAssignedTo === currentEmployeeId;
  if (isUnassigningSelf) return;

  if (nextAssignedTo !== currentEmployeeId) {
    throw new Error("Tai khoan sale chi duoc tu nhan lead cho minh hoac nha lead dang quan ly.");
  }

  if (currentAssignedTo && currentAssignedTo !== currentEmployeeId) {
    throw new Error("Khong the chiem lead da phan cong cho nguoi khac.");
  }
}

function assertLeadStatusTransitionAllowed(
  currentStatus: LeadStatus,
  nextStatus: LeadStatus,
) {
  if (nextStatus === currentStatus) return;

  const allowedNexts = VALID_LEAD_TRANSITIONS[currentStatus] || [];
  if (!allowedNexts.includes(nextStatus)) {
    throw new Error(`Khong the chuyen trang thai tu '${currentStatus}' sang '${nextStatus}'`);
  }
}

// ----------------------------------------------------

type LeadFilterParams = {
  search?: string; status?: LeadStatus; source?: string; assigned_to?: string; page?: number; pageSize?: number;
};
type LeadListResult = { leads: unknown[]; total: number; page: number; pageSize: number };

/** Core list query (no auth wrapper) — shared by getLeads and getLeadsBootstrap. */
async function queryLeads(
  supabase: SupabaseClient,
  role: string,
  employeeId: string,
  params: LeadFilterParams,
): Promise<LeadListResult> {
  const parsed = ZodLeadFilter.safeParse(params);
  if (!parsed.success) throw new Error("Tham số lọc không hợp lệ");

  const page = parsed.data.page || 1;
  const pageSize = parsed.data.limit || parsed.data.pageSize || 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("crm_leads").select(LEAD_LIST_FIELDS, { count: "exact" }).is("deleted_at", null).order("created_at", { ascending: false }).range(from, to);
  if (parsed.data.search) {
    const s = escapeSearch(parsed.data.search);
    query = query.or(`contact_name.ilike.%${s}%,phone.ilike.%${s}%`);
  }
  if (parsed.data.status) query = query.eq("status", parsed.data.status);
  if (parsed.data.source) query = query.eq("source", parsed.data.source);
  if (parsed.data.assigned_to) {
    if (parsed.data.assigned_to === "unassigned") query = query.is("assigned_to", null);
    else if (parsed.data.assigned_to === "me") query = query.eq("assigned_to", employeeId);
    else query = query.eq("assigned_to", parsed.data.assigned_to);
  }
  // 🔒 Sale chỉ thấy lead của mình + lead chưa giao. Admin/manager thấy tất cả.
  query = applyLeadVisibilityScope(query, role, employeeId);

  const { data, count, error } = await query;
  if (error) throw error;
  return { leads: data || [], total: count || 0, page, pageSize };
}

export async function getLeads(params: LeadFilterParams): Promise<ActionResult<LeadListResult>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const { employee, role } = await requireCrmAccess(supabase, userId);
    return queryLeads(supabase, role, employee.id, params);
  });
}

// ----------------------------------------------------

export async function createLead(data: unknown): Promise<ActionResult<{ lead_id: string }>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const { employee, role } = await requireCrmAccess(supabase, userId);
    const parsed = ZodLeadCreate.safeParse(data);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    const tData = parsed.data;

    if (tData.status && tData.status !== "moi") {
      throw new Error("Lead moi chi duoc tao o trang thai 'moi'. Hay dung thao tac pipeline de doi trang thai.");
    }

    if (tData.assigned_to) {
      assertLeadAssignmentAllowed({
        role,
        currentEmployeeId: employee.id,
        currentAssignedTo: null,
        nextAssignedTo: tData.assigned_to,
      });
    }

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
      potential: (tData.potential || null) as Database["public"]["Enums"]["lead_potential_enum"] | null, 
      status: "moi" as LeadStatus, 
      notes: tData.notes?.trim() || null,
      social_link: tData.social_link?.trim() || null, 
      next_contact_date: tData.next_contact_date || null,
      assigned_to: tData.assigned_to || null, 
      contact_date: tData.contact_date || format(new Date(), "yyyy-MM-dd"),
      created_by: employee.id,
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
      performedBy: userId,
      employeeId: employee.id,
    });

    revalidatePath("/crm/leads");
    return { lead_id: newLead.id };
  });
}

// ----------------------------------------------------
// ─── UPDATE LEAD ──────────────────────────────

export async function updateLead(id: string, data: unknown): Promise<ActionResult<null>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const { employee, role } = await requireCrmAccess(supabase, userId);
    
    // We expect the client to pass the id and data together for Zod parsing
    const parsed = ZodLeadUpdate.safeParse({ id, ...(typeof data === "object" && data !== null ? data : {}) });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    const tData = parsed.data;

    const { data: oldData, error: oldError } = await supabase.from("crm_leads").select("*").eq("id", tData.id).is("deleted_at", null).single();
    if (oldError || !oldData) throw new Error("Không tìm thấy lead hoặc lead đã bị xóa");

    // 🔒 Sale không được sửa lead đã giao cho người khác.
    assertLeadVisibleToRole(role, employee.id, oldData.assigned_to);

    // Optimistic Locking Check (early, friendly message for stale client)
    if (tData.expectedUpdatedAt && oldData.updated_at && new Date(oldData.updated_at).getTime() > new Date(tData.expectedUpdatedAt).getTime()) {
      throw new Error("Dữ liệu đã bị thay đổi bởi người khác, vui lòng tải lại trang");
    }

    // Duplicate-phone guard on change (parity with createLead; closes the create→edit bypass).
    const nextPhone = tData.phone?.trim();
    if (nextPhone && nextPhone !== (oldData.phone || "")) {
      const { data: dup } = await supabase.from("crm_leads").select("id, contact_name").eq("phone", nextPhone).neq("status", "huy").is("deleted_at", null).neq("id", tData.id).limit(1);
      if (dup && dup.length > 0) {
        throw new Error(`SĐT này đã tồn tại (${dup[0].contact_name}). Vui lòng kiểm tra lại.`);
      }
    }

    const now = new Date().toISOString();
    const updateData: Database["public"]["Tables"]["crm_leads"]["Update"] = { updated_at: now };
    if (tData.contact_name !== undefined) updateData.contact_name = tData.contact_name.trim();
    if (tData.phone !== undefined) updateData.phone = tData.phone.trim() || null;
    if (tData.email !== undefined) updateData.email = tData.email.trim() || null;
    if (tData.source !== undefined) updateData.source = tData.source || null;
    if (tData.needs !== undefined) updateData.needs = tData.needs?.trim() || null;
    if (tData.address !== undefined) updateData.address = tData.address?.trim() || null;
    if (tData.potential !== undefined) updateData.potential = (tData.potential || null) as Database["public"]["Enums"]["lead_potential_enum"] | null;
    if (tData.status !== undefined) {
      const oldStatus = (oldData.status || "moi") as LeadStatus;
      assertLeadStatusTransitionAllowed(oldStatus, tData.status);
      updateData.status = tData.status;
      if (tData.status !== oldStatus) updateData.status_changed_at = now;
    }
    if (tData.notes !== undefined) updateData.notes = tData.notes?.trim() || null;
    if (tData.social_link !== undefined) updateData.social_link = tData.social_link?.trim() || null;
    if (tData.next_contact_date !== undefined) updateData.next_contact_date = tData.next_contact_date || null;
    if (tData.assigned_to !== undefined) {
      const nextAssignedTo = tData.assigned_to || null;
      assertLeadAssignmentAllowed({
        role,
        currentEmployeeId: employee.id,
        currentAssignedTo: oldData.assigned_to,
        nextAssignedTo,
      });
      updateData.assigned_to = nextAssignedTo;
    }
    if (tData.deal_value !== undefined) updateData.deal_value = tData.deal_value || 0;
    if (tData.tags !== undefined) updateData.tags = tData.tags || [];
    if (tData.score !== undefined) updateData.score = tData.score || 0;

    // ⚙️ Atomic optimistic lock: only write if the row hasn't changed since we read it.
    // Closes the TOCTOU lost-update window (read → compare → write was non-atomic).
    const { data: updatedRows, error } = await supabase
      .from("crm_leads")
      .update(updateData)
      .eq("id", tData.id)
      .eq("updated_at", oldData.updated_at as string)
      .select("id");
    if (error) throw error;
    if (!updatedRows || updatedRows.length === 0) {
      throw new Error("Dữ liệu đã bị thay đổi bởi người khác, vui lòng tải lại trang");
    }

    await writeAuditLog({
      action: "UPDATE",
      tableName: "crm_leads",
      recordId: tData.id,
      oldData: oldData,
      newData: updateData,
      performedBy: userId,
      employeeId: employee.id,
    });

    revalidatePath("/crm/leads");
    return null;
  });
}

// ----------------------------------------------------

export async function deleteLead(id: string): Promise<ActionResult<null>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const { employee, role } = await requireCrmAccess(supabase, userId);

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
      performedBy: userId,
      employeeId: employee.id,
    });

    revalidatePath("/crm/leads");
    return null;
  });
}

// ----------------------------------------------------

export async function getLeadById(id: string): Promise<ActionResult<CrmLead>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const { employee: actor, role } = await requireCrmAccess(supabase, userId);
    const parsed = ZodUuidId.safeParse({ id });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "ID không hợp lệ");

    // Single round-trip: embed the assigned employee (FK crm_leads.assigned_to → employees.id).
    const { data, error } = await supabase
      .from("crm_leads")
      .select("*, employees:assigned_to ( id, full_name )")
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (error) throw error;
    if (!data) throw new Error("Không tìm thấy lead");

    // 🔒 Sale may only open their own / unassigned leads.
    assertLeadVisibleToRole(role, actor.id, (data as { assigned_to?: string | null }).assigned_to);

    return data as unknown as CrmLead;
  });
}

// ----------------------------------------------------

type LeadStatsResult = { total: number; active: number; closed: number; conversionRate: number; byStatus: Record<string, number>; bySource: Record<string, number> };

/** Core stats (no auth wrapper). Admin/manager use the fast RPC; sale aggregates the
 *  scoped (own + unassigned) set in TS so stats match the visible list. */
async function getLeadStatsScoped(
  supabase: SupabaseClient,
  role: string,
  employeeId: string,
): Promise<LeadStatsResult> {
  if (role !== "sale") {
    const { data, error } = await supabase.rpc("get_crm_lead_stats");
    if (error) throw error;
    const stats = (data || {}) as Partial<LeadStatsResult>;
    return {
      total: stats.total || 0,
      active: stats.active || 0,
      closed: stats.closed || 0,
      conversionRate: stats.conversionRate || 0,
      byStatus: stats.byStatus || {},
      bySource: stats.bySource || {},
    };
  }

  const { data, error } = await supabase
    .from("crm_leads")
    .select("status, source")
    .is("deleted_at", null)
    .or(`assigned_to.eq.${employeeId},assigned_to.is.null`);
  if (error) throw error;

  const rows = (data || []) as { status: string | null; source: string | null }[];
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const r of rows) {
    const st = r.status || "unknown";
    byStatus[st] = (byStatus[st] || 0) + 1;
    const src = r.source && r.source.trim() ? r.source : "Khac";
    bySource[src] = (bySource[src] || 0) + 1;
  }
  const total = rows.length;
  const closed = byStatus["da_chot"] || 0;
  const cancelled = byStatus["huy"] || 0;
  return {
    total,
    active: total - closed - cancelled,
    closed,
    conversionRate: total > 0 ? Math.round((closed / total) * 100) : 0,
    byStatus,
    bySource,
  };
}

export async function getLeadStats(): Promise<ActionResult<LeadStatsResult>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const { employee, role } = await requireCrmAccess(supabase, userId);
    return getLeadStatsScoped(supabase, role, employee.id);
  });
}

/**
 * ⚡ Combined bootstrap for the leads page: one auth + parallel list/stats in a single
 * server action, replacing two separate POSTs that each re-ran auth + the employee lookup.
 */
export async function getLeadsBootstrap(
  params: LeadFilterParams,
): Promise<ActionResult<LeadListResult & { stats: LeadStatsResult }>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const { employee, role } = await requireCrmAccess(supabase, userId);
    const [list, stats] = await Promise.all([
      queryLeads(supabase, role, employee.id, params),
      getLeadStatsScoped(supabase, role, employee.id),
    ]);
    return { ...list, stats };
  });
}




