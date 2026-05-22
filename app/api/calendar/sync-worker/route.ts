import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/lib/googleCalendarService";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

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
  const isCron = authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;

  if (!user && !isCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Dùng service role để query và mutate queue
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
      .limit(10); // Batch xử lý 10 events một lần

    if (error) {
      console.error("Lỗi khi query queue:", error);
      return NextResponse.json({ success: false, error: error.message });
    }

    if (!queue || queue.length === 0) {
      return NextResponse.json({ success: true, message: "Queue is empty" });
    }

    const results = [];

    for (const record of queue) {
      try {
        if (record.action === "DELETE") {
          if (record.google_event_id) {
            await deleteGoogleCalendarEvent(record.google_event_id);
          }
          await supabase.from("google_sync_queue").delete().eq("id", record.id);
          results.push({ id: record.id, status: "deleted" });
        } else if (record.action === "CREATE") {
          const payload = record.payload as any;
          const googleEvent = await createGoogleCalendarEvent(payload);
          
          const googleEventId = typeof googleEvent?.id === "string" ? googleEvent.id : null;
          if (googleEventId) {
            // Update the linked ID in schedules table
            if (record.schedule_id) {
              await supabase
                .from("schedules")
                .update({ google_event_id: googleEventId })
                .eq("id", record.schedule_id);
            }
            // Remove from queue
            await supabase.from("google_sync_queue").delete().eq("id", record.id);
            results.push({ id: record.id, status: "synced (created)" });
          } else {
            throw new Error("No Google Event ID returned");
          }
        } else if (record.action === "UPDATE") {
          const payload = record.payload as any;
          if (record.google_event_id) {
            await updateGoogleCalendarEvent(record.google_event_id, payload);
          }
          await supabase.from("google_sync_queue").delete().eq("id", record.id);
          results.push({ id: record.id, status: "synced (updated)" });
        }
      } catch (err) {
        console.error(`Lỗi xử lý queue ${record.id}:`, err);
        // Tăng attempt và set failed
        await supabase
          .from("google_sync_queue")
          .update({ 
            status: record.attempts >= 2 ? "failed" : "pending",
            attempts: record.attempts + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", record.id);
        results.push({ id: record.id, status: "failed", error: String(err) });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (err) {
    console.error("Lỗi worker:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
