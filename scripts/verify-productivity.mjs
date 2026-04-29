import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const RANGE = { startDate: "2026-04-01", endDate: "2026-04-30" };

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

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} returned an invalid array payload`);
  }
  return value;
}

function assertNonNegative(value, label) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
}

async function assertRpc(client, name, args = undefined) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name} failed: ${error.message}`);
  return data;
}

async function assertAnonDenied(client, name, args = undefined) {
  const { error } = await client.rpc(name, args);
  if (!error) {
    throw new Error(`${name} is callable by anon; expected execute permission to be revoked`);
  }

  const message = error.message.toLowerCase();
  if (!message.includes("permission denied") && !message.includes("not found")) {
    throw new Error(`${name} anon denial returned unexpected error: ${error.message}`);
  }
}

loadEnvFile(path.join(root, ".env.local"));

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const serviceClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anonClient = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const overviewArgs = {
  p_start_date: RANGE.startDate,
  p_end_date: RANGE.endDate,
};

const anonRpcArgs = {
  get_employee_productivity: overviewArgs,
  get_employee_job_details: {
    p_employee_id: "00000000-0000-0000-0000-000000000000",
    ...overviewArgs,
  },
  get_my_employee_productivity: overviewArgs,
  get_my_employee_job_details: overviewArgs,
};

console.log("Verifying productivity RPC contracts with service role...");
const overviewRows = assertArray(
  await assertRpc(serviceClient, "get_employee_productivity", overviewArgs),
  "get_employee_productivity",
);
console.log(`- get_employee_productivity: ok (${overviewRows.length} rows)`);

for (const [index, row] of overviewRows.entries()) {
  if (!row.employee_id) throw new Error(`overview row ${index} missing employee_id`);
  if (!row.full_name) throw new Error(`overview row ${index} missing full_name`);
  assertNonNegative(row.onsite_hours, `overview row ${index}.onsite_hours`);
  assertNonNegative(row.active_tasks, `overview row ${index}.active_tasks`);
  assertNonNegative(row.completed_tasks, `overview row ${index}.completed_tasks`);
  assertNonNegative(row.overdue_tasks, `overview row ${index}.overdue_tasks`);
  assertNonNegative(row.total_cost, `overview row ${index}.total_cost`);
}

const firstEmployee = overviewRows.find((row) => row.employee_id);
if (firstEmployee) {
  const detailRows = assertArray(
    await assertRpc(serviceClient, "get_employee_job_details", {
      p_employee_id: firstEmployee.employee_id,
      ...overviewArgs,
    }),
    "get_employee_job_details",
  );
  console.log(`- get_employee_job_details: ok (${detailRows.length} rows)`);

  for (const [index, row] of detailRows.entries()) {
    if (!row.contract_id) throw new Error(`detail row ${index} missing contract_id`);
    if (!row.contract_code) throw new Error(`detail row ${index} missing contract_code`);
    assertNonNegative(row.cost, `detail row ${index}.cost`);
  }
} else {
  console.log("- get_employee_job_details: skipped (no employees returned)");
}

console.log("Verifying private productivity RPCs are not callable by anon...");
for (const [name, args] of Object.entries(anonRpcArgs)) {
  await assertAnonDenied(anonClient, name, args);
  console.log(`- ${name}: anon denied`);
}

console.log("Productivity verification passed.");
