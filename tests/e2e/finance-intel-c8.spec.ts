/**
 * #18 (T-20260910-health-score-debt-stats) — C8: thẻ "Điểm Sức Khỏe" + "Tiến độ Hòa vốn" không còn trên
 * /finance và /finance/dashboard; thẻ "Cashflow Runway" vẫn hiện; 0 lỗi app trong console.
 * Seed 1 admin tạm (department E2E), không tạo dữ liệu tài chính; dọn ở afterAll.
 * Chạy: $env:ALLOW_PROD_WRITE="1"; $env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000"; npx playwright test tests/e2e/finance-intel-c8.spec.ts --project=chromium
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { sweepStaleE2EOrphans } from "./e2e-sweep";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}
function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}
function admin(): SupabaseClient {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
// Nhiễu của next start cục bộ (không phải lỗi app): Sentry tunnel 403, speed-insights 404 → MIME "Refused to execute script".
const NOISE = /favicon|Download the React DevTools|Failed to load resource|speed-insights|hydration|Refused to execute script/i;

const ts = Date.now();
const seed = { email: `e2e-intel-${ts}@test.local`, password: `In!${ts}`, userId: "" };
let db: SupabaseClient;

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(seed.email);
  await page.locator('input[name="password"]').fill(seed.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
  await Promise.race([page.waitForEvent("load"), page.waitForTimeout(4000)]);
}

test.describe.serial("#18 — C8 gỡ Health-score + Hòa vốn, giữ Runway", () => {
  test.setTimeout(240_000);

  test.beforeAll(async () => {
    db = admin();
    await sweepStaleE2EOrphans(db);
    const { data: au, error } = await db.auth.admin.createUser({
      email: seed.email, password: seed.password, email_confirm: true,
      app_metadata: { role: "admin" }, user_metadata: { full_name: `E2E Intel ${ts}` },
    });
    if (error || !au.user) throw new Error(`auth: ${error?.message}`);
    seed.userId = au.user.id;
    const { error: ee } = await db.from("employees").update({
      employee_code: `E2E-IN-${String(ts).slice(-6)}`, department: "E2E", position: "QA", role: "admin", status: "active", start_date: "2026-05-15",
    }).eq("auth_user_id", seed.userId);
    if (ee) throw new Error(`employee: ${ee.message}`);
  });

  test.afterAll(async () => {
    if (!db || !seed.userId) return;
    await db.from("employees").delete().eq("auth_user_id", seed.userId);
    await db.auth.admin.deleteUser(seed.userId);
    await sweepStaleE2EOrphans(db);
  });

  for (const route of ["/finance", "/finance/dashboard"]) {
    test(`${route}: có Runway, không Health-score / Hòa vốn, 0 lỗi app`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });

      await login(page);
      await page.goto(route);
      await expect(page.getByText("Cashflow Runway").first()).toBeVisible({ timeout: 60_000 });
      await page.waitForTimeout(1500);
      await expect(page.getByText("Điểm Sức Khỏe")).toHaveCount(0);
      await expect(page.getByText("Tiến độ Hòa vốn")).toHaveCount(0);

      const bad = consoleErrors.filter((m) => !NOISE.test(m));
      expect(bad, `console: ${bad.join(" | ")}`).toEqual([]);
      await page.screenshot({ path: `test-results/finance-intel-c8${route.replace(/\//g, "-")}.png`, fullPage: false });
    });
  }
});
