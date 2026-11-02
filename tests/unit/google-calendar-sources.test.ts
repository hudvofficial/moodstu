import {
  getGoogleCalendarSourceOptions,
  listGoogleCalendarSources,
  validateGoogleCalendarSelection,
  type GoogleCalendarSource,
} from "@/lib/google-calendar-sources";

const sources: GoogleCalendarSource[] = [
  { id: "primary@test.invalid", name: "Chính", primary: true, selected: false, hidden: false, accessRole: "owner", backgroundColor: null },
  { id: "team@group.calendar.google.com", name: "Studio", primary: false, selected: true, hidden: false, accessRole: "owner", backgroundColor: "#012345" },
  { id: "shared@test.invalid", name: "Chia sẻ", primary: false, selected: false, hidden: false, accessRole: "reader", backgroundColor: null },
  { id: "busy@test.invalid", name: "Chỉ bận", primary: false, selected: true, hidden: false, accessRole: "freeBusyReader", backgroundColor: null },
  { id: "hidden@test.invalid", name: "Bị ẩn", primary: false, selected: true, hidden: true, accessRole: "owner", backgroundColor: null },
];

describe("Google Calendar source selection (privacy and validation)", () => {
  it("includes primary and Google-selected calendars by default, not unselected shared calendars", () => {
    const result = getGoogleCalendarSourceOptions(sources, undefined);
    expect(result.map((x) => [x.id, x.included])).toEqual([
      ["primary@test.invalid", true],
      ["team@group.calendar.google.com", true],
      ["shared@test.invalid", false],
    ]);
  });

  it("uses explicitly chosen readable calendars without changing Google selected property", () => {
    const result = getGoogleCalendarSourceOptions(sources, ["shared@test.invalid"]);
    expect(result.filter((x) => x.included).map((x) => x.id)).toEqual(["shared@test.invalid"]);
    expect(result.find((x) => x.id === "shared@test.invalid")?.selected).toBe(false);
  });

  it("refuses inaccessible, hidden, arbitrary, duplicate, or empty selections", () => {
    expect(validateGoogleCalendarSelection(sources, ["primary@test.invalid", "shared@test.invalid"]))
      .toEqual(["primary@test.invalid", "shared@test.invalid"]);
    for (const input of [
      [], ["unknown@test.invalid"], ["hidden@test.invalid"], ["busy@test.invalid"],
      ["shared@test.invalid", "shared@test.invalid"], ["primary@test.invalid", 1],
    ]) {
      expect(() => validateGoogleCalendarSelection(sources, input)).toThrow();
    }
  });

  it("treats invalid stored preference as Google-selected default, without exposing hidden sources", () => {
    const opts = getGoogleCalendarSourceOptions(sources, { broken: true });
    expect(opts.filter((x) => x.included).map((x) => x.id))
      .toEqual(["primary@test.invalid", "team@group.calendar.google.com"]);
  });
});

describe("Google Calendar calendarList paging", () => {
  const originalFetch = global.fetch;
  beforeEach(() => { global.fetch = jest.fn(); });
  afterAll(() => { global.fetch = originalFetch; });

  it("loads nextPageToken without missing calendar entries", async () => {
    jest.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true, json: async () => ({ items: [{ id: "one", summary: "Một", accessRole: "owner", selected: true }], nextPageToken: "page2" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true, json: async () => ({ items: [{ id: "two", summary: "Hai", accessRole: "reader", selected: false }] }),
      } as Response);
    const result = await listGoogleCalendarSources("fake-token");
    expect(result.map((x) => x.id)).toEqual(["one", "two"]);
    const secondUrl = new URL(String(jest.mocked(global.fetch).mock.calls[1][0]));
    expect(secondUrl.searchParams.get("pageToken")).toBe("page2");
  });

  it("rejects non-200 responses rather than pretending no calendars exist", async () => {
    jest.mocked(global.fetch).mockResolvedValue({ ok: false, status: 403 } as Response);
    await expect(listGoogleCalendarSources("fake-token")).rejects.toThrow("403");
  });
});
