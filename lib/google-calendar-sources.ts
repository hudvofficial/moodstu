/**
 * Google Calendar list and single-studio source selection.
 *
 * All calls are read-only. Source IDs are selected by an administrator and
 * stored in studio_info.google_oauth JSON (alongside encrypted credentials).
 */
export interface GoogleCalendarSource {
  id: string;
  name: string;
  primary: boolean;
  selected: boolean;
  backgroundColor: string | null;
  accessRole: string;
  hidden: boolean;
}

export interface GoogleCalendarSourceOption extends GoogleCalendarSource {
  included: boolean;
}

type GoogleCalendarListResponse = {
  items?: Array<{
    id?: string;
    summary?: string;
    summaryOverride?: string;
    primary?: boolean;
    selected?: boolean;
    hidden?: boolean;
    backgroundColor?: string;
    accessRole?: string;
  }>;
  nextPageToken?: string;
};

const READABLE_ROLES = new Set(["reader", "writer", "writerWithoutPrivateAccess", "owner"]);
const MAX_SOURCE_PAGES = 10;
export const MAX_GOOGLE_CALENDAR_SOURCES = 20;

export function getGoogleCalendarSourceOptions(
  sources: GoogleCalendarSource[],
  configuredIds: unknown,
): GoogleCalendarSourceOption[] {
  const allowed = sources.filter(
    (source) => !source.hidden && READABLE_ROLES.has(source.accessRole),
  );
  const explicitIds = Array.isArray(configuredIds) &&
    configuredIds.every((value) => typeof value === "string")
    ? new Set(configuredIds as string[])
    : null;

  return allowed.map((source) => ({
    ...source,
    included: explicitIds
      ? explicitIds.has(source.id)
      : source.primary || source.selected,
  }));
}

export async function listGoogleCalendarSources(
  accessToken: string,
): Promise<GoogleCalendarSource[]> {
  const sources: GoogleCalendarSource[] = [];
  const seen = new Set<string>();
  let nextPageToken: string | undefined;

  for (let page = 0; page < MAX_SOURCE_PAGES; page++) {
    const url = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
    url.searchParams.set("maxResults", "250");
    if (nextPageToken) url.searchParams.set("pageToken", nextPageToken);

    const response = await fetch(url, {
      headers: { Authorization: "Bearer " + accessToken },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      throw new Error("Không thể tải danh sách lịch Google (HTTP " + response.status + ").");
    }

    const result = (await response.json()) as GoogleCalendarListResponse;
    for (const item of result.items || []) {
      if (!item.id || seen.has(item.id)) continue;
      seen.add(item.id);
      sources.push({
        id: item.id,
        name: item.summaryOverride || item.summary || "Lịch không có tên",
        primary: item.primary === true,
        selected: item.selected === true,
        hidden: item.hidden === true,
        backgroundColor: item.backgroundColor || null,
        accessRole: item.accessRole || "none",
      });
    }
    nextPageToken = result.nextPageToken;
    if (!nextPageToken) return sources;
  }

  throw new Error("Danh sách lịch Google quá lớn; không thể tải đầy đủ.");
}

export function validateGoogleCalendarSelection(
  sources: GoogleCalendarSource[],
  desiredIds: unknown,
): string[] {
  if (!Array.isArray(desiredIds) || desiredIds.length === 0 ||
      desiredIds.length > MAX_GOOGLE_CALENDAR_SOURCES ||
      !desiredIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 1024)) {
    throw new Error("Vui lòng chọn từ 1 đến 20 lịch hợp lệ.");
  }
  const unique = [...new Set(desiredIds as string[])];
  if (unique.length !== desiredIds.length) {
    throw new Error("Danh sách lịch Google có mục trùng lặp.");
  }
  const available = new Set(getGoogleCalendarSourceOptions(sources, null).map((c) => c.id));
  if (!unique.every((id) => available.has(id))) {
    throw new Error("Lịch không thuộc tài khoản Google đã kết nối hoặc không có quyền đọc.");
  }
  return unique;
}
