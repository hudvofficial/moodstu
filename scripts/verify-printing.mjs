import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();

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

const readOnlyRpcs = [
  "printing_stats",
  "get_printing_cost_stats",
  "finance_lab_debt_summary",
  "printing_lab_overview",
  "printing_integrity_report",
];

console.log("Verifying printing read RPC contracts with service role...");
for (const rpc of readOnlyRpcs) {
  await assertRpc(serviceClient, rpc);
  console.log(`- ${rpc}: ok`);
}

console.log("Verifying private RPCs are not callable by anon...");
for (const rpc of [
  "printing_stats",
  "finance_lab_debt_summary",
  "printing_lab_overview",
  "printing_integrity_report",
]) {
  await assertAnonDenied(anonClient, rpc);
  console.log(`- ${rpc}: anon denied`);
}

const integrityRows = await assertRpc(serviceClient, "printing_integrity_report");
const rows = Array.isArray(integrityRows) ? integrityRows : [];
console.log("Printing integrity report:");
console.table(rows);

const failedChecks = rows.filter((row) => Number(row.issue_count ?? 0) > 0);
if (failedChecks.length > 0) {
  console.error("Printing integrity checks failed:");
  for (const row of failedChecks) {
    console.error(`- ${row.check_name}: ${row.issue_count}`);
  }
  process.exit(1);
}

console.log("Printing verification passed.");
