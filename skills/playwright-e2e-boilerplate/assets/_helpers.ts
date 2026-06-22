/**
 * tests/e2e/_helpers.ts
 * ?????????????????????
 * Shared helpers cho to�n b? E2E spec trong mood-studio.
 *
 * Design principles:
 *   1. Deterministic: M?i helper �?i signal r? r�ng (URL, locator, network)
 *      thay v? waitForTimeout (hard wait = flaky).
 *   2. Parallel-safe: Marker unique truy?n v�o t?ng helper; cleanup theo marker.
 *   3. Self-contained: Load .env.local m?t l?n ? module init.
 *   4. Two login paths: UI login (env) ho?c storageState (file).
 *
 * Import:
 *   import {
 *     loginViaUI, loginViaStorageState, cleanupTestData, seedAdminUser,
 *     expectToast, expectDialogVisible, expectUrl, fillFormByLabel, clickButton,
 *     assertNoConsoleErrors, assertNoFailedRequests,
 *     waitForAppIdle, uniqueMarker, createAdminSupabase,
 *   } from "./_helpers";
 */

import type { Page, BrowserContext, ConsoleMessage, Response } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// ??? Env loading (run once at module init) ????????????????????????????????????

let envLoaded = false;
function loadEnvOnce(): void {
  if (envLoaded) return;
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    envLoaded = true;
    return;
  }
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
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
  envLoaded = true;
}

function requireEnv(name: string): string {
  loadEnvOnce();
  const v = process.env[name];
  if (!v) throw new Error(`[_helpers] Missing required env var: ${name}`);
  return v;
}
// ??? Marker (parallel-safe test data) ???????????????????????????????????????

/**
 * T?o marker unique cho 1 l?n ch?y test.
 * Format: <base36 timestamp>-<random> (vd: lqf8a3x2k9).
 */
export function uniqueMarker(): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 6);
  return `${ts}-${rnd}`;
}

// ??? Admin Supabase client ????????????????????????????????????????????????????

/**
 * T?o Supabase client v?i service role key (bypass RLS).
 * D�ng cho seed/cleanup test data, KH�NG d�ng trong test logic.
 */
export function createAdminSupabase(): SupabaseClient {
  loadEnvOnce();
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// ??? Login helpers ????????????????????????????????????????????????????????????

/**
 * Login qua UI form. �u ti�n d�ng ADMIN_EMAIL + ADMIN_PASSWORD env.
 * Best for: tests c?n verify flow login, ho?c khi storageState ch�a c�.
 */
export async function loginViaUI(
  page: Page,
  options?: { email?: string; password?: string; redirectTo?: string | RegExp },
): Promise<void> {
  const email = options?.email ?? requireEnv("ADMIN_EMAIL");
  const password = options?.password ?? requireEnv("ADMIN_PASSWORD");
  const redirectTo = options?.redirectTo ?? /\/dashboard$/;

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/m?t kh?u|password/i).fill(password);
  await page.getByRole("button", { name: /��ng nh?p|sign in|login/i }).click();
  await page.waitForURL(redirectTo, { timeout: 45_000 });
  await waitForAppIdle(page);
}

/**
 * Verify storage state exists. Storage state is applied at context creation
 * (see playwright.config.ts ? projects ? use.storageState).
 * Best for: tests c?n assert "�? login s?n" tr�?c khi ch?y flow.
 */
export async function loginViaStorageState(
  _context: BrowserContext,
  storagePath: string = ".auth/admin.json",
): Promise<void> {
  if (!existsSync(path.join(process.cwd(), storagePath))) {
    throw new Error(
      `[_helpers] Storage state not found: ${storagePath}. ` +
        `Run setup project first, or use loginViaUI instead.`,
    );
  }
}
/**
 * T?o E2E auth user + employee record, tr? v? credentials �? d�ng trong test.
 */
export interface SeededAdmin {
  email: string;
  password: string;
  userId: string;
  employeeId: string;
}

export async function seedAdminUser(
  admin: SupabaseClient,
  marker: string,
  options?: { fullName?: string },
): Promise<SeededAdmin> {
  const email = `e2e-${marker}@test.local`;
  const password = `E2E-${marker}-pwd`;

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: options?.fullName ?? `E2E Admin ${marker}` },
  });
  if (authError || !authUser.user)
    throw new Error(`[_helpers] Cannot create E2E auth user: ${authError?.message}`);
  const userId = authUser.user.id;

  // Try update pre-existing employee row first
  const { data: employee, error: empError } = await admin
    .from("employees")
    .update({
      employee_code: `E2E-EMP-${marker.slice(0, 8).toUpperCase()}`,
      department: "E2E",
      position: "QA",
      role: "admin",
      status: "active",
    })
    .eq("auth_user_id", userId)
    .select("id")
    .single();

  let employeeId: string;
  if (empError || !employee) {
    const { data: inserted, error: insertError } = await admin
      .from("employees")
      .insert({
        auth_user_id: userId,
        employee_code: `E2E-EMP-${marker.slice(0, 8).toUpperCase()}`,
        full_name: options?.fullName ?? `E2E Admin ${marker}`,
        department: "E2E",
        position: "QA",
        role: "admin",
        status: "active",
      })
      .select("id")
      .single();
    if (insertError || !inserted)
      throw new Error(`[_helpers] Cannot create E2E employee: ${insertError?.message}`);
    employeeId = inserted.id as string;
  } else {
    employeeId = employee.id as string;
  }

  return { email, password, userId, employeeId };
}
// ??? Cleanup helpers ?????????????????????????????????????????????????????????

/**
 * X�a test data theo marker. G?i trong afterAll c?a describe.
 * X�a theo FK order: child tables ? contracts ? customers ? employees ? auth users.
 */
export async function cleanupTestData(
  admin: SupabaseClient,
  marker: string,
): Promise<void> {
  const log = (msg: string) => console.log(`[cleanup ${marker}] ${msg}`);

  try {
    // 1. Child rows of contracts matching marker
    const { data: contracts } = await admin
      .from("contracts")
      .select("id")
      .like("contract_code", `E2E-%${marker}%`);
    const contractIds = (contracts ?? []).map((c) => c.id as string);

    if (contractIds.length > 0) {
      const childTables = [
        "work_tasks",
        "contract_events",
        "payments",
        "payment_plans",
        "contract_checklists",
        "contract_notes",
        "expenses",
        "printing_orders",
        "contract_items",
        "dress_reservations",
      ];
      for (const table of childTables) {
        const { error } = await admin.from(table).delete().in("contract_id", contractIds);
        if (error) log(`warn ${table}: ${error.message}`);
      }
      const { error: delContracts } = await admin
        .from("contracts")
        .delete()
        .in("id", contractIds);
      if (delContracts) log(`warn contracts: ${delContracts.message}`);
      else log(`ok Deleted ${contractIds.length} contracts`);
    }

    // 2. Customers
    const { error: delCust } = await admin
      .from("customers")
      .delete()
      .like("customer_code", `E2E-%${marker}%`);
    if (delCust) log(`warn customers: ${delCust.message}`);

    // 3. Employees + auth users
    const { data: emps } = await admin
      .from("employees")
      .select("id, auth_user_id")
      .eq("department", "E2E")
      .like("employee_code", `E2E-EMP-%${marker}%`);
    if (emps && emps.length > 0) {
      const empIds = emps.map((e) => e.id as string);
      const { error: delEmp } = await admin.from("employees").delete().in("id", empIds);
      if (delEmp) log(`warn employees: ${delEmp.message}`);
      for (const emp of emps) {
        if (emp.auth_user_id) {
          await admin.auth.admin
            .deleteUser(emp.auth_user_id as string)
            .catch((e: unknown) => log(`warn auth user: ${(e as Error).message}`));
        }
      }
      log(`ok Deleted ${empIds.length} employees`);
    }
  } catch (e) {
    console.log(`[cleanup ${marker}] error: ${(e as Error).message}`);
  }
}
// ??? Wait helpers (no hard wait) ?????????????????????????????????????????????

/**
 * �?i app idle: network kh�ng pending request + DOM stable.
 * Thay th? page.waitForTimeout(2000).
 */
export async function waitForAppIdle(page: Page, timeoutMs: number = 5_000): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => {});
  // Small buffer for client-side hydration of Next.js apps
  await page.waitForTimeout(200);
}

// ??? Common assertions ????????????????????????????????????????????????????????

/**
 * Assert KH�NG c� console error trong su?t test.
 * @example
 *   const consoleCheck = assertNoConsoleErrors(page);
 *   // ... do stuff ...
 *   consoleCheck.check();
 */
export function assertNoConsoleErrors(
  page: Page,
  options?: { ignorePatterns?: RegExp[] },
): { errors: string[]; check: () => void } {
  const errors: string[] = [];
  const ignore = options?.ignorePatterns ?? [
    /favicon\.ico/,
    /Download the React DevTools/i,
    /Fast Refresh/i,
  ];

  const handler = (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (ignore.some((re) => re.test(text))) return;
    errors.push(text);
  };
  page.on("console", handler);

  return {
    errors,
    check: () => {
      if (errors.length > 0) {
        throw new Error(
          `Console errors detected:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
        );
      }
    },
  };
}

/**
 * Assert KH�NG c� HTTP request n�o fail (4xx/5xx) trong su?t test.
 */
export function assertNoFailedRequests(
  page: Page,
  options?: { ignorePatterns?: RegExp[] },
): { failures: string[]; check: () => void } {
  const failures: string[] = [];
  const ignore = options?.ignorePatterns ?? [/favicon\.ico/, /__nextjs/];

  const responseHandler = (response: Response) => {
    const status = response.status();
    if (status < 400) return;
    const url = response.url();
    if (ignore.some((re) => re.test(url))) return;
    failures.push(`${status} ${response.request().method()} ${url}`);
  };
  page.on("response", responseHandler);

  return {
    failures,
    check: () => {
      if (failures.length > 0) {
        throw new Error(
          `Failed HTTP requests detected:\n${failures.map((f) => `  - ${f}`).join("\n")}`,
        );
      }
    },
  };
}
// ??? Toast / Dialog / URL assertions ??????????????????????????????????????????

/**
 * Assert toast/notification message xu?t hi?n v?i text cho tr�?c.
 * H? tr? sonner, shadcn/ui, ho?c custom toast components.
 */
export async function expectToast(
  page: Page,
  text: string | RegExp,
  options?: { type?: "success" | "error" | "info"; timeout?: number },
): Promise<void> {
  const { expect } = await import("@playwright/test");
  const timeout = options?.timeout ?? 5_000;

  const selectors = [
    "[data-sonner-toast]",
    "[data-radix-toast-root]",
    "[role=\"status\"]",
    "[role=\"alert\"]",
    ".toast",
  ];
  const matcher = typeof text === "string" ? new RegExp(text, "i") : text;

  for (const sel of selectors) {
    const toast = page.locator(sel).filter({ hasText: matcher }).first();
    try {
      await toast.waitFor({ state: "visible", timeout });
      await expect(toast).toContainText(matcher);
      return;
    } catch {
      // try next selector
    }
  }
  throw new Error(
    `Toast with text "${String(text)}" not found. Tried: ${selectors.join(", ")}`,
  );
}

/**
 * Assert modal/dialog visible + ch?a text cho tr�?c.
 */
export async function expectDialogVisible(
  page: Page,
  text: string | RegExp,
  timeoutMs: number = 5_000,
): Promise<void> {
  const { expect } = await import("@playwright/test");
  const dialog = page.getByRole("dialog").filter({ hasText: text });
  await expect(dialog).toBeVisible({ timeout: timeoutMs });
}

/**
 * Assert URL match pattern (regex ho?c escaped string).
 */
export async function expectUrl(
  page: Page,
  pattern: string | RegExp,
  timeoutMs: number = 10_000,
): Promise<void> {
  const { expect } = await import("@playwright/test");
  if (typeof pattern === "string") {
    await expect(page).toHaveURL(
      new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      { timeout: timeoutMs },
    );
  } else {
    await expect(page).toHaveURL(pattern, { timeout: timeoutMs });
  }
}

// ??? Form helpers ?????????????????????????????????????????????????????????????

/**
 * Fill form fields theo label (accessibility-first).
 * @example
 *   await fillFormByLabel(page, {
 *     "H? t�n": "Nguy?n V�n A",
 *     "Email": "a@example.com",
 *   });
 */
export async function fillFormByLabel(
  page: Page,
  fields: Record<string, string>,
): Promise<void> {
  for (const [label, value] of Object.entries(fields)) {
    const input = page.getByLabel(label, { exact: false }).first();
    await input.fill(value);
  }
}

/**
 * Click button theo accessible name (text ho?c aria-label).
 */
export async function clickButton(page: Page, name: string | RegExp): Promise<void> {
  await page.getByRole("button", { name }).first().click();
}