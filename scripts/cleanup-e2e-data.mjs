import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const DRY_RUN = process.argv.includes("--dry-run");
if (DRY_RUN) console.log("=== DRY RUN — no deletions ===\n");

// 1) Find all E2E contracts
const { data: e2eContracts, error: cErr } = await admin
  .from("contracts")
  .select("id, contract_code, created_at")
  .like("contract_code", "E2E-%");

if (cErr) { console.error("Error querying contracts:", cErr.message); process.exit(1); }
console.log(`Found ${e2eContracts?.length ?? 0} E2E contracts`);
if (e2eContracts?.length) {
  for (const c of e2eContracts) console.log(`  - ${c.contract_code} (${c.created_at})`);
}

// 2) Find all E2E customers
const { data: cust1 } = await admin.from("customers").select("id, customer_code, full_name").like("customer_code", "E2E-%");
const { data: cust2 } = await admin.from("customers").select("id, customer_code, full_name").like("full_name", "E2E%");
const custMap = new Map();
for (const c of [...(cust1 ?? []), ...(cust2 ?? [])]) custMap.set(c.id, c);
const e2eCustomers = [...custMap.values()];
console.log(`Found ${e2eCustomers.length} E2E customers`);
for (const c of e2eCustomers) console.log(`  - ${c.customer_code ?? "?"} / ${c.full_name}`);

// 3) Find all E2E employees
const { data: e2eEmps } = await admin.from("employees").select("id, employee_code, full_name, auth_user_id, department").eq("department", "E2E");
console.log(`Found ${e2eEmps?.length ?? 0} E2E employees`);
for (const e of e2eEmps ?? []) console.log(`  - ${e.employee_code} / ${e.full_name}`);

// 4) Find E2E auth users
const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
const e2eAuthUsers = (authList?.users ?? []).filter(u => /^e2e-.*@(test\.local|moodwedding\.com)$/i.test(u.email ?? ""));
console.log(`Found ${e2eAuthUsers.length} E2E auth users`);
for (const u of e2eAuthUsers) console.log(`  - ${u.email} (${u.id})`);

if (DRY_RUN) { console.log("\n=== DRY RUN complete — pass without --dry-run to delete ==="); process.exit(0); }

// ---- DELETIONS ----
console.log("\n--- Deleting ---");

// 5) Delete contract child rows
if (e2eContracts?.length) {
  const contractIds = e2eContracts.map(c => c.id);
  const childTables = [
    "work_tasks", "contract_events", "payments", "payment_plan_allocations",
    "payment_plans", "contract_checklists", "contract_notes",
    "expenses", "printing_orders", "contract_items", "dress_reservations",
  ];
  for (const table of childTables) {
    const { error, count } = await admin.from(table).delete({ count: "exact" }).in("contract_id", contractIds);
    if (error) console.log(`  ${table}: ERROR — ${error.message}`);
    else console.log(`  ${table}: deleted ${count ?? "?"} rows`);
  }

  // Delete contracts themselves
  const { error: delErr, count: delCount } = await admin.from("contracts").delete({ count: "exact" }).in("id", contractIds);
  if (delErr) console.log(`  contracts: ERROR — ${delErr.message}`);
  else console.log(`  contracts: deleted ${delCount ?? "?"} rows`);
}

// 6) Delete E2E customers
if (e2eCustomers.length) {
  const custIds = e2eCustomers.map(c => c.id);
  const { error, count } = await admin.from("customers").delete({ count: "exact" }).in("id", custIds);
  if (error) console.log(`  customers: ERROR — ${error.message}`);
  else console.log(`  customers: deleted ${count ?? "?"} rows`);
}

// 7) Delete E2E employees
if (e2eEmps?.length) {
  const empIds = e2eEmps.map(e => e.id);
  const { error, count } = await admin.from("employees").delete({ count: "exact" }).in("id", empIds);
  if (error) console.log(`  employees: ERROR — ${error.message}`);
  else console.log(`  employees: deleted ${count ?? "?"} rows`);
}

// 8) Delete E2E auth users
for (const u of e2eAuthUsers) {
  const { error } = await admin.auth.admin.deleteUser(u.id);
  if (error) console.log(`  auth user ${u.email}: ERROR — ${error.message}`);
  else console.log(`  auth user ${u.email}: deleted`);
}

console.log("\n=== Cleanup complete ===");
