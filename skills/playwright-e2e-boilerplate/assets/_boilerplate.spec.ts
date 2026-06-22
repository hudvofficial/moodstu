/**
 * <feature>.spec.ts
 * ─────────────────
 * TEMPLATE — copy thành tests/e2e/<feature>.spec.ts, chỉ sửa phần
 * "// 🔧 CUSTOMIZE HERE" bên dưới.
 *
 * Flow:
 *   1. beforeAll: seed E2E admin user (unique marker) + login via UI
 *   2. tests:  navigate → interact → assert (locator + toast)
 *   3. afterAll: cleanup test data theo marker
 *
 * Required env (.env.local):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - ADMIN_EMAIL  (optional nếu dùng loginViaStorageState)
 *   - ADMIN_PASSWORD
 *
 * Run:
 *   npx playwright test tests/e2e/<feature>.spec.ts
 *   npx playwright test tests/e2e/<feature>.spec.ts --project="iPhone 14"
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

// ─── Constants ────────────────────────────────────────────────────────────────

/** Unique marker cho run này — tự động dùng làm suffix cho mọi test data. */
const MARKER = uniqueMarker();

/** Set true nếu muốn test chạy parallel với specs khác (data isolation OK). */
const PARALLEL_SAFE = true;

// ─── Test suite ───────────────────────────────────────────────────────────────

test.describe("<Feature Name> @smoke", () => {
  let admin: SupabaseClient;
  let page: Page;
  let consoleCheck: ReturnType<typeof assertNoConsoleErrors>;
  let requestCheck: ReturnType<typeof assertNoFailedRequests>;

  test.beforeAll(async ({ browser }) => {
    if (PARALLEL_SAFE) {
      test.describe.configure({ mode: "parallel" });
    }

    admin = createAdminSupabase();

    // 1. Seed E2E admin user
    const seeded = await seedAdminUser(admin, MARKER, {
      fullName: `E2E <Feature> ${MARKER}`,
    });
    console.log(`[${MARKER}] Seeded admin: ${seeded.email}`);

    // 2. Login via UI với env credentials (hoặc dùng storageState)
    const context = await browser.newContext();
    page = await context.newPage();

    consoleCheck = assertNoConsoleErrors(page);
    requestCheck = assertNoFailedRequests(page);

    await loginViaUI(page, {
      email: seeded.email,
      password: seeded.password,
      redirectTo: /\/dashboard$/,
    });
  });

  test.afterAll(async () => {
    // Cleanup: xóa mọi data theo marker
    if (admin) {
      await cleanupTestData(admin, MARKER);
    }
    if (page && !page.isClosed()) {
      await page.context().close();
    }
  });

  // ─── Test cases ────────────────────────────────────────────────────────────

  test("should navigate to <feature> page", async () => {
    // Arrange: đã login + ở dashboard

    // Act
    await page.goto("/<feature-path>");
    await waitForAppIdle(page);

    // Assert
    await expectUrl(page, /\/<feature-path>$/);
    await expect(
      page.getByRole("heading", { name: /<page title>/i }),
    ).toBeVisible();
  });

  test("should display key elements", async () => {
    await page.goto("/<feature-path>");
    await waitForAppIdle(page);

    // 🔧 CUSTOMIZE HERE — đổi locator theo UI thật
    await expect(page.getByTestId("<key-element>")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /<primary action>/i }),
    ).toBeEnabled();
  });

  test("should handle primary action", async () => {
    await page.goto("/<feature-path>");
    await waitForAppIdle(page);

    // 🔧 CUSTOMIZE HERE — flow nghiệp vụ
    await clickButton(page, /<primary action>/i);

    // Assert dialog/modal/toast xuất hiện
    await expectDialogVisible(page, /<dialog title>/i);
    await fillFormByLabel(page, {
      "<Field 1>": `E2E-${MARKER}-value-1`,
      "<Field 2>": `E2E-${MARKER}-value-2`,
    });
    await clickButton(page, /<submit>/i);

    // Assert toast thành công
    await expectToast(page, /thành công|success/i);
  });

  test("should validate form errors", async () => {
    await page.goto("/<feature-path>");
    await waitForAppIdle(page);

    // Open form, submit without filling → expect validation
    await clickButton(page, /<primary action>/i);
    await expectDialogVisible(page, /<dialog title>/i);
    await clickButton(page, /<submit>/i);

    // Toast/error message appears
    await expectToast(page, /lỗi|error|required/i, { type: "error" });
  });

  test("should persist data across reload", async () => {
    // Create data
    await page.goto("/<feature-path>");
    await waitForAppIdle(page);
    // 🔧 CUSTOMIZE HERE — create new entity
    await clickButton(page, /<create>/i);
    await fillFormByLabel(page, { "<Name>": `E2E Reload ${MARKER}` });
    await clickButton(page, /<save>/i);
    await expectToast(page, /thành công/i);

    // Reload and verify
    await page.reload();
    await waitForAppIdle(page);
    await expect(
      page.getByText(`E2E Reload ${MARKER}`).first(),
    ).toBeVisible();
  });

  // ─── Quality checks (always run) ───────────────────────────────────────────

  test.afterEach(async () => {
    // Fail test nếu có console error hoặc HTTP request fail
    consoleCheck.check();
    requestCheck.check();
  });
});
