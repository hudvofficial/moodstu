"use server";

import { requireContractAccess, withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { isOnSetEvent } from "@/types/contract-constants";
import type { EventType, ServiceType } from "@/types/contract";
import { SupabaseClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════
// contract-event-actions.ts — V2 = V1 logic + tối ưu
// V1 ref: 0Moodstudio/webapp/app/actions/contract-events/crud.ts
// V2: withAuth, proper typing, revalidatePath
// ═══════════════════════════════════════════

// ─── TYPES ───────────────────────────────────────
type EventUpdateFields = Partial<{
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

function addDays(base: Date, offset: number): string {
  const date = new Date(base);
  date.setDate(date.getDate() + offset);
  return date.toISOString().split("T")[0];
}

function fallbackEventTemplates(serviceType: ServiceType): EventTemplateRow[] {
  const serviceLabel: Partial<Record<ServiceType, string>> = {
    studio: "Studio",
    ngay_cuoi: "Ngay cuoi",
    combo: "Combo",
    baby: "Baby",
    gia_dinh: "Gia dinh",
    sinh_nhat: "Sinh nhat",
    bau: "Bau",
    concept: "Concept",
    couple: "Couple",
    ky_yeu: "Ky yeu",
    media: "Media",
    khac: "Du an",
  };

  const label = serviceLabel[serviceType] || "Du an";
  if (serviceType === "ngay_cuoi") {
    return [
      { event_type: "ngay_to_chuc", event_name: label, default_days_offset: 0, sort_order: 1 },
      { event_type: "hau_ky", event_name: `Hau ky ${label}`, default_days_offset: 5, sort_order: 2 },
      { event_type: "giao_san_pham", event_name: "Giao san pham", default_days_offset: 10, sort_order: 3 },
    ];
  }

  return [
    { event_type: "ngay_chup", event_name: `Thuc hien ${label}`, default_days_offset: 0, sort_order: 1 },
    { event_type: "hau_ky", event_name: `Hau ky ${label}`, default_days_offset: 3, sort_order: 2 },
    { event_type: "giao_san_pham", event_name: "Giao san pham", default_days_offset: 7, sort_order: 3 },
  ];
}

function buildContractEvents(
  contractId: string,
  serviceType: ServiceType,
  workDate: string | null | undefined,
  templates: EventTemplateRow[],
) {
  const baseDate = workDate ? new Date(workDate) : null;
  const knownCeremonyDate = serviceType === "ngay_cuoi" && baseDate;
  let lastOnSetType: EventType | null = null;

  return templates.map((template, index) => {
    const eventType = template.event_type;
    const offset = template.default_days_offset ?? 0;
    const isOnSet = isOnSetEvent(eventType);
    let eventDate: string | null = null;
    let deadline: string | null = null;

    if (isOnSet) {
      lastOnSetType = eventType;
      if (baseDate && (eventType !== "ngay_to_chuc" || knownCeremonyDate)) {
        eventDate = addDays(baseDate, offset);
      }
    } else if (baseDate && (lastOnSetType !== "ngay_to_chuc" || knownCeremonyDate)) {
      deadline = addDays(baseDate, offset);
    }

    return {
      contract_id: contractId,
      event_type: eventType,
      title: template.event_name || eventType,
      event_date: eventDate,
      deadline,
      status: "chua_lam",
      sort_order: template.sort_order ?? index + 1,
      is_manual_date: false,
    };
  });
}

export async function generateContractEvents(
  contractId: string,
  serviceType: ServiceType,
  workDate?: string | null,
) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { count, error: countError } = await supabase
      .from("contract_events")
      .select("id", { count: "exact", head: true })
      .eq("contract_id", contractId)
      .is("deleted_at", null);

    if (countError) throw new Error(`Loi kiem tra event: ${countError.message}`);
    if (count && count > 0) {
      return { generated: 0, message: "Contract events already exist" };
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

    revalidatePath(`/contracts/${contractId}`);
    return { generated: data?.length || 0, message: "Contract events generated" };
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
    await requireContractAccess(supabase, userId);

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

    revalidatePath(`/contracts`);
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
    await requireContractAccess(supabase, userId);

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
        event_date: isOnSet ? (input.eventDate || today) : today,
        deadline: !isOnSet ? (input.deadline || today) : null,
        location: input.location || null,
        notes: input.notes || null,
        sort_order: nextOrder,
        status: "chua_lam",
        is_manual_date: true,
      })
      .select("id, event_type, title, sort_order")
      .single();

    if (error) throw new Error(`Lỗi thêm sự kiện: ${error.message}`);

    fireAuditLog({
      action: "CREATE",
      tableName: "contract_events",
      recordId: data?.id,
      description: `Thêm sự kiện: ${input.title} (${input.eventType})`,
    });

    revalidatePath("/contracts");
    return data;
  });
}

// ─── DELETE CONTRACT EVENT (Hybrid Model) ────────
// Chỉ cho xóa event do admin tạo (is_manual_date = true)
// Cascade: xóa work_tasks liên quan
export async function deleteContractEvent(eventId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    if (!eventId) throw new Error("Thiếu event ID");

    // Guard: only delete manual events
    const { data: evt, error: fetchErr } = await supabase
      .from("contract_events")
      .select("id, title, is_manual_date, contract_id")
      .eq("id", eventId)
      .single();

    if (fetchErr || !evt) throw new Error("Không tìm thấy sự kiện");
    if (!evt.is_manual_date) {
      throw new Error("Không thể xóa sự kiện từ template. Chỉ xóa được sự kiện do admin tạo.");
    }

    // Cascade: delete related work_tasks first
    await supabase.from("work_tasks").delete().eq("event_id", eventId);

    // Delete the event
    const { error } = await supabase
      .from("contract_events")
      .delete()
      .eq("id", eventId);

    if (error) throw new Error(`Lỗi xóa sự kiện: ${error.message}`);

    fireAuditLog({
      action: "DELETE",
      tableName: "contract_events",
      recordId: eventId,
      description: `Xóa sự kiện: ${evt.title || eventId.substring(0, 8)}`,
      severity: "WARNING",
    });

    revalidatePath("/contracts");
    return null;
  });
}
