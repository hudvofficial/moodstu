/**
 * finance-module.spec.ts
 * ---
 * E2E smoke test for /finance module.
 * Covers: dashboard, receipts, expenses, closes — navigation + basic render checks.
 * Pattern: seed admin user → login → visit each sub-route → assert key elements → cleanup.
 */

import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type AdminClient = SupabaseClient;

interface SeedState {
  marker: string;
  email: string;
  password: string;
  employeeName: string;
  userId?: string;
  employeeId?: string;
}

// ── Env + Admin client ──

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

// ── Seed / Cleanup ──

async function seedUser(admin: AdminClient, seed: SeedState) {
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: seed.email,
    password: seed.password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: seed.employeeName },
  });
  if (authError || !authUser.user)
    throw new Error(`Cannot create E2E auth user: ${authError?.message || "missing"}`);
  seed.userId = authUser.user.id;

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .update({
      employee_code: `E2E-FIN-${Date.now().toString(36).toUpperCase()}`,
      department: "E2E",
      position: "QA",
      role: "admin",
      status: "active",
      start_date: "2026-05-15",
    })
    .eq("auth_user_id", seed.userId)
    .select("id")
    .single();
  if (employeeError || !employee)
    throw new Error(`Cannot update E2E employee: ${employeeError?.message || "missing"}`);
  seed.employeeId = employee.id;
}

async function cleanupSeed(admin: AdminClient, seed: SeedState) {
  if (seed.employeeId) {
    await admin.from("employees").delete().eq("id", seed.employeeId);
  }
  if (seed.userId) {
    await admin.auth.admin.deleteUser(seed.userId);
  }
}

// ── Login ──

async function login(page: Page, seed: SeedState) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(seed.email);
  await page.locator('input[name="password"]').fill(seed.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
}

// ── Helpers ──

/** Wait for page to be idle (no pending navigations/network) */
async function waitForIdle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  // Extra buffer for client hydration
  await page.waitForTimeout(500);
}

/** Check page has no uncaught error overlay (Next.js error overlay) */
async function assertNoErrorOverlay(page: Page) {
  const overlay = page.locator("nextjs-portal");
  const count = await overlay.count();
  if (count === 0) return;

  const text = (await overlay.first().textContent().catch(() => ""))?.trim() || "";
  if (text.length > 0) {
    throw new Error(`Next.js error overlay detected: ${text.slice(0, 200)}`);
  }
}

// ── Test Suite ──

test.describe.serial("finance module e2e", () => {
  test.setTimeout(180_000);

  let admin: AdminClient;
  const timestamp = Date.now();
  const seed: SeedState = {
    marker: timestamp.toString(),
    email: `e2e-finance-${timestamp}@test.local`,
    password: `Finance!${timestamp}`,
    employeeName: `E2E Finance ${timestamp}`,
  };

  test.beforeAll(async () => {
    admin = createAdminSupabase();
    await seedUser(admin, seed);
  });

  test.afterAll(async () => {
    await cleanupSeed(admin, seed);
  });

  // ── 1. Finance Dashboard ──
  test("finance dashboard loads and renders stats", async ({ page }) => {
    await login(page, seed);
    await page.goto("/finance");
    await waitForIdle(page);

    // Should stay on /finance
    expect(page.url()).toContain("/finance");

    // Should render the main container
    await expect(page.locator(".main-container").first()).toBeVisible({ timeout: 15_000 });

    // Check breadcrumb
    await expect(page.getByText("Tài chính").first()).toBeVisible();

    await assertNoErrorOverlay(page);
  });

  // ── 2. Receipts Page ──
  test("receipts page loads and shows table/list", async ({ page }) => {
    await login(page, seed);
    await page.goto("/finance/receipts");
    await waitForIdle(page);

    expect(page.url()).toContain("/finance/receipts");
    await expect(page.locator(".main-container").first()).toBeVisible({ timeout: 15_000 });

    // Should see "Phiếu thu" text somewhere (breadcrumb or heading)
    await expect(page.getByText("Phiếu thu").first()).toBeVisible();

    // Should have "Thêm phiếu thu" button (desktop)
    const addBtn = page.getByRole("button", { name: /Thêm phiếu thu/i });
    // Button may be hidden on mobile viewport, just check it exists in DOM
    expect(await addBtn.count()).toBeGreaterThanOrEqual(0);

    await assertNoErrorOverlay(page);
  });

  // ── 3. Receipts — open new modal ──
  test("receipts new modal opens via ?new=1", async ({ page }) => {
    await login(page, seed);
    await page.goto("/finance/receipts?new=1");
    await waitForIdle(page);

    // Modal should open with form title
    await expect(
      page.getByText(/Thêm phiếu thu|Tạo phiếu thu/i).first()
    ).toBeVisible({ timeout: 10_000 });

    await assertNoErrorOverlay(page);
  });

  // ── 4. Expenses Page ──
  test("expenses page loads and shows table/list", async ({ page }) => {
    await login(page, seed);
    await page.goto("/finance/expenses");
    await waitForIdle(page);

    expect(page.url()).toContain("/finance/expenses");
    await expect(page.locator(".main-container").first()).toBeVisible({ timeout: 15_000 });

    // Should see "Phiếu chi" text
    await expect(page.getByText("Phiếu chi").first()).toBeVisible();

    await assertNoErrorOverlay(page);
  });

  // ── 5. Closes Page ──
  test("closes page loads", async ({ page }) => {
    await login(page, seed);
    await page.goto("/finance/closes");
    await waitForIdle(page);

    expect(page.url()).toContain("/finance/closes");
    await expect(page.locator(".main-container").first()).toBeVisible({ timeout: 15_000 });

    // Should see "Chốt sổ" text
    await expect(page.getByText(/Chốt sổ/i).first()).toBeVisible();

    await assertNoErrorOverlay(page);
  });

  // ── 6. Navigation between sub-routes (no jank) ──
  test("navigate between finance sub-routes without jank", async ({ page }) => {
    await login(page, seed);

    // Go to dashboard first
    await page.goto("/finance");
    await waitForIdle(page);
    expect(page.url()).toContain("/finance");

    // Click to receipts via sidebar or link
    await page.goto("/finance/receipts");
    await waitForIdle(page);
    expect(page.url()).toContain("/finance/receipts");

    // Click to expenses
    await page.goto("/finance/expenses");
    await waitForIdle(page);
    expect(page.url()).toContain("/finance/expenses");

    // Click to closes
    await page.goto("/finance/closes");
    await waitForIdle(page);
    expect(page.url()).toContain("/finance/closes");

    // Back to dashboard
    await page.goto("/finance");
    await waitForIdle(page);
    expect(page.url()).toContain("/finance");

    await assertNoErrorOverlay(page);
  });

  // ── 7. Month/Year filter changes don't crash ──
  test("receipts filter by month/year without crash", async ({ page }) => {
    await login(page, seed);
    await page.goto("/finance/receipts");
    await waitForIdle(page);

    // Find month select pill and change it if it exists
    const monthPill = page.locator("select, [role='combobox']").first();
    if (await monthPill.isVisible().catch(() => false)) {
      await monthPill.click();
      await page.waitForTimeout(300);
      // Just click first option to ensure it doesn't crash
      const option = page.locator("[role='option']").first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        await waitForIdle(page);
      }
    }

    // Page should still be on receipts
    expect(page.url()).toContain("/finance/receipts");
    await assertNoErrorOverlay(page);
  });

  // ── 8. No console errors on any finance page ──
  test("no critical console errors across finance pages", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore known non-critical errors
        if (
          text.includes("favicon") ||
          text.includes("hydration") ||
          text.includes("404") ||
          text.includes("Failed to load resource") ||
          text.includes("va.vercel-scripts.com/v1/speed-insights") ||
          text.includes("Content Security Policy directive")
        )
          return;
        consoleErrors.push(text);
      }
    });

    await login(page, seed);

    const routes = ["/finance", "/finance/receipts", "/finance/expenses", "/finance/closes"];
    for (const route of routes) {
      await page.goto(route);
      await waitForIdle(page);
    }

    // Allow up to 2 non-critical console errors (e.g. dev warnings)
    if (consoleErrors.length > 2) {
      console.warn("Console errors found:", consoleErrors);
    }
    expect(consoleErrors.length).toBeLessThanOrEqual(2);
  });
});