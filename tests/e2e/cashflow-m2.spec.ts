/**
 * ADR-016 M2 / T-20260826-cashflow-m2-ba-so — Ba số, một bộ sổ.
 * Phần 1 (RPC, service role, đo DELTA trước/sau seed → không phụ thuộc dữ liệu thật):
 *   luật ngày — doanh thu HĐ theo ngày CHỤP (T7), task theo ngày SỰ KIỆN (T7), đơn in theo order_date (T7),
 *   tiền theo ngày PHIẾU (T8). finance_month_summary / finance_pnl_by_month / finance_reports_snapshot /
 *   finance_cashflow_timeline phải cho cùng một số (một bộ sổ).
 * Phần 2: payee_payment_history có nhãn phân bổ; void_payee_payment_atomic hoàn nợ; 2 hàm cũ đã DROP.
 * Phần 3 (UI smoke): /finance ba khối · /finance/payables (đối tác seed) · route cũ redirect · /reports.
 * Seed riêng, dọn sạch — KHÔNG mutate dữ liệu thật.
 * Chạy: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npx playwright test tests/e2e/cashflow-m2.spec.ts --project=chromium
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { sweepStaleE2EOrphans } from "./e2e-sweep";

type Admin = SupabaseClient;
type Row = Record<string, unknown>;

interface Seed {
  marker: string;
  email: string;
  password: string;
  userId?: string;
  customerId?: string;
  contractId?: string;
  contractCode: string;
  eventId?: string;
  labId?: string;
  vendorId?: string;
  vendorName: string;
  orderId?: string;
  taskId?: string;
  expenseIds: string[];
}

interface Baseline {
  ms7: Row;
  ms8: Row;
  pnl: Row[];
  snap7: Row;
  snap8: Row;
  tl8Out: number;
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
const num = (v: unknown) => Number(v ?? 0);
const delta = (after: Row, before: Row, key: string) => num(after[key]) - num(before[key]);

async function monthSummary(db: Admin, month: number, year: number): Promise<Row> {
  const { data, error } = await db.rpc("finance_month_summary", { p_month: month, p_year: year }).single();
  if (error) throw new Error(`finance_month_summary: ${error.message}`);
  return data as Row;
}
async function snapshot(db: Admin, start: string, end: string): Promise<Row> {
  const { data, error } = await db.rpc("finance_reports_snapshot", { p_start_date: start, p_end_date: end });
  if (error) throw new Error(`finance_reports_snapshot: ${error.message}`);
  return data as Row;
}
async function readBaseline(db: Admin): Promise<Baseline> {
  const { data: pnl, error: pe } = await db.rpc("finance_pnl_by_month", { p_year: 2026 });
  if (pe) throw new Error(`finance_pnl_by_month: ${pe.message}`);
  const { data: tl, error: te } = await db.rpc("finance_cashflow_timeline", { p_start_date: "2026-08-01", p_end_date: "2026-08-31" });
  if (te) throw new Error(`finance_cashflow_timeline: ${te.message}`);
  return {
    ms7: await monthSummary(db, 7, 2026),
    ms8: await monthSummary(db, 8, 2026),
    pnl: pnl as Row[],
    snap7: await snapshot(db, "2026-07-01", "2026-07-31"),
    snap8: await snapshot(db, "2026-08-01", "2026-08-31"),
    tl8Out: (tl as Row[]).reduce((sum, r) => sum + num(r.outflow), 0),
  };
}
const section = (snap: Row, key: "summary" | "cashflowSummary") => (snap[key] ?? {}) as Row;

async function seedAll(db: Admin, s: Seed) {
  const { data: au, error: ae } = await db.auth.admin.createUser({
    email: s.email, password: s.password, email_confirm: true,
    app_metadata: { role: "admin" }, user_metadata: { full_name: `E2E M2 ${s.marker}` },
  });
  if (ae || !au.user) throw new Error(`auth: ${ae?.message}`);
  s.userId = au.user.id;
  const { error: ee } = await db.from("employees").update({
    employee_code: `E2E-M2-${s.marker.slice(-6)}`, department: "E2E", position: "QA", role: "admin", status: "active", start_date: "2026-05-15",
  }).eq("auth_user_id", s.userId);
  if (ee) throw new Error(`employee: ${ee.message}`);

  const { data: cu, error: ce } = await db.from("customers").insert({
    customer_code: `E2E-M2-CUS-${s.marker}`, full_name: `E2E M2 ${s.marker}`, phone: "0901000002", status: "active",
  }).select("id").single();
  if (ce || !cu) throw new Error(`customer: ${ce?.message}`);
  s.customerId = cu.id;

  // ký 30/06, CHỤP 05/07 → doanh thu vào T7 (không phải T6 ngày ký, không phải tháng bấm hoàn thành)
  const { data: c, error: cte } = await db.from("contracts").insert({
    contract_code: s.contractCode, customer_id: s.customerId, contract_date: "2026-06-30", work_date: "2026-07-05T02:00:00+07:00",
    service_type: "studio", transaction_type: "hop_dong", status: "dang_thuc_hien", payment_status: "chua_thanh_toan",
    total_amount: 5000000, paid_amount: 0, remaining_amount: 5000000,
  }).select("id").single();
  if (cte || !c) throw new Error(`contract: ${cte?.message}`);
  s.contractId = c.id;

  const { data: ev, error: eve } = await db.from("contract_events").insert({
    contract_id: s.contractId, event_type: "ngay_chup", title: "E2E chụp", event_date: "2026-07-05T02:00:00+07:00", status: "chua_lam", sort_order: 1, is_manual_date: true,
  }).select("id").single();
  if (eve || !ev) throw new Error(`event: ${eve?.message}`);
  s.eventId = ev.id;

  const { data: lab, error: le } = await db.from("labs").insert({ lab_name: `E2E Lab M2 ${s.marker}`, status: "active" }).select("id").single();
  if (le || !lab) throw new Error(`lab: ${le?.message}`);
  s.labId = lab.id;

  const { data: v, error: ve } = await db.from("vendors").insert({ full_name: s.vendorName, status: "active", vendor_type: "tho_ngoai" }).select("id").single();
  if (ve || !v) throw new Error(`vendor: ${ve?.message}`);
  s.vendorId = v.id;
}

async function cleanup(db: Admin, s: Seed) {
  if (s.expenseIds.length) {
    await db.from("expense_allocations").delete().in("expense_id", s.expenseIds);
    await db.from("expenses").delete().in("id", s.expenseIds);
  }
  if (s.contractId) {
    await db.from("expenses").delete().eq("contract_id", s.contractId);
    if (s.orderId) await db.from("printing_order_status_history").delete().eq("order_id", s.orderId);
    await db.from("work_tasks").delete().eq("contract_id", s.contractId);
    await db.from("contract_events").delete().eq("contract_id", s.contractId);
    await db.from("printing_orders").delete().eq("contract_id", s.contractId);
    await db.from("contract_items").delete().eq("contract_id", s.contractId);
    await db.from("contracts").delete().eq("id", s.contractId);
  }
  if (s.labId) await db.from("labs").delete().eq("id", s.labId);
  if (s.vendorId) await db.from("vendors").delete().eq("id", s.vendorId);
  if (s.customerId) await db.from("customers").delete().eq("id", s.customerId);
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
  // Sau khi URL đổi (soft), trang còn kích một điều hướng cứng tới /dashboard vài chục ms sau;
  // goto ngay lúc đó → net::ERR_ABORTED. Chờ document load xong (tối đa 4s) rồi mới đi tiếp.
  await Promise.race([page.waitForEvent("load"), page.waitForTimeout(4000)]);
}

test.describe.serial("ADR-016 M2 — ba số, một bộ sổ", () => {
  test.setTimeout(240_000);
  let db: Admin;
  let before: Baseline;
  const ts = Date.now();
  const s: Seed = {
    marker: ts.toString(), email: `e2e-m2-${ts}@test.local`, password: `M2!${ts}`,
    contractCode: `E2E-M2-${ts.toString().slice(-6)}`, vendorName: `E2E Thợ M2 ${ts.toString().slice(-6)}`, expenseIds: [],
  };

  test.beforeAll(async () => {
    db = admin();
    await sweepStaleE2EOrphans(db);
    before = await readBaseline(db); // đo TRƯỚC khi seed (HĐ seed đã là doanh thu T7 ngay khi insert)
    await seedAll(db, s);
  });
  test.afterAll(async () => {
    if (db) await cleanup(db, s);
  });

  test("luật ngày: doanh thu/chi phí rơi vào T7 (chụp + sự kiện + order_date), tiền rơi vào T8 (ngày phiếu) — 4 RPC cùng số", async () => {
    // đơn in 300.000, order_date ép về 10/07 (RPC mặc định hôm nay)
    const { data: created, error } = await db.rpc("create_printing_order_atomic", {
      p_order: { contractId: s.contractId, labId: s.labId, items: [{ name: "E2E M2 Mika 50x75", quantity: 2, unitPrice: 150000 }], notes: "E2E M2", expectedDate: "2026-09-01" },
      p_actor_id: s.userId,
    });
    expect(error).toBeNull();
    s.orderId = (created as { order_id: string }).order_id;
    const { error: oe } = await db.from("printing_orders").update({ order_date: "2026-07-10" }).eq("id", s.orderId!);
    expect(oe).toBeNull();

    // task thợ ngoài 1.200.000, sự kiện 05/07, bấm hoàn thành HÔM NAY (26/08) → chi phí vẫn ở T7
    const { data: task, error: te } = await db.from("work_tasks").insert({
      contract_id: s.contractId, event_id: s.eventId, work_type: "chup_anh", vendor_id: s.vendorId, cost: 1200000, status: "hoan_thanh",
      completion_date: new Date().toISOString(),
    }).select("id").single();
    expect(te).toBeNull();
    s.taskId = task!.id;

    // trả lab 20/08 + trả thợ 22/08 → tiền ra T8 (đường trả tiền hợp nhất, phân bổ target_id)
    const { data: payLab, error: ple } = await db.rpc("record_payee_payment_atomic", {
      p_payee_type: "lab", p_payee_id: s.labId, p_amount: 300000, p_payment_method: "chuyen_khoan", p_payment_date: "2026-08-20", p_note: "E2E M2 trả lab",
      p_allocations: [{ target_id: s.orderId, amount: 300000 }], p_actor_id: s.userId,
    });
    expect(ple).toBeNull();
    s.expenseIds.push((payLab as { expense_id: string }).expense_id);
    const { data: payVendor, error: pve } = await db.rpc("record_payee_payment_atomic", {
      p_payee_type: "vendor", p_payee_id: s.vendorId, p_amount: 1200000, p_payment_method: "tien_mat", p_payment_date: "2026-08-22", p_note: "E2E M2 trả thợ",
      p_allocations: [{ target_id: s.taskId, amount: 1200000 }], p_actor_id: s.userId,
    });
    expect(pve).toBeNull();
    s.expenseIds.push((payVendor as { expense_id: string }).expense_id);

    const after = await readBaseline(db);

    // T7 — lãi/lỗ: +5.000.000 doanh thu, +1.200.000 task, +300.000 in → +3.500.000 lãi; két T7 không đổi
    expect(delta(after.ms7, before.ms7, "revenue_contract")).toBe(5000000);
    expect(delta(after.ms7, before.ms7, "cost_task")).toBe(1200000);
    expect(delta(after.ms7, before.ms7, "cost_print")).toBe(300000);
    expect(delta(after.ms7, before.ms7, "profit")).toBe(3500000);
    expect(delta(after.ms7, before.ms7, "contracts_shot")).toBe(1);
    expect(delta(after.ms7, before.ms7, "cash_in")).toBe(0);
    expect(delta(after.ms7, before.ms7, "cash_out")).toBe(0);

    // T8 — két: +1.500.000 chi (toàn bộ là trả nợ); lãi/lỗ T8 KHÔNG đổi (trả nợ không phải chi phí mới)
    expect(delta(after.ms8, before.ms8, "cash_out")).toBe(1500000);
    expect(delta(after.ms8, before.ms8, "cash_out_settlement")).toBe(1500000);
    expect(delta(after.ms8, before.ms8, "cash_out_other")).toBe(0);
    expect(delta(after.ms8, before.ms8, "revenue")).toBe(0);
    expect(delta(after.ms8, before.ms8, "profit")).toBe(0);
    expect(delta(after.ms8, before.ms8, "cash_in")).toBe(0);
    // phải thu tăng theo HĐ seed (chưa thu), phải trả về 0 cho đối tác seed (đã trả hết)
    expect(delta(after.ms8, before.ms8, "receivable")).toBe(5000000);
    expect(delta(after.ms8, before.ms8, "payable")).toBe(0);

    // cùng một bộ sổ: chart 12 tháng + /reports + timeline cho đúng số ấy
    const m = (rows: Row[], month: number) => rows.find((r) => num(r.raw_month) === month) ?? {};
    expect(delta(m(after.pnl, 7), m(before.pnl, 7), "profit")).toBe(3500000);
    expect(delta(m(after.pnl, 7), m(before.pnl, 7), "revenue")).toBe(5000000);
    expect(delta(m(after.pnl, 8), m(before.pnl, 8), "cash_out")).toBe(1500000);
    expect(delta(m(after.pnl, 8), m(before.pnl, 8), "profit")).toBe(0);

    expect(delta(section(after.snap7, "summary"), section(before.snap7, "summary"), "totalRevenue")).toBe(5000000);
    expect(delta(section(after.snap7, "summary"), section(before.snap7, "summary"), "directCost")).toBe(1500000);
    expect(delta(section(after.snap7, "summary"), section(before.snap7, "summary"), "netProfit")).toBe(3500000);
    expect(delta(section(after.snap7, "cashflowSummary"), section(before.snap7, "cashflowSummary"), "totalOutflow")).toBe(0);
    expect(delta(section(after.snap8, "cashflowSummary"), section(before.snap8, "cashflowSummary"), "totalOutflow")).toBe(1500000);
    expect(delta(section(after.snap8, "summary"), section(before.snap8, "summary"), "totalCost")).toBe(0);
    expect(delta(section(after.snap8, "summary"), section(before.snap8, "summary"), "operatingCost")).toBe(0);

    expect(after.tl8Out - before.tl8Out).toBe(1500000);
  });

  test("lịch sử theo đối tác có nhãn phân bổ; huỷ phiếu chi hoàn nợ; 2 hàm cũ đã DROP", async () => {
    const { data: hist, error } = await db.rpc("payee_payment_history", { p_payee_type: "vendor", p_payee_id: s.vendorId });
    expect(error).toBeNull();
    const rows = hist as Array<{ expense_id: string; expense_date: string; amount: number; allocations: Array<{ label: string; amount: number; target_type: string }> }>;
    expect(rows.length).toBe(1);
    expect(rows[0].expense_date).toBe("2026-08-22");
    expect(rows[0].allocations.length).toBe(1);
    expect(rows[0].allocations[0].target_type).toBe("work_task");
    expect(rows[0].allocations[0].label).toContain("chup_anh");
    expect(rows[0].allocations[0].label).toContain(s.contractCode);

    const { data: voided, error: ve } = await db.rpc("void_payee_payment_atomic", { p_expense_id: rows[0].expense_id, p_actor_id: s.userId });
    expect(ve).toBeNull();
    expect((voided as { payee_type: string }).payee_type).toBe("vendor");

    const { data: exp } = await db.from("expenses").select("deleted_at").eq("id", rows[0].expense_id).single();
    expect(exp?.deleted_at).toBeTruthy();

    const { data: payable } = await db.rpc("finance_payable_summary");
    const vRow = (payable as Array<{ payee_type: string; payee_id: string; remaining: number }>).find((r) => r.payee_type === "vendor" && r.payee_id === s.vendorId);
    expect(num(vRow?.remaining)).toBe(1200000); // nợ thợ quay lại

    const { error: again } = await db.rpc("void_payee_payment_atomic", { p_expense_id: rows[0].expense_id, p_actor_id: s.userId });
    expect(again?.message || "").toContain("da bi huy");

    const { error: oldMetrics } = await db.rpc("finance_dashboard_metrics" as never, { p_month: 8, p_year: 2026 } as never);
    expect(oldMetrics).not.toBeNull();
    const { error: oldRevenue } = await db.rpc("finance_revenue_by_month" as never, { p_year: 2026 } as never);
    expect(oldRevenue).not.toBeNull();
  });

  test("UI smoke: /finance ba khối · /finance/payables đối tác seed · route cũ redirect · /reports", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await login(page, s);

    await page.goto("/finance", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Két tháng/).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Lãi\/lỗ tháng/).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Công nợ hiện tại/).first()).toBeVisible({ timeout: 20_000 });

    // thợ seed còn nợ 1.200.000 sau khi huỷ phiếu chi → có mặt ở màn Phải trả
    await page.goto("/finance/payables", { waitUntil: "domcontentloaded" });
    const row = page.locator("table tbody tr", { hasText: s.vendorName }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.getByText(/1\.200\.000/).first()).toBeVisible();
    await row.getByRole("button", { name: "Thanh toán", exact: true }).click(); // exact: tránh khớp "Lịch sử thanh toán"
    await expect(page.getByText(/Tổng còn nợ/).first()).toBeVisible({ timeout: 20_000 });
    await page.getByText("Chọn thủ công").click(); // danh sách khoản chỉ hiện ở chế độ thủ công
    await expect(page.getByText(/chup_anh/).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Hủy", exact: true }).click();

    await page.goto("/finance/lab-debts", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/finance\/payables/, { timeout: 20_000 });
    await page.goto("/finance/vendor-debts", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/finance\/payables/, { timeout: 20_000 });

    await page.goto("/reports", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Doanh thu/).first()).toBeVisible({ timeout: 20_000 });
  });
});
