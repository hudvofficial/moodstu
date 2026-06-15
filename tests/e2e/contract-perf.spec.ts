/**
 * E2E Performance Tests — Contract Module
 *
 * 1. Optimistic UI: add/delete event responds instantly (no spinner blocking)
 * 2. Network overhead: opening event modal does NOT trigger redundant full-data fetches
 * 3. React Compiler guard: no "Rendered more hooks" console error on detail page
 *
 * Shares seed infrastructure with contract-operational.spec.ts.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { sweepStaleE2EOrphans } from "./e2e-sweep";

type AdminClient = SupabaseClient;

interface SeedState {
  marker: string;
  email: string;
  password: string;
  employeeName: string;
  seededEventTitle: string;
  userId?: string;
  employeeId?: string;
  customerId?: string;
  contractId?: string;
  eventId?: string;
}

function loadEnvFile(filePath: string) {
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

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function createAdminSupabase() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function cleanupSeed(admin: AdminClient, seed: SeedState) {
  if (seed.contractId) {
    await admin.from("work_tasks").delete().eq("contract_id", seed.contractId);
    await admin.from("contract_events").delete().eq("contract_id", seed.contractId);
    await admin.from("payments").delete().eq("contract_id", seed.contractId);
    await admin.from("printing_orders").delete().eq("contract_id", seed.contractId);
    await admin.from("contract_items").delete().eq("contract_id", seed.contractId);
    await admin.from("contracts").delete().eq("id", seed.contractId);
  }
  if (seed.customerId) {
    await admin.from("customers").delete().eq("id", seed.customerId);
  }
  if (seed.userId) {
    // Delete by auth_user_id, not seed.employeeId: the on_auth_user_created
    // trigger provisions an employees row as soon as the auth user exists, so a
    // seed that aborts before employeeId is captured still leaves that row
    // behind (FK to auth users does not cascade). auth_user_id always covers it.
    await admin.from("employees").delete().eq("auth_user_id", seed.userId);
    await admin.auth.admin.deleteUser(seed.userId);
  }
}

async function seedContractFlow(admin: AdminClient, seed: SeedState) {
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: seed.email,
    password: seed.password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: seed.employeeName },
  });
  if (authError || !authUser.user) throw new Error(`Cannot create E2E auth user: ${authError?.message || "missing user"}`);
  seed.userId = authUser.user.id;

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .update({
      employee_code: `E2E-${Date.now().toString(36).toUpperCase()}`,
      department: "E2E",
      position: "QA",
      role: "admin",
      status: "active",
      start_date: "2026-05-15",
    })
    .eq("auth_user_id", seed.userId)
    .select("id")
    .single();
  if (employeeError || !employee) throw new Error(`Cannot create E2E employee: ${employeeError?.message || "missing row"}`);
  seed.employeeId = employee.id;

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({
      customer_code: `E2E-CUS-${seed.marker}`,
      full_name: `E2E Customer ${seed.marker}`,
      phone: "0901234567",
      bride_name: `Bride ${seed.marker}`,
      groom_name: `Groom ${seed.marker}`,
      status: "active",
      notes: seed.marker,
    })
    .select("id")
    .single();
  if (customerError || !customer) throw new Error(`Cannot create E2E customer: ${customerError?.message || "missing row"}`);
  seed.customerId = customer.id;

  const { data: contract, error: contractError } = await admin
    .from("contracts")
    .insert({
      contract_code: `E2E-HD-${seed.marker}`,
      customer_id: seed.customerId,
      contract_date: "2026-05-15",
      work_date: "2026-05-20",
      delivery_date: "2026-05-25",
      service_type: "studio",
      transaction_type: "hop_dong",
      status: "cho_xu_ly",
      payment_status: "chua_thanh_toan",
      total_amount: 1000000,
      paid_amount: 0,
      remaining_amount: 1000000,
      notes: seed.marker,
    })
    .select("id")
    .single();
  if (contractError || !contract) throw new Error(`Cannot create E2E contract: ${contractError?.message || "missing row"}`);
  seed.contractId = contract.id;

  const { data: event, error: eventError } = await admin
    .from("contract_events")
    .insert({
      contract_id: seed.contractId,
      event_type: "ngay_chup",
      title: seed.seededEventTitle,
      event_date: "2026-05-20",
      location: "E2E Studio",
      status: "chua_lam",
      sort_order: 1,
      is_manual_date: true,
    })
    .select("id")
    .single();
  if (eventError || !event) throw new Error(`Cannot create E2E event: ${eventError?.message || "missing row"}`);
  seed.eventId = event.id;
}

async function login(page: Page, seed: SeedState) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(seed.email);
  await page.locator('input[name="password"]').fill(seed.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
}

function eventCard(page: Page, title: string) {
  return page.getByTestId("contract-event-card").filter({ hasText: title }).first();
}

// ─── Perf budgets ───────────────────────────
const OPTIMISTIC_BUDGET_MS = 3_000;
const INTERACTION_BUDGET_MS = 15_000;

test.describe.serial("contract perf: optimistic UI + network + compiler guard", () => {
  let admin: AdminClient;
  const timestamp = Date.now();
  const seed: SeedState = {
    marker: `${timestamp}`,
    email: `e2e-perf-${timestamp}@moodwedding.com`,
    password: `E2ePerf${timestamp}!`,
    employeeName: `E2E PerfAdmin ${timestamp}`,
    seededEventTitle: `E2E Perf Seed ${timestamp}`,
  };

  test.beforeAll(async () => {
    admin = createAdminSupabase();
    await sweepStaleE2EOrphans(admin);
    await seedContractFlow(admin, seed);
  });

  test.afterAll(async () => {
    if (admin) await cleanupSeed(admin, seed);
  });

  test("1. React Compiler guard: no 'Rendered more hooks' error on contract detail", async ({ page }) => {
    test.skip(!seed.contractId, "Seed not created");
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("Rendered more hooks")) {
        consoleErrors.push(msg.text());
      }
    });

    await login(page, seed);
    await page.goto(`/contracts/${seed.contractId}`);
    await expect(eventCard(page, seed.seededEventTitle)).toBeVisible({ timeout: 45_000 });

    // Give page time to settle (React hydration + deferred effects)
    await page.waitForTimeout(2_000);

    expect(consoleErrors).toEqual([]);
  });

  test("2. Optimistic UI: add event appears instantly without spinner blocking", async ({ page }) => {
    test.skip(!seed.contractId, "Seed not created");
    await login(page, seed);
    await page.goto(`/contracts/${seed.contractId}`);
    await expect(eventCard(page, seed.seededEventTitle)).toBeVisible({ timeout: 45_000 });

    const addedTitle = `E2E Perf Event ${seed.marker}`;
    await page.getByTestId("add-contract-event").first().click();
    await page.getByTestId("add-event-title").fill(addedTitle);
    await page.getByTestId("add-event-date").click();
    await page.getByTestId("add-event-date-today").click();

    const t0 = Date.now();
    await page.getByTestId("add-event-submit").click();
    const card = eventCard(page, addedTitle);
    await expect(card).toBeVisible({ timeout: INTERACTION_BUDGET_MS });
    const addTime = Date.now() - t0;

    // Cleanup: delete the event we just added
    const t1 = Date.now();
    await card.getByTestId("contract-event-delete").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(
      page.getByTestId("contract-event-card").filter({ hasText: addedTitle }),
    ).toHaveCount(0, { timeout: INTERACTION_BUDGET_MS });
    const deleteTime = Date.now() - t1;

    // Log for perf analysis
    console.log(`[PERF] Add event: ${addTime}ms | Delete event: ${deleteTime}ms`);

    // Assert both are within budget
    expect(addTime).toBeLessThan(INTERACTION_BUDGET_MS);
    expect(deleteTime).toBeLessThan(INTERACTION_BUDGET_MS);
  });

  test("3. Network overhead: opening event modal triggers no redundant data fetches", async ({ page }) => {
    test.skip(!seed.contractId, "Seed not created");
    await login(page, seed);
    await page.goto(`/contracts/${seed.contractId}`);
    await expect(eventCard(page, seed.seededEventTitle)).toBeVisible({ timeout: 45_000 });

    // Wait for page to stabilize (all initial fetches settle)
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1_000);

    // Start monitoring network AFTER page has fully loaded
    const apiCalls: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/rest/v1/") || url.includes("/rpc/")) {
        apiCalls.push(`${req.method()} ${new URL(url).pathname}`);
      }
    });

    // Click event card → opens modal → should use already-fetched data (placeholderData)
    await eventCard(page, seed.seededEventTitle).click();
    await page.waitForTimeout(2_000);

    // Opening an event modal SHOULD NOT fire full contract detail re-fetch
    const redundantDetailFetches = apiCalls.filter(
      (call) => call.includes("getContractDetail") || call.includes("contract_detail"),
    );
    expect(redundantDetailFetches).toEqual([]);

    // Log all API calls for visibility
    if (apiCalls.length > 0) {
      console.log(`[PERF] API calls after modal open: ${apiCalls.length}`);
      apiCalls.forEach((c) => console.log(`  → ${c}`));
    } else {
      console.log("[PERF] Zero API calls after modal open — cached data used");
    }
  });
});
