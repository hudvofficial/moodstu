import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { sweepStaleE2EOrphans } from "./e2e-sweep";

type AdminClient = SupabaseClient;

interface SeedState {
  marker: string;
  email: string;
  password: string;
  employeeName: string;
  contractCode: string;
  userId?: string;
  customerId?: string;
  contractId?: string;
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

async function seedUser(admin: AdminClient, seed: SeedState) {
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: seed.email,
    password: seed.password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: seed.employeeName },
  });

  if (authError || !authUser.user) {
    throw new Error(`auth user: ${authError?.message}`);
  }

  seed.userId = authUser.user.id;

  const { error: employeeError } = await admin
    .from("employees")
    .update({
      employee_code: `E2E-IPAD-${seed.marker.slice(-6)}`,
      department: "E2E",
      position: "QA",
      role: "admin",
      status: "active",
      start_date: "2026-05-15",
    })
    .eq("auth_user_id", seed.userId);

  if (employeeError) {
    throw new Error(`employee: ${employeeError.message}`);
  }

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({
      customer_code: `E2E-IPAD-CUS-${seed.marker}`,
      full_name: `E2E iPad ${seed.marker}`,
      phone: "0901234567",
      status: "active",
    })
    .select("id")
    .single();

  if (customerError || !customer) {
    throw new Error(`customer: ${customerError?.message}`);
  }

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

  if (contractError || !contract) {
    throw new Error(`contract: ${contractError?.message}`);
  }

  seed.contractId = contract.id;

  await admin.from("contract_events").insert({
    contract_id: seed.contractId,
    event_type: "ngay_chup",
    title: "Chụp",
    event_date: "2026-07-05",
    status: "chua_lam",
    sort_order: 1,
    is_manual_date: true,
  });

  await admin.from("printing_orders").insert({
    contract_id: seed.contractId,
    order_code: `PO-${seed.marker.slice(-6)}`,
    status: "cho_xu_ly",
    payment_status: "unpaid",
    total_amount: 362500,
    expected_date: "2026-07-08",
    items: [
      { name: "Album 20x30", quantity: 1, unitPrice: 250000 },
      { name: "Ảnh cổng 60x90", quantity: 1, unitPrice: 112500 },
    ],
    notes: "Đơn test iPad UI",
  });
}

async function cleanupSeed(admin: AdminClient, seed: SeedState) {
  if (seed.contractId) {
    await admin.from("work_tasks").delete().eq("contract_id", seed.contractId);
    await admin.from("contract_events").delete().eq("contract_id", seed.contractId);
    await admin.from("payments").delete().eq("contract_id", seed.contractId);
    await admin.from("printing_orders").delete().eq("contract_id", seed.contractId);
    await admin.from("contract_items").delete().eq("contract_id", seed.contractId);
    await admin.from("contracts").delete().eq("id", seed.contractId);
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
}

test.describe.serial("Tablet UI test - Print Orders Block", () => {
  test.setTimeout(240_000);

  let admin: AdminClient;
  const ts = Date.now();
  const seed: SeedState = {
    marker: ts.toString(),
    email: `e2e-ipad-${ts}@test.local`,
    password: `IPad!${ts}`,
    employeeName: `E2E iPad ${ts}`,
    contractCode: `E2E-IPAD-${ts.toString().slice(-6)}`,
  };

  test.beforeAll(async () => {
    admin = createAdminSupabase();
    await sweepStaleE2EOrphans(admin);
    await seedUser(admin, seed);
  });

  test.afterAll(async () => {
    if (admin) {
      await cleanupSeed(admin, seed);
    }
  });

  test("Check UI Printing block on iPad viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page, seed);

    await page.goto("/contracts", { waitUntil: "networkidle" });

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

    const printHeading = page.locator('h3:has-text("In ấn"):visible').first();
    await printHeading.waitFor({ state: "visible", timeout: 15_000 });
    await printHeading.scrollIntoViewIfNeeded();

    const printBlock = printHeading.locator("xpath=ancestor::div[contains(@class, 'card-base')][1]");
    await expect(printBlock).toBeVisible();

    await page.waitForTimeout(1000);
    await printBlock.screenshot({ path: "test-results/printing-block-ipad.png" });

    await expect(printBlock.getByText("2 SP", { exact: false }).first()).toBeVisible();
    await expect(printBlock.getByText("362.500đ", { exact: false }).first()).toBeVisible();

    const orderCard = printBlock.locator(".space-y-3 > div").first();
    await orderCard.click();
    await page.waitForTimeout(500);

    await expect(printBlock.getByText("Danh sách sản phẩm", { exact: false })).toBeVisible();
    await expect(printBlock.getByText("Album 20x30", { exact: false })).toBeVisible();
    await expect(printBlock.getByText("Ảnh cổng 60x90", { exact: false })).toBeVisible();

    await printBlock.screenshot({ path: "test-results/printing-block-ipad-expanded.png" });
  });
});