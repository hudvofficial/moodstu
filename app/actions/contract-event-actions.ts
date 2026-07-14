"use server";

import {
  requireContractDestructiveAccess,
  requireContractWriteAccess,
  withAuth,
} from "@/lib/auth_utils";
import { after } from "next/server";
import { fireAuditLog } from "@/lib/audit";
import {
  deleteContractEventFromGoogle,
  syncContractEventToGoogle,
} from "@/lib/contract-event-google-sync";
import { createAdminClient } from "@/lib/supabase/server";
import { invalidateContractPaths } from "@/lib/server-cache-invalidation";
import { isOnSetEvent } from "@/types/contract-constants";
import {
  planContractScheduleReconciliation,
  summarizeContractSchedules,
} from "@/lib/contracts/contract-schedule";
import type {
  ContractScheduleInput,
  ExistingContractScheduleEvent,
} from "@/types/contract-schedule";
import type { EventType, ServiceType, TaskStatus } from "@/types/contract";
import { SupabaseClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════
// contract-event-actions.ts — V2 = V1 logic + tối ưu
// V1 ref: 0Moodstudio/webapp/app/actions/contract-events/crud.ts
// V2: withAuth, proper typing, revalidatePath
// ═══════════════════════════════════════════

// ─── TYPES ───────────────────────────────────────
type EventUpdateFields = Partial<{
  title: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  deadline: string | null;
  location: string | null;
  status: string;
  notes: string | null;
  is_manual_date: boolean;
}>;

type EventTemplateRow = {
  event_type: EventType;
  event_name: string | null;
  default_days_offset: number | null;
  sort_order: number | null;
};

function scheduleEventGoogleSync(eventId: string) {
  after(async () => {
    try {
      const supabase = await createAdminClient();
      await syncContractEventToGoogle(supabase, eventId);
    } catch (syncError) {
      console.warn("Best effort contract event Google sync failed:", syncError);
    }
  });
}

function scheduleEventGoogleDelete(eventId: string) {
  after(async () => {
    try {
      const supabase = await createAdminClient();
      await deleteContractEventFromGoogle(supabase, eventId);
    } catch (syncError) {
      console.warn("Best effort contract event Google delete failed:", syncError);
    }
  });
}

function addDays(base: Date, offset: number): string {
  const date = new Date(base);
  date.setDate(date.getDate() + offset);
  return date.toISOString().split("T")[0];
}

function fallbackEventTemplates(serviceType: ServiceType): EventTemplateRow[] {
  const serviceLabel: Partial<Record<ServiceType, string>> = {
    studio: "Studio",
    ngay_cuoi: "Ngày cưới",
    combo: "Combo",
    baby: "Baby",
    gia_dinh: "Gia đình",
    sinh_nhat: "Sinh nhật",
    bau: "Bầu",
    concept: "Concept",
    couple: "Couple",
    ky_yeu: "Kỷ yếu",
    media: "Media",
    outsource: "Gia công",
    khac: "Dự án",
  };

  const label = serviceLabel[serviceType] || "Dự án";
  if (serviceType === "studio") {
    return [
      { event_type: "ngay_chup", event_name: "Chụp cổng tại Studio", default_days_offset: 0, sort_order: 1 },
      { event_type: "ngay_to_chuc", event_name: "Ngày cưới", default_days_offset: 0, sort_order: 2 },
      { event_type: "hau_ky", event_name: "Hậu kỳ Studio", default_days_offset: 3, sort_order: 3 },
      { event_type: "giao_san_pham", event_name: "Giao sản phẩm", default_days_offset: 7, sort_order: 4 },
    ];
  }

  if (serviceType === "ngay_cuoi") {
    return [
      { event_type: "ngay_to_chuc", event_name: label, default_days_offset: 0, sort_order: 1 },
      { event_type: "hau_ky", event_name: `Hậu kỳ ${label}`, default_days_offset: 5, sort_order: 2 },
      { event_type: "giao_san_pham", event_name: "Giao sản phẩm", default_days_offset: 10, sort_order: 3 },
    ];
  }

  if (serviceType === "outsource") {
    return [
      { event_type: "hau_ky", event_name: "Hậu kỳ (Gia công)", default_days_offset: 0, sort_order: 1 },
      { event_type: "giao_san_pham", event_name: "Giao sản phẩm", default_days_offset: 3, sort_order: 2 },
    ];
  }

  return [
    { event_type: "ngay_chup", event_name: `Thực hiện ${label}`, default_days_offset: 0, sort_order: 1 },
    { event_type: "hau_ky", event_name: `Hậu kỳ ${label}`, default_days_offset: 3, sort_order: 2 },
    { event_type: "giao_san_pham", event_name: "Giao sản phẩm", default_days_offset: 7, sort_order: 3 },
  ];
}

function buildContractEvents(
  contractId: string,
  serviceType: ServiceType,
  workDate: string | null | undefined,
  weddingDate: string | null | undefined,
  templates: EventTemplateRow[],
) {
  // Parse dates handling comma-separated strings
  const workDates = workDate ? workDate.split(',').map(d => d.trim()).filter(Boolean) : [];
  const weddingDates = weddingDate ? weddingDate.split(',').map(d => d.trim()).filter(Boolean) : [];
  
  const effectiveWeddingDates = serviceType === "ngay_cuoi" ? workDates : weddingDates;
  
  const baseDatesList = workDates.length > 0 ? workDates : [];
  const ceremonyDatesList = effectiveWeddingDates.length > 0 ? effectiveWeddingDates : [];

  // For deadline calculations, use the LAST shooting date
  const lastBaseDateStr = baseDatesList.length > 0 ? baseDatesList[baseDatesList.length - 1] : null;
  const lastCeremonyDateStr = ceremonyDatesList.length > 0 ? ceremonyDatesList[ceremonyDatesList.length - 1] : null;

  const baseDate = lastBaseDateStr ? new Date(lastBaseDateStr) : null;
  const ceremonyDate = lastCeremonyDateStr ? new Date(lastCeremonyDateStr) : null;

  let lastOnSetType: EventType | null = null;
  const events: any[] = [];
  let sortOrderCounter = 1;

  for (const template of templates) {
    const eventType = template.event_type;
    const offset = template.default_days_offset ?? 0;
    const isOnSet = isOnSetEvent(eventType);

    if (isOnSet) {
      lastOnSetType = eventType;
      // Spawn multiple if it's ceremony or shoot
      if (eventType === "ngay_to_chuc" && ceremonyDatesList.length > 0) {
        ceremonyDatesList.forEach((dateStr, idx) => {
          events.push({
            contract_id: contractId,
            event_type: eventType,
            title: `${template.event_name || eventType}${ceremonyDatesList.length > 1 ? ` ${idx + 1}` : ''}`,
            event_date: addDays(new Date(dateStr), offset),
            deadline: null,
            status: "chua_lam",
            sort_order: sortOrderCounter++,
            is_manual_date: false,
          });
        });
      } else if (eventType !== "ngay_to_chuc" && baseDatesList.length > 0) {
        baseDatesList.forEach((dateStr, idx) => {
          events.push({
            contract_id: contractId,
            event_type: eventType,
            title: `${template.event_name || eventType}${baseDatesList.length > 1 ? ` ${idx + 1}` : ''}`,
            event_date: addDays(new Date(dateStr), offset),
            deadline: null,
            status: "chua_lam",
            sort_order: sortOrderCounter++,
            is_manual_date: false,
          });
        });
      } else {
         // Fallback if no dates
         events.push({
            contract_id: contractId,
            event_type: eventType,
            title: template.event_name || eventType,
            event_date: null,
            deadline: null,
            status: "chua_lam",
            sort_order: sortOrderCounter++,
            is_manual_date: false,
          });
      }
    } else {
      // Non-onset (hau_ky, giao_san_pham) - calculate deadline based on the LAST shooting date
      let deadline: string | null = null;
      if (lastOnSetType === "ngay_to_chuc" && ceremonyDate) {
        deadline = addDays(ceremonyDate, offset);
      } else if (lastOnSetType !== "ngay_to_chuc" && baseDate) {
        deadline = addDays(baseDate, offset);
      }

      events.push({
        contract_id: contractId,
        event_type: eventType,
        title: template.event_name || eventType,
        event_date: null,
        deadline,
        status: "chua_lam",
        sort_order: sortOrderCounter++,
        is_manual_date: false,
      });
    }
  }

  return events;
}

export async function _generateContractEventsInternal(
  supabase: SupabaseClient,
  contractId: string,
  serviceType: ServiceType,
  workDate?: string | null,
  weddingDate?: string | null,
) {
  const { count, error: countError } = await supabase
    .from("contract_events")
    .select("id", { count: "exact", head: true })
    .eq("contract_id", contractId)
    .is("deleted_at", null);

  if (countError) throw new Error(`Loi kiem tra event: ${countError.message}`);
  if (count && count > 0) {
    return { generated: 0, eventIds: [], message: "Contract events already exist" };
  }

  const { data: templates, error: templateError } = await supabase
    .from("event_templates")
    .select("event_type, event_name, default_days_offset, sort_order")
    .eq("service_type", serviceType)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (templateError) throw new Error(`Loi doc event templates: ${templateError.message}`);

  const rows = buildContractEvents(
    contractId,
    serviceType,
    workDate,
    weddingDate,
    (templates as EventTemplateRow[] | null)?.length
      ? (templates as EventTemplateRow[])
      : fallbackEventTemplates(serviceType),
  );

  const { data, error } = await supabase
    .from("contract_events")
    .insert(rows)
    .select("id, event_type, title, sort_order");

  if (error) throw new Error(`Loi tao event tu dong: ${error.message}`);

  fireAuditLog({
    action: "CREATE",
    tableName: "contract_events",
    recordId: contractId,
    description: `Auto generated ${data?.length || 0} contract events`,
    source: "server_action",
  });

  return {
    generated: data?.length || 0,
    eventIds: (data || []).map((event) => event.id),
    message: "Contract events generated",
  };
}

type ContractScheduleReconciliationResult = {
  eventIds: string[];
  deletedEventIds: string[];
};

/**
 * Reconcile submitted operational dates with existing contract events.
 * Event IDs are the identity boundary: retaining an ID preserves tasks,
 * notes, status and the linked Google Calendar event.
 */
export async function _reconcileContractScheduleInternal(
  supabase: SupabaseClient,
  contractId: string,
  serviceType: ServiceType,
  scheduleInput: ContractScheduleInput[],
): Promise<ContractScheduleReconciliationResult> {
  const summary = summarizeContractSchedules(serviceType, scheduleInput);
  const now = new Date().toISOString();

  const [eventsResult, tasksResult, templatesResult] = await Promise.all([
    supabase
      .from("contract_events")
      .select("id, event_type, title, event_date, sort_order, status, is_manual_date")
      .eq("contract_id", contractId)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("work_tasks")
      .select("event_id")
      .eq("contract_id", contractId),
    supabase
      .from("event_templates")
      .select("event_type, event_name, default_days_offset, sort_order")
      .eq("service_type", serviceType)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (eventsResult.error) {
    throw new Error(`Lỗi đọc lịch trình hợp đồng: ${eventsResult.error.message}`);
  }
  if (tasksResult.error) {
    throw new Error(`Lỗi kiểm tra công việc sự kiện: ${tasksResult.error.message}`);
  }
  if (templatesResult.error) {
    throw new Error(`Lỗi đọc mẫu lịch trình: ${templatesResult.error.message}`);
  }

  const taskCounts = new Map<string, number>();
  for (const task of tasksResult.data || []) {
    if (!task.event_id) continue;
    taskCounts.set(task.event_id, (taskCounts.get(task.event_id) || 0) + 1);
  }

  const activeEvents = eventsResult.data || [];
  const existingOnSet: ExistingContractScheduleEvent[] = activeEvents
    .filter((event) => isOnSetEvent(event.event_type as EventType))
    .map((event) => ({
      id: event.id,
      eventType: event.event_type as ExistingContractScheduleEvent["eventType"],
      title: event.title || event.event_type,
      date: event.event_date,
      sortOrder: event.sort_order,
      status: event.status as TaskStatus,
      taskCount: taskCounts.get(event.id) || 0,
    }));

  const plan = planContractScheduleReconciliation(existingOnSet, summary.schedules);
  if (plan.conflicts.length > 0) {
    const titles = plan.conflicts.map((event) => event.title).join(", ");
    throw new Error(
      `Không thể xóa sự kiện đã hoàn thành hoặc đã có công việc: ${titles}`,
    );
  }

  const changedIds: string[] = [];
  for (const event of plan.updates) {
    const { error } = await supabase
      .from("contract_events")
      .update({
        event_type: event.eventType,
        title: event.title,
        event_date: event.date,
        sort_order: event.sortOrder,
        updated_at: now,
      })
      .eq("id", event.id)
      .eq("contract_id", contractId)
      .is("deleted_at", null);
    if (error) throw new Error(`Lỗi cập nhật sự kiện: ${error.message}`);
    changedIds.push(event.id);
  }

  if (plan.inserts.length > 0) {
    const { data, error } = await supabase
      .from("contract_events")
      .insert(plan.inserts.map((event) => ({
        contract_id: contractId,
        event_type: event.eventType,
        title: event.title,
        event_date: event.date,
        deadline: null,
        status: "chua_lam",
        sort_order: event.sortOrder,
        is_manual_date: false,
      })))
      .select("id");
    if (error) throw new Error(`Lỗi thêm sự kiện: ${error.message}`);
    changedIds.push(...(data || []).map((event) => event.id));
  }

  const deletedEventIds = plan.deletes.map((event) => event.id);
  if (deletedEventIds.length > 0) {
    const { error } = await supabase
      .from("contract_events")
      .update({ deleted_at: now, updated_at: now, status: "da_huy" })
      .in("id", deletedEventIds)
      .eq("contract_id", contractId)
      .is("deleted_at", null);
    if (error) throw new Error(`Lỗi xóa sự kiện: ${error.message}`);
  }

  const configuredTemplates = (templatesResult.data as EventTemplateRow[] | null)?.length
    ? templatesResult.data as EventTemplateRow[]
    : fallbackEventTemplates(serviceType);
  const downstreamTemplates = configuredTemplates.filter(
    (template) => !isOnSetEvent(template.event_type),
  );
  const existingDownstream = activeEvents.filter(
    (event) => !isOnSetEvent(event.event_type as EventType),
  );
  const deadlineBase = summary.finalCeremonyDate ||
    summary.schedules.filter((item) => item.eventType === "ngay_chup").at(-1)?.date ||
    null;

  for (const [index, template] of downstreamTemplates.entries()) {
    const existing = existingDownstream.find(
      (event) => event.event_type === template.event_type,
    );
    const deadline = deadlineBase
      ? addDays(new Date(deadlineBase), template.default_days_offset ?? 0)
      : null;
    const sortOrder = summary.schedules.length + index + 1;

    if (existing) {
      if (existing.status === "hoan_thanh" || existing.is_manual_date) continue;
      const { error } = await supabase
        .from("contract_events")
        .update({ deadline, sort_order: sortOrder, updated_at: now })
        .eq("id", existing.id)
        .eq("contract_id", contractId);
      if (error) throw new Error(`Lỗi cập nhật hạn công việc: ${error.message}`);
      changedIds.push(existing.id);
      continue;
    }

    const { data, error } = await supabase
      .from("contract_events")
      .insert({
        contract_id: contractId,
        event_type: template.event_type,
        title: template.event_name || template.event_type,
        event_date: null,
        deadline,
        status: "chua_lam",
        sort_order: sortOrder,
        is_manual_date: false,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Lỗi tạo công việc sau sự kiện: ${error.message}`);
    changedIds.push(data.id);
  }

  return {
    eventIds: [...new Set(changedIds)],
    deletedEventIds,
  };
}

export async function generateContractEvents(
  contractId: string,
  serviceType: ServiceType,
  workDate?: string | null,
  weddingDate?: string | null,
) {
  return withAuth(async (supabase, userId) => {
    await requireContractWriteAccess(supabase, userId);
    const result = await _generateContractEventsInternal(supabase, contractId, serviceType, workDate, weddingDate);
    for (const eventId of result.eventIds) scheduleEventGoogleSync(eventId);
    invalidateContractPaths(contractId, { detail: true, calendar: true, dashboard: true });
    return result;
  });
}

// ─── UPDATE CONTRACT EVENT ───────────────────────
// V1 ref: crud.ts L238-285
// Logic: Update event metadata + auto recalc downstream dates
export async function updateContractEvent(
  eventId: string,
  updates: EventUpdateFields,
) {
  return withAuth(async (supabase, userId) => {
    await requireContractWriteAccess(supabase, userId);

    const { data, error } = await supabase
      .from("contract_events")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", eventId)
      .select("id, contract_id, event_type, sort_order, event_date, deadline")
      .single();

    if (error) throw new Error(`Lỗi cập nhật event: ${error.message}`);

    // V1 logic: auto recalculate downstream dates when ceremony date is set
    // event_type "ngay_to_chuc" = V2 equivalent of V1 "NGÀY TỔ CHỨC"
    if (
      updates.event_date &&
      data.event_type === "ngay_to_chuc"
    ) {
      await recalculateDownstreamDates(
        supabase,
        data.contract_id,
        data.sort_order,
        updates.event_date,
      );
    }

    scheduleEventGoogleSync(data.id);

    invalidateContractPaths(data.contract_id, { detail: true, calendar: true, dashboard: true });
    return data;
  });
}

// ─── RECALCULATE DOWNSTREAM DATES ────────────────
// V1 ref: crud.ts L287-392
// Logic: When ceremony date is set → cascade deadlines to hậu kỳ events after it
// Skips is_manual_date events (admin already set date by hand)
// Stops at next on-set event (different shooting group)
async function recalculateDownstreamDates(
  supabase: SupabaseClient,
  contractId: string,
  ceremonyOrder: number,
  newDate: string,
) {
  // Get all events for this contract sorted by sort_order
  const { data: allEvents } = await supabase
    .from("contract_events")
    .select("id, event_type, sort_order, status, is_manual_date")
    .eq("contract_id", contractId)
    .order("sort_order");

  if (!allEvents) return;

  // Get contract's service_type for template lookup
  const { data: contract } = await supabase
    .from("contracts")
    .select("service_type")
    .eq("id", contractId)
    .single();

  if (!contract) return;

  // Get event templates for offset reference
  const { data: templates } = await supabase
    .from("event_templates")
    .select("event_type, event_name, default_days_offset, sort_order")
    .eq("service_type", contract.service_type)
    .eq("is_active", true)
    .order("sort_order");

  if (!templates || templates.length === 0) return;

  // Find the ceremony template to get its offset as reference point
  const ceremonyTpl = templates.find(
    (t: { sort_order: number }) => t.sort_order === ceremonyOrder,
  );
  if (!ceremonyTpl) return;
  const ceremonyOffset = ceremonyTpl.default_days_offset;

  const baseDate = new Date(newDate);

  // Update downstream events (sort_order > ceremony, until next on-set event)
  for (const evt of allEvents) {
    if (evt.sort_order <= ceremonyOrder) continue;
    if (evt.status === "hoan_thanh") continue;

    // Skip events where admin manually picked the date
    if (evt.is_manual_date) continue;

    // Stop at next on-set event (different ceremony/shooting group)
    if (isOnSetEvent(evt.event_type as EventType)) break;

    // Find matching template
    const tpl = templates.find(
      (t: { sort_order: number }) => t.sort_order === evt.sort_order,
    );
    if (!tpl) continue;

    // Calculate: newDate + (template_offset - ceremony_offset)
    const relativeDays = tpl.default_days_offset - ceremonyOffset;
    const d = new Date(baseDate);
    d.setDate(d.getDate() + relativeDays);
    const newDeadline = d.toISOString().split("T")[0];

    await supabase
      .from("contract_events")
      .update({ deadline: newDeadline, updated_at: new Date().toISOString() })
      .eq("id", evt.id);
  }

  // Also recalculate GIAO SẢN PHẨM if it's the last event
  // V1 ref: crud.ts L362-391
  const lastEvent = allEvents[allEvents.length - 1];
  if (
    lastEvent.event_type === "giao_san_pham" &&
    lastEvent.status !== "hoan_thanh" &&
    !lastEvent.is_manual_date
  ) {
    const lastCeremony = [...allEvents]
      .reverse()
      .find((e: { event_type: string }) => e.event_type === "ngay_to_chuc");
    if (lastCeremony && lastCeremony.sort_order <= ceremonyOrder) {
      const gspTpl = templates.find(
        (t: { sort_order: number }) => t.sort_order === lastEvent.sort_order,
      );
      if (gspTpl) {
        const relativeDays = gspTpl.default_days_offset - ceremonyOffset;
        const d = new Date(baseDate);
        d.setDate(d.getDate() + relativeDays);
        await supabase
          .from("contract_events")
          .update({
            deadline: d.toISOString().split("T")[0],
            updated_at: new Date().toISOString(),
          })
          .eq("id", lastEvent.id);
      }
    }
  }
}

// ─── ADD CONTRACT EVENT (Hybrid Model) ───────────
// Admin tạo event tùy chỉnh — is_manual_date = true
// sort_order = MAX(existing) + 1
export async function addContractEvent(input: {
  contractId: string;
  eventType: EventType;
  title: string;
  eventDate?: string;
  deadline?: string;
  location?: string;
  notes?: string;
}) {
  return withAuth(async (supabase, userId) => {
    await requireContractWriteAccess(supabase, userId);

    if (!input.contractId) throw new Error("Thiếu contract ID");
    if (!input.title?.trim()) throw new Error("Tên sự kiện không được để trống");

    // Auto sort_order: max + 1
    const { data: maxRow } = await supabase
      .from("contract_events")
      .select("sort_order")
      .eq("contract_id", input.contractId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxRow?.sort_order ?? 0) + 1;
    const isOnSet = isOnSetEvent(input.eventType);

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("contract_events")
      .insert({
        contract_id: input.contractId,
        event_type: input.eventType,
        title: input.title.trim(),
        event_date: isOnSet ? (input.eventDate || today) : null,
        deadline: !isOnSet ? (input.deadline || today) : null,
        location: input.location || null,
        notes: input.notes || null,
        sort_order: nextOrder,
        status: "chua_lam",
        is_manual_date: true,
      })
      .select("id, contract_id, event_type, title, event_date, end_date, location, status, notes, sort_order, deadline, start_time, end_time, is_manual_date, phase, sync_to_google, google_event_id, google_sync_status, google_sync_error, google_synced_at, deleted_at, created_at, updated_at")
      .single();

    if (error) throw new Error(`Lỗi thêm sự kiện: ${error.message}`);

    fireAuditLog({
      action: "CREATE",
      tableName: "contract_events",
      recordId: data?.id,
      description: `Thêm sự kiện: ${input.title} (${input.eventType})`,
    });

    scheduleEventGoogleSync(data.id);

    invalidateContractPaths(input.contractId, { detail: true, calendar: true, dashboard: true });
    return data;
  });
}

// ─── DELETE CONTRACT EVENT (Hybrid Model) ────────
// Admin/manager can remove a contract timeline milestone.
// Protect completed/task-linked milestones so deleting a date never destroys work history.
export async function deleteContractEvent(eventId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractDestructiveAccess(supabase, userId);

    if (!eventId) throw new Error("Thiếu event ID");

    const { data: evt, error: fetchErr } = await supabase
      .from("contract_events")
      .select("id, title, contract_id, status")
      .eq("id", eventId)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !evt) throw new Error("Không tìm thấy sự kiện");
    const now = new Date().toISOString();

    const { count: taskCount, error: taskError } = await supabase
      .from("work_tasks")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("contract_id", evt.contract_id);

    if (taskError) throw new Error(`Lỗi kiểm tra phân công liên quan: ${taskError.message}`);
    if (evt.status === "hoan_thanh" || (taskCount || 0) > 0) {
      throw new Error("Không thể xóa sự kiện đã hoàn thành hoặc đã có công việc");
    }

    const { error } = await supabase
      .from("contract_events")
      .update({
        deleted_at: now,
        updated_at: now,
        status: "da_huy",
      })
      .eq("id", eventId)
      .is("deleted_at", null);

    if (error) throw new Error(`Lỗi xóa sự kiện: ${error.message}`);

    fireAuditLog({
      action: "DELETE",
      tableName: "contract_events",
      recordId: eventId,
      description: `Xóa sự kiện: ${evt.title || eventId.substring(0, 8)}`,
      severity: "WARNING",
    });

    scheduleEventGoogleDelete(eventId);
    invalidateContractPaths(evt.contract_id, { detail: true, calendar: true, dashboard: true });
    return null;
  });
}
