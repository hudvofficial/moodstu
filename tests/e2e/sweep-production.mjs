/**
 * sweep-production.mjs
 * ---
 * ONE-TIME sweep script: xóa TẤT CẢ data test cũ khỏi production Supabase.
 * KHÔNG time-bound — xóa mọi row có prefix E2E.
 *
 * Cách chạy: node tests/e2e/sweep-production.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// ── Load .env.local ─────────────────────────────────────────────────────
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function safeDelete(admin, table, col, ids) {
  try {
    const { error } = await admin.from(table).delete().in(col, ids);
    if (error) return { ok: false, msg: `${table}: ${error.message}` };
    return { ok: true, msg: "" };
  } catch (err) {
    return { ok: false, msg: `${table}: ${err.message}` };
  }
}

async function safeDeleteById(admin, table, id) {
  try {
    const { error } = await admin.from(table).delete().eq("id", id);
    if (error) return { ok: false, msg: `${table}(${id}): ${error.message}` };
    return { ok: true, msg: "" };
  } catch (err) {
    return { ok: false, msg: `${table}(${id}): ${err.message}` };
  }
}

async function safeDeleteUser(admin, userId) {
  try {
    await admin.auth.admin.deleteUser(userId);
    return true;
  } catch {
    return false;
  }
}

// ── Main sweep ──────────────────────────────────────────────────────────
async function main() {
  const root = process.cwd();
  loadEnvFile(path.join(root, ".env.local"));

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Service role key: ${serviceKey.slice(0, 15)}...`);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let totalContracts = 0;
  let totalCustomers = 0;
  let totalEmployees = 0;
  let totalAuthUsers = 0;

  // ── 1. Tìm & xóa contracts E2E + child rows (3 pass để handle FK) ──
  console.log("\n📋 BƯỚC 1: Quét contracts E2E...");

  let allContractIds = [];
  let page = 0;
  const perPage = 1000;
  while (true) {
    const { data: contracts, error } = await admin
      .from("contracts")
      .select("id, contract_code")
      .like("contract_code", "E2E-%")
      .range(page * perPage, (page + 1) * perPage - 1);

    if (error) {
      console.error(`  ❌ Query contracts failed: ${error.message}`);
      break;
    }
    if (!contracts || contracts.length === 0) break;

    for (const c of contracts) {
      allContractIds.push(c.id);
    }
    console.log(`  📄 Page ${page + 1}: found ${contracts.length} contracts (e.g. ${contracts[0]?.contract_code})`);
    page++;
  }

  totalContracts = allContractIds.length;
  console.log(`  📊 Tổng contracts E2E: ${totalContracts}`);

  if (allContractIds.length > 0) {
    const chunkSize = 200;

    // Pass 1: Delete expenses first (FK to contracts + printing_orders)
    for (let i = 0; i < allContractIds.length; i += chunkSize) {
      const chunk = allContractIds.slice(i, i + chunkSize);
      const r = await safeDelete(admin, "expenses", "contract_id", chunk);
      if (!r.ok) console.log(`  ⚠️  ${r.msg}`);
    }
    console.log("  🗑️  expenses (contract_id)");

    // Also delete expenses linked via printing_orders
    // (printing_orders rows with matching contract_id)
    const { data: poIds } = await admin
      .from("printing_orders")
      .select("id")
      .in("contract_id", allContractIds.slice(0, 500));
    if (poIds?.length) {
      for (let i = 0; i < poIds.length; i += chunkSize) {
        const chunk = poIds.slice(i, i + chunkSize).map((p) => p.id);
        await safeDelete(admin, "expenses", "printing_order_id", chunk);
      }
      console.log("  🗑️  expenses (printing_order_id)");
    }

    // Pass 2: Delete child rows
    const childTables = [
      "work_tasks",
      "contract_events",
      "payments",
      "payment_plans",
      "contract_checklists",
      "contract_notes",
      "printing_orders",
      "contract_items",
      "dress_reservations",
    ];

    for (const table of childTables) {
      for (let i = 0; i < allContractIds.length; i += chunkSize) {
        const chunk = allContractIds.slice(i, i + chunkSize);
        const r = await safeDelete(admin, table, "contract_id", chunk);
        if (!r.ok) console.log(`  ⚠️  ${r.msg}`);
      }
      console.log(`  🗑️  ${table}`);
    }

    // Pass 3: Delete contracts
    for (let i = 0; i < allContractIds.length; i += chunkSize) {
      const chunk = allContractIds.slice(i, i + chunkSize);
      const r = await safeDelete(admin, "contracts", "id", chunk);
      if (!r.ok) console.log(`  ⚠️  ${r.msg}`);
    }
    console.log("  ✅ Contracts E2E đã xóa");
  }

  // ── 2. Xóa customers E2E ────────────────────────────────────────────
  console.log("\n📋 BƯỚC 2: Quét customers E2E...");

  let customerPages = 0;
  while (true) {
    const { data: customers } = await admin
      .from("customers")
      .select("id, customer_code")
      .or("customer_code.ilike.E2E-%,full_name.ilike.E2E%")
      .range(customerPages * perPage, (customerPages + 1) * perPage - 1);

    if (!customers || customers.length === 0) break;

    for (const c of customers) {
      const r = await safeDeleteById(admin, "customers", c.id);
      if (r.ok) totalCustomers++;
      else console.log(`  ⚠️  ${r.msg}`);
    }
    console.log(`  📄 Customer page ${customerPages + 1}: ${customers.length} rows`);
    customerPages++;
  }
  console.log(`  🗑️  Đã xóa ${totalCustomers} customers`);

  // ── 3. Xóa employees E2E ────────────────────────────────────────────
  console.log("\n📋 BƯỚC 3: Quét employees E2E...");

  let empPage = 0;
  const authIdsToDelete = new Set();
  while (true) {
    const { data: employees } = await admin
      .from("employees")
      .select("id, employee_code, auth_user_id")
      .or("employee_code.ilike.E2E-%,department.eq.E2E")
      .range(empPage * perPage, (empPage + 1) * perPage - 1);

    if (!employees || employees.length === 0) break;

    for (const e of employees) {
      const r = await safeDeleteById(admin, "employees", e.id);
      if (r.ok) {
        totalEmployees++;
        if (e.auth_user_id) authIdsToDelete.add(e.auth_user_id);
      }
      else console.log(`  ⚠️  ${r.msg}`);
    }
    console.log(`  📄 Employee page ${empPage + 1}: ${employees.length} rows`);
    empPage++;
  }
  console.log(`  🗑️  Đã xóa ${totalEmployees} employees`);

  // ── 4. Xóa auth users E2E ───────────────────────────────────────────
  console.log("\n📋 BƯỚC 4: Quét auth users e2e-...");

  // Collect all auth IDs from employees + listUsers
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of list?.users ?? []) {
    const email = (u.email ?? "").toLowerCase();
    if (email.includes("e2e-")) {
      authIdsToDelete.add(u.id);
    }
  }

  for (const id of authIdsToDelete) {
    if (await safeDeleteUser(admin, id)) totalAuthUsers++;
  }
  console.log(`  🗑️  Đã xóa ${totalAuthUsers} auth users`);

  // ── Tổng kết ─────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════");
  console.log("✅ SWEEP PRODUCTION HOÀN TẤT");
  console.log("═══════════════════════════════════════");
  console.log(`  Contracts:    ${totalContracts}`);
  console.log(`  Customers:    ${totalCustomers}`);
  console.log(`  Employees:    ${totalEmployees}`);
  console.log(`  Auth users:   ${totalAuthUsers}`);
  console.log("═══════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("❌ Sweep failed:", err.message);
  process.exit(1);
});
