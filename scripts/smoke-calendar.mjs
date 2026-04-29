import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const timestamp = Date.now();
const marker = `smoke-calendar-${timestamp}`;

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

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function cleanup(client, ids) {
  if (ids.scheduleId) await client.from("schedules").delete().eq("id", ids.scheduleId);
}

loadEnvFile(path.join(root, ".env.local"));

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const serviceClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ids = {};

try {
  console.log("Finding active calendar employee...");
  const { data: employee, error: employeeError } = await serviceClient
    .from("employees")
    .select("id")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (employeeError) throw new Error(`Cannot query employees: ${employeeError.message}`);
  assert(employee?.id, "No active employee available for calendar smoke");

  console.log("Seeding timestamped schedule...");
  const { data: schedule, error: scheduleError } = await serviceClient
    .from("schedules")
    .insert({
      event_type: marker,
      event_date: "2026-05-15T09:30:00+07:00",
      end_date: "2026-05-15T10:30:00+07:00",
      employee_id: employee.id,
      status: "scheduled",
      color_id: "blue",
    })
    .select("id")
    .single();

  if (scheduleError || !schedule) {
    throw new Error(`Cannot create smoke schedule: ${scheduleError?.message || "missing row"}`);
  }
  ids.scheduleId = schedule.id;

  console.log("Checking same-day availability query shape...");
  const { data: sameDaySchedules, error: sameDayError } = await serviceClient
    .from("schedules")
    .select("id")
    .eq("employee_id", employee.id)
    .gte("event_date", "2026-05-15")
    .lt("event_date", "2026-05-16");

  if (sameDayError) throw new Error(`Same-day schedule query failed: ${sameDayError.message}`);
  assert(
    (sameDaySchedules || []).some((row) => row.id === ids.scheduleId),
    "Same-day timestamp range did not find the smoke schedule",
  );

  console.log("Checking Google-linked schedule probe...");
  const { error: googleProbeError } = await serviceClient
    .from("schedules")
    .select("google_event_id")
    .not("google_event_id", "is", null)
    .limit(1);

  if (googleProbeError) {
    throw new Error(`Google-linked schedule probe failed: ${googleProbeError.message}`);
  }

  console.log("Calendar seeded smoke passed.");
} finally {
  await cleanup(serviceClient, ids);
}
