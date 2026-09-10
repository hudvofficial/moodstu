/**
 * #18 (T-20260910-health-score-debt-stats) — hai nửa của bước:
 *   (DB) get_finance_intelligence().stats.receivables/payables PHẢI bằng finance_debt_stats() — nửa này không lộ ra UI
 *        sau C8 nên phải assert thẳng qua RPC, nếu không hồi quy sẽ im lặng.
 *   (C8) "Điểm Sức Khỏe" + "Tiến độ Hòa vốn" — kể cả trong câu mô tả đầu trang — không còn trên /finance và
 *        /finance/dashboard; "Cashflow Runway" vẫn hiện; không có lỗi app trong console/mạng.
 * Spec KHÔNG seed tiền, NHƯNG global-setup của mỗi lần chạy bơm ~20 HĐ E2E vào prod (phải thu tạm phình) —
 * vì thế phép so ở đây là RPC-vs-RPC cùng thời điểm, không so với con số tuyệt đối. Seed 1 admin tạm, dọn ở afterAll.
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

  test("DB: stats.receivables/payables = finance_debt_stats() (nửa không lộ ra UI)", async () => {
    const [{ data: intel, error: e1 }, { data: debt, error: e2 }] = await Promise.all([
      db.rpc("get_finance_intelligence"),
      db.rpc("finance_debt_stats"),
    ]);
    if (e1) throw new Error(`get_finance_intelligence: ${e1.message}`);
    if (e2) throw new Error(`finance_debt_stats: ${e2.message}`);
    const stats = (intel as { stats: { receivables: number; payables: number } }).stats;
    const row = (Array.isArray(debt) ? debt[0] : debt) as { receivable: number | string; payable: number | string };

    expect(Number(stats.receivables), "phải thu của health-score phải lấy từ sổ canonical").toBe(Number(row.receivable));
    expect(Number(stats.payables), "phải trả của health-score phải lấy từ sổ canonical").toBe(Number(row.payable));
    // bảng debts vẫn rỗng → nếu ai đó trả hàm về đọc debts thì 2 số này rơi lại về 0 và assert trên sẽ đỏ
    const { count } = await db.from("debts").select("id", { count: "exact", head: true });
    expect(count ?? 0, "debts vẫn là sổ tay rỗng — #18 không đụng dữ liệu").toBe(0);
  });

  for (const route of ["/finance", "/finance/dashboard"]) {
    test(`${route}: có Runway, không Health-score / Hòa vốn, 0 lỗi app`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const badResponses: string[] = [];
      page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
      // Lọc lỗi mạng theo URL (thông điệp console "Failed to load resource" không kèm URL nên không lọc nổi):
      // /monitoring = Sentry tunnel 403, /_vercel/speed-insights = 404 — hai thứ chỉ hỏng trên next start cục bộ.
      page.on("response", (res) => {
        if (res.status() < 400) return;
        const u = res.url();
        if (/\/monitoring|_vercel\/speed-insights|favicon/i.test(u)) return;
        badResponses.push(`${res.status()} ${u.replace(/\?.*$/, "")}`);
      });

      await login(page);
      await page.goto(route);
      const runway = page.getByText("Cashflow Runway").first();
      await runway.waitFor({ state: "visible", timeout: 60_000 });
      await runway.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);

      // Phủ định theo NGỮ, không chỉ theo nhãn thẻ: bắt cả câu mô tả đầu trang từng hứa 2 chỉ số này.
      // #29 mở lại 2 thẻ ⇒ test này sẽ đỏ, đó là chủ đích (buộc đảo ngược có ý thức).
      await expect(page.getByText(/Điểm Sức Khỏe|Tiến độ Hòa vốn|hòa vốn|Sức khỏe tài chính/i)).toHaveCount(0);

      const bad = consoleErrors.filter((m) => !NOISE.test(m));
      expect(bad, `console: ${bad.join(" | ")}`).toEqual([]);
      expect(badResponses, `mạng: ${badResponses.join(" | ")}`).toEqual([]);
      await page.screenshot({ path: `test-results/finance-intel-c8${route.replace(/\//g, "-")}.png`, fullPage: true });
    });
  }
});
