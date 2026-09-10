/**
 * #17 (T-20260910-goals-doc-ledger) — /finance/goals đọc sổ kỳ: số Thu / Chi / Dư khả dụng trên màn
 * phải bằng finance_month_summary(tháng hiện tại).cash_in / cash_out / max(0, cash_net), chênh 0đ.
 * Seed 1 admin tạm (department E2E), KHÔNG tạo dữ liệu tài chính — dùng số thật; dọn ở afterAll.
 * Chạy: $env:ALLOW_PROD_WRITE="1"; $env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000"; npx playwright test tests/e2e/goals-ledger.spec.ts --project=chromium
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
const digits = (s: string) => Number((s.match(/\d/g) || []).join("")) || 0;

const ts = Date.now();
const seed = { email: `e2e-goals-${ts}@test.local`, password: `Gl!${ts}`, userId: "" };
let db: SupabaseClient;
let expected = { cashIn: 0, cashOut: 0, available: 0, month: 0, year: 0 };

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(seed.email);
  await page.locator('input[name="password"]').fill(seed.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
  await Promise.race([page.waitForEvent("load"), page.waitForTimeout(4000)]);
}

test.describe.serial("#17 — /finance/goals đọc sổ kỳ", () => {
  test.setTimeout(240_000);

  test.beforeAll(async () => {
    db = admin();
    await sweepStaleE2EOrphans(db);
    const { data: au, error } = await db.auth.admin.createUser({
      email: seed.email, password: seed.password, email_confirm: true,
      app_metadata: { role: "admin" }, user_metadata: { full_name: `E2E Goals ${ts}` },
    });
    if (error || !au.user) throw new Error(`auth: ${error?.message}`);
    seed.userId = au.user.id;
    const { error: ee } = await db.from("employees").update({
      employee_code: `E2E-GL-${String(ts).slice(-6)}`, department: "E2E", position: "QA", role: "admin", status: "active", start_date: "2026-05-15",
    }).eq("auth_user_id", seed.userId);
    if (ee) throw new Error(`employee: ${ee.message}`);

    // Tháng hiện tại theo giờ VN — cùng luật getTodayInTimeZone của app
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
    const year = Number(today.slice(0, 4));
    const month = Number(today.slice(5, 7));
    const { data, error: re } = await db.rpc("finance_month_summary", { p_month: month, p_year: year });
    if (re) throw new Error(`rpc: ${re.message}`);
    const row = (Array.isArray(data) ? data[0] : data) as { cash_in: number | string; cash_out: number | string; cash_net: number | string };
    expected = {
      cashIn: Math.round(Number(row.cash_in)),
      cashOut: Math.round(Number(row.cash_out)),
      available: Math.max(0, Math.round(Number(row.cash_net))),
      month, year,
    };
  });

  test.afterAll(async () => {
    if (!db || !seed.userId) return;
    await db.from("employees").delete().eq("auth_user_id", seed.userId);
    await db.auth.admin.deleteUser(seed.userId);
    await sweepStaleE2EOrphans(db);
  });

  test("Thu / Chi / Dư khả dụng = finance_month_summary, chênh 0đ, 0 console error", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });

    await login(page);
    await page.goto("/finance/goals");
    await expect(page.getByText("Dòng tiền tháng")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(`T${expected.month}/${expected.year}`)).toBeVisible();

    const card = page.locator(".stats-card", { hasText: "Dòng tiền tháng" }).first();
    const thu = await card.locator("div", { hasText: /^Thu/ }).locator("span").nth(1).innerText();
    const chi = await card.locator("div", { hasText: /^Chi/ }).locator("span").nth(1).innerText();
    const du = await card.locator("div", { hasText: "Dư khả dụng" }).locator("span").nth(1).innerText();

    expect(digits(thu), `Thu màn "${thu}" vs RPC ${expected.cashIn}`).toBe(expected.cashIn);
    expect(digits(chi), `Chi màn "${chi}" vs RPC ${expected.cashOut}`).toBe(expected.cashOut);
    expect(digits(du), `Dư màn "${du}" vs RPC ${expected.available}`).toBe(expected.available);
    // C7: không còn dòng Lương / Chi cố định trong khối dòng tiền
    await expect(card.getByText(/^Lương$|^Chi co dinh$|^Chi cố định$/)).toHaveCount(0);

    // Nhiễu của next start cục bộ (không phải lỗi app, cùng bộ lọc finance-module.spec.ts): "Failed to load resource" =
    // POST /monitoring (Sentry tunnel → 403) + /_vercel/speed-insights/script.js (404); "Refused to execute script … MIME" =
    // script 404 bị middleware trả HTML /login. Lỗi app thật (RPC, PGRST, TypeError…) vẫn bị bắt.
    const NOISE = /favicon|Download the React DevTools|Failed to load resource|speed-insights|hydration|Refused to execute script/i;
    const bad = consoleErrors.filter((m) => !NOISE.test(m));
    expect(bad, `console: ${bad.join(" | ")}`).toEqual([]);
    await page.screenshot({ path: "test-results/goals-ledger.png", fullPage: false });
  });
});
