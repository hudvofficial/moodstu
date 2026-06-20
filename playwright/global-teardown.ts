/**
 * playwright/global-teardown.ts
 * ──────────────────────────────
 * Runs ONCE after the entire Playwright test suite finishes.
 *
 * Responsibilities:
 *   1. Read /tmp/e2e-seed-ids.json (written by global-setup.ts).
 *   2. Delete ALL rows seeded in that run — in correct FK order:
 *        printing_order items → printing_orders
 *        contract_events / payments / work_tasks / … → contracts
 *        contracts → customers
 *        employees → auth users
 *   3. Remove the seed file so a fresh run starts clean.
 *
 * Safety:
 *   - Operates ONLY on IDs captured during setup (no broad LIKE sweeps).
 *   - Falls back to a LIKE-based E2E sweep if the seed file is missing
 *     (handles Ctrl-C between setup and teardown).
 *   - Never throws — logs errors and continues so Playwright exit code
 *     reflects test results, not teardown failures.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { GlobalSeedIds } from "./global-setup";

// ─── Env helpers ─────────────────────────────────────────────────────────────

function loadEnvFile(filePath: string): void {
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
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[global-teardown] Missing env var: ${name}`);
  return v;
}

// ─── Supabase admin client ────────────────────────────────────────────────────

function createAdminClient(): SupabaseClient {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Child-table order (FK safe — no ON DELETE CASCADE relied upon) ───────────

const CONTRACT_CHILD_TABLES = [
  "work_tasks",
  "contract_events",
  "payments",
  "payment_plans",
  "contract_checklists",
  "contract_notes",
  "expenses",          // ← must be deleted BEFORE printing_orders (FK reference)
  "printing_orders",
  "contract_items",
  "dress_reservations",
] as const;

// ─── Cleanup using captured IDs ───────────────────────────────────────────────

async function cleanupById(
  admin: SupabaseClient,
  ids: GlobalSeedIds,
): Promise<void> {
  const { allContractIds, customerId, extraCustomerId, userId } = ids;

  // 1. Child rows of all contracts
  if (allContractIds.length > 0) {
    for (const table of CONTRACT_CHILD_TABLES) {
      const { error } = await admin
        .from(table)
        .delete()
        .in("contract_id", allContractIds);
      if (error) {
        console.warn(`[global-teardown] ⚠️  ${table} cleanup: ${error.message}`);
      }
    }
    // 2. Contracts themselves
    const { error: cErr } = await admin
      .from("contracts")
      .delete()
      .in("id", allContractIds);
    if (cErr) console.warn(`[global-teardown] ⚠️  contracts cleanup: ${cErr.message}`);
    else console.log(`[global-teardown] ✅ Deleted ${allContractIds.length} contracts`);
  }

  // 3. Customers (after contracts — FK)
  const customerIds = [customerId, extraCustomerId].filter(Boolean) as string[];
  if (customerIds.length > 0) {
    const { error: custErr } = await admin
      .from("customers")
      .delete()
      .in("id", customerIds);
    if (custErr) console.warn(`[global-teardown] ⚠️  customers cleanup: ${custErr.message}`);
    else console.log(`[global-teardown] ✅ Deleted ${customerIds.length} customers`);
  }

  // 4. Employee + Auth user
  if (userId) {
    const { error: empErr } = await admin
      .from("employees")
      .delete()
      .eq("auth_user_id", userId);
    if (empErr) console.warn(`[global-teardown] ⚠️  employee cleanup: ${empErr.message}`);

    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    if (authErr) console.warn(`[global-teardown] ⚠️  auth user cleanup: ${authErr.message}`);
    else console.log(`[global-teardown] ✅ Deleted auth user ${userId}`);
  }
}

// ─── Fallback: LIKE-sweep when seed file is missing ──────────────────────────

async function fallbackSweep(admin: SupabaseClient): Promise<void> {
  console.log("[global-teardown] 🔄 No seed file — running fallback E2E sweep…");

  // Remove E2E contracts (stale only — older than 1 hour to be safe)
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  try {
    const { data: staleContracts } = await admin
      .from("contracts")
      .select("id")
      .like("contract_code", "E2E-%")
      .lt("created_at", cutoff);

    if (staleContracts?.length) {
      const contractIds = staleContracts.map((r) => r.id as string);
      for (const table of CONTRACT_CHILD_TABLES) {
        try {
          await admin.from(table).delete().in("contract_id", contractIds);
        } catch {
          // best-effort
        }
      }
      await admin.from("contracts").delete().in("id", contractIds);
      console.log(`[global-teardown] ✅ Fallback removed ${contractIds.length} E2E contracts`);
    }

    await admin.from("customers").delete().like("customer_code", "E2E-%").lt("created_at", cutoff);
    await admin.from("customers").delete().like("full_name", "E2E%").lt("created_at", cutoff);
  } catch (e) {
    console.warn(`[global-teardown] ⚠️  Fallback sweep error: ${(e as Error).message}`);
  }

  // Remove E2E auth users (department='E2E' employees, old)
  try {
    const { data: staleEmps } = await admin
      .from("employees")
      .select("id, auth_user_id")
      .eq("department", "E2E")
      .lt("created_at", cutoff);

    if (staleEmps?.length) {
      await admin
        .from("employees")
        .delete()
        .in("id", staleEmps.map((e) => e.id as string));
      for (const emp of staleEmps) {
        if (emp.auth_user_id) {
          await admin.auth.admin.deleteUser(emp.auth_user_id as string).catch(() => {});
        }
      }
      console.log(`[global-teardown] ✅ Fallback removed ${staleEmps.length} E2E employees`);
    }
  } catch (e) {
    console.warn(`[global-teardown] ⚠️  Fallback employee sweep error: ${(e as Error).message}`);
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const SEED_FILE = path.join(os.tmpdir(), "e2e-seed-ids.json");

export default async function globalTeardown(): Promise<void> {
  console.log("[global-teardown] 🧹 Starting E2E global teardown…");

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error(`[global-teardown] ❌ Cannot create admin client: ${(e as Error).message}`);
    return;
  }

  if (existsSync(SEED_FILE)) {
    let ids: GlobalSeedIds;
    try {
      ids = JSON.parse(readFileSync(SEED_FILE, "utf8")) as GlobalSeedIds;
    } catch (e) {
      console.error(`[global-teardown] ❌ Cannot parse seed file: ${(e as Error).message}`);
      await fallbackSweep(admin);
      return;
    }

    console.log(
      `[global-teardown] Found seed file (marker=${ids.marker}, seeded at ${ids.seededAt})`,
    );

    await cleanupById(admin, ids);

    // Remove seed file
    try {
      unlinkSync(SEED_FILE);
      console.log(`[global-teardown] ✅ Seed file removed: ${SEED_FILE}`);
    } catch {
      // Not critical
    }
  } else {
    console.log(`[global-teardown] ℹ️  No seed file at ${SEED_FILE}`);
    await fallbackSweep(admin);
  }

  console.log("[global-teardown] ✅ Teardown complete.");
}
