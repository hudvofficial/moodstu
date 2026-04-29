import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const PRIVATE_TABLES = [
  "employees",
  "employee_salaries",
  "monthly_salaries",
  "attendance",
  "evaluations",
];

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

function isDenied(error, status) {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    message.includes("permission denied") ||
    message.includes("not found") ||
    message.includes("row-level security")
  );
}

async function assertAnonDenied(client, table) {
  const response = await client.from(table).select("*", { count: "exact", head: true });
  if (!isDenied(response.error, response.status)) {
    throw new Error(`${table} anon select was not denied`);
  }
}

async function assertServiceReadable(client, table) {
  const { error, count } = await client.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table} service-role select failed: ${error.message}`);
  return count ?? 0;
}

async function assertAnonRpcDenied(client, name, args) {
  const response = await client.rpc(name, args);
  if (!isDenied(response.error, response.status)) {
    throw new Error(`${name} anon rpc was not denied`);
  }
}

async function assertServiceRpc(client, name, args, validate) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name} service-role rpc failed: ${error.message}`);
  validate?.(data);
  return data;
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

console.log("Verifying employees table exposure...");
for (const table of PRIVATE_TABLES) {
  await assertAnonDenied(anonClient, table);
  console.log(`- ${table}: anon denied`);
}

console.log("Verifying service-role table access...");
for (const table of PRIVATE_TABLES) {
  const count = await assertServiceReadable(serviceClient, table);
  console.log(`- ${table}: service-role ok (${count} rows)`);
}

console.log("Verifying employee RPC permissions...");
await assertServiceRpc(serviceClient, "employee_stats", undefined, (data) => {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    throw new Error("employee_stats returned invalid payload");
  }
  for (const key of ["total", "active", "inactive"]) {
    if (!Number.isFinite(Number(row[key]))) {
      throw new Error(`employee_stats.${key} must be numeric`);
    }
  }
});
console.log("- employee_stats: service-role ok");

await assertServiceRpc(serviceClient, "next_employee_code", undefined, (data) => {
  if (typeof data !== "string" || !/^NV-\d+$/.test(data)) {
    throw new Error("next_employee_code returned invalid code");
  }
});
console.log("- next_employee_code: service-role ok");

await assertAnonRpcDenied(anonClient, "employee_stats", undefined);
console.log("- employee_stats: anon denied");

await assertAnonRpcDenied(anonClient, "next_employee_code", undefined);
console.log("- next_employee_code: anon denied");

console.log("Employees verification passed.");
