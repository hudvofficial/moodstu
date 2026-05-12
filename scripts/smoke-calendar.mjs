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

function isMissingRpcError(error) {
  if (!error) return false;
  return error.code === "PGRST202" || /schema cache|function/i.test(error.message || "");
}

async function cleanup(client, ids) {
  if (ids.startTaskId) await client.from("work_tasks").delete().eq("id", ids.startTaskId);
  if (ids.deadlineTaskId) await client.from("work_tasks").delete().eq("id", ids.deadlineTaskId);
  if (ids.boundaryScheduleId) await client.from("schedules").delete().eq("id", ids.boundaryScheduleId);
  if (ids.scheduleId) await client.from("schedules").delete().eq("id", ids.scheduleId);
  if (ids.contractId) await client.from("contracts").delete().eq("id", ids.contractId);
  if (ids.customerId) await client.from("customers").delete().eq("id", ids.customerId);
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

  console.log("Seeding exclusive-boundary schedule...");
  const { data: boundarySchedule, error: boundaryScheduleError } = await serviceClient
    .from("schedules")
    .insert({
      event_type: `${marker}-boundary`,
      event_date: "2026-06-10T23:30:00+07:00",
      end_date: "2026-06-11T00:30:00+07:00",
      employee_id: employee.id,
      status: "scheduled",
      color_id: "blue",
    })
    .select("id")
    .single();

  if (boundaryScheduleError || !boundarySchedule) {
    throw new Error(`Cannot create boundary smoke schedule: ${boundaryScheduleError?.message || "missing row"}`);
  }
  ids.boundaryScheduleId = boundarySchedule.id;

  console.log("Seeding contract for task fixtures...");
  const { data: customer, error: customerError } = await serviceClient
    .from("customers")
    .insert({
      customer_code: `SMK-CAL-CUS-${timestamp}`,
      full_name: `Calendar Smoke ${marker}`,
      phone: "0901234567",
      bride_name: `Bride ${marker}`,
      groom_name: `Groom ${marker}`,
      status: "active",
      notes: marker,
    })
    .select("id")
    .single();

  if (customerError || !customer) {
    throw new Error(`Cannot create smoke customer: ${customerError?.message || "missing row"}`);
  }
  ids.customerId = customer.id;

  const { data: contract, error: contractError } = await serviceClient
    .from("contracts")
    .insert({
      contract_code: `SMK-CAL-HD-${timestamp}`,
      customer_id: ids.customerId,
      contract_date: "2026-05-01",
      work_date: "2026-05-15",
      delivery_date: "2026-05-20",
      service_type: "studio",
      transaction_type: "hop_dong",
      status: "dang_thuc_hien",
      payment_status: "chua_thanh_toan",
      total_amount: 1000000,
      paid_amount: 0,
      remaining_amount: 1000000,
      notes: marker,
    })
    .select("id")
    .single();

  if (contractError || !contract) {
    throw new Error(`Cannot create smoke contract: ${contractError?.message || "missing row"}`);
  }
  ids.contractId = contract.id;

  console.log("Seeding deadline and start-date tasks...");
  const { data: deadlineTask, error: deadlineTaskError } = await serviceClient
    .from("work_tasks")
    .insert({
      contract_id: ids.contractId,
      work_type: "concept",
      assigned_to: employee.id,
      deadline: "2026-05-16",
      start_date: null,
      status: "chua_lam",
      notes: `${marker}-deadline-task`,
    })
    .select("id")
    .single();

  if (deadlineTaskError || !deadlineTask) {
    throw new Error(`Cannot create deadline smoke task: ${deadlineTaskError?.message || "missing row"}`);
  }
  ids.deadlineTaskId = deadlineTask.id;

  const { data: startTask, error: startTaskError } = await serviceClient
    .from("work_tasks")
    .insert({
      contract_id: ids.contractId,
      work_type: "retouch",
      assigned_to: employee.id,
      deadline: null,
      start_date: "2026-05-17",
      start_time: "13:00",
      end_time: "14:00",
      status: "chua_lam",
      notes: `${marker}-start-task`,
    })
    .select("id")
    .single();

  if (startTaskError || !startTask) {
    throw new Error(`Cannot create start-date smoke task: ${startTaskError?.message || "missing row"}`);
  }
  ids.startTaskId = startTask.id;

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

  console.log("Checking calendar month RPC...");
  const { data: monthEvents, error: monthEventsError } = await serviceClient
    .rpc("calendar_month_events", {
      p_month: 5,
      p_year: 2026,
    });

  if (monthEventsError && isMissingRpcError(monthEventsError)) {
    console.warn("Skipping calendar_month_events RPC probe; migration is not deployed.");
  } else {
    if (monthEventsError) {
      throw new Error(`Calendar month RPC failed: ${monthEventsError.message}`);
    }
    assert(
      (monthEvents || []).some((row) => row.event_source === "schedule" && row.id === ids.scheduleId),
      "Calendar month RPC did not include the smoke schedule",
    );
    assert(
      (monthEvents || []).some((row) => row.event_source === "schedule" && row.id === ids.boundaryScheduleId),
      "Calendar month RPC did not include final-window-day timestamp schedule",
    );
    assert(
      (monthEvents || []).some((row) => row.event_source === "task" && row.id === ids.deadlineTaskId),
      "Calendar month RPC did not include the deadline task",
    );
    assert(
      (monthEvents || []).some((row) => row.event_source === "task" && row.id === ids.startTaskId && !row.deadline),
      "Calendar month RPC did not include the start-date-only task",
    );
  }

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
