import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { requireGlobalSeed } from "../../playwright/seed-reader";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
}

test("prints a complete multi-day contract without clipping", async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const seed = requireGlobalSeed();
  const admin = adminClient();

  const { error: customerError } = await admin
    .from("customers")
    .update({
      wedding_date: "2026-07-16",
      address: "Sơn Kỳ, Sơn Hà, Quảng Ngãi",
    })
    .eq("id", seed.customerId);
  expect(customerError).toBeNull();

  const { error: eventsError } = await admin.from("contract_events").insert([
    {
      contract_id: seed.contractId,
      event_type: "ngay_to_chuc",
      title: "Ăn hỏi",
      event_date: "2026-07-15",
      location: "Nhà gái",
      status: "chua_lam",
      sort_order: 2,
      is_manual_date: true,
    },
    {
      contract_id: seed.contractId,
      event_type: "ngay_to_chuc",
      title: "Ngày cưới",
      event_date: "2026-07-16",
      location: "Trung tâm tiệc cưới",
      status: "chua_lam",
      sort_order: 3,
      is_manual_date: true,
    },
  ]);
  expect(eventsError).toBeNull();

  const { error: itemError } = await admin.from("contract_items").insert({
    contract_id: seed.contractId,
    item_name: "Combo học + ngày cưới 1 suất + chụp",
    type: "dich_vu",
    quantity: 1,
    unit_price: 5_000_000,
    discount_amount: 0,
    total_amount: 5_000_000,
    is_addon: false,
  });
  expect(itemError).toBeNull();

  await login(page, seed.email, seed.password);
  await page.goto(`/contracts/${seed.contractId}/print`);

  const firstCopy = page.locator("#print-template-copy-1");
  await expect(firstCopy).toBeVisible({ timeout: 45_000 });
  await expect(firstCopy.getByText("Lịch thực hiện")).toBeVisible();
  await expect(firstCopy.getByText("Ăn hỏi", { exact: true })).toBeVisible();
  await expect(firstCopy.getByText("Ngày cưới", { exact: true })).toBeVisible();
  await expect(firstCopy.getByText("Ngày chính", { exact: true })).toBeVisible();
  await expect(firstCopy.getByText(/Cảm ơn quý khách/)).toBeVisible();
  await expect(firstCopy.getByText("Lộ trình thanh toán", { exact: true })).toHaveCount(0);
  await expect(firstCopy.getByText("Thanh toán hết", { exact: true })).toHaveCount(0);

  const footer = firstCopy.locator(".contract-print-footer");
  const dimensions = await firstCopy.evaluate((element) => {
    const footerElement = element.querySelector<HTMLElement>(".contract-print-footer");
    const templateRect = element.getBoundingClientRect();
    const footerRect = footerElement?.getBoundingClientRect();
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      templateBottom: templateRect.bottom,
      footerBottom: footerRect?.bottom || 0,
    };
  });
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.clientHeight + 1);
  expect(dimensions.footerBottom).toBeLessThanOrEqual(dimensions.templateBottom + 1);
  await expect(footer).toBeVisible();

  await page.emulateMedia({ media: "print" });
  await page.locator("#contract-print-area").screenshot({
    path: "test-results/contract-print-a4-landscape.png",
  });
  await page.emulateMedia({ media: "screen" });

  const pdfDownload = page.waitForEvent("download", { timeout: 45_000 });
  await page.goto(`/contracts/${seed.contractId}/print?isExportMode=true`);
  const exportCopy = page.locator("#print-template-export");
  await expect(exportCopy.getByText(/Cảm ơn quý khách/)).toBeVisible();

  const download = await pdfDownload;
  await download.saveAs(testInfo.outputPath("contract-print-a5.pdf"));

  await page.emulateMedia({ media: "print" });
  await exportCopy.screenshot({
    path: "test-results/contract-print-a5-export.png",
  });
});
