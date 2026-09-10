/**
 * #22 (T-20260907-role-gate-route) — role-gate tầng route theo ma trận ROLE_PERMISSIONS.
 * sale  → /crm/leads, /settings: "Không có quyền truy cập"; sidebar không có "CRM"; /contracts vẫn vào.
 * viewer (ctv) → /admin/vendors: "Không có quyền truy cập".
 * admin → /crm/leads, /settings, /admin/vendors vào bình thường (không thấy AccessDenied).
 * Seed 3 auth user (department E2E), không tạo dữ liệu nghiệp vụ; dọn ở afterAll + sweep.
 * Chạy: $env:ALLOW_PROD_WRITE="1"; $env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000"; npx playwright test tests/e2e/role-gate.spec.ts --project=chromium
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

type SeedRole = "admin" | "sale" | "ctv";
const ts = Date.now();
const users: Record<SeedRole, { email: string; password: string; userId: string }> = {
  admin: { email: `e2e-rg-admin-${ts}@test.local`, password: `Rg!${ts}a`, userId: "" },
  sale: { email: `e2e-rg-sale-${ts}@test.local`, password: `Rg!${ts}s`, userId: "" },
  ctv: { email: `e2e-rg-ctv-${ts}@test.local`, password: `Rg!${ts}c`, userId: "" },
};
let db: SupabaseClient;
const DENIED = "Không có quyền truy cập";

async function login(page: Page, role: SeedRole) {
  const u = users[role];
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(u.email);
  await page.locator('input[name="password"]').fill(u.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
  await Promise.race([page.waitForEvent("load"), page.waitForTimeout(4000)]);
}
async function isDenied(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(800);
  return (await page.getByText(DENIED).count()) > 0;
}

test.describe.serial("#22 — role-gate tầng route", () => {
  test.setTimeout(240_000);

  test.beforeAll(async () => {
    db = admin();
    await sweepStaleE2EOrphans(db);
    for (const role of Object.keys(users) as SeedRole[]) {
      const u = users[role];
      const { data: au, error } = await db.auth.admin.createUser({
        email: u.email, password: u.password, email_confirm: true,
        app_metadata: { role }, user_metadata: { full_name: `E2E RG ${role} ${ts}` },
      });
      if (error || !au.user) throw new Error(`auth ${role}: ${error?.message}`);
      u.userId = au.user.id;
      const { error: ee } = await db.from("employees").update({
        employee_code: `E2E-RG-${role.toUpperCase()}-${String(ts).slice(-5)}`, department: "E2E", position: "QA", role, status: "active", start_date: "2026-05-15",
      }).eq("auth_user_id", u.userId);
      if (ee) throw new Error(`employee ${role}: ${ee.message}`);
    }
  });

  test.afterAll(async () => {
    if (!db) return;
    for (const u of Object.values(users)) {
      if (!u.userId) continue;
      await db.from("employees").delete().eq("auth_user_id", u.userId);
      await db.auth.admin.deleteUser(u.userId);
    }
    await sweepStaleE2EOrphans(db);
  });

  test("sale: /crm/leads + /settings bị chặn, sidebar không có CRM, /contracts vẫn vào", async ({ page }) => {
    await login(page, "sale");
    expect(await isDenied(page, "/crm/leads"), "sale → /crm/leads").toBe(true);
    expect(await isDenied(page, "/settings"), "sale → /settings").toBe(true);
    await page.goto("/contracts");
    await page.waitForSelector("table, button.card-base", { timeout: 30_000 });
    expect(await page.getByText(DENIED).count(), "sale → /contracts").toBe(0);
    const sidebarCrm = await page.locator("aside nav").getByText(/^CRM$/).count();
    expect(sidebarCrm, "sidebar mục CRM").toBe(0);
    console.log("sale: crm=chặn · settings=chặn · contracts=vào · sidebar CRM=0");
  });

  test("viewer (ctv): /admin/vendors bị chặn", async ({ page }) => {
    await login(page, "ctv");
    expect(await isDenied(page, "/admin/vendors"), "ctv → /admin/vendors").toBe(true);
    expect(await isDenied(page, "/admin/backfill-dimensions"), "ctv → /admin/backfill-dimensions").toBe(true);
    console.log("ctv: /admin/vendors=chặn · /admin/backfill-dimensions=chặn");
  });

  test("admin: /crm/leads, /settings, /admin/vendors vào bình thường", async ({ page }) => {
    await login(page, "admin");
    for (const url of ["/crm/leads", "/settings", "/admin/vendors"]) {
      expect(await isDenied(page, url), `admin → ${url}`).toBe(false);
    }
    console.log("admin: 3 route vào bình thường");
  });
});
