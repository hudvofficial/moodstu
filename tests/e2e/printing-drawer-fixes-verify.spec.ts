/**
 * Regression cho T-20260825-printing-drawer-fixes (ADR-015) — 3 luồng đã từng vỡ:
 *   1. /printing group drawer: chọn Gặp sự cố / Hủy đơn phải hỏi lý do (trước: server
 *      từ chối thẳng vì client không gửi reason) + drawer ĐANG MỞ tự cập nhật (trước:
 *      snapshot đông cứng, phải F5) + dot màu gap_su_co ≠ huy_don.
 *   2. Detail drawer: badge nợ lab = total − đã phân bổ (trước: luôn = tổng đơn) +
 *      next-step đổi badge/nhãn tại chỗ + modal Hủy không còn mục "Hoàn tiền".
 *   3. /contracts/[id]: Hủy đơn từ thẻ hợp đồng hỏi lý do (trước: requiresReason thiếu huy_don).
 * Seed 1 user + 1 HĐ + 1 lab + 3 đơn in E2E rồi dọn sạch — KHÔNG mutate dữ liệu thật.
 * Chạy: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npx playwright test tests/e2e/printing-drawer-fixes-verify.spec.ts --project=chromium
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { sweepStaleE2EOrphans } from "./e2e-sweep";

type AdminClient = SupabaseClient;

interface SeededOrder {
  id: string;
  code: string;
}

interface SeedState {
  marker: string;
  email: string;
  password: string;
  employeeName: string;
  contractCode: string;
  userId?: string;
  customerId?: string;
  contractId?: string;
  labId?: string;
  labPaymentId?: string;
  orderA?: SeededOrder; // cho_xu_ly, quá hạn → test "Gặp sự cố" trong group drawer
  orderB?: SeededOrder; // cho_xu_ly, chưa tới hạn → test "Hủy đơn" trong group drawer
  orderC?: SeededOrder; // cho_xu_ly, có lab + đã trả lab 1 phần → detail drawer
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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function createAdminSupabase() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function createOrder(
  admin: AdminClient,
  seed: SeedState,
  input: { labId: string | null; items: { name: string; quantity: number; unitPrice: number }[]; expectedDate: string; notes: string },
): Promise<SeededOrder> {
  const { data, error } = await admin.rpc("create_printing_order_atomic", {
    p_order: {
      contractId: seed.contractId,
      labId: input.labId,
      items: input.items,
      notes: input.notes,
      expectedDate: input.expectedDate,
    },
    p_actor_id: seed.userId,
  });
  if (error) throw new Error(`printing order: ${error.message}`);
  const rec = data as { order_id?: string; order_code?: string };
  if (!rec?.order_id || !rec?.order_code) throw new Error(`printing order: no id/code in ${JSON.stringify(data)}`);
  return { id: rec.order_id, code: rec.order_code };
}

async function seedAll(admin: AdminClient, seed: SeedState) {
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: seed.email,
    password: seed.password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: seed.employeeName },
  });
  if (authError || !authUser.user) throw new Error(`auth user: ${authError?.message}`);
  seed.userId = authUser.user.id;

  const { error: employeeError } = await admin
    .from("employees")
    .update({
      employee_code: `E2E-PDF-${seed.marker.slice(-6)}`,
      department: "E2E",
      position: "QA",
      role: "admin",
      status: "active",
      start_date: "2026-05-15",
    })
    .eq("auth_user_id", seed.userId);
  if (employeeError) throw new Error(`employee: ${employeeError.message}`);

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({
      customer_code: `E2E-PDF-CUS-${seed.marker}`,
      full_name: `E2E PDF ${seed.marker}`,
      phone: "0901234567",
      status: "active",
    })
    .select("id")
    .single();
  if (customerError || !customer) throw new Error(`customer: ${customerError?.message}`);
  seed.customerId = customer.id;

  const { data: contract, error: contractError } = await admin
    .from("contracts")
    .insert({
      contract_code: seed.contractCode,
      customer_id: seed.customerId,
      contract_date: "2026-06-30",
      work_date: "2026-07-05",
      service_type: "studio",
      transaction_type: "hop_dong",
      status: "dang_thuc_hien",
      payment_status: "chua_thanh_toan",
      total_amount: 5000000,
      paid_amount: 1000000,
      remaining_amount: 4000000,
    })
    .select("id")
    .single();
  if (contractError || !contract) throw new Error(`contract: ${contractError?.message}`);
  seed.contractId = contract.id;

  const { data: lab, error: labError } = await admin
    .from("labs")
    .insert({ lab_name: `E2E Lab ${seed.marker}`, status: "active" })
    .select("id")
    .single();
  if (labError || !lab) throw new Error(`lab: ${labError?.message}`);
  seed.labId = lab.id;

  seed.orderA = await createOrder(admin, seed, {
    labId: seed.labId,
    items: [{ name: "E2E A - Album", quantity: 1, unitPrice: 100000 }],
    expectedDate: "2026-07-08", // quá hạn (hôm nay 2026-08-25)
    notes: "E2E PDF A",
  });
  seed.orderB = await createOrder(admin, seed, {
    labId: seed.labId,
    items: [{ name: "E2E B - Ảnh cổng", quantity: 1, unitPrice: 200000 }],
    expectedDate: "2026-12-31",
    notes: "E2E PDF B",
  });
  seed.orderC = await createOrder(admin, seed, {
    labId: seed.labId,
    items: [
      { name: "E2E C - Album 20x30", quantity: 1, unitPrice: 250000 },
      { name: "E2E C - Ảnh cổng 60x90", quantity: 1, unitPrice: 112500 },
    ],
    expectedDate: "2026-12-31",
    notes: "E2E PDF C",
  });

  // Trả lab 1 phần cho C: 100.000 / 362.500 → còn nợ 262.500 (trước fix badge hiện 362.500)
  // ADR-016: phiếu chi thật (expenses + expense_allocations) qua RPC — không còn bảng lab_payments
  const { data: payment, error: payError } = await admin.rpc("record_lab_payment_atomic", {
    p_lab_id: seed.labId!,
    p_amount: 100000,
    p_payment_method: "transfer",
    p_note: `E2E PDF ${seed.marker}`,
    p_allocations: [{ printing_order_id: seed.orderC.id, amount: 100000 }],
    p_actor_id: seed.userId!,
    p_payment_date: "2026-08-20",
  });
  if (payError || !payment) throw new Error(`lab_payment: ${payError?.message}`);
  seed.labPaymentId = (payment as { expense_id: string }).expense_id;
}

async function cleanupSeed(admin: AdminClient, seed: SeedState) {
  const orderIds = [seed.orderA, seed.orderB, seed.orderC].filter(Boolean).map((o) => o!.id);
  if (seed.labPaymentId) {
    await admin.from("expense_allocations").delete().eq("expense_id", seed.labPaymentId);
    await admin.from("expenses").delete().eq("id", seed.labPaymentId);
  }
  if (orderIds.length) {
    await admin.from("printing_order_status_history").delete().in("order_id", orderIds);
  }
  if (seed.contractId) {
    await admin.from("work_tasks").delete().eq("contract_id", seed.contractId);
    await admin.from("contract_events").delete().eq("contract_id", seed.contractId);
    await admin.from("payments").delete().eq("contract_id", seed.contractId);
    await admin.from("expenses").delete().eq("contract_id", seed.contractId);
    await admin.from("printing_orders").delete().eq("contract_id", seed.contractId);
    await admin.from("contract_items").delete().eq("contract_id", seed.contractId);
    await admin.from("contracts").delete().eq("id", seed.contractId);
  }
  if (seed.labId) {
    await admin.from("labs").delete().eq("id", seed.labId);
  }
  if (seed.customerId) {
    await admin.from("customers").delete().eq("id", seed.customerId);
  }
  if (seed.userId) {
    await admin.from("employees").delete().eq("auth_user_id", seed.userId);
    await admin.auth.admin.deleteUser(seed.userId);
  }
}

async function login(page: Page, seed: SeedState) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(seed.email);
  await page.locator('input[name="password"]').fill(seed.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
  // Trang còn kích một điều hướng cứng tới /dashboard ngay sau khi đổi URL → goto sớm bị ERR_ABORTED
  await Promise.race([page.waitForEvent("load"), page.waitForTimeout(4000)]);
}

async function waitForOrderStatus(admin: AdminClient, id: string, status: string) {
  for (let i = 0; i < 30; i++) {
    const { data } = await admin
      .from("printing_orders")
      .select("status, issue_reason")
      .eq("id", id)
      .single();
    if (data?.status === status) return data;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`order ${id} did not reach ${status}`);
}

async function openStatusSelect(page: Page, trigger: Locator) {
  await trigger.click();
  const anyOption = page.getByRole("option").first();
  if (!(await anyOption.isVisible().catch(() => false))) {
    await trigger.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("option").first()).toBeVisible({ timeout: 5_000 });
}

async function confirmReason(page: Page, reason: string) {
  const modal = page.getByRole("dialog", { name: "Nhập lý do thay đổi trạng thái" });
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await modal.locator("textarea").fill(reason);
  await modal.getByRole("button", { name: "Xác nhận" }).click();
  await expect(modal).toBeHidden({ timeout: 10_000 });
}

function groupDrawer(page: Page) {
  return page.locator('[role="dialog"]:visible', { hasText: "Chi tiết Nhóm Đơn In" }).first();
}

async function openGroupDrawer(page: Page, seed: SeedState) {
  await page.goto("/printing", { waitUntil: "domcontentloaded" });
  const groupRow = page.locator("table tbody tr", { hasText: seed.contractCode }).first();
  await groupRow.waitFor({ state: "visible", timeout: 20_000 });
  await groupRow.click();
  const drawer = groupDrawer(page);
  await expect(drawer).toBeVisible({ timeout: 10_000 });
  return drawer;
}

test.describe.serial("T-20260825 printing drawer fixes — render thật", () => {
  test.setTimeout(240_000);

  let admin: AdminClient;
  const ts = Date.now();
  const seed: SeedState = {
    marker: ts.toString(),
    email: `e2e-pdf-${ts}@test.local`,
    password: `Pdf!${ts}`,
    employeeName: `E2E PDF ${ts}`,
    contractCode: `E2E-PDF-${ts.toString().slice(-6)}`,
  };

  test.beforeAll(async () => {
    admin = createAdminSupabase();
    await sweepStaleE2EOrphans(admin);
    await seedAll(admin, seed);
  });

  test.afterAll(async () => {
    if (admin) await cleanupSeed(admin, seed);
  });

  test("1. Group drawer: Gặp sự cố / Hủy đơn hỏi lý do, drawer đang mở tự cập nhật, dot màu tách", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await login(page, seed);
    const drawer = await openGroupDrawer(page, seed);

    // Header ban đầu: 0/3 xong, 1 trễ (A quá hạn)
    await expect(drawer.locator("p.text-h3.text-success").first()).toHaveText(/0\s*\/\s*3/);
    await expect(drawer.locator("div.text-error p.text-h3").first()).toHaveText("1");

    // ── A: cho_xu_ly → gap_su_co ──
    const cardA = drawer.locator("div.bg-bg-main.shadow-xs", { hasText: seed.orderA!.code }).first();
    const triggerA = cardA.locator('button[aria-label="Cập nhật trạng thái"]');
    await expect(triggerA).toContainText("Chờ xử lý");
    await openStatusSelect(page, triggerA);

    // Dot màu: Gặp sự cố (cam pending #f39c12) ≠ Hủy đơn (đỏ error #e74c3c)
    const optIssue = page.getByRole("option", { name: "Gặp sự cố" });
    const optCancel = page.getByRole("option", { name: "Hủy đơn" });
    await expect(optIssue).toBeVisible();
    await expect(optCancel).toBeVisible();
    const issueDot = await optIssue.locator("span.rounded-full").first().evaluate((el) => getComputedStyle(el).backgroundColor);
    const cancelDot = await optCancel.locator("span.rounded-full").first().evaluate((el) => getComputedStyle(el).backgroundColor);
    console.log(`[dot] gap_su_co=${issueDot} huy_don=${cancelDot}`);
    expect(issueDot).toBe("rgb(243, 156, 18)");
    expect(cancelDot).toBe("rgb(231, 76, 60)");

    await optIssue.click();
    await confirmReason(page, "E2E: in sai màu");
    await expect(page.getByText("Cập nhật trạng thái thành công").first()).toBeVisible({ timeout: 15_000 });

    // Drawer VẪN mở và đã đổi — không đóng/F5
    await expect(drawer).toBeVisible();
    await expect(triggerA).toContainText("Gặp sự cố", { timeout: 15_000 });
    const rowA = await waitForOrderStatus(admin, seed.orderA!.id, "gap_su_co");
    expect(rowA.issue_reason).toBe("E2E: in sai màu");
    // gap_su_co vẫn pending → trễ vẫn 1
    await expect(drawer.locator("div.text-error p.text-h3").first()).toHaveText("1");

    // ── B: cho_xu_ly → huy_don ──
    const cardB = drawer.locator("div.bg-bg-main.shadow-xs", { hasText: seed.orderB!.code }).first();
    const triggerB = cardB.locator('button[aria-label="Cập nhật trạng thái"]');
    await openStatusSelect(page, triggerB);
    await page.getByRole("option", { name: "Hủy đơn" }).click();
    await confirmReason(page, "E2E: khách đổi yêu cầu");
    await expect(page.getByText("Cập nhật trạng thái thành công").first()).toBeVisible({ timeout: 15_000 });

    await expect(drawer).toBeVisible();
    await expect(triggerB).toContainText("Hủy đơn", { timeout: 15_000 });
    await waitForOrderStatus(admin, seed.orderB!.id, "huy_don");
    // header "Đã hoàn thành" cập nhật ngay trong drawer đang mở: 1/3
    await expect(drawer.locator("p.text-h3.text-success").first()).toHaveText(/1\s*\/\s*3/, { timeout: 15_000 });

    await page.waitForTimeout(500);
    await drawer.screenshot({ path: "test-results/pdf-1-group-drawer-after.png" });
  });

  test("2. Detail drawer: badge nợ lab đúng số, next-step cập nhật tại chỗ, modal Hủy không còn Hoàn tiền", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await login(page, seed);
    const drawer = await openGroupDrawer(page, seed);

    const cardC = drawer.locator("div.bg-bg-main.shadow-xs", { hasText: seed.orderC!.code }).first();
    await cardC.getByRole("button", { name: "Sửa" }).click();

    const detail = page
      .locator('[role="dialog"]:visible', { has: page.getByRole("button", { name: "Lưu thay đổi" }) })
      .first();
    await expect(detail).toBeVisible({ timeout: 10_000 });
    await expect(detail.getByText("Chờ xử lý", { exact: true }).first()).toBeVisible();

    // Nợ lab thật: 362.500 − 100.000 = 262.500 (trước fix: 362.500)
    const payLabBtn = detail.getByRole("button", { name: /Thanh toán lab/ });
    await expect(payLabBtn).toContainText("262.500đ", { timeout: 15_000 });
    await expect(detail.getByText("Còn nợ lab")).toBeVisible();
    await expect(detail.getByText("262.500đ").first()).toBeVisible();
    await detail.screenshot({ path: "test-results/pdf-2-detail-lab-debt.png" });

    // Next step: cho_xu_ly → dang_in — drawer đang mở phải tự đổi badge + nhãn nút
    await detail.getByRole("button", { name: /Gửi lab — bắt đầu in/ }).click();
    await expect(page.getByText("Cập nhật trạng thái thành công").first()).toBeVisible({ timeout: 15_000 });
    await expect(detail).toBeVisible();
    await expect(detail.getByText("Đang in", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    await expect(detail.getByRole("button", { name: /Lab đã in xong/ })).toBeVisible({ timeout: 15_000 });
    await waitForOrderStatus(admin, seed.orderC!.id, "dang_in");
    await detail.screenshot({ path: "test-results/pdf-2-detail-after-next-step.png" });

    // Modal Hủy đơn: không còn "Hoàn tiền" / "Đã thanh toán"
    await detail.getByRole("button", { name: "Hủy đơn", exact: true }).click();
    const cancelModal = page.getByRole("dialog", { name: "Hủy đơn in" });
    await expect(cancelModal).toBeVisible({ timeout: 10_000 });
    await expect(cancelModal.getByText("Hoàn tiền")).toHaveCount(0);
    await expect(cancelModal.getByText("Đã thanh toán")).toHaveCount(0);
    await expect(cancelModal.getByText("Tổng đơn")).toBeVisible();
    await cancelModal.screenshot({ path: "test-results/pdf-2-cancel-modal.png" });
    await cancelModal.locator("textarea").fill("E2E: hủy từ modal");
    await cancelModal.getByRole("button", { name: "Xác nhận hủy đơn" }).click();
    await expect(page.getByText("Đã hủy đơn thành công").first()).toBeVisible({ timeout: 15_000 });
    await expect(cancelModal).toBeHidden();
    // Drawer đang mở tự đổi badge (ADR-015) + nút Hủy đơn/next-step ẩn
    await expect(detail.getByText("Hủy đơn", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    await expect(detail.getByRole("button", { name: /Lab đã in xong/ })).toHaveCount(0);
    // ADR-017: 1 đường hủy → đủ cả 2 bộ side-effect
    const rowC = await admin
      .from("printing_orders")
      .select("status, cancelled_at, cancellation_reason")
      .eq("id", seed.orderC!.id)
      .single();
    expect(rowC.data?.status).toBe("huy_don");
    expect(rowC.data?.cancelled_at).not.toBeNull();
    expect(rowC.data?.cancellation_reason).toBe("E2E: hủy từ modal");
    const hist = await admin
      .from("printing_order_status_history")
      .select("to_status, reason")
      .eq("order_id", seed.orderC!.id)
      .eq("to_status", "huy_don");
    expect(hist.data?.length).toBe(1);
    expect(hist.data?.[0]?.reason).toBe("E2E: hủy từ modal");
  });

  test("3. /contracts/[id]: Hủy đơn từ thẻ hợp đồng hỏi lý do (trước đây fail thẳng)", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await login(page, seed);

    // Đi qua danh sách như spec printing-ui-tablet (goto thẳng /contracts/[id] ngay sau
    // login bị net::ERR_ABORTED — điều hướng bị huỷ giữa chừng, không liên quan code test).
    await page.goto("/contracts", { waitUntil: "domcontentloaded" });
    const codeText = page.getByText(seed.contractCode, { exact: false }).first();
    await codeText.waitFor({ state: "visible", timeout: 20_000 });
    const tableRow = page.locator("table tbody tr", { hasText: seed.contractCode }).first();
    const cardBtn = page.locator("button.card-base", { hasText: seed.contractCode }).first();
    if (await tableRow.isVisible().catch(() => false)) {
      await tableRow.locator("td").first().click();
    } else if (await cardBtn.isVisible().catch(() => false)) {
      await cardBtn.click();
    } else {
      await codeText.click();
    }
    const detailBtn = page.locator('button:has-text("Chi tiết hợp đồng"):visible').first();
    await expect(detailBtn).toBeVisible({ timeout: 10_000 });
    await detailBtn.click();
    await page.waitForURL(`**/contracts/${seed.contractId}`, { timeout: 30_000 });

    const printTab = page.locator('button:has-text("In ấn"):visible').first();
    if (await printTab.isVisible().catch(() => false)) {
      await printTab.click();
      await page.waitForTimeout(500);
    }
    const printHeading = page.locator('h3:has-text("In ấn"):visible').first();
    await printHeading.waitFor({ state: "visible", timeout: 15_000 });
    await printHeading.scrollIntoViewIfNeeded();
    const printBlock = printHeading.locator("xpath=ancestor::div[contains(@class, 'card-base')][1]");

    // A (gap_su_co sau test 1, hoặc cho_xu_ly nếu chạy lẻ — cả 2 đều cho phép huy_don)
    // → Hủy đơn (bắt buộc lý do)
    const cardA = printBlock.locator(".space-y-3 > div", { hasText: seed.orderA!.code }).first();
    const triggerA = cardA.locator('button[aria-label="Cập nhật trạng thái"]').first();
    await expect(triggerA).toBeVisible({ timeout: 10_000 });
    await openStatusSelect(page, triggerA);
    await page.getByRole("option", { name: "Hủy đơn" }).click();
    await confirmReason(page, "E2E: hủy từ thẻ hợp đồng");
    await expect(triggerA).toContainText("Hủy đơn", { timeout: 15_000 });
    await waitForOrderStatus(admin, seed.orderA!.id, "huy_don");
    await printBlock.screenshot({ path: "test-results/pdf-3-contract-block-after.png" });
  });
});
