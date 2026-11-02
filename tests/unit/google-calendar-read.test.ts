import { getGoogleCalendarEvents } from "@/lib/googleCalendarService";
import { createAdminClient } from "@/lib/supabase/server";
import { getValidGoogleToken } from "@/lib/google-auth";

jest.mock("@/lib/supabase/server", () => ({ createAdminClient: jest.fn() }));
jest.mock("@/lib/google-auth", () => ({ getValidGoogleToken: jest.fn() }));

const mockAdmin = jest.mocked(createAdminClient);
const mockToken = jest.mocked(getValidGoogleToken);
const originalFetch = global.fetch;
const from = "2026-11-01T00:00:00Z";
const until = "2026-12-01T00:00:00Z";
const primary = "owner@test.invalid";
const team = "studio@group.calendar.google.com";
const shared = "shared@test.invalid";
const sourceList = [
  { id: primary, primary: true, selected: true, accessRole: "owner", summary: "Chính" },
  { id: team, primary: false, selected: true, accessRole: "owner", summary: "Studio" },
  { id: shared, primary: false, selected: false, accessRole: "reader", summary: "Chia sẻ" },
];

const googleEvent = (id: string, title: string) => ({
  id, summary: title,
  start: { dateTime: "2026-11-02T09:00:00+07:00" },
  end: { dateTime: "2026-11-02T10:00:00+07:00" },
  colorId: "7",
});

function setStudioResult(google_oauth: Record<string, unknown> | null, error: unknown = null) {
  const fakeClient = {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: error ? null : { id: "studio", google_oauth },
            error,
          }),
        }),
      }),
    }),
  };
  mockAdmin.mockResolvedValue(fakeClient as never);
}

function fakeGoogleAPI(
  eventPages: Record<string, Array<{ items: unknown[]; nextPageToken?: string }>>,
  sources = sourceList,
) {
  jest.mocked(global.fetch).mockImplementation(async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/users/me/calendarList")) {
      return { ok: true, json: async () => ({ items: sources }) } as Response;
    }
    const marker = "/calendars/";
    const calendarPart = url.pathname.split(marker)[1]?.split("/events")[0];
    const calendarId = calendarPart ? decodeURIComponent(calendarPart) : "";
    const pageIndex = url.searchParams.has("pageToken") ? Number(url.searchParams.get("pageToken")) : 0;
    const results = eventPages[calendarId]?.[pageIndex] || { items: [] };
    return { ok: true, json: async () => results } as Response;
  });
}

describe("Google Calendar multi-source reading (no real API/DB)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    mockToken.mockResolvedValue({ access_token: "fake-token" } as never);
  });
  afterAll(() => { global.fetch = originalFetch; });

  it("returns [] only when no account is connected", async () => {
    setStudioResult(null);
    await expect(getGoogleCalendarEvents(from, until)).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockToken).not.toHaveBeenCalled();
  });

  it("does not disguise failed DB reads as an empty calendar", async () => {
    setStudioResult(null, { code: "db_failure" });
    await expect(getGoogleCalendarEvents(from, until))
      .rejects.toThrow("Google Calendar không thể tải sự kiện.");
  });

  it("throws if Google calendarList returns 403", async () => {
    setStudioResult({ access_token: "encrypted" });
    jest.mocked(global.fetch).mockResolvedValue({ ok: false, status: 403 } as Response);
    await expect(getGoogleCalendarEvents(from, until)).rejects.toThrow("Google Calendar không thể tải sự kiện.");
  });

  it("reads primary and Google-selected calendars, but not an unselected shared calendar by default", async () => {
    setStudioResult({ access_token: "encrypted" });
    fakeGoogleAPI({
      [primary]: [{ items: [googleEvent("p1", "Primary event")] }],
      [team]: [{ items: [googleEvent("t1", "Studio event")] }],
      [shared]: [{ items: [googleEvent("s1", "Shared event")] }],
    });
    const events = await getGoogleCalendarEvents(from, until);
    expect(events).toHaveLength(2);
    expect(events.map(e => e.title).sort()).toEqual(["Primary event", "Studio event"]);
    expect(events.find(e => e.calendarId === team)?.id).toBe(team + "::t1");
    expect(events.find(e => e.calendarId === primary)?.id).toBe("p1");
    expect(jest.mocked(global.fetch).mock.calls.filter(([input]) => String(input).includes("/events"))).toHaveLength(2);
  });

  it("imports explicitly enabled shared calendar without changing Google-selected setting", async () => {
    setStudioResult({ selected_calendar_ids: [shared] });
    fakeGoogleAPI({
      [primary]: [{ items: [googleEvent("p1", "Primary")] }],
      [shared]: [{ items: [googleEvent("s1", "Visible after choice")] }],
    });
    const events = await getGoogleCalendarEvents(from, until);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: shared + "::s1", originalId: "s1", calendarId: shared,
      calendarPrimary: false, title: "Visible after choice",
    });
  });

  it("paginates each included calendar and keeps duplicate Google IDs unique", async () => {
    setStudioResult({});
    fakeGoogleAPI({
      [primary]: [
        { items: [googleEvent("same-id", "Primary page 1")], nextPageToken: "1" },
        { items: [googleEvent("later", "Primary page 2")] },
      ],
      [team]: [{ items: [googleEvent("same-id", "Team event")] }],
    });
    const events = await getGoogleCalendarEvents(from, until);
    expect(events).toHaveLength(3);
    expect(new Set(events.map(e => e.id)).size).toBe(3);
    expect(events.map(e => e.title)).toContain("Primary page 2");
    expect(jest.mocked(global.fetch).mock.calls.some(([input]) => String(input).includes("pageToken=1"))).toBe(true);
  });

  it("surfaces a failed calendar events request instead of silently returning partial events", async () => {
    setStudioResult({});
    jest.mocked(global.fetch).mockImplementation(async (input) => {
      if (String(input).includes("/calendarList")) {
        return { ok: true, json: async () => ({ items: sourceList }) } as Response;
      }
      return { ok: false, status: 403 } as Response;
    });
    await expect(getGoogleCalendarEvents(from, until))
      .rejects.toThrow("Google Calendar không thể tải sự kiện.");
  });
});
