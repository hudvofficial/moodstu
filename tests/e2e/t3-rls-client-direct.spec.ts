/**
 * #24 — T3 tầng RLS: sau khi gỡ policy OR + thu hồi quyền ghi, đường client-direct
 * (anon key + phiên đăng nhập) của vai SALE vẫn đọc được bảng con hợp đồng trong drawer,
 * và trang lịch (RPC calendar_month_events có p_employee_id) render không lỗi.
 *
 * Chạy (PowerShell, next start đã lên ở 3000):
 *   $env:ALLOW_PROD_WRITE='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3000'
 *   npx playwright test tests/e2e/t3-rls-client-direct.spec.ts --project=chromium
 * Chạm DB prod: tạo 1 user sale tạm (E2E-T3-…) rồi xoá ở afterAll + sweep.
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

const ts = Date.now();
const seed = { email: `e2e-t3-sale-${ts}@test.local`, password: `T3!${ts}s`, userId: "" };
let db: SupabaseClient;
// HĐ thật có mốc để mở drawer — KHÔNG lấy hàng đầu bảng: global-setup seed 20 HĐ E2E (19 HĐ "simple" không bảng con)
// nên hàng đầu thường là HĐ E2E rỗng → bảng con trả [] dù RLS đúng (bài học 10/09).
const target = { id: "", code: "" };

async function pickRealContract(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("contracts")
    .select("id, contract_code")
    .is("deleted_at", null)
    .not("contract_code", "ilike", "E2E%")
    .order("contract_code", { ascending: false })
    .limit(8);
  if (error) throw new Error(`contracts: ${error.message}`);
  for (const c of data ?? []) {
    const { count } = await admin.from("contract_events").select("id", { count: "exact", head: true }).eq("contract_id", c.id).is("deleted_at", null);
    if ((count ?? 0) > 0) return { id: c.id as string, code: c.contract_code as string };
  }
  throw new Error("không tìm được HĐ thật có mốc");
}

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(seed.email);
  await page.locator('input[name="password"]').fill(seed.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
  await Promise.race([page.waitForEvent("load"), page.waitForTimeout(4000)]);
}

const CHILD_TABLES = ["contract_events", "contract_checklists", "work_tasks", "payment_plans"] as const;

test.describe.serial("#24 — T3 RLS: client-direct của sale vẫn đọc, lịch có p_employee_id", () => {
  test.setTimeout(240_000);

  test.beforeAll(async () => {
    db = admin();
    await sweepStaleE2EOrphans(db);
    const { data: au, error } = await db.auth.admin.createUser({
      email: seed.email, password: seed.password, email_confirm: true,
      app_metadata: { role: "sale" }, user_metadata: { full_name: `E2E T3 sale ${ts}` },
    });
    if (error || !au.user) throw new Error(`auth: ${error?.message}`);
    seed.userId = au.user.id;
    const { error: ee } = await db.from("employees").update({
      employee_code: `E2E-T3-SALE-${String(ts).slice(-5)}`, department: "E2E", position: "QA", role: "sale", status: "active", start_date: "2026-05-15",
    }).eq("auth_user_id", seed.userId);
    if (ee) throw new Error(`employee: ${ee.message}`);
    Object.assign(target, await pickRealContract(db));
  });

  test.afterAll(async () => {
    if (!db || !seed.userId) return;
    await db.from("employees").delete().eq("auth_user_id", seed.userId);
    await db.auth.admin.deleteUser(seed.userId);
    await db.from("login_attempts").delete().ilike("email", "e2e-t3-%");
    await sweepStaleE2EOrphans(db);
  });

  test("sale mở drawer HĐ: 4 bảng con tải qua anon key, 0 lỗi 42501/PGRST", async ({ page }) => {
    const restStatuses: Array<{ url: string; status: number }> = [];
    const consoleErrors: string[] = [];
    page.on("response", (res) => {
      if (res.url().includes("/rest/v1/")) restStatuses.push({ url: res.url().replace(/\?.*$/, ""), status: res.status() });
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await login(page);
    // lọc theo mã (param q) để hàng đầu là HĐ thật đã chọn, không phải HĐ E2E của global-setup
    await page.goto(`/contracts?status=all&q=${encodeURIComponent(target.code)}`);
    await page.waitForLoadState("networkidle");
    const row = page.locator("table tbody tr", { hasText: target.code }).first();
    await expect(row).toBeVisible({ timeout: 30_000 });

    const bodies: Record<string, number> = {};
    const ids: Record<string, string> = {};
    const waits = CHILD_TABLES.map((t) =>
      page.waitForResponse(
        (r) => r.url().includes(`/rest/v1/${t}?`) && r.url().includes(`contract_id=eq.${target.id}`) && r.request().method() === "GET",
        { timeout: 30_000 },
      ).then(async (r) => {
        const json = (await r.json().catch(() => null)) as unknown;
        bodies[t] = Array.isArray(json) ? json.length : -1;
        ids[t] = new URL(r.url()).searchParams.get("contract_id") ?? "";
        return r.status();
      }),
    );
    await row.click();
    const statuses = await Promise.all(waits);

    expect(statuses, `status 4 bảng con: ${JSON.stringify(bodies)}`).toEqual([200, 200, 200, 200]);
    expect(Object.values(ids).every((v) => v === `eq.${target.id}`), `id lệch: ${JSON.stringify(ids)}`).toBe(true);
    // HĐ thật có mốc → contract_events phải >0 qua anon key → chứng minh policy *_read cho sale
    expect(bodies.contract_events, `mốc HĐ ${target.code} qua client-direct: ${JSON.stringify(bodies)}`).toBeGreaterThan(0);
    const bad = restStatuses.filter((s) => s.status >= 400);
    expect(bad, `REST lỗi: ${JSON.stringify(bad)}`).toEqual([]);
    const denied = consoleErrors.filter((m) => /42501|permission denied|PGRST/i.test(m));
    expect(denied, `console: ${denied.join(" | ")}`).toEqual([]);
    await page.screenshot({ path: "test-results/t3-sale-drawer.png", fullPage: false });
  });

  test("sale mở /calendar: server action gọi RPC với p_employee_id, không lỗi tải lịch", async ({ page }) => {
    await login(page);
    await page.goto("/calendar");
    // trang lịch không bao giờ "networkidle" (realtime) → chờ toolbar + hàng thứ của lưới tháng
    await expect(page.getByLabel("Chọn tháng và năm").first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("T2", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2500); // cho server action fetchCalendarEvents (RPC p_employee_id) trả về
    await expect(page.getByText(/Lỗi tải dữ liệu lịch|Lỗi tải lịch|Lỗi tải sự kiện/)).toHaveCount(0);
    await expect(page.getByText("Không có quyền truy cập")).toHaveCount(0);
    await page.screenshot({ path: "test-results/t3-sale-calendar.png", fullPage: false });
  });
});
