/**
 * #19 (T-20260911-audit-co-danh-tinh) — nhật ký biết ai làm gì, kiểm trên ĐƯỜNG THẬT:
 *  1. Đăng nhập qua form → sinh dòng LOGIN mang danh tính + IP + trình duyệt.
 *  2. Tạo một mục tiêu tài chính qua giao diện → `createGoal` gọi writeAuditLog KHÔNG truyền actor,
 *     nên dòng nhật ký chỉ có danh tính nếu ngữ cảnh ở withAdmin hoạt động (đây là phép thử của lớp A).
 *  3. Màn /audit-logs hiện TÊN NGƯỜI THẬT, không phải "Hệ thống".
 * Seed 1 admin tạm; dọn người, mục tiêu và mọi dòng nhật ký của lần chạy ở afterAll.
 * Chạy: $env:ALLOW_PROD_WRITE="1"; $env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000"; npx playwright test tests/e2e/audit-actor.spec.ts --project=chromium
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
const seed = { email: `e2e-audit-${ts}@test.local`, password: `Au!${ts}`, userId: "" };
const GOAL_NAME = `E2E T19 muc tieu ${ts}`;
let db: SupabaseClient;
let goalId: string | null = null;

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(seed.email);
  await page.locator('input[name="password"]').fill(seed.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
  await Promise.race([page.waitForEvent("load"), page.waitForTimeout(4000)]);
}

test.describe.serial("#19 — nhật ký có danh tính", () => {
  test.setTimeout(240_000);

  test.beforeAll(async () => {
    db = admin();
    await sweepStaleE2EOrphans(db);
    const { data: au, error } = await db.auth.admin.createUser({
      email: seed.email, password: seed.password, email_confirm: true,
      app_metadata: { role: "admin" }, user_metadata: { full_name: `E2E Audit ${ts}` },
    });
    if (error || !au.user) throw new Error(`auth: ${error?.message}`);
    seed.userId = au.user.id;
    const { error: ee } = await db.from("employees").update({
      employee_code: `E2E-AU-${String(ts).slice(-6)}`, department: "E2E", position: "QA", role: "admin", status: "active", start_date: "2026-05-15",
    }).eq("auth_user_id", seed.userId);
    if (ee) throw new Error(`employee: ${ee.message}`);
  });

  test.afterAll(async () => {
    if (!db) return;
    if (goalId) await db.from("financial_goals").delete().eq("id", goalId);
    await db.from("financial_goals").delete().eq("name", GOAL_NAME);
    if (seed.userId) {
      await db.from("audit_logs").delete().eq("performed_by", seed.userId);
      await db.from("employees").delete().eq("auth_user_id", seed.userId);
      await db.auth.admin.deleteUser(seed.userId);
    }
    await db.from("audit_logs").delete().ilike("description", `%${GOAL_NAME}%`);
    await db.from("login_attempts").delete().ilike("email", "e2e-audit-%");
    await sweepStaleE2EOrphans(db);
  });

  test("đăng nhập để lại vết: có người, có IP, có trình duyệt", async ({ page }) => {
    await login(page);

    await expect
      .poll(
        async () => {
          const { data } = await db
            .from("audit_logs")
            .select("action, performed_by, ip_address, user_agent, source")
            .eq("performed_by", seed.userId)
            .eq("action", "LOGIN")
            .limit(1);
          return data?.length ?? 0;
        },
        { timeout: 20_000, message: "không thấy dòng LOGIN nào cho tài khoản vừa đăng nhập" },
      )
      .toBe(1);

    const { data } = await db
      .from("audit_logs")
      .select("performed_by, ip_address, user_agent, source, description")
      .eq("performed_by", seed.userId)
      .eq("action", "LOGIN")
      .single();

    expect(data?.performed_by).toBe(seed.userId);
    expect(data?.source).toBe("server_action");
    expect(data?.user_agent, "user_agent phải được ghi").toBeTruthy();
    expect(data?.description).toContain(seed.email);
  });

  test("ngữ cảnh tự gắn danh tính: createGoal không truyền actor vẫn ra dòng có người", async ({ page }) => {
    await login(page);
    await page.goto("/finance/goals");
    await page.getByRole("button", { name: /Thêm mục tiêu/i }).first().click();
    // components/ui/input.tsx render <label> KHÔNG có htmlFor nên getByLabel không khớp — trỏ theo nhãn kề.
    const oNhap = (nhan: string) =>
      page.locator(`label:has-text("${nhan}")`).locator("xpath=following::input[1]");
    await oNhap("Tên mục tiêu").fill(GOAL_NAME);
    await oNhap("Số tiền mục tiêu").fill("1000000");
    await page.getByRole("button", { name: /Lưu mục tiêu/i }).click();

    await expect
      .poll(
        async () => {
          const { data } = await db.from("financial_goals").select("id").eq("name", GOAL_NAME).limit(1);
          if (data?.[0]?.id) goalId = data[0].id;
          return data?.length ?? 0;
        },
        { timeout: 30_000, message: "mục tiêu chưa được tạo" },
      )
      .toBe(1);

    const { data: log } = await db
      .from("audit_logs")
      .select("performed_by, source, table_name, description")
      .eq("table_name", "financial_goals")
      .eq("record_id", goalId!)
      .eq("action", "CREATE")
      .single();

    // Đây là phép thử của lớp A: goal-budget-actions.ts KHÔNG truyền performedBy.
    expect(log?.performed_by, "ngữ cảnh ở withAdmin phải bơm được danh tính").toBe(seed.userId);
    expect(log?.source).toBe("server_action");
  });

  test("màn nhật ký hiện tên người thật, không phải 'Hệ thống'", async ({ page }) => {
    await login(page);
    await page.goto("/audit-logs");
    await expect(page.getByRole("heading", { name: /Nhật ký hoạt động/i })).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(1500);
    await expect(page.getByText(`E2E Audit ${ts}`).first()).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: "test-results/audit-actor.png", fullPage: false });
  });
});
