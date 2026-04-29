import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const PRIVATE_TABLES = [
  "services",
  "service_categories",
  "service_bundles",
  "service_relations",
  "price_rules",
  "studio_info",
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

function assertDenied(response, label) {
  const { error, status } = response;
  if (!error) throw new Error(`${label} unexpectedly succeeded`);

  const message = error.message.toLowerCase();
  if (
    status !== 401 &&
    status !== 403 &&
    !message.includes("permission denied") &&
    !message.includes("not found") &&
    !message.includes("row-level security")
  ) {
    throw new Error(`${label} denial returned unexpected error: ${error.message}`);
  }
}

async function assertAnonTableDenied(client, table) {
  const response = await client.from(table).select("*", { count: "exact", head: true });
  assertDenied(response, `${table} anon select`);
}

async function assertServiceReadable(client, table) {
  const { error, count } = await client.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table} service-role select failed: ${error.message}`);
  return count ?? 0;
}

async function assertAnonRpcDenied(client, name, args) {
  const response = await client.rpc(name, args);
  assertDenied(response, `${name} anon rpc`);
}

async function assertServiceRpcReachable(client, name, args) {
  const { error } = await client.rpc(name, args);
  if (!error) throw new Error(`${name} service-role validation unexpectedly succeeded`);

  const message = error.message.toLowerCase();
  if (message.includes("permission denied") || message.includes("not found")) {
    throw new Error(`${name} is not reachable by service role: ${error.message}`);
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

console.log("Verifying services table exposure...");
for (const table of PRIVATE_TABLES) {
  await assertAnonTableDenied(anonClient, table);
  console.log(`- ${table}: anon denied`);
}

console.log("Verifying service-role access remains available...");
for (const table of ["services", "service_categories", "service_bundles"]) {
  const count = await assertServiceReadable(serviceClient, table);
  console.log(`- ${table}: service-role ok (${count} rows)`);
}

console.log("Verifying services RPC execute permissions...");
await assertServiceRpcReachable(serviceClient, "save_service_atomic", {
  p_actor_id: null,
  p_service: {},
  p_bundle_items: [],
  p_expected_updated_at: null,
});
console.log("- save_service_atomic: service-role reachable");

await assertServiceRpcReachable(serviceClient, "delete_service_atomic", {
  p_actor_id: null,
  p_service_id: "00000000-0000-0000-0000-000000000000",
});
console.log("- delete_service_atomic: service-role reachable");

await assertAnonRpcDenied(anonClient, "save_service_atomic", {
  p_actor_id: "00000000-0000-0000-0000-000000000000",
  p_service: {},
  p_bundle_items: [],
  p_expected_updated_at: null,
});
console.log("- save_service_atomic: anon denied");

await assertAnonRpcDenied(anonClient, "delete_service_atomic", {
  p_actor_id: "00000000-0000-0000-0000-000000000000",
  p_service_id: "00000000-0000-0000-0000-000000000000",
});
console.log("- delete_service_atomic: anon denied");

console.log("Services verification passed.");
