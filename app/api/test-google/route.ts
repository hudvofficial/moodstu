import { NextResponse } from "next/server";
import { getGoogleCalendarEvents } from "@/lib/googleCalendarService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await getGoogleCalendarEvents("2026-05-01T00:00:00.000Z", "2026-05-31T23:59:59.000Z");
    return NextResponse.json({ success: true, count: events.length, events });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
