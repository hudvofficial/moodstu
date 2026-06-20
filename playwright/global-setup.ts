/**
 * playwright/global-setup.ts
 * ─────────────────────────
 * Runs ONCE before the entire Playwright test suite.
 *
 * Responsibilities:
 *   1. Read credentials from .env.local (NEXT_PUBLIC_SUPABASE_URL +
 *      SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY).
 *   2. Seed ONE shared E2E admin user + 20 contracts (1 full + 19 simple)
 *      into Supabase — all tagged with the E2E- prefix so they're easy to
 *      identify and never mixed with real production data.
 *   3. Persist the resulting IDs to /tmp/e2e-seed-ids.json so individual
 *      specs can read them (and so teardown can clean up everything).
 *   4. Batch inserts ≤ 5 rows at a time (PostgREST default limit safety).
 *
 * Data isolation strategy:
 *   - All rows use prefix E2E- in codes/names.
 *   - Auth user email: e2e-global-<marker>@test.local (swept by e2e-sweep.ts).
 *   - Teardown deletes every row whose ID was captured here.
 *   - sweepStaleE2EOrphans() in each spec's beforeAll picks up anything
 *     teardown missed (Ctrl-C, worker crash, etc.).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GlobalSeedIds {
  /** ISO timestamp of when the seed ran — used by sweep as staleness guard. */
  seededAt: string;
  /** Unique marker embedded in all codes so concurrent runs don't collide. */
  marker: string;

  // Auth / employee
  userId: string;
  employeeId: string;

  // Contracts
  /** The "full" contract (with events + printing_order). */
  contractId: string;
  /** The 19 simple bulk contracts. */
  extraContractIds: string[];
  /** All contract IDs in one flat array (contractId + extraContractIds). */
  allContractIds: string[];

  // Customers
  customerId: string;
  extraCustomerId: string;

  // Events / printing (from full contract)
  eventIds: string[];
  printingOrderId: string | null;

  // Login credentials (for test login helpers)
  email: string;
  password: string;
  /** contract_code of the full contract. */
  contractCode: string;
}

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
  if (!v) throw new Error(`[global-setup] Missing required env var: ${name}`);
  return v;
}

// ─── Supabase admin client ────────────────────────────────────────────────────

function createAdminClient(): SupabaseClient {
  loadEnvFile(path.join(process.cwd(), ".env.local"));

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  // Prefer service role (bypasses RLS); fall back to anon key.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────

/** Batch-insert rows in slices ≤ BATCH_SIZE (PostgREST safety). */
async function batchInsert<T extends Record<string, unknown>>(
  admin: SupabaseClient,
  table: string,
  rows: T[],
  batchSize = 5,
): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize);
    const { data, error } = await admin.from(table).insert(slice as never).select("id");
    if (error) throw new Error(`[global-setup] Insert into ${table}: ${error.message}`);
    for (const row of data ?? []) ids.push((row as { id: string }).id);
  }
  return ids;
}

// ─── Main seed logic ──────────────────────────────────────────────────────────

async function runSeed(admin: SupabaseClient): Promise<GlobalSeedIds> {
  const ts = Date.now();
  const marker = ts.toString(36).toUpperCase(); // e.g. "LJ14FDCW"
  const email = `e2e-global-${ts}@test.local`;
  const password = `E2eGlobal!${ts}`;
  const contractCode = `E2E-GLOBAL-${marker.slice(-6)}`;

  console.log(`[global-setup] 🌱 Seeding with marker=${marker}`);

  // ── 1. Auth user ────────────────────────────────────────────────────────────
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: `E2E Global ${marker}` },
  });
  if (authErr || !authData.user)
    throw new Error(`[global-setup] Cannot create auth user: ${authErr?.message ?? "no user"}`);
  const userId = authData.user.id;
  console.log(`[global-setup] ✅ Auth user created: ${email} (${userId})`);

  // ── 2. Employee (update trigger-provisioned row) ─────────────────────────────
  const { data: empRow, error: empErr } = await admin
    .from("employees")
    .update({
      employee_code: `E2E-GLB-${marker.slice(-6)}`,
      department: "E2E",
      position: "QA",
      role: "admin",
      status: "active",
      start_date: "2026-01-01",
    })
    .eq("auth_user_id", userId)
    .select("id")
    .single();
  if (empErr || !empRow)
    throw new Error(`[global-setup] Cannot update employee: ${empErr?.message ?? "no row"}`);
  const employeeId = empRow.id as string;
  console.log(`[global-setup] ✅ Employee updated: ${employeeId}`);

  // ── 3. Primary customer (for full contract) ──────────────────────────────────
  const { data: custRow, error: custErr } = await admin
    .from("customers")
    .insert({
      customer_code: `E2E-GLB-CUS-${marker}`,
      full_name: `E2E Global ${marker}`,
      phone: "0900000001",
      bride_name: `Bride ${marker}`,
      groom_name: `Groom ${marker}`,
      status: "active",
      notes: `E2E global seed ${marker}`,
    })
    .select("id")
    .single();
  if (custErr || !custRow)
    throw new Error(`[global-setup] Cannot create customer: ${custErr?.message ?? "no row"}`);
  const customerId = custRow.id as string;
  console.log(`[global-setup] ✅ Primary customer: ${customerId}`);

  // ── 4. Full contract (events + printing order) ───────────────────────────────
  const { data: contractRow, error: contractErr } = await admin
    .from("contracts")
    .insert({
      contract_code: contractCode,
      customer_id: customerId,
      contract_date: "2026-06-30",
      work_date: "2026-07-05",
      delivery_date: "2026-07-10",
      service_type: "studio",
      transaction_type: "hop_dong",
      status: "dang_thuc_hien",
      payment_status: "chua_thanh_toan",
      total_amount: 5_000_000,
      paid_amount: 1_000_000,
      remaining_amount: 4_000_000,
      notes: `E2E global seed ${marker}`,
    })
    .select("id")
    .single();
  if (contractErr || !contractRow)
    throw new Error(`[global-setup] Cannot create contract: ${contractErr?.message ?? "no row"}`);
  const contractId = contractRow.id as string;
  console.log(`[global-setup] ✅ Full contract: ${contractId} (${contractCode})`);

  // ── 5. Contract events (batch, ≤5 each) ─────────────────────────────────────
  const eventRows = [
    {
      contract_id: contractId,
      event_type: "ngay_chup",
      title: `E2E Global Chụp ${marker}`,
      event_date: "2026-07-05",
      location: "E2E Studio",
      status: "chua_lam",
      sort_order: 1,
      is_manual_date: true,
    },
    {
      contract_id: contractId,
      event_type: "hau_ky",
      title: `E2E Global Hậu kỳ ${marker}`,
      event_date: "2026-07-07",
      status: "chua_lam",
      sort_order: 2,
      is_manual_date: true,
    },
  ];
  const eventIds = await batchInsert(admin, "contract_events", eventRows, 5);
  console.log(`[global-setup] ✅ Contract events: ${eventIds.length} rows`);

  // ── 6. Printing order ────────────────────────────────────────────────────────
  let printingOrderId: string | null = null;
  try {
    const { data: printData, error: printErr } = await admin.rpc(
      "create_printing_order_atomic",
      {
        p_order: {
          contractId,
          labId: null,
          items: [
            { name: "Album 20x30", quantity: 1, unitPrice: 250_000 },
            { name: "Ảnh cổng 60x90", quantity: 1, unitPrice: 112_500 },
          ],
          notes: `E2E global seed ${marker}`,
          expectedDate: "2026-07-08",
        },
        p_actor_id: userId,
      },
    );
    if (printErr) {
      console.warn(`[global-setup] ⚠️ Printing order RPC skipped: ${printErr.message}`);
    } else {
      printingOrderId = (printData as { order_id?: string })?.order_id ?? null;
      console.log(`[global-setup] ✅ Printing order: ${printingOrderId}`);
    }
  } catch (e) {
    console.warn(`[global-setup] ⚠️ Printing order skipped: ${(e as Error).message}`);
  }

  // ── 7. Bulk customer (for 19 simple contracts) ───────────────────────────────
  const { data: bulkCustRow, error: bulkCustErr } = await admin
    .from("customers")
    .insert({
      customer_code: `E2E-GLB-BULK-CUS-${marker}`,
      full_name: `E2E Bulk ${marker}`,
      phone: "0900000002",
      status: "active",
    })
    .select("id")
    .single();
  if (bulkCustErr || !bulkCustRow)
    throw new Error(`[global-setup] Cannot create bulk customer: ${bulkCustErr?.message ?? "no row"}`);
  const extraCustomerId = bulkCustRow.id as string;
  console.log(`[global-setup] ✅ Bulk customer: ${extraCustomerId}`);

  // ── 8. 19 simple contracts (batch ≤5 each) ───────────────────────────────────
  const SIMPLE_COUNT = 19;
  const simpleRows: Record<string, unknown>[] = Array.from(
    { length: SIMPLE_COUNT },
    (_, i) => ({
      contract_code: `E2E-GLB-BULK-${marker.slice(-4)}-${String(i + 1).padStart(2, "0")}`,
      customer_id: extraCustomerId,
      contract_date: "2026-06-30",
      work_date: "2026-07-05",
      service_type: "studio",
      transaction_type: "hop_dong",
      status: "dang_thuc_hien",
      payment_status: "chua_thanh_toan",
      total_amount: 1_000_000 + i * 500_000,
      paid_amount: 0,
      remaining_amount: 1_000_000 + i * 500_000,
      notes: `E2E global bulk seed ${marker}`,
    }),
  );
  const extraContractIds = await batchInsert(admin, "contracts", simpleRows, 5);
  console.log(`[global-setup] ✅ Bulk contracts: ${extraContractIds.length} rows`);

  // ── Assemble result ───────────────────────────────────────────────────────────
  const allContractIds = [contractId, ...extraContractIds];

  const ids: GlobalSeedIds = {
    seededAt: new Date().toISOString(),
    marker,
    userId,
    employeeId,
    contractId,
    extraContractIds,
    allContractIds,
    customerId,
    extraCustomerId,
    eventIds,
    printingOrderId,
    email,
    password,
    contractCode,
  };

  return ids;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const SEED_FILE = path.join(os.tmpdir(), "e2e-seed-ids.json");

export default async function globalSetup(): Promise<void> {
  console.log("[global-setup] 🚀 Starting E2E global setup…");
  console.log(`[global-setup] Seed file → ${SEED_FILE}`);

  const admin = createAdminClient();
  const ids = await runSeed(admin);

  writeFileSync(SEED_FILE, JSON.stringify(ids, null, 2), "utf8");
  console.log(
    `[global-setup] ✅ Done. Seeded ${ids.allContractIds.length} contracts. IDs saved to ${SEED_FILE}`,
  );
}

export { SEED_FILE };
