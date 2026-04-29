import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const PRIVATE_TABLES = [
  "dresses",
  "dress_reservations",
  "dress_rentals",
  "dress_rental_accessories",
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

async function assertAnonTableHidden(client, table) {
  const response = await client.from(table).select("id", { count: "exact" }).limit(1);
  if (response.error) {
    if (isDenied(response.error, response.status)) return "denied";
    throw new Error(`${table} anon select returned unexpected error: ${response.error.message}`);
  }
  if ((response.data || []).length > 0 || (response.count || 0) > 0) {
    throw new Error(`${table} exposes rows to anon`);
  }
  return "0 rows";
}

async function assertServiceReadable(client, table) {
  const { error, count } = await client.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(`${table} service-role select failed: ${error.message}`);
  return count ?? 0;
}

async function assertAnonRpcDenied(client, name, args) {
  const { error, status } = await client.rpc(name, args);
  if (!isDenied(error, status)) {
    throw new Error(`${name} anon rpc was not denied; got ${error ? error.message : "success"}`);
  }
}

async function assertServiceRpc(client, name, args, validate) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name} service-role rpc failed: ${error.message}`);
  validate?.(data);
  return data;
}

async function assertServiceRpcReachableWithBusinessError(client, name, args) {
  const { error } = await client.rpc(name, args);
  if (!error) throw new Error(`${name} fake probe unexpectedly succeeded`);

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

const fakeDress = "00000000-0000-0000-0000-000000000001";
const fakeContract = "00000000-0000-0000-0000-000000000002";
const fakeUser = "00000000-0000-0000-0000-000000000003";
const fakeRental = "00000000-0000-0000-0000-000000000004";
const fakeReservation = "00000000-0000-0000-0000-000000000005";

console.log("Verifying dresses table exposure...");
for (const table of PRIVATE_TABLES) {
  const result = await assertAnonTableHidden(anonClient, table);
  console.log(`- ${table}: anon ${result}`);
}

console.log("Verifying service-role table access...");
for (const table of PRIVATE_TABLES) {
  const count = await assertServiceReadable(serviceClient, table);
  console.log(`- ${table}: service-role ok (${count} rows)`);
}

console.log("Verifying dresses read RPCs...");
await assertServiceRpc(serviceClient, "dress_stats", undefined, (data) => {
  if (!data || typeof data !== "object") throw new Error("dress_stats returned invalid payload");
  for (const key of ["total", "available", "reserved", "rented", "maintenance"]) {
    if (!Number.isFinite(Number(data[key]))) {
      throw new Error(`dress_stats.${key} must be numeric`);
    }
  }
});
console.log("- dress_stats: service-role ok");

await assertServiceRpc(
  serviceClient,
  "dress_list",
  {
    p_search: null,
    p_category: null,
    p_status: null,
    p_sort: "newest",
    p_page: 1,
    p_limit: 5,
  },
  (data) => {
    if (!data || typeof data !== "object" || !Array.isArray(data.items)) {
      throw new Error("dress_list returned invalid payload");
    }
  },
);
console.log("- dress_list: service-role ok");

await assertServiceRpc(
  serviceClient,
  "dress_rental_list",
  { p_status: null, p_search: null, p_page: 1, p_limit: 5, p_item_id: null },
  (data) => {
    if (!data || typeof data !== "object" || !Array.isArray(data.rentals)) {
      throw new Error("dress_rental_list returned invalid payload");
    }
  },
);
console.log("- dress_rental_list: service-role ok");

await assertServiceRpc(serviceClient, "is_dress_available", {
  p_dress_id: fakeDress,
  p_start_date: "2026-01-01",
  p_end_date: "2026-01-02",
  p_exclude_reservation_id: null,
  p_exclude_rental_id: null,
});
console.log("- is_dress_available: service-role ok");

console.log("Verifying dresses mutation RPC execute permissions...");
await assertServiceRpcReachableWithBusinessError(
  serviceClient,
  "create_standalone_dress_rental_atomic",
  {
    p_item_id: fakeDress,
    p_contract_id: null,
    p_customer_name: "verify",
    p_phone: "000",
    p_pickup_date: "2026-01-01",
    p_return_date: "2026-01-02",
    p_rental_price: 0,
    p_deposit: 0,
    p_accessories: null,
    p_notes: null,
    p_user_id: fakeUser,
  },
);
console.log("- create_standalone_dress_rental_atomic: service-role reachable");

for (const [name, args] of Object.entries({
  dress_stats: undefined,
  dress_list: {
    p_search: null,
    p_category: null,
    p_status: null,
    p_sort: "newest",
    p_page: 1,
    p_limit: 5,
  },
  dress_rental_list: {
    p_status: null,
    p_search: null,
    p_page: 1,
    p_limit: 5,
    p_item_id: null,
  },
  is_dress_available: {
    p_dress_id: fakeDress,
    p_start_date: "2026-01-01",
    p_end_date: "2026-01-02",
    p_exclude_reservation_id: null,
    p_exclude_rental_id: null,
  },
  create_standalone_dress_rental_atomic: {
    p_item_id: fakeDress,
    p_contract_id: null,
    p_customer_name: "verify",
    p_phone: "000",
    p_pickup_date: "2026-01-01",
    p_return_date: "2026-01-02",
    p_rental_price: 0,
    p_deposit: 0,
    p_accessories: null,
    p_notes: null,
    p_user_id: fakeUser,
  },
  start_dress_rental_atomic: { p_rental_id: fakeRental, p_user_id: fakeUser },
  return_dress_rental_atomic: {
    p_rental_id: fakeRental,
    p_return_condition: "good",
    p_damage_fee: 0,
    p_deposit_returned: true,
    p_notes: null,
    p_user_id: fakeUser,
  },
  cancel_dress_rental_atomic: { p_rental_id: fakeRental, p_user_id: fakeUser },
  mark_dress_cleaned_atomic: { p_dress_id: fakeDress, p_user_id: fakeUser },
  delete_dress_atomic: { p_dress_id: fakeDress, p_user_id: fakeUser },
  create_dress_contract_reservation_atomic: {
    p_dress_id: fakeDress,
    p_contract_id: fakeContract,
    p_contract_item_id: null,
    p_customer_id: null,
    p_start_date: "2026-01-01",
    p_end_date: "2026-01-02",
    p_export_type: null,
    p_is_addon: false,
    p_rental_price: 0,
    p_notes: null,
    p_user_id: fakeUser,
  },
  update_dress_reservation_status_atomic: {
    p_reservation_id: fakeReservation,
    p_status: "cancelled",
    p_user_id: fakeUser,
  },
  release_dress_reservation_atomic: { p_reservation_id: fakeReservation, p_user_id: fakeUser },
})) {
  await assertAnonRpcDenied(anonClient, name, args);
  console.log(`- ${name}: anon denied`);
}

console.log("Verifying dresses storage bucket posture...");
const { data: buckets, error: bucketError } = await serviceClient.storage.listBuckets();
if (bucketError) throw new Error(`storage listBuckets failed: ${bucketError.message}`);
const dressesBucket = buckets.find((bucket) => bucket.name === "dresses");
if (!dressesBucket) throw new Error("dresses bucket is missing");
if (!dressesBucket.public) throw new Error("dresses bucket is expected to be public-read");
console.log("- dresses bucket: public-read, service-role visible");

console.log("Dresses verification passed.");
