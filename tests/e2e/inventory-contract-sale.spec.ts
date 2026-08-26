/**
 * T-20260826-thiep-kho-ui (M3b) — thiệp của khách HĐ đi đúng đường "Bán thêm HĐ" / "Xuất HĐ".
 *   (a) /inventory · Bán lẻ · gõ SĐT khách HĐ → gợi ý đúng HĐ → chuyển Bán thêm HĐ → ghi đủ 3 sổ
 *       (contract_items phát sinh · payments · stock_out contract_addon_sale) + contract_financials.cogs.
 *   (b) /contracts/[id] · ô "Thiệp" → modal mở sẵn HĐ · đổi Xuất HĐ → stock_out contract_fulfillment · drawer lợi nhuận hiện giá vốn.
 *   (c) ô chọn HĐ tìm được theo 4 số cuối SĐT.
 * Seed riêng, dọn sạch. Chạy: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npx playwright test tests/e2e/inventory-contract-sale.spec.ts --project=chromium --workers=1
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type Admin = SupabaseClient;

interface Seed {
  marker: string;
  email: string;
  password: string;
  phone: string;
  contractCode: string;
  itemCode: string;
  itemName: string;
  userId?: string;
  customerId?: string;
  contractId?: string;
  itemId?: string;
}

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
function admin(): Admin {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

async function seedAll(db: Admin, s: Seed) {
  const { data: au, error: ae } = await db.auth.admin.createUser({
    email: s.email, password: s.password, email_confirm: true,
    app_metadata: { role: "admin" }, user_metadata: { full_name: `E2E VT ${s.marker}` },
  });
  if (ae || !au.user) throw new Error(`auth: ${ae?.message}`);
  s.userId = au.user.id;
  const { error: ee } = await db.from("employees").update({
    employee_code: `E2E-VT-${s.marker.slice(-6)}`, department: "E2E", position: "QA", role: "admin", status: "active", start_date: "2026-05-15",
  }).eq("auth_user_id", s.userId);
  if (ee) throw new Error(`employee: ${ee.message}`);

  const { data: cu, error: ce } = await db.from("customers").insert({
    customer_code: `E2E-VT-CUS-${s.marker}`, full_name: `E2E Khách thiệp ${s.marker.slice(-6)}`, phone: s.phone, status: "active",
  }).select("id").single();
  if (ce || !cu) throw new Error(`customer: ${ce?.message}`);
  s.customerId = cu.id;

  const { data: c, error: cte } = await db.from("contracts").insert({
    contract_code: s.contractCode, customer_id: s.customerId, contract_date: "2026-08-01", work_date: "2026-08-20T02:00:00+07:00",
    service_type: "studio", transaction_type: "hop_dong", status: "dang_thuc_hien", payment_status: "chua_thanh_toan",
    total_amount: 5000000, paid_amount: 0, remaining_amount: 5000000,
  }).select("id").single();
  if (cte || !c) throw new Error(`contract: ${cte?.message}`);
  s.contractId = c.id;

  const { data: it, error: ie } = await db.from("inventory_items").insert({
    item_code: s.itemCode, name: s.itemName, category: "thiep", unit: "tờ", current_stock: 100, min_stock: 0,
    purchase_price: 500, average_unit_price: 500, sale_price: 1100, status: "active",
  }).select("id").single();
  if (ie || !it) throw new Error(`item: ${ie?.message}`);
  s.itemId = it.id;
}

async function cleanup(db: Admin, s: Seed) {
  if (s.itemId) await db.from("inventory_transactions").delete().eq("item_id", s.itemId);
  if (s.contractId) {
    await db.from("payments").delete().eq("contract_id", s.contractId);
    await db.from("contract_items").delete().eq("contract_id", s.contractId);
    await db.from("contract_events").delete().eq("contract_id", s.contractId);
    await db.from("contracts").delete().eq("id", s.contractId);
  }
  if (s.customerId) await db.from("customers").delete().eq("id", s.customerId);
  if (s.itemId) await db.from("inventory_items").delete().eq("id", s.itemId);
  if (s.userId) {
    await db.from("employees").delete().eq("auth_user_id", s.userId);
    await db.auth.admin.deleteUser(s.userId);
  }
}

async function login(page: Page, s: Seed) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(s.email);
  await page.locator('input[name="password"]').fill(s.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
  await Promise.race([page.waitForEvent("load"), page.waitForTimeout(4000)]);
}

const stockOutDialog = (page: Page) => page.getByRole("dialog").filter({ hasText: "Xuất kho" }).first();

async function pickItem(page: Page, s: Seed) {
  const dialog = stockOutDialog(page);
  await dialog.getByPlaceholder("Tìm và chọn vật tư...").fill(s.itemCode);
  await dialog.getByRole("button", { name: new RegExp(s.itemCode) }).first().click();
  await expect(dialog.getByText(`Tồn kho hiện tại`)).toBeVisible();
}

async function chooseMode(page: Page, label: string) {
  const dialog = stockOutDialog(page);
  await dialog.getByRole("combobox", { name: "Loại xuất kho" }).click(); // SelectForm (Radix) đặt aria-label = label
  await page.getByRole("option", { name: label, exact: true }).click();
}

async function cogsOf(db: Admin, contractId: string) {
  const { data, error } = await db.rpc("contract_financials", { p_contract_ids: [contractId] });
  if (error) throw new Error(`contract_financials: ${error.message}`);
  const row = (data as Array<{ cogs: number }>)[0];
  return Number(row?.cogs ?? 0);
}

test.describe.serial("M3b — thiệp khách HĐ đi đường Bán thêm HĐ / Xuất HĐ", () => {
  test.setTimeout(240_000);
  let db: Admin;
  const ts = Date.now();
  const s: Seed = {
    marker: ts.toString(), email: `e2e-vt-${ts}@test.local`, password: `Vt!${ts}`,
    phone: `09${ts.toString().slice(-8)}`,
    contractCode: `E2E-VT-${ts.toString().slice(-6)}`,
    itemCode: `E2E-VT-${ts.toString().slice(-6)}`, itemName: `E2E Thiệp ${ts.toString().slice(-6)}`,
  };

  test.beforeAll(async () => {
    db = admin();
    await seedAll(db, s);
  });
  test.afterAll(async () => {
    await cleanup(db, s);
  });

  test("(a) Bán lẻ gõ SĐT khách HĐ → gợi ý → Bán thêm HĐ ghi đủ 3 sổ + giá vốn HĐ", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await login(page, s);
    await page.goto("/inventory", { waitUntil: "domcontentloaded" });
    const openBtn = page.getByRole("button", { name: "Xuất", exact: true }).first(); // nút header /inventory (FAB phone là "Xuất kho")
    await expect(async () => {
      await openBtn.click();
      await expect(stockOutDialog(page)).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
    const dialog = stockOutDialog(page);
    await pickItem(page, s);

    await dialog.getByPlaceholder("0901234567").fill(s.phone);
    const hint = dialog.getByText(/SĐT này là khách của/);
    await expect(hint).toBeVisible({ timeout: 15_000 });
    await expect(hint).toContainText(s.contractCode);
    if (process.env.DRAWER_SHOTS) await page.screenshot({ path: "test-results/m3b/hint-1366.png" });
    await dialog.getByRole("button", { name: "Bán thêm HĐ", exact: true }).click(); // nút trong banner (footer lúc này là "Bán lẻ")
    await expect(dialog.getByText("Hợp đồng *")).toBeVisible();
    await expect(dialog.locator(".badge", { hasText: s.contractCode })).toBeVisible();
    await expect(dialog.getByPlaceholder("0901234567")).toHaveCount(0); // khối khách lẻ ẩn

    await dialog.locator('input[type="number"]').fill("10");
    await dialog.getByRole("button", { name: "Bán thêm HĐ", exact: true }).click(); // footer submit
    await expect(page.getByText(new RegExp(`Đã bán thêm 10 ${s.itemName}`)).first()).toBeVisible({ timeout: 20_000 });
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    const { data: items } = await db.from("contract_items").select("total_amount, is_addon").eq("contract_id", s.contractId!);
    expect(items?.length).toBe(1);
    expect(Number(items?.[0]?.total_amount)).toBe(11000);
    expect(items?.[0]?.is_addon).toBe(true);
    const { data: pays } = await db.from("payments").select("amount, is_contract_adjustment").eq("contract_id", s.contractId!).is("deleted_at", null);
    expect(pays?.length).toBe(1);
    expect(Number(pays?.[0]?.amount)).toBe(11000);
    const { data: txns } = await db.from("inventory_transactions").select("transaction_type, source_type, contract_id, quantity, total_cost").eq("item_id", s.itemId!);
    expect(txns?.length).toBe(1);
    expect(txns?.[0]).toMatchObject({ transaction_type: "stock_out", source_type: "contract_addon_sale", contract_id: s.contractId, quantity: 10 });
    expect(Number(txns?.[0]?.total_cost)).toBe(5000);
    const { data: item } = await db.from("inventory_items").select("current_stock").eq("id", s.itemId!).single();
    expect(item?.current_stock).toBe(90);
    expect(await cogsOf(db, s.contractId!)).toBe(5000);
  });

  test("(b) Trang HĐ · ô Thiệp → modal mở sẵn HĐ → Xuất HĐ → giá vốn HĐ cộng dồn, drawer lợi nhuận hiện", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await login(page, s);
    await page.goto(`/contracts/${s.contractId}`, { waitUntil: "domcontentloaded" });
    const thiepBtn = page.getByRole("button", { name: "Thiệp", exact: true }).first();
    await expect(thiepBtn).toBeVisible({ timeout: 20_000 });
    if (process.env.DRAWER_SHOTS) await page.screenshot({ path: "test-results/m3b/quick-actions-1366.png" });
    await expect(async () => {
      await thiepBtn.click();
      await expect(stockOutDialog(page)).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
    const dialog = stockOutDialog(page);
    await expect(dialog.locator(".badge", { hasText: s.contractCode })).toBeVisible(); // HĐ chọn sẵn
    await expect(dialog.getByRole("combobox", { name: "Loại xuất kho" })).toContainText("Bán thêm HĐ"); // mặc định
    if (process.env.DRAWER_SHOTS) await page.screenshot({ path: "test-results/m3b/contract-modal-1366.png" });
    await chooseMode(page, "Xuất HĐ");
    await expect(dialog.locator(".badge", { hasText: s.contractCode })).toBeVisible(); // đổi chế độ vẫn giữ HĐ
    await pickItem(page, s);
    await dialog.locator('input[type="number"]').fill("5");
    await dialog.getByRole("button", { name: "Xuất HĐ", exact: true }).click();
    await expect(page.getByText(new RegExp(`Đã xuất 5 ${s.itemName}`)).first()).toBeVisible({ timeout: 20_000 });
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    const { data: txns } = await db.from("inventory_transactions").select("source_type, contract_id, quantity, total_cost").eq("item_id", s.itemId!).order("created_at");
    expect(txns?.length).toBe(2);
    expect(txns?.[1]).toMatchObject({ source_type: "contract_fulfillment", contract_id: s.contractId, quantity: 5 });
    const { data: item } = await db.from("inventory_items").select("current_stock").eq("id", s.itemId!).single();
    expect(item?.current_stock).toBe(85);
    expect(await cogsOf(db, s.contractId!)).toBe(7500);

    // Drawer lợi nhuận trên /contracts: lợi nhuận = doanh thu HĐ (đã cộng phát sinh 11.000 nếu RPC cập nhật total) − giá vốn 7.500
    const { data: c } = await db.from("contracts").select("total_amount").eq("id", s.contractId!).single();
    const profit = Number(c?.total_amount) - 7500;
    await page.goto("/contracts", { waitUntil: "domcontentloaded" });
    const row = page.locator("table tbody tr", { hasText: s.contractCode }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.getByText(new RegExp(`\\+${vnd(profit).replace(/\./g, "\\.")}`)).first().click();
    const profitDialog = page.getByRole("dialog").filter({ hasText: "Giá vốn vật tư" }).first();
    await expect(profitDialog).toBeVisible({ timeout: 20_000 });
    await expect(profitDialog.getByText("7.500").first()).toBeVisible();
    await expect(profitDialog.getByText(s.itemName).first()).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("(c) Ô chọn HĐ tìm theo 4 số cuối SĐT", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await login(page, s);
    await page.goto("/inventory", { waitUntil: "domcontentloaded" });
    const openBtn = page.getByRole("button", { name: "Xuất", exact: true }).first(); // nút header /inventory (FAB phone là "Xuất kho")
    await expect(async () => {
      await openBtn.click();
      await expect(stockOutDialog(page)).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
    const dialog = stockOutDialog(page);
    await chooseMode(page, "Bán thêm HĐ");
    const contractInput = dialog.getByPlaceholder("Gõ mã HĐ hoặc tên khách...");
    await contractInput.fill(s.phone.slice(-4));
    await expect(dialog.getByRole("button", { name: new RegExp(s.contractCode) }).first()).toBeVisible({ timeout: 15_000 });
    // Tên khách và mã HĐ cũng phải tìm được (bản cũ `.or()` trộn cột bảng nhúng → PostgREST "failed to parse logic tree" mỗi khi gõ chữ)
    await contractInput.fill(`Khách thiệp ${s.marker.slice(-6)}`);
    await expect(dialog.getByRole("button", { name: new RegExp(s.contractCode) }).first()).toBeVisible({ timeout: 15_000 });
    await contractInput.fill(s.contractCode.slice(-6));
    await expect(dialog.getByRole("button", { name: new RegExp(s.contractCode) }).first()).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
  });
});
