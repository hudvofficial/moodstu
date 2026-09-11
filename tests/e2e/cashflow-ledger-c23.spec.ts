/**
 * #23 (T-20260911-close-timeline-ve-ledger) — kiểm trên ĐƯỜNG THẬT rằng biểu đồ tiền
 * và số tổng của kỳ giờ ra từ CÙNG MỘT nguồn (finance_cash_entries → finance_period_ledger):
 *   1. Tab "Dòng tiền" của /reports vẽ được, không rơi vào trạng thái rỗng.
 *   2. Hai nhãn "Vào" / "Ra" trên màn == finance_reports_snapshot.cashflowSummary
 *      == Σ finance_cashflow_timeline cùng kỳ (RPC đọc ngay sau khi màn render).
 *   3. Bản _legacy (công thức cũ) vẫn ra đúng số đó — cửa an toàn 1 kỳ.
 *   4. 0 lỗi app trong console / mạng.
 * Không seed tiền. Seed 1 admin tạm, dọn ở afterAll.
 * Chạy: $env:ALLOW_PROD_WRITE="1"; $env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000"; npx playwright test tests/e2e/cashflow-ledger-c23.spec.ts --project=chromium
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
const seed = { email: `e2e-cash-${ts}@test.local`, password: `Cf!${ts}`, userId: "" };
let db: SupabaseClient;

// /reports mở mặc định theo THÁNG HIỆN TẠI (app/(protected)/reports/page.tsx) — dùng đúng kỳ đó để đối chiếu.
const now = new Date();
const RANGE = {
  start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
  end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString("sv-SE"),
};

const chiSo = (text: string) => Number(text.replace(/[^\d]/g, "")) || 0;

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(seed.email);
  await page.locator('input[name="password"]').fill(seed.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
  await Promise.race([page.waitForEvent("load"), page.waitForTimeout(4000)]);
}

test.describe.serial("#23 — biểu đồ tiền và số kỳ cùng một nguồn", () => {
  test.setTimeout(240_000);

  test.beforeAll(async () => {
    db = admin();
    await sweepStaleE2EOrphans(db);
    const { data: au, error } = await db.auth.admin.createUser({
      email: seed.email, password: seed.password, email_confirm: true,
      app_metadata: { role: "admin" }, user_metadata: { full_name: `E2E Cashflow ${ts}` },
    });
    if (error || !au.user) throw new Error(`auth: ${error?.message}`);
    seed.userId = au.user.id;
    const { error: ee } = await db.from("employees").update({
      employee_code: `E2E-CF-${String(ts).slice(-6)}`, department: "E2E", position: "QA", role: "admin", status: "active", start_date: "2026-05-15",
    }).eq("auth_user_id", seed.userId);
    if (ee) throw new Error(`employee: ${ee.message}`);
  });

  test.afterAll(async () => {
    if (!db || !seed.userId) return;
    // Đăng nhập qua form thật đẻ dòng LOGIN vào audit_logs của prod — phải dọn cả dòng đó,
    // không chỉ người dùng tạm (bài học 11/09: sweep bắt 2 dòng sót của chính spec này).
    await db.from("audit_logs").delete().eq("performed_by", seed.userId);
    await db.from("audit_logs").delete().ilike("description", `%${seed.email}%`);
    await db.from("login_attempts").delete().ilike("email", "e2e-cash-%");
    await db.from("employees").delete().eq("auth_user_id", seed.userId);
    await db.auth.admin.deleteUser(seed.userId);
    await sweepStaleE2EOrphans(db);
  });

  test("DB: sổ kỳ == Σ biểu đồ == bản _legacy (mọi tháng có số của 2026)", async () => {
    for (let month = 1; month <= now.getMonth() + 1; month += 1) {
      const start = `${now.getFullYear()}-${String(month).padStart(2, "0")}-01`;
      const end = new Date(now.getFullYear(), month, 0).toLocaleDateString("sv-SE");

      const [{ data: led, error: e1 }, { data: tl, error: e2 }, { data: old, error: e3 }] = await Promise.all([
        db.rpc("finance_period_ledger", { p_start: start, p_end: end }),
        db.rpc("finance_cashflow_timeline", { p_start_date: start, p_end_date: end }),
        db.rpc("finance_cashflow_timeline_legacy", { p_start_date: start, p_end_date: end }),
      ]);
      if (e1 || e2 || e3) throw new Error(`RPC ${start}: ${e1?.message || e2?.message || e3?.message}`);

      const row = (led as { cash_in_contract: number; cash_in_retail: number; cash_out: number }[])[0];
      const sum = (rows: unknown[], key: "inflow" | "outflow") =>
        (rows as Record<string, number>[]).reduce((s, r) => s + Number(r[key] || 0), 0);

      expect(sum(tl || [], "inflow"), `${start}: tiền vào biểu đồ != sổ kỳ`).toBe(Number(row.cash_in_contract) + Number(row.cash_in_retail));
      expect(sum(tl || [], "outflow"), `${start}: tiền ra biểu đồ != sổ kỳ`).toBe(Number(row.cash_out));
      expect(sum(tl || [], "inflow"), `${start}: bản mới != bản _legacy (vào)`).toBe(sum(old || [], "inflow"));
      expect(sum(tl || [], "outflow"), `${start}: bản mới != bản _legacy (ra)`).toBe(sum(old || [], "outflow"));
      expect((tl || []).length, `${start}: số ngày khác bản _legacy`).toBe((old || []).length);
    }
  });

  test("/reports tab Dòng tiền: vẽ được, hai nhãn khớp sổ kỳ, 0 lỗi app", async ({ page }) => {
    const consoleErrors: string[] = [];
    const badResponses: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
    page.on("response", (res) => {
      if (res.status() < 400) return;
      const u = res.url();
      if (/\/monitoring|_vercel\/speed-insights|favicon/i.test(u)) return;
      badResponses.push(`${res.status()} ${u.replace(/\?.*$/, "")}`);
    });

    await login(page);
    await page.goto("/reports");
    // ReportsFilters render CA hai ban (desktop + mobile) — ban an vẫn khớp getByText, phải lọc visible.
    await page.getByText("Dòng tiền", { exact: true }).locator("visible=true").first().click();

    const tieuDe = page.getByRole("heading", { name: "Dòng tiền trong kỳ" });
    await tieuDe.waitFor({ state: "visible", timeout: 60_000 });
    await page.waitForTimeout(1500);

    // Đọc RPC NGAY SAU khi màn render — global-setup seed xong trước khi test chạy nên số prod đứng yên trong lượt này.
    const [{ data: snap, error: e1 }, { data: tl, error: e2 }] = await Promise.all([
      db.rpc("finance_reports_snapshot", { p_start_date: RANGE.start, p_end_date: RANGE.end }),
      db.rpc("finance_cashflow_timeline", { p_start_date: RANGE.start, p_end_date: RANGE.end }),
    ]);
    if (e1 || e2) throw new Error(`RPC: ${e1?.message || e2?.message}`);
    const cash = (snap as { cashflowSummary: { totalInflow: number; totalOutflow: number } }).cashflowSummary;
    const rows = (tl || []) as { inflow: number; outflow: number }[];
    const tlIn = rows.reduce((s, r) => s + Number(r.inflow || 0), 0);
    const tlOut = rows.reduce((s, r) => s + Number(r.outflow || 0), 0);

    expect(tlIn, "Σ biểu đồ (vào) phải bằng số tổng của kỳ").toBe(Number(cash.totalInflow));
    expect(tlOut, "Σ biểu đồ (ra) phải bằng số tổng của kỳ").toBe(Number(cash.totalOutflow));

    const vao = chiSo(await page.getByText(/^Vào\s/).locator("visible=true").first().innerText());
    const ra = chiSo(await page.getByText(/^Ra\s/).locator("visible=true").first().innerText());
    expect(vao, "nhãn 'Vào' trên màn phải là số của sổ kỳ").toBe(Number(cash.totalInflow));
    expect(ra, "nhãn 'Ra' trên màn phải là số của sổ kỳ").toBe(Number(cash.totalOutflow));

    // Có phát sinh trong kỳ ⇒ phải vẽ, không được rơi vào trạng thái rỗng.
    if (rows.length > 0) {
      await expect(page.getByText("Chưa có giao dịch phát sinh trong kỳ này.")).toHaveCount(0);
    }

    const bad = consoleErrors.filter((m) => !NOISE.test(m));
    expect(bad, `console: ${bad.join(" | ")}`).toEqual([]);
    expect(badResponses, `mạng: ${badResponses.join(" | ")}`).toEqual([]);
    await page.screenshot({ path: "test-results/cashflow-ledger-c23.png", fullPage: true });
  });
});
