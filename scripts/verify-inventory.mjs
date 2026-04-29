import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const PRIVATE_TABLES = ["inventory_items", "inventory_transactions"];

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
    throw new Error(
      `${name} anon rpc was not denied; got ${error ? error.message : "success"}`,
    );
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
  if (!error) throw new Error(`${name} fake-item probe unexpectedly succeeded`);

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

const fakeItem = "00000000-0000-0000-0000-000000000001";
const fakeUser = "00000000-0000-0000-0000-000000000002";

const stockInArgs = {
  p_item_id: fakeItem,
  p_quantity: 1,
  p_unit_cost: 1,
  p_supplier: null,
  p_reason: "verify-inventory",
  p_notes: null,
  p_user_id: fakeUser,
};

const stockOutArgs = {
  p_item_id: fakeItem,
  p_quantity: 1,
  p_contract_id: null,
  p_reason: "verify-inventory",
  p_customer_name: null,
  p_customer_phone: null,
  p_notes: null,
  p_user_id: fakeUser,
};

console.log("Verifying inventory table exposure...");
for (const table of PRIVATE_TABLES) {
  const result = await assertAnonTableHidden(anonClient, table);
  console.log(`- ${table}: anon ${result}`);
}

console.log("Verifying service-role table access...");
for (const table of PRIVATE_TABLES) {
  const count = await assertServiceReadable(serviceClient, table);
  console.log(`- ${table}: service-role ok (${count} rows)`);
}

console.log("Verifying inventory aggregate RPCs...");
await assertServiceRpc(serviceClient, "inventory_stats", undefined, (data) => {
  if (!data || typeof data !== "object") {
    throw new Error("inventory_stats returned invalid payload");
  }
  for (const key of ["total", "active", "lowStock", "outOfStock", "totalValue", "transactionsThisMonth"]) {
    if (!Number.isFinite(Number(data[key]))) {
      throw new Error(`inventory_stats.${key} must be numeric`);
    }
  }
});
console.log("- inventory_stats: service-role ok");

await assertServiceRpc(
  serviceClient,
  "inventory_list",
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
      throw new Error("inventory_list returned invalid payload");
    }
  },
);
console.log("- inventory_list: service-role ok");

await assertServiceRpc(serviceClient, "inventory_item_transaction_totals", {
  p_item_id: fakeItem,
});
console.log("- inventory_item_transaction_totals: service-role ok");

console.log("Verifying inventory RPC execute permissions...");
await assertServiceRpcReachableWithBusinessError(
  serviceClient,
  "inventory_stock_in_atomic",
  stockInArgs,
);
console.log("- inventory_stock_in_atomic: service-role reachable");

await assertServiceRpcReachableWithBusinessError(
  serviceClient,
  "inventory_stock_out_atomic",
  stockOutArgs,
);
console.log("- inventory_stock_out_atomic: service-role reachable");

for (const [name, args] of Object.entries({
  inventory_stats: undefined,
  inventory_list: {
    p_search: null,
    p_category: null,
    p_status: null,
    p_sort: "newest",
    p_page: 1,
    p_limit: 5,
  },
  inventory_item_transaction_totals: { p_item_id: fakeItem },
  inventory_stock_in_atomic: stockInArgs,
  inventory_stock_out_atomic: stockOutArgs,
})) {
  await assertAnonRpcDenied(anonClient, name, args);
  console.log(`- ${name}: anon denied`);
}

console.log("Inventory verification passed.");
