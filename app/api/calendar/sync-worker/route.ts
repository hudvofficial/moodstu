import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/lib/googleCalendarService";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

type QueueAction = "CREATE" | "UPDATE" | "DELETE";

type GoogleSyncQueueRecord = {
  id: string;
  schedule_id: string | null;
  google_event_id: string | null;
  action: QueueAction | string;
  payload: unknown;
  status: string;
  attempts: number;
  created_at: string;
};

type SyncResult = {
  id: string;
  status: string;
  error?: string;
};

type SupabaseAdminClient = SupabaseClient<any>;

function compareQueueRecords(a: GoogleSyncQueueRecord, b: GoogleSyncQueueRecord) {
  const createdDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  if (createdDiff !== 0) return createdDiff;
  return a.id.localeCompare(b.id);
}

function coalesceQueue(queue: GoogleSyncQueueRecord[]) {
  const standalone: GoogleSyncQueueRecord[] = [];
  const byScheduleId = new Map<string, GoogleSyncQueueRecord[]>();

  for (const record of queue) {
    if (!record.schedule_id) {
      standalone.push(record);
      continue;
    }

    const group = byScheduleId.get(record.schedule_id) || [];
    group.push(record);
    byScheduleId.set(record.schedule_id, group);
  }

  const records = [...standalone];
  const supersededIds: string[] = [];

  for (const group of byScheduleId.values()) {
    group.sort(compareQueueRecords);
    supersededIds.push(...group.slice(0, -1).map((record) => record.id));
    records.push(group[group.length - 1]);
  }

  records.sort(compareQueueRecords);
  return { records, supersededIds };
}

async function deleteQueueRecord(supabase: SupabaseAdminClient, id: string) {
  const { error } = await supabase.from("google_sync_queue").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete queue record ${id}: ${error.message}`);
}

async function getScheduleGoogleLink(
  supabase: SupabaseAdminClient,
  scheduleId: string,
) {
  const { data, error } = await supabase
    .from("schedules")
    .select("id, google_event_id")
    .eq("id", scheduleId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load schedule ${scheduleId}: ${error.message}`);
  return {
    exists: Boolean(data),
    googleEventId: (data as { google_event_id: string | null } | null)?.google_event_id || null,
  };
}

async function updateScheduleGoogleEventId(
  supabase: SupabaseAdminClient,
  scheduleId: string,
  googleEventId: string,
) {
  const { error } = await supabase
    .from("schedules")
    .update({ google_event_id: googleEventId })
    .eq("id", scheduleId);

  if (error) throw new Error(`Failed to link Google event ${googleEventId}: ${error.message}`);
}

async function markQueueFailure(
  supabase: SupabaseAdminClient,
  record: GoogleSyncQueueRecord,
  err: unknown,
): Promise<SyncResult> {
  await supabase
    .from("google_sync_queue")
    .update({
      status: record.attempts >= 2 ? "failed" : "pending",
      attempts: record.attempts + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  return {
    id: record.id,
    status: "failed",
    error: err instanceof Error ? err.message : String(err),
  };
}

async function processQueueRecord(
  supabase: SupabaseAdminClient,
  record: GoogleSyncQueueRecord,
): Promise<SyncResult> {
  try {
    if (record.action === "DELETE") {
      if (record.google_event_id) {
        await deleteGoogleCalendarEvent(record.google_event_id);
      }
      await deleteQueueRecord(supabase, record.id);
      return { id: record.id, status: "deleted" };
    }

    if (record.action !== "CREATE" && record.action !== "UPDATE") {
      await deleteQueueRecord(supabase, record.id);
      return { id: record.id, status: "skipped", error: `Unknown action: ${record.action}` };
    }

    let currentGoogleEventId: string | null = null;
    if (record.schedule_id) {
      const schedule = await getScheduleGoogleLink(supabase, record.schedule_id);
      if (!schedule.exists) {
        await deleteQueueRecord(supabase, record.id);
        return { id: record.id, status: "skipped (schedule deleted)" };
      }
      currentGoogleEventId = schedule.googleEventId;
    }

    const payload = record.payload as any;
    const targetGoogleEventId = record.google_event_id || currentGoogleEventId;

    if (targetGoogleEventId) {
      await updateGoogleCalendarEvent(targetGoogleEventId, payload);
      if (record.schedule_id && !currentGoogleEventId) {
        await updateScheduleGoogleEventId(supabase, record.schedule_id, targetGoogleEventId);
      }
      await deleteQueueRecord(supabase, record.id);
      return {
        id: record.id,
        status: record.action === "CREATE" ? "synced (updated existing)" : "synced (updated)",
      };
    }

    const googleEvent = await createGoogleCalendarEvent(payload);
    const googleEventId = typeof googleEvent?.id === "string" ? googleEvent.id : null;
    if (!googleEventId) throw new Error("No Google Event ID returned");

    if (record.schedule_id) {
      await updateScheduleGoogleEventId(supabase, record.schedule_id, googleEventId);
    }

    await deleteQueueRecord(supabase, record.id);
    return { id: record.id, status: "synced (created)" };
  } catch (err) {
    console.error(`Failed to process Google sync queue ${record.id}:`, err);
    return markQueueFailure(supabase, record, err);
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await authSupabase.auth.getUser();
  const authHeader = request.headers.get("Authorization");
  const isCron = Boolean(process.env.CRON_SECRET) && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!user && !isCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: queue, error } = await supabase
      .from("google_sync_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", 3)
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) {
      console.error("Failed to query Google sync queue:", error);
      return NextResponse.json({ success: false, error: error.message });
    }

    if (!queue || queue.length === 0) {
      return NextResponse.json({ success: true, message: "Queue is empty" });
    }

    const { records, supersededIds } = coalesceQueue(queue as GoogleSyncQueueRecord[]);
    const results: SyncResult[] = supersededIds.map((id) => ({
      id,
      status: "skipped (superseded)",
    }));

    if (supersededIds.length > 0) {
      const { error: deleteSupersededError } = await supabase
        .from("google_sync_queue")
        .delete()
        .in("id", supersededIds);

      if (deleteSupersededError) {
        throw new Error(`Failed to delete superseded queue records: ${deleteSupersededError.message}`);
      }
    }

    for (const record of records) {
      results.push(await processQueueRecord(supabase, record));
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (err) {
    console.error("Google sync worker failed:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
