/**
 * ADR-016 / T-20260825-cashflow-m1-so-tien-ra — Sổ tiền ra.
 * Phần 1 (RPC, qua service role): 5 luồng đã đổi hành vi —
 *   (a) tạo/sửa đơn in KHÔNG sinh phiếu chi; (b) trả lab → phiếu chi thật đúng ngày nhập + phân bổ +
 *   payment_status dẫn xuất; (c) task thợ ngoài hoàn thành KHÔNG sinh phiếu chi, trả thợ → phiếu chi + phân bổ;
 *   (d) nhập phôi "đã trả" → phiếu chi payee=supplier + phân bổ + tồn kho; (e) xoá đơn in đã trả bị chặn.
 * Phần 2 (UI smoke, seed admin): 5 màn đọc sổ mới render được số đúng.
 * Seed riêng, dọn sạch — KHÔNG mutate dữ liệu thật.
 * Chạy: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npx playwright test tests/e2e/cashflow-m1.spec.ts --project=chromium
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { sweepStaleE2EOrphans } from "./e2e-sweep";

type Admin = SupabaseClient;

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
  supplierId?: string;
  itemId?: string;
  orderId?: string;
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

async function expensesFor(db: Admin, payeeType: string, payeeId: string) {
  const { data } = await db
    .from("expenses")
    .select("id, amount, expense_date, payee_type, payee_id, approved_by, category_id")
    .eq("payee_type", payeeType)
    .eq("payee_id", payeeId)
    .is("deleted_at", null);
  return data || [];
}
async function allocationsFor(db: Admin, targetType: string, targetId: string) {
  const { data } = await db.from("expense_allocations").select("expense_id, amount").eq("target_type", targetType).eq("target_id", targetId);
  return data || [];
}

async function seedAll(db: Admin, s: Seed) {
  const { data: au, error: ae } = await db.auth.admin.createUser({
    email: s.email, password: s.password, email_confirm: true,
    app_metadata: { role: "admin" }, user_metadata: { full_name: `E2E M1 ${s.marker}` },
  });
  if (ae || !au.user) throw new Error(`auth: ${ae?.message}`);
  s.userId = au.user.id;
  const { error: ee } = await db.from("employees").update({
    employee_code: `E2E-M1-${s.marker.slice(-6)}`, department: "E2E", position: "QA", role: "admin", status: "active", start_date: "2026-05-15",
  }).eq("auth_user_id", s.userId);
  if (ee) throw new Error(`employee: ${ee.message}`);

  const { data: cu, error: ce } = await db.from("customers").insert({
    customer_code: `E2E-M1-CUS-${s.marker}`, full_name: `E2E M1 ${s.marker}`, phone: "0901000000", status: "active",
  }).select("id").single();
  if (ce || !cu) throw new Error(`customer: ${ce?.message}`);
  s.customerId = cu.id;

  const { data: c, error: cte } = await db.from("contracts").insert({
    contract_code: s.contractCode, customer_id: s.customerId, contract_date: "2026-06-30", work_date: "2026-07-05",
    service_type: "studio", transaction_type: "hop_dong", status: "dang_thuc_hien", payment_status: "chua_thanh_toan",
    total_amount: 5000000, paid_amount: 0, remaining_amount: 5000000,
  }).select("id").single();
  if (cte || !c) throw new Error(`contract: ${cte?.message}`);
  s.contractId = c.id;

  const { data: ev, error: eve } = await db.from("contract_events").insert({
    contract_id: s.contractId, event_type: "ngay_chup", title: "E2E chụp", event_date: "2026-07-05", status: "chua_lam", sort_order: 1, is_manual_date: true,
  }).select("id").single();
  if (eve || !ev) throw new Error(`event: ${eve?.message}`);
  s.eventId = ev.id;

  const { data: lab, error: le } = await db.from("labs").insert({ lab_name: `E2E Lab M1 ${s.marker}`, status: "active" }).select("id").single();
  if (le || !lab) throw new Error(`lab: ${le?.message}`);
  s.labId = lab.id;

  const { data: v, error: ve } = await db.from("vendors").insert({ full_name: `E2E Thợ M1 ${s.marker}`, status: "active", vendor_type: "tho_ngoai" }).select("id").single();
  if (ve || !v) throw new Error(`vendor: ${ve?.message}`);
  s.vendorId = v.id;

  const { data: sup, error: se } = await db.from("vendors").insert({ full_name: `E2E NCC phôi M1 ${s.marker}`, status: "active", vendor_type: "nha_cung_cap" }).select("id").single();
  if (se || !sup) throw new Error(`supplier: ${se?.message}`);
  s.supplierId = sup.id;

  const { data: it, error: ie } = await db.from("inventory_items").insert({
    item_code: `E2E-M1-${s.marker.slice(-6)}`, name: `E2E Phôi M1 ${s.marker}`, unit: "tờ", current_stock: 0, status: "active", supplier_id: s.supplierId,
  }).select("id").single();
  if (ie || !it) throw new Error(`item: ${ie?.message}`);
  s.itemId = it.id;
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
  if (s.itemId) {
    await db.from("inventory_transactions").delete().eq("item_id", s.itemId);
    await db.from("inventory_items").delete().eq("id", s.itemId);
  }
  if (s.labId) await db.from("labs").delete().eq("id", s.labId);
  if (s.vendorId) await db.from("vendors").delete().eq("id", s.vendorId);
  if (s.supplierId) await db.from("vendors").delete().eq("id", s.supplierId);
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
  // Trang còn kích một điều hướng cứng tới /dashboard ngay sau khi đổi URL → goto sớm bị ERR_ABORTED
  await Promise.race([page.waitForEvent("load"), page.waitForTimeout(4000)]);
}

test.describe.serial("ADR-016 M1 — sổ tiền ra", () => {
  test.setTimeout(240_000);
  let db: Admin;
  const ts = Date.now();
  const s: Seed = {
    marker: ts.toString(), email: `e2e-m1-${ts}@test.local`, password: `M1!${ts}`,
    contractCode: `E2E-M1-${ts.toString().slice(-6)}`, expenseIds: [],
  };

  test.beforeAll(async () => {
    db = admin();
    await sweepStaleE2EOrphans(db);
    await seedAll(db, s);
  });
  test.afterAll(async () => {
    if (db) await cleanup(db, s);
  });

  test("(a)+(b)+(e) đơn in: tạo không sinh phiếu chi; trả lab đúng ngày → phiếu chi + phân bổ + đã thanh toán; xoá bị chặn", async () => {
    const { data: created, error } = await db.rpc("create_printing_order_atomic", {
      p_order: { contractId: s.contractId, labId: s.labId, items: [{ name: "E2E Mika 50x75", quantity: 2, unitPrice: 150000 }], notes: "E2E M1", expectedDate: "2026-09-01" },
      p_actor_id: s.userId,
    });
    expect(error).toBeNull();
    s.orderId = (created as { order_id: string }).order_id;

    // (a) không có phiếu chi nào gắn đơn / gắn HĐ
    const { data: byOrder } = await db.from("expenses").select("id").eq("printing_order_id", s.orderId!).is("deleted_at", null);
    expect(byOrder?.length ?? 0).toBe(0);
    const { data: byContract } = await db.from("expenses").select("id").eq("contract_id", s.contractId!).is("deleted_at", null);
    expect(byContract?.length ?? 0).toBe(0);

    // công nợ lab = 300.000
    const { data: payable } = await db.rpc("finance_payable_summary");
    const labRow = (payable as Array<{ payee_type: string; payee_id: string; remaining: number }>).find((r) => r.payee_type === "lab" && r.payee_id === s.labId);
    expect(Number(labRow?.remaining)).toBe(300000);

    // (b) trả 300.000 ngày 2026-08-20 qua wrapper cũ (app gọi đúng hàm này)
    const { data: pay, error: payErr } = await db.rpc("record_lab_payment_atomic", {
      p_lab_id: s.labId, p_amount: 300000, p_payment_method: "transfer", p_note: "E2E trả lab", p_allocations: [], p_actor_id: s.userId, p_payment_date: "2026-08-20",
    });
    expect(payErr).toBeNull();
    const expenseId = (pay as { expense_id: string; payment_id: string }).expense_id;
    expect((pay as { payment_id: string }).payment_id).toBe(expenseId);
    s.expenseIds.push(expenseId);

    const labExpenses = await expensesFor(db, "lab", s.labId!);
    expect(labExpenses.length).toBe(1);
    expect(labExpenses[0].expense_date).toBe("2026-08-20"); // luật ngày: ngày nhập, không phải hôm nay
    expect(Number(labExpenses[0].amount)).toBe(300000);
    expect(labExpenses[0].approved_by).toBe(s.userId);
    const alloc = await allocationsFor(db, "printing_order", s.orderId!);
    expect(alloc.length).toBe(1);
    expect(Number(alloc[0].amount)).toBe(300000);

    const { data: order } = await db.from("printing_orders").select("payment_status").eq("id", s.orderId!).single();
    expect(order?.payment_status).toBe("da_thanh_toan");

    // M2: lịch sử theo đối tác đọc thẳng expenses + phân bổ có nhãn (không còn view lab_payments)
    const { data: hist } = await db.rpc("payee_payment_history", { p_payee_type: "lab", p_payee_id: s.labId! });
    const histRows = hist as Array<{ expense_date: string; allocations: Array<{ label: string; amount: number }> }>;
    expect(histRows.length).toBe(1);
    expect(histRows[0].expense_date).toBe("2026-08-20");
    expect(histRows[0].allocations.length).toBe(1);

    // (e) xoá đơn đã có phiếu chi → chặn
    const { error: delErr } = await db.rpc("delete_printing_order_atomic", { p_order_id: s.orderId, p_actor_id: s.userId });
    expect(delErr?.message || "").toContain("khong the xoa");

    // trả dư → chặn
    const { error: overErr } = await db.rpc("record_lab_payment_atomic", {
      p_lab_id: s.labId, p_amount: 1, p_payment_method: "cash", p_note: "", p_allocations: [], p_actor_id: s.userId, p_payment_date: "2026-08-21",
    });
    expect(overErr?.message || "").toContain("cong no");
  });

  test("(c) task thợ ngoài hoàn thành không sinh phiếu chi; trả thợ → phiếu chi + phân bổ, công nợ về 0", async () => {
    const { data: task, error: te } = await db.from("work_tasks").insert({
      contract_id: s.contractId, event_id: s.eventId, work_type: "chup_anh", vendor_id: s.vendorId, cost: 1200000, status: "chua_lam",
    }).select("id").single();
    expect(te).toBeNull();
    s.taskId = task!.id;

    const { error: ue } = await db.from("work_tasks").update({ status: "hoan_thanh", completion_date: new Date().toISOString() }).eq("id", s.taskId!);
    expect(ue).toBeNull();
    expect((await expensesFor(db, "vendor", s.vendorId!)).length).toBe(0); // trigger trích trước đã bỏ

    const { data: payable } = await db.rpc("finance_payable_summary");
    const vRow = (payable as Array<{ payee_type: string; payee_id: string; remaining: number }>).find((r) => r.payee_type === "vendor" && r.payee_id === s.vendorId);
    expect(Number(vRow?.remaining)).toBe(1200000);

    // M2b: wrapper record_vendor_payment_atomic đã drop → gọi thẳng RPC hợp nhất (app cũng vậy từ M2).
    // Vẫn gửi allocations dạng JSON.stringify → phủ nhánh RPC tự parse chuỗi (bug có sẵn M1 phát hiện).
    const { data: pay, error: pe } = await db.rpc("record_payee_payment_atomic", {
      p_payee_type: "vendor", p_payee_id: s.vendorId, p_amount: 1200000, p_payment_method: "chuyen_khoan", p_payment_date: "2026-08-22", p_note: "E2E trả thợ",
      p_allocations: JSON.stringify([{ target_id: s.taskId, amount: 1200000 }]), p_actor_id: s.userId,
    });
    expect(pe).toBeNull();
    const r = pay as { expense_id: string; allocated_amount: number };
    s.expenseIds.push(r.expense_id);
    expect(Number(r.allocated_amount)).toBe(1200000);

    const vExp = await expensesFor(db, "vendor", s.vendorId!);
    expect(vExp.length).toBe(1);
    expect(vExp[0].expense_date).toBe("2026-08-22");
    expect((await allocationsFor(db, "work_task", s.taskId!)).length).toBe(1);

    const { data: after } = await db.rpc("finance_vendor_debt_summary");
    expect((after as Array<{ vendor_id: string }>).some((x) => x.vendor_id === s.vendorId)).toBe(false); // hết nợ → không còn trong danh sách
  });

  test("(d) nhập phôi đã trả → phiếu chi payee=supplier + phân bổ + tồn kho; nhập chưa trả → chỉ tồn kho", async () => {
    const { data: r1, error: e1 } = await db.rpc("inventory_stock_in_atomic", {
      p_item_id: s.itemId, p_quantity: 100, p_unit_cost: 500, p_supplier: "E2E", p_reason: "E2E lô 1", p_notes: null as unknown as string, p_user_id: s.userId,
      p_supplier_id: s.supplierId, p_paid: true, p_payment_method: "tien_mat", p_paid_date: "2026-08-23",
    });
    expect(e1).toBeNull();
    const res1 = r1 as { current_stock: number; expense_id: string | null; transaction_id: string };
    expect(res1.current_stock).toBe(100);
    expect(res1.expense_id).toBeTruthy();
    s.expenseIds.push(res1.expense_id!);
    const supExp = await expensesFor(db, "supplier", s.supplierId!);
    expect(supExp.length).toBe(1);
    expect(Number(supExp[0].amount)).toBe(50000);
    expect(supExp[0].expense_date).toBe("2026-08-23");
    expect((await allocationsFor(db, "inventory_transaction", res1.transaction_id)).length).toBe(1);

    const { data: r2, error: e2 } = await db.rpc("inventory_stock_in_atomic", {
      p_item_id: s.itemId, p_quantity: 10, p_unit_cost: 500, p_supplier: "E2E", p_reason: "E2E lô 2", p_notes: null as unknown as string, p_user_id: s.userId,
      p_paid: false,
    });
    expect(e2).toBeNull();
    expect((r2 as { current_stock: number }).current_stock).toBe(110);
    expect((await expensesFor(db, "supplier", s.supplierId!)).length).toBe(1);

    const { data: payable } = await db.rpc("finance_payable_summary");
    const sRow = (payable as Array<{ payee_type: string; payee_id: string; remaining: number }>).find((r) => r.payee_type === "supplier" && r.payee_id === s.supplierId);
    expect(Number(sRow?.remaining)).toBe(5000); // lô 2 chưa trả

    const { data: integrity } = await db.rpc("printing_integrity_report");
    for (const row of integrity as Array<{ check_name: string; issue_count: number }>) expect(Number(row.issue_count), row.check_name).toBe(0);
  });

  test("UI smoke: 5 màn đọc sổ mới", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await login(page, s);

    // M2: 2 route công nợ cũ redirect sang /finance/payables → chờ URL đích + trang có số thật
    // (assert "main, body" cũ pass ngay trên skeleton → goto kế tiếp đua với điều hướng redirect → ERR_ABORTED)
    await page.goto("/finance/lab-debts", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/finance\/payables/, { timeout: 20_000 });
    await expect(page.getByText("Hồng Bảo").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/1\.905\.000/).first()).toBeVisible({ timeout: 20_000 });

    await page.goto("/finance/vendor-debts", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/finance\/payables/, { timeout: 20_000 });
    await expect(page.getByText(/Phải trả/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Hồng Bảo").first()).toBeVisible({ timeout: 20_000 });

    await page.goto("/printing", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Công nợ/).first()).toBeVisible({ timeout: 20_000 });

    await page.goto("/finance/expenses", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Trả lab Hồng Bảo/).first()).toBeVisible({ timeout: 20_000 });

    // Cột Lợi nhuận đọc contract_financials(): HĐ seed = 5.000.000 − (task thợ 1.200.000 + đơn in 300.000) = +3.500.000
    // (global-setup seed 20 HĐ E2E mới hơn nên HĐ thật bị đẩy sang trang 2 — dùng chính HĐ seed của spec này)
    await page.goto("/contracts", { waitUntil: "domcontentloaded" });
    const row = page.locator("table tbody tr", { hasText: s.contractCode }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.getByText(/3\.500\.000/).first()).toBeVisible({ timeout: 20_000 });
    await expect(row.getByText(/1\.500\.000/).first()).toBeVisible({ timeout: 20_000 });
  });
});
