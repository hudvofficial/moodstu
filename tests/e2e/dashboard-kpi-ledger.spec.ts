/**
 * Bước #8 (T-20260904-dashboard-doanh-thu-ket) — 3 thẻ tiền trên /dashboard đọc một sổ kỳ.
 * Kiểm: chữ trên thẻ = formatVnd(finance_pnl_by_month) chênh 0đ, lưới 6 thẻ 2 cột (<768) / 3 cột (≥768),
 * biểu đồ mang tên "Tiền thu theo tháng (két)". Chụp @390 · 768 · 1023 · 1280 vào screenshots/dashboard-kpi/.
 * Seed: 1 auth user admin (department E2E) — KHÔNG tạo hợp đồng/tiền; dọn sạch ở afterAll + sweep.
 * Chạy: $env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000"; npx playwright test tests/e2e/dashboard-kpi-ledger.spec.ts --project=chromium
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
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
// Cùng công thức lib/utils.ts formatVnd (Intl vi-VN + " VND")
function vnd(n: number) {
  return `${new Intl.NumberFormat("vi-VN").format(n)} VND`;
}

const SHOTS = path.resolve("screenshots/dashboard-kpi");
const VIEWPORTS = [
  { name: "390-phone", width: 390, height: 844, cols: 2 },
  { name: "768-tablet", width: 768, height: 1024, cols: 3 },
  { name: "1023-tablet-max", width: 1023, height: 768, cols: 3 },
  { name: "1280-desktop", width: 1280, height: 800, cols: 3 },
] as const;

const ts = Date.now();
const seed = { email: `e2e-kpi-${ts}@test.local`, password: `Kpi!${ts}`, userId: "" };
let db: SupabaseClient;
let expected: { revenue: number; cashIn: number; profit: number };

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(seed.email);
  await page.locator('input[name="password"]').fill(seed.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
  await Promise.race([page.waitForEvent("load"), page.waitForTimeout(4000)]);
}

test.describe.serial("#8 — /dashboard 3 thẻ tiền = sổ kỳ", () => {
  test.setTimeout(180_000);

  test.beforeAll(async () => {
    db = admin();
    await sweepStaleE2EOrphans(db);
    const { data: au, error: ae } = await db.auth.admin.createUser({
      email: seed.email, password: seed.password, email_confirm: true,
      app_metadata: { role: "admin" }, user_metadata: { full_name: `E2E KPI ${ts}` },
    });
    if (ae || !au.user) throw new Error(`auth: ${ae?.message}`);
    seed.userId = au.user.id;
    const { error: ee } = await db.from("employees").update({
      employee_code: `E2E-KPI-${String(ts).slice(-6)}`, department: "E2E", position: "QA", role: "admin", status: "active", start_date: "2026-05-15",
    }).eq("auth_user_id", seed.userId);
    if (ee) throw new Error(`employee: ${ee.message}`);

    // Số chờ: cùng RPC mà app đọc, cùng tháng theo giờ server (currentPeriod() của app)
    const now = new Date();
    const { data, error } = await db.rpc("finance_pnl_by_month", { p_year: now.getFullYear() });
    if (error) throw new Error(`rpc: ${error.message}`);
    const row = (data as Array<Record<string, unknown>>).find((r) => Number(r.raw_month) === now.getMonth() + 1);
    if (!row) throw new Error("không có dòng tháng hiện tại");
    expected = { revenue: Number(row.revenue) || 0, cashIn: Number(row.cash_in) || 0, profit: Number(row.profit) || 0 };
    mkdirSync(SHOTS, { recursive: true });
  });

  test.afterAll(async () => {
    if (!db || !seed.userId) return;
    await db.from("employees").delete().eq("auth_user_id", seed.userId);
    await db.auth.admin.deleteUser(seed.userId);
    await sweepStaleE2EOrphans(db);
  });

  test("số trên thẻ = RPC, lưới 2/3 cột, biểu đồ đổi tên", async ({ page }) => {
    await login(page);
    const results: string[] = [];

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/dashboard");
      await expect(page.getByText("Đã thu (két)")).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(1500); // entrance animation

      const card = (label: string) =>
        page.locator(".stats-card").filter({ has: page.locator("p.text-label", { hasText: label }) }).locator("p.text-h2");
      const revenue = (await card("Doanh thu tháng").innerText()).trim();
      const cashIn = (await card("Đã thu (két)").innerText()).trim();
      const profit = (await card("Lãi/lỗ tháng").innerText()).trim();
      expect(revenue, "Doanh thu tháng").toBe(vnd(expected.revenue));
      expect(cashIn, "Đã thu (két)").toBe(vnd(expected.cashIn));
      expect(profit, "Lãi/lỗ tháng").toBe(vnd(expected.profit));

      // Lưới: 6 thẻ; số cột = số thẻ có cùng toạ độ y với thẻ đầu
      const grid = page.locator("p.text-label", { hasText: "Đã thu (két)" }).locator("xpath=ancestor::div[contains(@class,'grid')][1]");
      const boxes = await grid.locator(":scope > *").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
      expect(boxes.length, "6 thẻ").toBe(6);
      const cols = boxes.filter((t) => Math.abs(t - boxes[0]) < 2).length;
      expect(cols, `${vp.name}: số cột`).toBe(vp.cols);

      await expect(page.getByRole("heading", { name: "Tiền thu theo tháng (két)" })).toBeVisible();
      await page.screenshot({ path: path.join(SHOTS, `${vp.name}.png`), fullPage: false });
      results.push(`${vp.name}: ${cols} cột · ${revenue} · ${cashIn} · ${profit}`);
    }
    console.log(["KPI = RPC (chênh 0đ):", ...results].join("\n"));
  });
});
