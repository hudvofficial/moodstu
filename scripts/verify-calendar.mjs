import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const findings = [];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function read(relPath) {
  return readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  findings.push(message);
}

const calendarQueries = read("app/actions/calendar-queries.ts");
const calendarMutations = read("app/actions/calendar-mutations.ts");
const calendarTasks = read("app/actions/calendar-task-actions.ts");
const calendarHook = read("hooks/use-calendar-data.ts");
const calendarAuth = read("lib/calendar-auth.ts");
const calendarUtils = read("lib/utils/calendar-utils.ts");
const calendarMonthEventsMigration = read("supabase/migrations/20260512090000_calendar_month_events_rpc.sql");
const packageJson = JSON.parse(read("package.json"));

if (!calendarAuth.includes("requireCalendarAccess")) {
  fail("shared calendar access helper is missing");
}
if (!calendarAuth.includes("requireCalendarScheduleEditable")) {
  fail("shared schedule ownership helper is missing");
}
if (!calendarAuth.includes("requireCalendarTaskEditable")) {
  fail("shared task ownership helper is missing");
}
for (const [label, source] of [
  ["calendar queries", calendarQueries],
  ["calendar mutations", calendarMutations],
  ["calendar task actions", calendarTasks],
]) {
  if (source.includes("ROLE_PERMISSIONS") || source.includes("normalizeRole")) {
    fail(`${label} still has duplicated role logic`);
  }
}
if (!calendarQueries.includes("fetchCalendarGoogleEvents")) {
  fail("Google Calendar events are not split into a separate action");
}
if (
  !calendarQueries.includes('rpc("calendar_month_events"') ||
  !calendarQueries.includes("fetchCalendarEventsFallback") ||
  !calendarMonthEventsMigration.includes("CREATE OR REPLACE FUNCTION public.calendar_month_events") ||
  !calendarMonthEventsMigration.includes("GRANT EXECUTE ON FUNCTION public.calendar_month_events")
) {
  fail("calendar month load is missing the aggregate RPC with fallback");
}
if (calendarQueries.includes("const [schedulesResult, tasksResult, googleEvents]")) {
  fail("internal calendar fetch still waits on Google events");
}
if (!calendarHook.includes("cacheKeys.calendarGoogle")) {
  fail("calendar hook is missing separate Google SWR key");
}
if (!calendarHook.includes('useRealtime("schedules"')) {
  fail("calendar hook is missing schedules realtime subscription");
}
if (!calendarHook.includes('useRealtime("work_tasks"')) {
  fail("calendar hook is missing work_tasks realtime subscription");
}
if (calendarHook.includes("charAt(0)") && calendarHook.includes("replace(/_/g")) {
  fail("calendar status labels still appear to be generated from raw enum strings");
}
for (const requiredLabel of ["Chưa làm", "Đang làm", "Hoàn thành", "Google Calendar"]) {
  if (!calendarUtils.includes(requiredLabel)) {
    fail(`calendar status label missing: ${requiredLabel}`);
  }
}
if (!calendarMutations.includes("superRefine") || !calendarMutations.includes("Ngày kết thúc phải")) {
  fail("schedule date-order validation is missing");
}
if (!calendarTasks.includes("TASK_STATUS_VALUES")) {
  fail("calendar task status enum validation is missing");
}
if (!packageJson.scripts?.["verify:calendar"]) {
  fail("package.json is missing verify:calendar");
}
if (!packageJson.scripts?.["smoke:calendar"]) {
  fail("package.json is missing smoke:calendar");
}

loadEnvFile(path.join(root, ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (url && serviceKey) {
  const serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: scheduleProbeError } = await serviceClient
    .from("schedules")
    .select("id")
    .limit(1);
  if (scheduleProbeError) {
    fail(`remote schedules probe failed: ${scheduleProbeError.message}`);
  }

  const { error: taskProbeError } = await serviceClient
    .from("work_tasks")
    .select("id")
    .limit(1);
  if (taskProbeError) {
    fail(`remote work_tasks probe failed: ${taskProbeError.message}`);
  }
} else {
  console.warn("Skipping remote Supabase probes; env vars are missing.");
}

if (findings.length > 0) {
  console.error("Calendar verification failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Calendar verification passed.");
