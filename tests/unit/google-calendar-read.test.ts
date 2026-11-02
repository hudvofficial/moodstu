import { getGoogleCalendarEvents } from "@/lib/googleCalendarService";
import { createAdminClient } from "@/lib/supabase/server";
import { getValidGoogleToken } from "@/lib/google-auth";

jest.mock("@/lib/supabase/server", () => ({ createAdminClient: jest.fn() }));
jest.mock("@/lib/google-auth", () => ({ getValidGoogleToken: jest.fn() }));

const mockAdmin = jest.mocked(createAdminClient);
const mockToken = jest.mocked(getValidGoogleToken);
const originalFetch = global.fetch;

function setStudioResult(studioInfo: unknown, error: unknown = null) {
  const fakeClient = {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: studioInfo, error }),
        }),
      }),
    }),
  };
  mockAdmin.mockResolvedValue(fakeClient as never);
  return fakeClient;
}

describe("Google Calendar read error visibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("returns [] only when the studio has no Google account linked", async () => {
    setStudioResult({ id: "studio", google_oauth: null });
    await expect(getGoogleCalendarEvents("2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z")).resolves.toEqual([]);
    expect(mockToken).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does not disguise a failed studio auth lookup as an empty calendar", async () => {
    setStudioResult(null, { code: "db_failure" });
    await expect(getGoogleCalendarEvents("2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z"))
      .rejects.toThrow("Google Calendar không thể tải sự kiện.");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("throws an actionable error when Google API is forbidden", async () => {
    setStudioResult({ id: "studio", google_oauth: { access_token: "encrypted" } });
    mockToken.mockResolvedValue({ access_token: "mock-token" } as never);
    jest.mocked(global.fetch).mockResolvedValue({ ok: false, status: 403 } as Response);
    await expect(getGoogleCalendarEvents("2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z"))
      .rejects.toThrow("Google Calendar không thể tải sự kiện.");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns mapped events when Google responds successfully", async () => {
    setStudioResult({ id: "studio", google_oauth: { access_token: "encrypted" } });
    mockToken.mockResolvedValue({ access_token: "mock-token" } as never);
    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{
          id: "google-1", summary: "Lịch chụp thử (mock)",
          start: { dateTime: "2026-11-02T09:00:00+07:00" },
          end: { dateTime: "2026-11-02T10:00:00+07:00" }, colorId: "7",
        }],
      }),
    } as Response);
    const events = await getGoogleCalendarEvents("2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: "google-1", title: "Lịch chụp thử (mock)", isGoogleEvent: true });
  });
});
