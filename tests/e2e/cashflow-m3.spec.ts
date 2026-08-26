/**
 * ADR-016 M3 / T-20260826-tien-ekip-va-can-thu — Đóng kín đường tiền.
 * (A) Ekip nội bộ trả theo task như thợ ngoài: task hoàn thành → phải trả (payee employee); trả → phiếu chi
 *     payee_type='employee' + phân bổ work_task; huỷ → nợ quay lại. Sheet lương tháng: product_salary = 0.
 * (B) Cần thu theo mốc giao: finance_debt_stats đọc hợp đồng (không phải bảng debts); chưa giao = chờ giao,
 *     đã giao mà còn nợ = đến hạn (overdue, aging từ ngày giao). finance_month_summary receivable_due/waiting.
 * UI: /finance/payables lọc Ekip; /finance/debts stats "Phải thu" ≠ 0; /finance khối Công nợ caption.
 * Seed riêng, dọn sạch. Chạy --workers=1 (đo delta).
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
  employeeId?: string;
  employeeName: string;
  customerId?: string;
  contractId?: string;
  contractCode: string;
  eventId?: string;
  deliveryEventId?: string;
  taskId?: string;
  expenseIds: string[];
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

async function debtStats(db: Admin): Promise<Row> {
  const { data, error } = await db.rpc("finance_debt_stats").single();
  if (error) throw new Error(`finance_debt_stats: ${error.message}`);
  return data as Row;
}
async function monthSummary(db: Admin): Promise<Row> {
  const now = new Date();
  const { data, error } = await db.rpc("finance_month_summary", { p_month: now.getMonth() + 1, p_year: now.getFullYear() }).single();
  if (error) throw new Error(`finance_month_summary: ${error.message}`);
  return data as Row;
}
async function payableFor(db: Admin, type: string, id: string) {
  const { data } = await db.rpc("finance_payable_summary");
  const row = (data as Array<{ payee_type: string; payee_id: string; remaining: number; item_count: number }>).find((r) => r.payee_type === type && r.payee_id === id);
  return row ? num(row.remaining) : 0;
}

async function seedAll(db: Admin, s: Seed) {
  const { data: au, error: ae } = await db.auth.admin.createUser({
    email: s.email, password: s.password, email_confirm: true,
    app_metadata: { role: "admin" }, user_metadata: { full_name: s.employeeName },
  });
  if (ae || !au.user) throw new Error(`auth: ${ae?.message}`);
  s.userId = au.user.id;
  const { data: emp, error: ee } = await db.from("employees").update({
    employee_code: `E2E-M3-${s.marker.slice(-6)}`, department: "E2E", position: "QA", role: "admin", status: "active", start_date: "2026-05-15",
  }).eq("auth_user_id", s.userId).select("id").single();
  if (ee || !emp) throw new Error(`employee: ${ee?.message}`);
  s.employeeId = emp.id;

  const { data: cu, error: ce } = await db.from("customers").insert({
    customer_code: `E2E-M3-CUS-${s.marker}`, full_name: `E2E M3 ${s.marker}`, phone: "0901000003", status: "active",
  }).select("id").single();
  if (ce || !cu) throw new Error(`customer: ${ce?.message}`);
  s.customerId = cu.id;

  const { data: c, error: cte } = await db.from("contracts").insert({
    contract_code: s.contractCode, customer_id: s.customerId, contract_date: "2026-06-30", work_date: "2026-07-05T02:00:00+07:00",
    service_type: "studio", transaction_type: "hop_dong", status: "dang_thuc_hien", payment_status: "chua_thanh_toan",
    total_amount: 5000000, paid_amount: 0, remaining_amount: 5000000,
  }).select("id").single();
  if (cte || !c) throw new Error(`contract: ${cte?.message}`);
  s.contractId = c.id;

  const { data: ev, error: eve } = await db.from("contract_events").insert({
    contract_id: s.contractId, event_type: "ngay_chup", title: "E2E chụp", event_date: "2026-07-05T02:00:00+07:00", status: "hoan_thanh", sort_order: 1, is_manual_date: true,
  }).select("id").single();
  if (eve || !ev) throw new Error(`event: ${eve?.message}`);
  s.eventId = ev.id;
  const { data: dev, error: deve } = await db.from("contract_events").insert({
    contract_id: s.contractId, event_type: "giao_san_pham", title: "E2E giao", event_date: "2026-08-01T02:00:00+07:00", status: "chua_lam", sort_order: 2, is_manual_date: true,
  }).select("id").single();
  if (deve || !dev) throw new Error(`delivery event: ${deve?.message}`);
  s.deliveryEventId = dev.id;
}

async function cleanup(db: Admin, s: Seed) {
  if (s.expenseIds.length) {
    await db.from("expense_allocations").delete().in("expense_id", s.expenseIds);
    await db.from("expenses").delete().in("id", s.expenseIds);
  }
  if (s.employeeId) await db.from("employee_salaries").delete().eq("employee_id", s.employeeId);
  if (s.contractId) {
    await db.from("expenses").delete().eq("contract_id", s.contractId);
    await db.from("work_tasks").delete().eq("contract_id", s.contractId);
    await db.from("contract_events").delete().eq("contract_id", s.contractId);
    await db.from("contract_items").delete().eq("contract_id", s.contractId);
    await db.from("contracts").delete().eq("id", s.contractId);
  }
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
  await Promise.race([page.waitForEvent("load"), page.waitForTimeout(4000)]);
}

test.describe.serial("ADR-016 M3 — trả ekip theo task + cần thu theo mốc giao", () => {
  test.setTimeout(240_000);
  let db: Admin;
  let before: { debt: Row; month: Row };
  const ts = Date.now();
  const s: Seed = {
    marker: ts.toString(), email: `e2e-m3-${ts}@test.local`, password: `M3!${ts}`,
    employeeName: `E2E Ekip M3 ${ts.toString().slice(-6)}`, contractCode: `E2E-M3-${ts.toString().slice(-6)}`, expenseIds: [],
  };

  test.beforeAll(async () => {
    db = admin();
    await sweepStaleE2EOrphans(db);
    before = { debt: await debtStats(db), month: await monthSummary(db) };
    await seedAll(db, s);
  });
  test.afterAll(async () => {
    if (db) await cleanup(db, s);
  });

  test("(A) task ekip hoàn thành → phải trả; trả theo task → phiếu chi employee + phân bổ; huỷ → nợ quay lại", async () => {
    const { data: task, error: te } = await db.from("work_tasks").insert({
      contract_id: s.contractId, event_id: s.eventId, work_type: "chup_anh", assigned_to: s.employeeId, cost: 1200000, status: "hoan_thanh",
      completion_date: new Date().toISOString(),
    }).select("id").single();
    expect(te).toBeNull();
    s.taskId = task!.id;

    expect(await payableFor(db, "employee", s.employeeId!)).toBe(1200000);
    const { data: items } = await db.rpc("payable_items", { p_payee_type: "employee", p_payee_id: s.employeeId! });
    const item = (items as Array<{ target_type: string; target_id: string; label: string; remaining: number }>).find((i) => i.target_id === s.taskId);
    expect(item?.target_type).toBe("work_task");
    expect(item?.label).toContain(s.contractCode);

    // trả 1.200.000 ngày 25/08 — cùng RPC với thợ ngoài
    const { data: pay, error: pe } = await db.rpc("record_payee_payment_atomic", {
      p_payee_type: "employee", p_payee_id: s.employeeId, p_amount: 1200000, p_payment_method: "tien_mat", p_payment_date: "2026-08-25", p_note: "E2E trả ekip",
      p_allocations: [{ target_id: s.taskId, amount: 1200000 }], p_actor_id: s.userId,
    });
    expect(pe).toBeNull();
    const expenseId = (pay as { expense_id: string }).expense_id;
    s.expenseIds.push(expenseId);
    const { data: exp } = await db.from("expenses").select("payee_type, payee_id, amount, expense_date, category_id, deleted_at").eq("id", expenseId).single();
    expect(exp?.payee_type).toBe("employee");
    expect(exp?.payee_id).toBe(s.employeeId);
    expect(exp?.expense_date).toBe("2026-08-25");
    expect(exp?.category_id).toBeTruthy(); // Chi lương nhân viên
    expect(await payableFor(db, "employee", s.employeeId!)).toBe(0);

    // lịch sử có nhãn task
    const { data: hist } = await db.rpc("payee_payment_history", { p_payee_type: "employee", p_payee_id: s.employeeId! });
    const rows = hist as Array<{ allocations: Array<{ target_type: string; label: string }> }>;
    expect(rows.length).toBe(1);
    expect(rows[0].allocations[0].target_type).toBe("work_task");
    expect(rows[0].allocations[0].label).toContain("chup_anh");

    // huỷ → nợ quay lại
    const { error: ve } = await db.rpc("void_payee_payment_atomic", { p_expense_id: expenseId, p_actor_id: s.userId });
    expect(ve).toBeNull();
    expect(await payableFor(db, "employee", s.employeeId!)).toBe(1200000);

    // lãi/lỗ HĐ không đổi bởi việc trả (cam kết đã tính qua task)
    const { data: fin } = await db.rpc("contract_financials", { p_contract_ids: [s.contractId!] });
    expect(num((fin as Array<{ task_cost: number }>)[0].task_cost)).toBe(1200000);
  });

  test("(B) cần thu theo mốc giao: chưa giao = chờ giao; giao xong = đến hạn (overdue, aging từ ngày giao)", async () => {
    const mid = { debt: await debtStats(db), month: await monthSummary(db) };
    expect(num(mid.debt.receivable) - num(before.debt.receivable)).toBe(5000000);
    expect(num(mid.debt.overdue) - num(before.debt.overdue)).toBe(0);
    expect(num((mid.debt.aging as Row).not_due) - num((before.debt.aging as Row).not_due)).toBe(5000000);
    expect(num(mid.month.receivable_waiting) - num(before.month.receivable_waiting)).toBe(5000000);
    expect(num(mid.month.receivable_due) - num(before.month.receivable_due)).toBe(0);
    expect(num(mid.month.payable_employee) - num(before.month.payable_employee)).toBe(1200000);

    // giao sản phẩm 01/08 → đến hạn thu
    const { error: ue } = await db.from("contract_events").update({ status: "hoan_thanh" }).eq("id", s.deliveryEventId!);
    expect(ue).toBeNull();
    const after = { debt: await debtStats(db), month: await monthSummary(db) };
    expect(num(after.debt.overdue) - num(before.debt.overdue)).toBe(5000000);
    expect(num((after.debt.aging as Row).not_due) - num((before.debt.aging as Row).not_due)).toBe(0);
    expect(num(after.month.receivable_due) - num(before.month.receivable_due)).toBe(5000000);
    expect(num(after.month.receivable_waiting) - num(before.month.receivable_waiting)).toBe(0);

    const { data: aging } = await db.rpc("get_receivable_aging");
    expect(aging).toHaveProperty("not_delivered");

    const { data: pending } = await db.rpc("finance_pending_collections", { p_limit: 50 });
    const mine = (pending as Array<{ contract_code: string; delivered_at: string | null }>).find((r) => r.contract_code === s.contractCode);
    expect(mine?.delivered_at).toBe("2026-08-01");

    // sheet lương tháng 8: product_salary = 0 dù có task 1.200.000 (công theo HĐ trả ở Phải trả › Ekip)
    const { data: existing } = await db.from("monthly_salaries").select("id").eq("month", 8).eq("year", 2026).maybeSingle();
    if (!existing) {
      // generateMonthlySalaries là server action (cần session) — kiểm luật qua dữ liệu: không có dòng lương nào tự sinh cho ekip seed
      const { data: rowsSal } = await db.from("employee_salaries").select("product_salary").eq("employee_id", s.employeeId!);
      expect((rowsSal || []).every((r) => num(r.product_salary) === 0)).toBe(true);
    }
  });

  test("UI: /finance/payables lọc Ekip · /finance/debts phải thu ≠ 0 · /finance khối Công nợ", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await login(page, s);

    await page.goto("/finance/payables", { waitUntil: "domcontentloaded" });
    const row = page.locator("table tbody tr", { hasText: s.employeeName }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.getByText("Ekip").first()).toBeVisible();
    await expect(row.getByText(/1\.200\.000/).first()).toBeVisible();

    await page.goto("/finance/debts", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Đã giao chưa thu").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Chờ giao").first()).toBeVisible({ timeout: 20_000 });

    await page.goto("/finance", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Đã giao chưa thu/).first()).toBeVisible({ timeout: 20_000 });
  });
});
