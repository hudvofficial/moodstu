import { updateGoogleCalendarSourceSelection } from "@/app/actions/settings-mutations";
import { withAdmin } from "@/lib/auth_utils";
import { listGoogleCalendarSources } from "@/lib/google-calendar-sources";
import { getValidGoogleToken } from "@/lib/google-auth";
import { encryptSecret } from "@/lib/settings-secrets";
import { writeAuditLog } from "@/lib/audit";

jest.mock("@/lib/auth_utils", () => ({ withAdmin: jest.fn() }));
jest.mock("@/lib/google-auth", () => ({ getValidGoogleToken: jest.fn() }));
jest.mock("@/lib/google-calendar-sources", () => ({
  ...jest.requireActual("@/lib/google-calendar-sources"),
  listGoogleCalendarSources: jest.fn(),
}));
jest.mock("@/lib/audit", () => ({ writeAuditLog: jest.fn() }));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

const adminMock = withAdmin as unknown as jest.Mock;
const listMock = jest.mocked(listGoogleCalendarSources);
const tokenMock = jest.mocked(getValidGoogleToken);

const calendarList = [
  { id: "primary@test.invalid", name: "Primary", primary: true, selected: true, hidden: false, accessRole: "owner", backgroundColor: null },
  { id: "share@test.invalid", name: "Shared", primary: false, selected: false, hidden: false, accessRole: "reader", backgroundColor: null },
];

describe("Saving Google Calendar source selection uses authenticated studio admin and preserves tokens", () => {
  const oldSettingsKey = process.env.SETTINGS_SECRET_KEY;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SETTINGS_SECRET_KEY = "unit-test-key-not-production";
    listMock.mockResolvedValue(calendarList);
    tokenMock.mockResolvedValue({ access_token: "fake-valid" } as never);
  });

  afterAll(() => {
    if (oldSettingsKey === undefined) delete process.env.SETTINGS_SECRET_KEY;
    else process.env.SETTINGS_SECRET_KEY = oldSettingsKey;
  });

  function mount(latestRefreshPlain: string) {
    const original = {
      access_token: encryptSecret("old-access"),
      refresh_token: encryptSecret("same-refresh"),
    };
    const latest = {
      access_token: encryptSecret("new-access-after-refresh"),
      refresh_token: encryptSecret(latestRefreshPlain),
      selected_calendar_ids: ["primary@test.invalid"],
    };
    const writes: unknown[] = [];
    const from = jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => ({ maybeSingle: jest.fn(async () => ({ data: { id: "studio", google_oauth: original }, error: null })) })),
        eq: jest.fn(() => ({ maybeSingle: jest.fn(async () => ({ data: { google_oauth: latest }, error: null })) })),
      })),
      update: jest.fn((payload: unknown) => ({
        eq: jest.fn(async () => { writes.push(payload); return { error: null }; }),
      })),
    }));
    const fakeAdminClient = { from };
    adminMock.mockImplementation(async (fn: (client: typeof fakeAdminClient) => Promise<unknown>) => ({
      success: true,
      data: await fn(fakeAdminClient),
    }));
    return { original, latest, writes, from };
  }

  it("saves a reader calendar after token refresh re-encrypts the same refresh token", async () => {
    const { original, latest, writes } = mount("same-refresh");
    expect(original.refresh_token).not.toBe(latest.refresh_token); // randomized encryption
    const res = await updateGoogleCalendarSourceSelection(["primary@test.invalid", "share@test.invalid"]);
    expect(res).toMatchObject({ success: true, data: { count: 2 } });
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      google_oauth: {
        access_token: latest.access_token,
        refresh_token: latest.refresh_token,
        selected_calendar_ids: ["primary@test.invalid", "share@test.invalid"],
      },
    });
    expect(writeAuditLog).toHaveBeenCalledTimes(1);
  });

  it("blocks saving when another Google account's refresh token has replaced the connection", async () => {
    const { writes } = mount("other-account-refresh-token");
    await expect(updateGoogleCalendarSourceSelection(["share@test.invalid"]))
      .rejects.toThrow("Kết nối Google vừa thay đổi.");
    expect(writes).toHaveLength(0);
  });

  it("rejects calendar IDs that are not readable in the connected Google account", async () => {
    const { writes } = mount("same-refresh");
    await expect(updateGoogleCalendarSourceSelection(["not-a-source@test.invalid"]))
      .rejects.toThrow("không có quyền đọc");
    expect(writes).toHaveLength(0);
  });
});
