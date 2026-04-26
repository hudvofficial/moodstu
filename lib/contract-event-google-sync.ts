import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  type GoogleCalendarEventPayload,
} from "@/lib/googleCalendarService";
import { getEventTypeLabel, getServiceLabel, isOnSetEvent } from "@/types/contract-constants";
import type { EventType, GoogleSyncStatus, ServiceType } from "@/types/contract";

const GOOGLE_SYNC_TIME_ZONE = "Asia/Ho_Chi_Minh";
const GOOGLE_COLOR_BY_EVENT_TYPE: Partial<Record<EventType, string>> = {
  ngay_chup: "7",
  ngay_to_chuc: "3",
};

type ContractEventGoogleRow = {
  id: string;
  contract_id: string;
  event_type: EventType;
  title: string | null;
  event_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  sync_to_google: boolean | null;
  google_event_id: string | null;
  deleted_at: string | null;
  contracts:
    | {
        id: string;
        contract_code: string | null;
        service_type: ServiceType;
        status: string | null;
        deleted_at: string | null;
        customers:
          | { full_name: string | null; phone: string | null }
          | { full_name: string | null; phone: string | null }[]
          | null;
      }
    | Array<{
        id: string;
        contract_code: string | null;
        service_type: ServiceType;
        status: string | null;
        deleted_at: string | null;
        customers:
          | { full_name: string | null; phone: string | null }
          | { full_name: string | null; phone: string | null }[]
          | null;
      }>
    | null;
};

export type ContractGoogleSyncTarget = {
  id: string;
  googleEventId: string;
};

function firstNode<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeBaseUrl(value?: string | null) {
  if (!value) return "http://localhost:3000";
  try {
    return new URL(value).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function getAppBaseUrl() {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL,
  );
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeTime(time: string) {
  const trimmed = time.trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  return "09:00:00";
}

function isConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Google Calendar chưa được kết nối") ||
    message.includes("Missing Google Credentials") ||
    message.includes("Missing Refresh Token")
  );
}

async function updateSyncState(
  supabase: SupabaseClient,
  eventId: string,
  values: {
    google_event_id?: string | null;
    google_sync_status: GoogleSyncStatus;
    google_sync_error?: string | null;
    google_synced_at?: string | null;
  },
) {
  await supabase
    .from("contract_events")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);
}

async function getContractEventForGoogle(
  supabase: SupabaseClient,
  eventId: string,
) {
  const { data, error } = await supabase
    .from("contract_events")
    .select(
      `id, contract_id, event_type, title, event_date, end_date,
       start_time, end_time, location, sync_to_google, google_event_id,
       deleted_at,
       contracts (
         id, contract_code, service_type, status, deleted_at,
         customers (full_name, phone)
       )`,
    )
    .eq("id", eventId)
    .maybeSingle();

  if (error) throw new Error(`Lỗi tải sự kiện để sync Google: ${error.message}`);
  return (data || null) as unknown as ContractEventGoogleRow | null;
}

function isEligible(row: ContractEventGoogleRow) {
  const contract = firstNode(row.contracts);
  return Boolean(
    row.sync_to_google !== false &&
      isOnSetEvent(row.event_type) &&
      row.event_date &&
      !row.deleted_at &&
      contract &&
      !contract.deleted_at &&
      contract.status !== "da_huy",
  );
}

type ContractGooglePayload = GoogleCalendarEventPayload & {
  summary: string;
  start: NonNullable<GoogleCalendarEventPayload["start"]>;
  end: NonNullable<GoogleCalendarEventPayload["end"]>;
};

function buildGoogleDateFields(row: ContractEventGoogleRow): Pick<ContractGooglePayload, "start" | "end"> {
  const eventDate = row.event_date || new Date().toISOString().slice(0, 10);
  if (row.start_time && row.end_time) {
    const startTime = normalizeTime(row.start_time);
    const endTime = normalizeTime(row.end_time);
    const endDate = row.end_date || eventDate;
    return {
      start: { dateTime: `${eventDate}T${startTime}`, timeZone: GOOGLE_SYNC_TIME_ZONE },
      end: { dateTime: `${endDate}T${endTime}`, timeZone: GOOGLE_SYNC_TIME_ZONE },
    };
  }

  const endDate = addDays(row.end_date || eventDate, 1);
  return {
    start: { date: eventDate },
    end: { date: endDate },
  };
}

function buildGooglePayload(row: ContractEventGoogleRow): ContractGooglePayload {
  const contract = firstNode(row.contracts);
  const customer = firstNode(contract?.customers);
  const contractCode = contract?.contract_code || "Chưa mã";
  const customerName = customer?.full_name || "Khách hàng";
  const eventLabel = getEventTypeLabel(row.event_type);
  const serviceLabel = contract?.service_type ? getServiceLabel(contract.service_type) : "";
  const contractUrl = `${getAppBaseUrl()}/contracts/${row.contract_id}`;

  return {
    summary: `HĐ ${contractCode} - ${eventLabel} - ${customerName}`,
    description: [
      `Mã HĐ: ${contractCode}`,
      `Khách hàng: ${customerName}`,
      customer?.phone ? `SĐT: ${customer.phone}` : null,
      serviceLabel ? `Dịch vụ: ${serviceLabel}` : null,
      `Mốc: ${row.title || eventLabel}`,
      `Mood Studio: ${contractUrl}`,
    ].filter(Boolean).join("\n"),
    location: row.location || undefined,
    colorId: GOOGLE_COLOR_BY_EVENT_TYPE[row.event_type],
    extendedProperties: {
      private: {
        mood_source: "contract_event",
        contract_id: row.contract_id,
        contract_event_id: row.id,
      },
    },
    ...buildGoogleDateFields(row),
  };
}

export async function deleteContractEventFromGoogle(
  supabase: SupabaseClient,
  eventId: string,
) {
  const row = await getContractEventForGoogle(supabase, eventId);
  if (!row?.google_event_id) return;

  await deleteGoogleTarget(supabase, {
    id: row.id,
    googleEventId: row.google_event_id,
  });
}

async function deleteGoogleTarget(
  supabase: SupabaseClient,
  target: ContractGoogleSyncTarget,
) {
  try {
    await deleteGoogleCalendarEvent(target.googleEventId);
    await updateSyncState(supabase, target.id, {
      google_event_id: null,
      google_sync_status: "deleted",
      google_sync_error: null,
      google_synced_at: new Date().toISOString(),
    });
  } catch (error) {
    await updateSyncState(supabase, target.id, {
      google_sync_status: "failed",
      google_sync_error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function syncContractEventToGoogle(
  supabase: SupabaseClient,
  eventId: string,
) {
  const row = await getContractEventForGoogle(supabase, eventId);
  if (!row) return;

  if (!isEligible(row)) {
    if (row.google_event_id) {
      await deleteContractEventFromGoogle(supabase, eventId);
    } else {
      await updateSyncState(supabase, eventId, {
        google_sync_status: "not_required",
        google_sync_error: null,
        google_synced_at: null,
      });
    }
    return;
  }

  await updateSyncState(supabase, eventId, {
    google_sync_status: "pending",
    google_sync_error: null,
  });

  try {
    const payload = buildGooglePayload(row);
    const googleEvent = row.google_event_id
      ? await updateGoogleCalendarEvent(row.google_event_id, payload)
      : await createGoogleCalendarEvent(payload);

    const googleEventId = row.google_event_id || googleEvent?.id || null;
    await updateSyncState(supabase, eventId, {
      google_event_id: googleEventId,
      google_sync_status: "synced",
      google_sync_error: null,
      google_synced_at: new Date().toISOString(),
    });
  } catch (error) {
    await updateSyncState(supabase, eventId, {
      google_sync_status: isConnectionError(error) ? "not_connected" : "failed",
      google_sync_error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function syncContractEventsToGoogle(
  supabase: SupabaseClient,
  eventIds: string[],
) {
  for (const eventId of Array.from(new Set(eventIds)).filter(Boolean)) {
    await syncContractEventToGoogle(supabase, eventId);
  }
}

export async function getContractGoogleSyncTargets(
  supabase: SupabaseClient,
  contractId: string,
) {
  const { data } = await supabase
    .from("contract_events")
    .select("id, google_event_id")
    .eq("contract_id", contractId)
    .not("google_event_id", "is", null);

  return (data || [])
    .filter((event): event is { id: string; google_event_id: string } => Boolean(event.google_event_id))
    .map((event) => ({
      id: event.id,
      googleEventId: event.google_event_id,
    }));
}

export async function deleteContractGoogleEvents(
  supabase: SupabaseClient,
  contractId: string,
  targets?: ContractGoogleSyncTarget[],
) {
  const syncTargets = targets ?? (await getContractGoogleSyncTargets(supabase, contractId));
  for (const target of syncTargets) {
    await deleteGoogleTarget(supabase, target);
  }
}

export async function syncEligibleContractEventsToGoogle(
  supabase: SupabaseClient,
  contractId: string,
) {
  const { data } = await supabase
    .from("contract_events")
    .select("id")
    .eq("contract_id", contractId)
    .in("event_type", ["ngay_chup", "ngay_to_chuc"])
    .is("deleted_at", null)
    .not("event_date", "is", null);

  for (const event of data || []) {
    await syncContractEventToGoogle(supabase, event.id);
  }
}
