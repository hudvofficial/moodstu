/**
 * ADR-016 M5 / T-20260827-luong-cung-m5 — Lương cứng.
 *   (A) sheet lương tháng → phải trả ekip (payable_items 'employee_salary') + accrual cost_salary_base (đo DELTA).
 *   (B) record_payee_payment_atomic('employee') phân bổ vào dòng lương → paid/remaining dẫn xuất; void → nợ quay lại.
 *   (C) UI /finance/salaries "Thanh toán" (tất toán) → phiếu chi payee employee + phân bổ employee_salary; két tháng +.
 * Seed riêng, dọn sạch — KHÔNG mutate dữ liệu thật (sheet 8/2026 chỉ tạo nếu chưa có, và xoá khi xong).
 * Chạy: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npx playwright test tests/e2e/cashflow-m5.spec.ts --project=chromium --workers=1
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type Admin = SupabaseClient;
type Row = Record<string, unknown>;

interface Seed {
  marker: string;
  email: string;
  password: string;
  employeeName: string;
  userId?: string;
  employeeId?: string;
  monthlySalaryId?: string;
  monthlySalaryCreated: boolean;
  salaryId?: string;
}

const MONTH = 8;
const YEAR = 2026;
const BASE = 3_000_000;

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

async function monthSummary(db: Admin): Promise<Row> {
  const { data, error } = await db.rpc("finance_month_summary", { p_month: MONTH, p_year: YEAR }).single();
  if (error) throw new Error(`finance_month_summary: ${error.message}`);
  return data as Row;
}
async function salaryRow(db: Admin, id: string) {
  const { data, error } = await db.from("employee_salaries").select("paid_amount, remaining_amount, net_salary").eq("id", id).single();
  if (error) throw new Error(`employee_salaries: ${error.message}`);
  return { paid: num(data.paid_amount), remaining: num(data.remaining_amount), net: num(data.net_salary) };
}
async function employeePayable(db: Admin, employeeId: string) {
  const { data, error } = await db.rpc("finance_payable_summary");
  if (error) throw new Error(`finance_payable_summary: ${error.message}`);
  const row = (data as Array<{ payee_type: string; payee_id: string; remaining: number }>).find((r) => r.payee_type === "employee" && r.payee_id === employeeId);
  return num(row?.remaining);
}

async function seedAll(db: Admin, s: Seed) {
  const { data: au, error: ae } = await db.auth.admin.createUser({
    email: s.email, password: s.password, email_confirm: true,
    app_metadata: { role: "admin" }, user_metadata: { full_name: s.employeeName },
  });
  if (ae || !au.user) throw new Error(`auth: ${ae?.message}`);
  s.userId = au.user.id;
  const { data: emp, error: ee } = await db.from("employees").update({
    employee_code: `E2E-M5-${s.marker.slice(-6)}`, full_name: s.employeeName, department: "E2E", position: "QA", role: "admin", status: "active",
    start_date: "2026-05-15", salary_info: { base_salary: BASE, bank_name: null, bank_account_no: null, bank_account_name: null },
  }).eq("auth_user_id", s.userId).select("id").single();
  if (ee || !emp) throw new Error(`employee: ${ee?.message}`);
  s.employeeId = emp.id;

  const { data: ms } = await db.from("monthly_salaries").select("id").eq("month", MONTH).eq("year", YEAR).maybeSingle();
  if (ms) {
    s.monthlySalaryId = ms.id;
  } else {
    const { data: created, error: me } = await db.from("monthly_salaries").insert({
      salary_code: `BL-${YEAR}-${String(MONTH).padStart(2, "0")}`, month: MONTH, year: YEAR, total_employees: 1, total_salary: BASE,
      base_salary_total: BASE, product_salary_total: 0, bonus_total: 0, penalty_total: 0, advance_total: 0,
    }).select("id").single();
    if (me || !created) throw new Error(`monthly_salaries: ${me?.message}`);
    s.monthlySalaryId = created.id;
    s.monthlySalaryCreated = true;
  }
  const { data: sal, error: se } = await db.from("employee_salaries").insert({
    monthly_salary_id: s.monthlySalaryId, employee_id: s.employeeId, month: MONTH, year: YEAR,
    base_salary: BASE, product_salary: 0, bonus: 0, penalty: 0, advance_payment: 0,
    total_salary: BASE, net_salary: BASE, paid_amount: 0, remaining_amount: BASE,
  }).select("id").single();
  if (se || !sal) throw new Error(`employee_salaries: ${se?.message}`);
  s.salaryId = sal.id;
}

async function cleanup(db: Admin, s: Seed) {
  if (s.employeeId) {
    const { data: exps } = await db.from("expenses").select("id").eq("payee_id", s.employeeId);
    const ids = (exps || []).map((e) => e.id);
    if (ids.length) {
      await db.from("expense_allocations").delete().in("expense_id", ids);
      await db.from("expenses").delete().in("id", ids);
    }
  }
  if (s.salaryId) await db.from("employee_salaries").delete().eq("id", s.salaryId);
  if (s.monthlySalaryCreated && s.monthlySalaryId) await db.from("monthly_salaries").delete().eq("id", s.monthlySalaryId);
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

test.describe.serial("ADR-016 M5 — lương cứng: sheet → phải trả, trả lương một đường, accrual", () => {
  test.setTimeout(240_000);
  let db: Admin;
  let before: { ms: Row; payable: number };
  const ts = Date.now();
  const s: Seed = {
    marker: ts.toString(), email: `e2e-m5-${ts}@test.local`, password: `M5!${ts}`,
    employeeName: `E2E M5 ${ts.toString().slice(-6)}`, monthlySalaryCreated: false,
  };

  test.beforeAll(async () => {
    db = admin();
    // baseline trước khi seed sheet (accrual + phải trả ekip theo DELTA)
    before = { ms: await monthSummary(db), payable: 0 };
    await seedAll(db, s);
  });
  test.afterAll(async () => {
    await cleanup(db, s);
  });

  test("(A) sheet lương → payable_items 'employee_salary' + accrual cost_salary_base", async () => {
    const { data: items, error } = await db.rpc("payable_items", { p_payee_type: "employee", p_payee_id: s.employeeId! });
    expect(error).toBeNull();
    const salaryItem = (items as Array<{ target_type: string; target_id: string; label: string; remaining: number }>).find((i) => i.target_type === "employee_salary");
    expect(salaryItem?.target_id).toBe(s.salaryId);
    expect(salaryItem?.label).toBe(`Lương ${MONTH}/${YEAR}`);
    expect(num(salaryItem?.remaining)).toBe(BASE);

    expect(await employeePayable(db, s.employeeId!)).toBe(BASE);
    const ms = await monthSummary(db);
    expect(num(ms.cost_salary_base) - num(before.ms.cost_salary_base)).toBe(BASE);
    expect(num(ms.payable_employee) - num(before.ms.payable_employee)).toBe(BASE);
  });

  test("(B) trả 1.000.000 phân bổ vào dòng lương → paid/remaining dẫn xuất; huỷ → nợ quay lại", async () => {
    const { data: pay, error: pe } = await db.rpc("record_payee_payment_atomic", {
      p_payee_type: "employee", p_payee_id: s.employeeId, p_amount: 1_000_000, p_payment_method: "chuyen_khoan", p_payment_date: "2026-08-27",
      p_note: "E2E trả lương một phần", p_allocations: [{ target_id: s.salaryId, amount: 1_000_000 }], p_actor_id: s.userId,
    });
    expect(pe).toBeNull();
    const r = pay as { expense_id: string; allocated_amount: number };
    expect(num(r.allocated_amount)).toBe(1_000_000);

    expect(await salaryRow(db, s.salaryId!)).toEqual({ paid: 1_000_000, remaining: 2_000_000, net: BASE });
    const { data: alloc } = await db.from("expense_allocations").select("target_type, target_id, amount").eq("expense_id", r.expense_id);
    expect(alloc?.[0]).toMatchObject({ target_type: "employee_salary", target_id: s.salaryId });
    const { data: rem } = await db.rpc("payable_remaining", { p_target_type: "employee_salary", p_target_id: s.salaryId!, p_payee_id: s.employeeId! });
    expect(num(rem)).toBe(2_000_000);
    expect(await employeePayable(db, s.employeeId!)).toBe(2_000_000);

    const { error: ve } = await db.rpc("void_payee_payment_atomic", { p_expense_id: r.expense_id, p_actor_id: s.userId });
    expect(ve).toBeNull();
    expect(await salaryRow(db, s.salaryId!)).toEqual({ paid: 0, remaining: BASE, net: BASE });
    expect(await employeePayable(db, s.employeeId!)).toBe(BASE);
  });

  test("(C) UI /finance/salaries → Thanh toán (tất toán) → phiếu chi + phân bổ, két tháng +, hết phải trả", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    const cashBefore = num((await monthSummary(db)).cash_out);
    await login(page, s);
    await page.goto("/finance/salaries", { waitUntil: "domcontentloaded" });
    const row = page.locator("table tbody tr", { hasText: s.employeeName }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.getByText(/3\.000\.000/).first()).toBeVisible();
    await row.getByRole("button", { name: "Thanh toán" }).click();
    const modal = page.getByRole("dialog", { name: "Xác nhận thanh toán lương" });
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await modal.getByRole("button", { name: "Tất toán" }).click();
    await modal.getByRole("button", { name: "Xác nhận chi tiền" }).click();
    await expect(page.getByText("Thanh toán lương thành công.").first()).toBeVisible({ timeout: 20_000 });

    await expect.poll(async () => (await salaryRow(db, s.salaryId!)).paid, { timeout: 20_000 }).toBe(BASE);
    const { data: exps } = await db.from("expenses").select("id, amount, payee_type, description").eq("payee_id", s.employeeId!).is("deleted_at", null);
    expect(exps?.length).toBe(1);
    expect(num(exps?.[0]?.amount)).toBe(BASE);
    expect(exps?.[0]?.description).toContain("[Auto-Salary]");
    const { data: alloc } = await db.from("expense_allocations").select("target_type, amount").eq("expense_id", exps![0].id);
    expect(alloc?.[0]).toMatchObject({ target_type: "employee_salary" });
    expect(num(alloc?.[0]?.amount)).toBe(BASE);
    expect(await employeePayable(db, s.employeeId!)).toBe(0); // hết nợ → không còn ở Phải trả
    expect(num((await monthSummary(db)).cash_out) - cashBefore).toBe(BASE);
  });
});
