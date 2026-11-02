// ═══════════════════════════════════════════
// Google Calendar Service — Full V1 port
// V1 ref: lib/googleCalendarService.ts (307 lines)
// Bê nguyên logic: token refresh, CRUD events, color mapping
// ═══════════════════════════════════════════

import { createAdminClient } from "@/lib/supabase/server";
import {
  decryptGoogleOAuth,
  encryptGoogleOAuth,
} from "@/lib/settings-secrets";
import { getValidGoogleToken } from "@/lib/google-auth";
import { getGoogleCalendarSourceOptions, listGoogleCalendarSources } from "@/lib/google-calendar-sources";


const GOOGLE_CALENDAR_API =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const GOOGLE_CALENDAR_EVENT_API =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const GOOGLE_DEFAULT_CALENDAR_COLOR = "#039be5";

// Google Calendar Standard Colors Mapping
export const GOOGLE_COLORS: Record<string, string> = {
  "1": "#7986cb", // Lavender
  "2": "#33b679", // Sage
  "3": "#8e24aa", // Grape
  "4": "#e67c73", // Flamingo
  "5": "#f6bf26", // Banana
  "6": "#f4511e", // Tangerine
  "7": "#039be5", // Peacock
  "8": "#616161", // Graphite
  "9": "#3f51b5", // Blueberry
  "10": "#0b8043", // Basil
  "11": "#d50000", // Tomato
};

type GoogleEventDate = { dateTime: string; timeZone?: string } | { date: string; timeZone?: string };

export type GoogleCalendarEventPayload = {
  summary?: string;
  description?: string;
  start?: GoogleEventDate;
  end?: GoogleEventDate;
  location?: string;
  colorId?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
};

// ─── INTERNAL HELPERS ─────────────────────────────

// ─── MAIN SERVICES ────────────────────────────────

// Keep page limits bounded: never silently hide events beyond the first page.
const GOOGLE_EVENT_PAGE_SIZE = 250;
const GOOGLE_MAX_EVENT_PAGES = 10;

export async function getGoogleCalendarEvents(
  timeMin: string,
  timeMax: string,
) {
  try {
    const supabase = await createAdminClient();

    const { data: studioInfo, error: studioError } = await supabase
      .from("studio_info")
      .select("id, google_oauth")
      .limit(1)
      .maybeSingle();

    if (studioError) throw new Error("Không thể kiểm tra kết nối Google Calendar.");
    if (!studioInfo?.google_oauth) return [];

    const authData = await getValidGoogleToken(supabase, studioInfo);
    const sources = await listGoogleCalendarSources(authData.access_token);
    const selected = getGoogleCalendarSourceOptions(
      sources,
      (studioInfo.google_oauth as Record<string, unknown>).selected_calendar_ids,
    ).filter((source) => source.included);

    const loadEventsFromSource = async (source: (typeof selected)[number]) => {
      const items: Array<Record<string, any>> = [];
      let nextPageToken: string | undefined;

      for (let page = 0; page < GOOGLE_MAX_EVENT_PAGES; page++) {
        const url = new URL(
          "https://www.googleapis.com/calendar/v3/calendars/" +
          encodeURIComponent(source.id) + "/events",
        );
        url.searchParams.set("timeMin", timeMin);
        url.searchParams.set("timeMax", timeMax);
        url.searchParams.set("singleEvents", "true");
        url.searchParams.set("orderBy", "startTime");
        url.searchParams.set("maxResults", String(GOOGLE_EVENT_PAGE_SIZE));
        if (nextPageToken) url.searchParams.set("pageToken", nextPageToken);

        const response = await fetch(url, {
          headers: { Authorization: "Bearer " + authData.access_token },
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
          throw new Error("Google Calendar API " + response.status);
        }
        const pageResult = await response.json();
        items.push(...(Array.isArray(pageResult.items) ? pageResult.items : []));
        nextPageToken = pageResult.nextPageToken;
        if (!nextPageToken) {
          return items
            .filter((item) =>
              item.status !== "cancelled" &&
              typeof item.id === "string" &&
              (item.start?.dateTime || item.start?.date),
            )
            .map((item) => {
              const start = item.start.dateTime || item.start.date;
              const end = item.end?.dateTime || item.end?.date || start;
              return {
                // Google event IDs can collide across calendars. Preserve
                // primary IDs for existing Mood Studio sync deduplication.
                id: source.primary ? item.id : source.id + "::" + item.id,
                originalId: item.id as string,
                calendarId: source.id,
                calendarPrimary: source.primary,
                title: item.summary || "(Không tiêu đề)",
                start,
                end,
                description: item.description,
                location: item.location,
                status: "Google",
                category: "Google",
                isGoogleEvent: true,
                htmlLink: item.htmlLink,
                colorId: item.colorId,
                backgroundColor: GOOGLE_COLORS[item.colorId] ||
                  source.backgroundColor || GOOGLE_DEFAULT_CALENDAR_COLOR,
                extendedProperties: item.extendedProperties || null,
                moodSource: item.extendedProperties?.private?.mood_source || null,
              };
            });
        }
      }

      throw new Error("Lịch Google có quá nhiều sự kiện; chưa tải hết các trang.");
    };

    // Batch concurrent requests to avoid unnecessary Google API bursts.
    const events: Awaited<ReturnType<typeof loadEventsFromSource>> = [];
    for (let i = 0; i < selected.length; i += 5) {
      const batches = await Promise.all(selected.slice(i, i + 5).map(loadEventsFromSource));
      for (const batch of batches) events.push(...batch);
    }
    return events;
  } catch (error) {
    // Never treat a Google API failure as "no events" in the studio calendar.
    // Logs keep details server-side; client receives a safe generic message.
    console.error("getGoogleCalendarEvents Error:", error);
    throw new Error("Google Calendar không thể tải sự kiện. Kiểm tra kết nối Google trong Cài đặt studio.");
  }
}

export async function createGoogleCalendarEvent(eventData: {
  summary: string;
  description?: string;
  start: GoogleEventDate;
  end: GoogleEventDate;
  location?: string;
  colorId?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}) {
  try {
    const supabase = await createAdminClient();
    const { data: studioInfo } = await supabase
      .from("studio_info")
      .select("id, google_oauth")
      .limit(1)
      .maybeSingle();

    if (!studioInfo?.google_oauth) throw new Error("Google Calendar chưa được kết nối. Vui lòng cài đặt trong Settings.");

    const authData = await getValidGoogleToken(supabase, studioInfo);

    const res = await fetch(GOOGLE_CALENDAR_EVENT_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    });

    if (!res.ok) {
      const err = await res.json();
      const msg = err?.error?.message || JSON.stringify(err?.error) || "Google Calendar create failed";
      console.error("Create Google Event Failed:", msg);
      throw new Error(msg);
    }

    return await res.json();
  } catch (error) {
    console.error("createGoogleCalendarEvent Error:", error);
    throw error;
  }
}

/**
 * Update an existing Google Calendar Event
 */
export async function updateGoogleCalendarEvent(
  eventId: string,
  eventData: GoogleCalendarEventPayload,
) {
  try {
    const supabase = await createAdminClient();
    const { data: studioInfo } = await supabase
      .from("studio_info")
      .select("id, google_oauth")
      .limit(1)
      .maybeSingle();

    if (!studioInfo?.google_oauth) throw new Error("Google Calendar chưa được kết nối. Vui lòng cài đặt trong Settings.");

    const authData = await getValidGoogleToken(supabase, studioInfo);

    const res = await fetch(`${GOOGLE_CALENDAR_EVENT_API}/${eventId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${authData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    });

    if (!res.ok) {
      const err = await res.json();
      const msg = err?.error?.message || JSON.stringify(err?.error) || "Google Calendar update failed";
      console.error("Update Google Event Failed:", msg);
      throw new Error(msg);
    }

    return await res.json();
  } catch (error) {
    console.error("updateGoogleCalendarEvent Error:", error);
    throw error;
  }
}

/**
 * Delete a Google Calendar Event
 */
export async function deleteGoogleCalendarEvent(eventId: string) {
  try {
    const supabase = await createAdminClient();
    const { data: studioInfo } = await supabase
      .from("studio_info")
      .select("id, google_oauth")
      .limit(1)
      .maybeSingle();

    if (!studioInfo?.google_oauth) throw new Error("Google Calendar chưa được kết nối. Vui lòng cài đặt trong Settings.");

    const authData = await getValidGoogleToken(supabase, studioInfo);

    const res = await fetch(`${GOOGLE_CALENDAR_EVENT_API}/${eventId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authData.access_token}`,
      },
    });

    if (res.status === 404 || res.status === 410) {
      return true;
    }

    // Google returns 204 No Content on success
    if (!res.ok && res.status !== 204) {
      let msg = "Google Calendar delete failed";
      try {
        const err = await res.json();
        msg = err?.error?.message || JSON.stringify(err?.error) || msg;
      } catch { /* no body */ }
      console.error("Delete Google Event Failed:", msg);
      throw new Error(msg);
    }
    return true;
  } catch (error) {
    console.error("deleteGoogleCalendarEvent Error:", error);
    throw error;
  }
}
