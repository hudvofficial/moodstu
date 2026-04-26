// ═══════════════════════════════════════════
// Google Calendar Service — Full V1 port
// V1 ref: lib/googleCalendarService.ts (307 lines)
// Bê nguyên logic: token refresh, CRUD events, color mapping
// ═══════════════════════════════════════════

import { createClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const GOOGLE_CALENDAR_EVENT_API =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh google token");
  }

  return response.json();
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureValidToken(supabase: any, studioInfo: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authData = studioInfo.google_calendar_auth as any;
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing Google Credentials");
  }

  const updatedAt = new Date(authData.updated_at).getTime();
  const expiresInMs = (authData.expires_in || 3600) * 1000;
  const now = Date.now();

  // Refresh if expiring in less than 5 minutes
  if (now - updatedAt > expiresInMs - 5 * 60 * 1000) {
    if (!authData.refresh_token) {
      throw new Error("Missing Refresh Token");
    }

    const newTokens = await refreshAccessToken(
      authData.refresh_token,
      CLIENT_ID,
      CLIENT_SECRET,
    );
    authData = {
      ...authData,
      ...newTokens,
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from("studio_info")
      .update({ google_calendar_auth: authData })
      .eq("id", studioInfo.id);
  }

  return authData;
}

// ─── MAIN SERVICES ────────────────────────────────

export async function getGoogleCalendarEvents(
  timeMin: string,
  timeMax: string,
) {
  try {
    const supabase = await createClient();

    // Cache the studio info fetch for 5 minutes to reduce DB load
    const getCachedStudioInfo = unstable_cache(
      async () => {
        const { data } = await supabase
          .from("studio_info")
          .select("id, google_calendar_auth")
          .limit(1)
          .maybeSingle();
        return data;
      },
      ["google-calendar-studio-info"],
      { revalidate: 300, tags: ["studio-info"] },
    );

    const studioInfo = await getCachedStudioInfo();

    if (!studioInfo?.google_calendar_auth) return [];

    const authData = await ensureValidToken(supabase, studioInfo);

    // Calendar default color — fetch from Google CalendarList API
    let calendarDefaultColor = "#039be5";
    try {
      const calListRes = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList/primary",
        {
          headers: { Authorization: `Bearer ${authData.access_token}` },
          cache: "no-store",
        },
      );
      if (calListRes.ok) {
        const calListData = await calListRes.json();
        calendarDefaultColor = calListData.backgroundColor || calendarDefaultColor;
      }
    } catch {
      // Best effort — fallback to default Peacock blue
    }

    // Fetch Events
    const calendarUrl = new URL(GOOGLE_CALENDAR_API);
    calendarUrl.searchParams.append("timeMin", timeMin);
    calendarUrl.searchParams.append("timeMax", timeMax);
    calendarUrl.searchParams.append("singleEvents", "true");
    calendarUrl.searchParams.append("orderBy", "startTime");

    const res = await fetch(calendarUrl.toString(), {
      headers: { Authorization: `Bearer ${authData.access_token}` },
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Google Calendar API ${res.status}`);

    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.items || []).map((item: Record<string, any>) => ({
      id: item.id,
      title: item.summary || "(Không tiêu đề)",
      start: item.start.dateTime || item.start.date,
      end: item.end.dateTime || item.end.date,
      description: item.description,
      location: item.location,
      status: "Google",
      category: "Google",
      isGoogleEvent: true,
      htmlLink: item.htmlLink,
      colorId: item.colorId,
      backgroundColor: GOOGLE_COLORS[item.colorId] || calendarDefaultColor,
      extendedProperties: item.extendedProperties || null,
      moodSource: item.extendedProperties?.private?.mood_source || null,
    }));
  } catch (error) {
    console.error("getGoogleCalendarEvents Error:", error);
    return [];
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
    const supabase = await createClient();
    const { data: studioInfo } = await supabase
      .from("studio_info")
      .select("id, google_calendar_auth")
      .limit(1)
      .maybeSingle();

    if (!studioInfo?.google_calendar_auth) throw new Error("Google Calendar chưa được kết nối. Vui lòng cài đặt trong Settings.");

    const authData = await ensureValidToken(supabase, studioInfo);

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
    const supabase = await createClient();
    const { data: studioInfo } = await supabase
      .from("studio_info")
      .select("id, google_calendar_auth")
      .limit(1)
      .maybeSingle();

    if (!studioInfo?.google_calendar_auth) throw new Error("Google Calendar chưa được kết nối. Vui lòng cài đặt trong Settings.");

    const authData = await ensureValidToken(supabase, studioInfo);

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
    const supabase = await createClient();
    const { data: studioInfo } = await supabase
      .from("studio_info")
      .select("id, google_calendar_auth")
      .limit(1)
      .maybeSingle();

    if (!studioInfo?.google_calendar_auth) throw new Error("Google Calendar chưa được kết nối. Vui lòng cài đặt trong Settings.");

    const authData = await ensureValidToken(supabase, studioInfo);

    const res = await fetch(`${GOOGLE_CALENDAR_EVENT_API}/${eventId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authData.access_token}`,
      },
    });

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
