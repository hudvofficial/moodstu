/**
 * example.spec.ts
 * ───────────────
 * Example dùng đầy đủ _helpers + _boilerplate pattern.
 * Reference cho M3 khi viết spec mới — copy pattern, đổi logic.
 *
 * Scenario: tạo + edit + delete một customer trong /customers
 */

import { test, expect, type Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loginViaUI,
  cleanupTestData,
  seedAdminUser,
  createAdminSupabase,
  uniqueMarker,
  waitForAppIdle,
  expectToast,
  expectDialogVisible,
  expectUrl,
  fillFormByLabel,
  clickButton,
  assertNoConsoleErrors,
  assertNoFailedRequests,
} from "./_helpers";

const MARKER = uniqueMarker();

test.describe("Customers @example", () => {
  let admin: SupabaseClient;
  let page: Page;
  let consoleCheck: ReturnType<typeof assertNoConsoleErrors>;
  let requestCheck: ReturnType<typeof assertNoFailedRequests>;

  test.beforeAll(async ({ browser }) => {
    admin = createAdminSupabase();

    const seeded = await seedAdminUser(admin, MARKER);
    console.log(`[${MARKER}] Seeded: ${seeded.email}`);

    const context = await browser.newContext();
    page = await context.newPage();
    consoleCheck = assertNoConsoleErrors(page);
    requestCheck = assertNoFailedRequests(page);

    await loginViaUI(page, {
      email: seeded.email,
      password: seeded.password,
    });
  });

  test.afterAll(async () => {
    await cleanupTestData(admin, MARKER);
    if (page && !page.isClosed()) await page.context().close();
  });

  test("navigate to customers list", async () => {
    await page.goto("/customers");
    await waitForAppIdle(page);
    await expectUrl(page, /\/customers/);
    await expect(
      page.getByRole("heading", { name: /khách hàng|customers/i }),
    ).toBeVisible();
  });

  test("create new customer", async () => {
    await page.goto("/customers");
    await waitForAppIdle(page);

    await clickButton(page, /thêm mới|create|add new/i);
    await expectDialogVisible(page, /thêm khách hàng|new customer/i);

    const phone = `09${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
    await fillFormByLabel(page, {
      "Họ tên": `E2E Customer ${MARKER}`,
      "Số điện thoại": phone,
      "Email": `e2e-${MARKER}@test.local`,
    });
    await clickButton(page, /lưu|save/i);
    await expectToast(page, /thành công|success/i);

    // Verify trong list
    await expect(
      page.getByText(`E2E Customer ${MARKER}`).first(),
    ).toBeVisible();
  });

  test("search customer by name", async () => {
    await page.goto("/customers");
    await waitForAppIdle(page);

    const searchInput = page.getByPlaceholder(/tìm kiếm|search/i);
    await searchInput.fill(`E2E Customer ${MARKER}`);
    await page.waitForTimeout(300); // wait for debounce
    await waitForAppIdle(page);

    await expect(
      page.getByText(`E2E Customer ${MARKER}`).first(),
    ).toBeVisible();
  });

  test("delete customer with confirmation", async () => {
    await page.goto("/customers");
    await waitForAppIdle(page);

    // Click row action → delete
    const row = page.getByRole("row").filter({ hasText: `E2E Customer ${MARKER}` });
    await row.getByRole("button", { name: /xóa|delete/i }).click();

    // Confirm dialog
    await expectDialogVisible(page, /xác nhận|confirm/i);
    await clickButton(page, /đồng ý|confirm|yes/i);

    await expectToast(page, /đã xóa|deleted/i);
  });

  test.afterEach(() => {
    consoleCheck.check();
    requestCheck.check();
  });
});
